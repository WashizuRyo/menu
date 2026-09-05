import * as v from 'valibot'
import { createIdGenerator } from '../id.js'
import { RecipeId } from '../recipe/schema.js'
import { MEAL_TYPES } from './constants.js'

export const MealPlanId = createIdGenerator('mpln')
export type MealPlanId = v.InferOutput<typeof MealPlanId.schema>

const isValidCalendarDate = (value: string): boolean => {
  // Dateは存在しない日付を自動補正するため、変換後の日付と元の値を比較する。
  const date = new Date(`${value}T00:00:00.000Z`)

  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  )
}

export const mealPlanDateSchema = v.pipe(
  v.string(),
  v.isoDate('YYYY-MM-DD形式の日付を入力してください'),
  v.check(isValidCalendarDate, '実在する日付を入力してください'),
  v.brand('MealPlanDate'),
)

export const mealTypeSchema = v.picklist(MEAL_TYPES)

export const createMealPlanInputSchema = v.pipe(
  v.strictObject({
    startDate: mealPlanDateSchema,
    endDate: mealPlanDateSchema,
    recipes: v.array(
      v.strictObject({
        mealDate: mealPlanDateSchema,
        mealType: mealTypeSchema,
        recipeId: RecipeId.schema,
      }),
    ),
  }),
  v.forward(
    v.check(
      (input) => input.startDate <= input.endDate,
      '開始日は終了日以前の日付を入力してください',
    ),
    ['endDate'],
  ),
  v.forward(
    v.check(
      (input) =>
        input.recipes.every(
          (recipe) =>
            input.startDate <= recipe.mealDate &&
            recipe.mealDate <= input.endDate,
        ),
      'レシピの日付は献立の期間内に設定してください',
    ),
    ['recipes'],
  ),
  v.forward(
    v.check((input) => {
      const keys = input.recipes.map(
        (recipe) => `${recipe.mealDate}:${recipe.mealType}:${recipe.recipeId}`,
      )
      return new Set(keys).size === keys.length
    }, '同じ日付・食事区分・レシピを重複して登録できません'),
    ['recipes'],
  ),
)

export const mealPlanSchema = v.pipe(
  v.strictObject({
    id: MealPlanId.schema,
    startDate: mealPlanDateSchema,
    endDate: mealPlanDateSchema,
    recipes: v.array(
      v.strictObject({
        mealDate: mealPlanDateSchema,
        mealType: mealTypeSchema,
        recipeId: RecipeId.schema,
      }),
    ),
    createdAt: v.pipe(v.string(), v.isoTimestamp()),
    updatedAt: v.pipe(v.string(), v.isoTimestamp()),
  }),
  v.forward(
    v.check(
      (mealPlan) => mealPlan.startDate <= mealPlan.endDate,
      '開始日は終了日以前の日付を入力してください',
    ),
    ['endDate'],
  ),
  v.forward(
    v.check(
      (mealPlan) =>
        mealPlan.recipes.every(
          (recipe) =>
            mealPlan.startDate <= recipe.mealDate &&
            recipe.mealDate <= mealPlan.endDate,
        ),
      'レシピの日付は献立の期間内に設定してください',
    ),
    ['recipes'],
  ),
  v.forward(
    v.check((mealPlan) => {
      const keys = mealPlan.recipes.map(
        (recipe) => `${recipe.mealDate}:${recipe.mealType}:${recipe.recipeId}`,
      )
      return new Set(keys).size === keys.length
    }, '同じ日付・食事区分・レシピを重複して登録できません'),
    ['recipes'],
  ),
)
