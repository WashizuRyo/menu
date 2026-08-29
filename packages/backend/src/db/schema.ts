import { sql } from 'drizzle-orm'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export type RecipeUnit =
  | 'g'
  | 'kg'
  | 'ml'
  | 'L'
  | '個'
  | '本'
  | '枚'
  | '片'
  | '束'
  | '玉'
  | '房'
  | '丁'
  | '袋'
  | 'パック'
  | '缶'
  | '瓶'
  | '切れ'
  | '尾'
  | '大さじ'
  | '小さじ'
  | 'カップ'
  | '合'

export type RecipeIngredientAmount =
  | '少々'
  | '適量'
  | 'ひとつまみ'
  | 'お好みで'
  | '適宜'

export type RecipeIngredientQuantity =
  | {
      type: 'numeric'
      value: number
      unit: RecipeUnit
    }
  | {
      type: 'range'
      min: number
      max: number
      unit: RecipeUnit
    }
  | {
      type: 'qualitative'
      value: RecipeIngredientAmount
    }

export type RecipeIngredient = {
  name: string
  quantity: RecipeIngredientQuantity
}

export type RecipeSource =
  | {
      type: 'manual'
    }
  | {
      type: 'youtube'
      url: string
    }

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
