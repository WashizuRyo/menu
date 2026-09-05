import type { MealPlan } from '@menu/shared'
import type { mealPlans } from '../db/schema.js'

type MealPlanRow = typeof mealPlans.$inferSelect

export function toMealPlan(
  { id, startDate, endDate, createdAt, updatedAt }: MealPlanRow,
  recipes: MealPlan['recipes'],
): MealPlan {
  return {
    id,
    startDate,
    endDate,
    recipes,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  }
}
