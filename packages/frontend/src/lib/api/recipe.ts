import type { AppType } from '@menu/backend'
import type { CreateRecipeInput } from '@menu/shared'
import { hc } from 'hono/client'

const client = hc<AppType>('/')

export async function getRecipes() {
  const response = await client.api.recipes.$get()

  if (!response.ok) {
    throw new Error('レシピを取得できませんでした')
  }

  return response.json()
}

export async function createRecipe(input: CreateRecipeInput) {
  const response = await client.api.recipes.$post({ json: input })

  if (!response.ok) {
    throw new Error('レシピを保存できませんでした')
  }

  return response.json()
}
