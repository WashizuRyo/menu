import type { RecipeIngredient, RecipeSource } from '@menu/shared'
import { sql } from 'drizzle-orm'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

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
