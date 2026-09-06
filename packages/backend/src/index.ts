import { sValidator } from '@hono/standard-validator'
import {
  createMealPlanInputSchema,
  createRecipeInputSchema,
  MealPlanId,
  RecipeId,
} from '@menu/shared'
import { sql } from 'drizzle-orm'
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
      const [existingRecipeCount] = await db.all<{ value: number }>(sql`
        select count(*) as value
        from json_each(${serializedRecipes}) as meal_recipe
        inner join ${recipes}
          on ${recipes.id} = json_extract(meal_recipe.value, '$.recipeId')
      `)

      if (existingRecipeCount?.value !== input.recipes.length) {
        return context.json({ error: 'validation failed' }, 400)
      }

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
        { mealPlan: toMealPlan(mealPlanRow, input.recipes) },
        201,
      )
    },
  )
  .onError(onApiError)

export default app

export type AppType = typeof app
