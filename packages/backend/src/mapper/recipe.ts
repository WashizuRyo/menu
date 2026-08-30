import type { Recipe } from '@menu/shared'
import type { recipes } from '../db/schema.js'

type RecipeRow = typeof recipes.$inferSelect

export function toRecipe({
  id,
  name,
  ingredients,
  instructions,
  source,
  createdAt,
  updatedAt,
}: RecipeRow): Recipe {
  return {
    id,
    name,
    ingredients,
    instructions,
    source,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  }
}
