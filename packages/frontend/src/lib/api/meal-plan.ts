import type { AppType } from '@menu/backend'
import type { CreateMealPlanInput } from '@menu/shared'
import { hc } from 'hono/client'
import { throwApiError } from './error.js'

const client = hc<AppType>('/')

export async function getMealPlans() {
  const response = await client.api['meal-plans'].$get()

  if (!response.ok) {
    await throwApiError(response, '献立を取得できませんでした')
  }

  return response.json()
}

export async function createMealPlan(input: CreateMealPlanInput) {
  const response = await client.api['meal-plans'].$post({ json: input })

  if (!response.ok) {
    await throwApiError(response, '献立を保存できませんでした')
  }

  return response.json()
}
