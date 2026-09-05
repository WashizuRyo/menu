import type {
  MealPlanDate,
  MealType,
  RecipeIngredient,
  RecipeSource,
} from '@menu/shared'
import { sql } from 'drizzle-orm'
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core'

export const recipes = sqliteTable('recipes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  ingredients: text('ingredients', { mode: 'json' })
    .$type<RecipeIngredient[]>()
    .notNull(),
  instructions: text('instructions', { mode: 'json' })
    .$type<string[]>()
    .notNull(),
  source: text('source', { mode: 'json' }).$type<RecipeSource>().notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .default(sql`(unixepoch())`)
    .notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .default(sql`(unixepoch())`)
    .notNull(),
})

export const mealPlans = sqliteTable('meal_plans', {
  id: text('id').primaryKey(),
  startDate: text('start_date').$type<MealPlanDate>().notNull(),
  endDate: text('end_date').$type<MealPlanDate>().notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .default(sql`(unixepoch())`)
    .notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .default(sql`(unixepoch())`)
    .notNull(),
})

export const mealPlanRecipes = sqliteTable(
  'meal_plan_recipes',
  {
    mealPlanId: text('meal_plan_id')
      .notNull()
      .references(() => mealPlans.id, { onDelete: 'cascade' }),
    mealDate: text('meal_date').$type<MealPlanDate>().notNull(),
    mealType: text('meal_type').$type<MealType>().notNull(),
    recipeId: integer('recipe_id')
      .notNull()
      .references(() => recipes.id, { onDelete: 'restrict' }),
  },
  (table) => [
    primaryKey({
      columns: [
        table.mealPlanId,
        table.mealDate,
        table.mealType,
        table.recipeId,
      ],
    }),
    index('meal_plan_recipes_recipe_id_index').on(table.recipeId),
  ],
)
