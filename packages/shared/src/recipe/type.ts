import type * as v from 'valibot'
import type {
  createRecipeInputSchema,
  recipeIngredientAmountSchema,
  recipeIngredientQuantitySchema,
  recipeIngredientSchema,
  recipeSchema,
  recipeSourceSchema,
  recipeUnitSchema,
} from './schema.js'

export type RecipeUnit = v.InferOutput<typeof recipeUnitSchema>

export type RecipeIngredientAmount = v.InferOutput<
  typeof recipeIngredientAmountSchema
>

export type RecipeIngredientQuantity = v.InferOutput<
  typeof recipeIngredientQuantitySchema
>
export type RecipeIngredientQuantityType = RecipeIngredientQuantity['type']

export type RecipeIngredient = v.InferOutput<typeof recipeIngredientSchema>

export type RecipeSource = v.InferOutput<typeof recipeSourceSchema>
export type RecipeSourceType = RecipeSource['type']

export type Recipe = v.InferOutput<typeof recipeSchema>
export type CreateRecipeInput = v.InferOutput<typeof createRecipeInputSchema>
