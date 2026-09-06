import type {
  MealPlanDate,
  MealPlanId,
  MealType,
  RecipeId,
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
  dbId: integer('db_id').primaryKey({ autoIncrement: true }),
  id: text('id').$type<RecipeId>().notNull().unique(),
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
  dbId: integer('db_id').primaryKey({ autoIncrement: true }),
  id: text('id').$type<MealPlanId>().notNull().unique(),
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
    mealPlanDbId: integer('meal_plan_db_id')
      .notNull()
      .references(() => mealPlans.dbId, { onDelete: 'cascade' }),
    mealDate: text('meal_date').$type<MealPlanDate>().notNull(),
    mealType: text('meal_type').$type<MealType>().notNull(),
    recipeDbId: integer('recipe_db_id')
      .notNull()
      .references(() => recipes.dbId, { onDelete: 'restrict' }),
  },
  (table) => [
    primaryKey({
      columns: [
        table.mealPlanDbId,
        table.mealDate,
        table.mealType,
        table.recipeDbId,
      ],
    }),
    index('meal_plan_recipes_recipe_db_id_index').on(table.recipeDbId),
  ],
)
