import type * as v from 'valibot'
import type {
  createMealPlanInputSchema,
  mealPlanSchema,
  mealTypeSchema,
} from './schema.js'

export type MealType = v.InferOutput<typeof mealTypeSchema>
export type CreateMealPlanInput = v.InferOutput<
  typeof createMealPlanInputSchema
>
export type MealPlan = v.InferOutput<typeof mealPlanSchema>
