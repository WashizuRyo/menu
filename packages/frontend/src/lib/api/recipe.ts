import type { AppType } from '@menu/backend'
import { hc } from 'hono/client'

const client = hc<AppType>('/')

export async function getRecipes() {
  const response = await client.api.recipes.$get()

  if (!response.ok) {
    throw new Error('レシピを取得できませんでした')
  }

  return response.json()
}
