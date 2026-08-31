import * as v from 'valibot'
import {
  RECIPE_INGREDIENT_AMOUNTS,
  RECIPE_INGREDIENT_QUANTITY_TYPES,
  RECIPE_UNITS,
} from './constants.js'

export const recipeUnitSchema = v.picklist(RECIPE_UNITS)

export const recipeIngredientAmountSchema = v.picklist(
  RECIPE_INGREDIENT_AMOUNTS,
)

const positiveQuantitySchema = v.pipe(
  v.number(),
  v.finite('有限の数量を入力してください'),
  v.gtValue(0, '数量は0より大きい値を入力してください'),
)

export const recipeIngredientQuantitySchema = v.pipe(
  v.variant('type', [
    v.strictObject({
      type: v.literal(RECIPE_INGREDIENT_QUANTITY_TYPES.NUMERIC),
      value: positiveQuantitySchema,
      unit: recipeUnitSchema,
    }),
    v.strictObject({
      type: v.literal(RECIPE_INGREDIENT_QUANTITY_TYPES.RANGE),
      min: positiveQuantitySchema,
      max: positiveQuantitySchema,
      unit: recipeUnitSchema,
    }),
    v.strictObject({
      type: v.literal(RECIPE_INGREDIENT_QUANTITY_TYPES.QUALITATIVE),
      value: recipeIngredientAmountSchema,
    }),
  ]),
  v.forward(
    v.check(
      (quantity) =>
        quantity.type === 'range' ? quantity.min <= quantity.max : true,
      '最大値は最小値以上を入力してください',
    ),
    ['max'],
  ),
)

export const recipeIngredientSchema = v.strictObject({
  name: v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty('材料名を入力してください'),
    v.maxLength(100, '材料名は100文字以内で入力してください'),
  ),
  quantity: recipeIngredientQuantitySchema,
})

export const recipeSourceSchema = v.variant('type', [
  v.strictObject({
    type: v.literal('manual'),
  }),
  v.strictObject({
    type: v.literal('youtube'),
    url: v.pipe(
      v.string(),
      v.trim(),
      v.nonEmpty('YouTube URLを入力してください'),
      v.maxLength(2_048, 'YouTube URLは2048文字以内で入力してください'),
      v.url('正しいYouTube URLを入力してください'),
      v.regex(
        /^https?:\/\/(?:(?:[a-z0-9-]+\.)*youtube\.com|(?:[a-z0-9-]+\.)*youtube-nocookie\.com|youtu\.be)(?=[:/?#]|$)/i,
        'YouTubeのURLを入力してください',
      ),
    ),
  }),
])

export const recipeNameSchema = v.pipe(
  v.string(),
  v.trim(),
  v.nonEmpty('レシピ名を入力してください'),
  v.maxLength(100, 'レシピ名は100文字以内で入力してください'),
)

export const recipeIngredientsSchema = v.pipe(
  v.array(recipeIngredientSchema),
  v.minLength(1, '材料を1件以上入力してください'),
  v.maxLength(100, '材料は100件以内で入力してください'),
)

export const recipeInstructionSchema = v.pipe(
  v.string(),
  v.trim(),
  v.nonEmpty('手順を入力してください'),
  v.maxLength(1_000, '手順は1000文字以内で入力してください'),
)

export const recipeInstructionsSchema = v.pipe(
  v.array(recipeInstructionSchema),
  v.minLength(1, '手順を1件以上入力してください'),
  v.maxLength(50, '手順は50件以内で入力してください'),
)

export const recipeSchema = v.strictObject({
  id: v.number(),
  name: recipeNameSchema,
  ingredients: recipeIngredientsSchema,
  instructions: recipeInstructionsSchema,
  source: recipeSourceSchema,
  createdAt: v.string(),
  updatedAt: v.string(),
})

export const createRecipeInputSchema = v.strictObject({
  name: recipeNameSchema,
  ingredients: recipeIngredientsSchema,
  instructions: recipeInstructionsSchema,
  source: recipeSourceSchema,
})
