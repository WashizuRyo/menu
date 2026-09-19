import { sValidator } from '@hono/standard-validator'
import {
  createMealPlanInputSchema,
  createRecipeInputSchema,
  type MealPlan,
  MealPlanId,
  RecipeId,
} from '@menu/shared'
import { asc, desc, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { mealPlanRecipes, mealPlans, recipes } from './db/schema.js'
import type { Bindings } from './env.js'
import { PayloadTooLargeError, ValidationError } from './lib/api-error.js'
import { onApiError } from './lib/error-handler.js'
import { toMealPlan } from './mapper/meal-plan.js'
import { toRecipe } from './mapper/recipe.js'
import youtube from './routes/youtube.js'

const app = new Hono<{ Bindings: Bindings }>()
  .get('/', (context) => {
    return context.json({ message: 'Menu API' })
  })
  .get('/api/health', (context) => {
    return context.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    })
  })
  .route('/api/youtube', youtube)
  .get('/api/recipes', async (context) => {
    const db = drizzle(context.env.DB)
    const recipeRows = await db
      .select()
      .from(recipes)
      .orderBy(recipes.createdAt)

    return context.json(
      {
        recipes: recipeRows.map(toRecipe),
      },
      200,
    )
  })
  .get('/api/meal-plans', async (context) => {
    const db = drizzle(context.env.DB)
    const rows = await db
      .select({
        mealPlan: mealPlans,
        mealDate: mealPlanRecipes.mealDate,
        mealType: mealPlanRecipes.mealType,
        recipeId: recipes.id,
        recipeName: recipes.name,
      })
      .from(mealPlans)
      .innerJoin(
        mealPlanRecipes,
        sql`${mealPlanRecipes.mealPlanDbId} = ${mealPlans.dbId}`,
      )
      .innerJoin(recipes, sql`${mealPlanRecipes.recipeDbId} = ${recipes.dbId}`)
      .orderBy(
        desc(mealPlans.startDate),
        desc(mealPlans.createdAt),
        desc(mealPlans.id),
        asc(mealPlanRecipes.mealDate),
        sql`case ${mealPlanRecipes.mealType}
          when 'breakfast' then 0
          when 'lunch' then 1
          when 'dinner' then 2
        end`,
        asc(recipes.id),
      )

    // JOIN結果は「献立1件 × レシピ割り当て1件」の形式になるため、
    // APIレスポンスの「献立1件にrecipesをまとめる」形式へ組み立て直す。
    // SQLで並べた順序を保つため、Mapの挿入順をそのままレスポンス順に利用する。
    const grouped = new Map<
      MealPlanId,
      {
        mealPlan: (typeof rows)[number]['mealPlan']
        recipes: MealPlan['recipes']
      }
    >()
    for (const row of rows) {
      const current = grouped.get(row.mealPlan.id)
      const recipe = {
        mealDate: row.mealDate,
        mealType: row.mealType,
        recipeId: row.recipeId,
        recipeName: row.recipeName,
      } satisfies MealPlan['recipes'][number]

      if (current) {
        // 同じ献立に複数のレシピ割り当てがある場合は、同じ配列へ追加する。
        current.recipes.push(recipe)
      } else {
        // 献立が初めて登場した行では、献立情報と最初の割り当てを登録する。
        grouped.set(row.mealPlan.id, {
          mealPlan: row.mealPlan,
          recipes: [recipe],
        })
      }
    }

    // Mapに格納した献立を、共有のレスポンス形式へ変換して返す。
    return context.json(
      {
        mealPlans: [...grouped.values()].map(({ mealPlan, recipes }) =>
          toMealPlan(mealPlan, recipes),
        ),
      },
      200,
    )
  })
  .post(
    '/api/recipes',
    bodyLimit({
      maxSize: 256 * 1024,
      onError: () => {
        throw new PayloadTooLargeError('request too large')
      },
    }),
    sValidator('json', createRecipeInputSchema, (result) => {
      if (!result.success) {
        throw new ValidationError('validation failed')
      }
    }),
    async (context) => {
      const db = drizzle(context.env.DB)
      const input = context.req.valid('json')
      const [recipeRow] = await db
        .insert(recipes)
        .values({ ...input, id: RecipeId.generate() })
        .returning()

      if (!recipeRow) {
        throw new Error('Failed to create recipe')
      }

      return context.json({ recipe: toRecipe(recipeRow) }, 201)
    },
  )
  .post(
    '/api/meal-plans',
    bodyLimit({
      maxSize: 256 * 1024,
      onError: () => {
        throw new PayloadTooLargeError('request too large')
      },
    }),
    sValidator('json', createMealPlanInputSchema, (result) => {
      if (!result.success) {
        throw new ValidationError('validation failed')
      }
    }),
    async (context) => {
      const db = drizzle(context.env.DB)
      const input = context.req.valid('json')

      const serializedRecipes = JSON.stringify(input.recipes)
      const existingRecipeRows = await db.all<{
        recipe_id: RecipeId
        recipe_name: string
      }>(sql`
        select
          json_extract(meal_recipe.value, '$.recipeId') as recipe_id,
          ${recipes.name} as recipe_name
        from json_each(${serializedRecipes}) as meal_recipe
        inner join ${recipes}
          on ${recipes.id} = json_extract(meal_recipe.value, '$.recipeId')
        order by meal_recipe.key
      `)

      if (existingRecipeRows.length !== input.recipes.length) {
        return context.json({ error: 'validation failed' }, 400)
      }

      const recipeNames = new Map(
        existingRecipeRows.map(({ recipe_id, recipe_name }) => [
          recipe_id,
          recipe_name,
        ]),
      )
      const responseRecipes = input.recipes.map((recipe) => {
        const recipeName = recipeNames.get(recipe.recipeId)
        if (!recipeName) {
          throw new Error('Failed to find meal plan recipe')
        }
        return { ...recipe, recipeName }
      })

      const mealPlanId = MealPlanId.generate()

      const [mealPlanRows] = await db.batch([
        db
          .insert(mealPlans)
          .values({
            id: mealPlanId,
            startDate: input.startDate,
            endDate: input.endDate,
          })
          .returning(),
        db.insert(mealPlanRecipes).select(sql`
          select
            ${mealPlans.dbId},
            json_extract(meal_recipe.value, '$.mealDate'),
            json_extract(meal_recipe.value, '$.mealType'),
            (
              select ${recipes.dbId}
              from ${recipes}
              where ${recipes.id} = json_extract(
                meal_recipe.value,
                '$.recipeId'
              )
            )
          from json_each(${serializedRecipes}) as meal_recipe
          cross join ${mealPlans}
          where ${mealPlans.id} = ${mealPlanId}
        `),
      ])

      const [mealPlanRow] = mealPlanRows

      if (!mealPlanRow) {
        throw new Error('Failed to create meal plan')
      }

      return context.json(
        { mealPlan: toMealPlan(mealPlanRow, responseRecipes) },
        201,
      )
    },
  )
  .onError(onApiError)

export default app

export type AppType = typeof app
