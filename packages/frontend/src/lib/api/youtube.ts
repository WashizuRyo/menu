import type { AppType } from '@menu/backend'
import { hc } from 'hono/client'
import { throwApiError } from './error.js'

const client = hc<AppType>('/')

export async function summarizeYoutube(url: string) {
  const response = await client.api.youtube.summarize.$post({ json: { url } })

  if (!response.ok) {
    await throwApiError(response, 'YouTube動画を解析できませんでした')
  }

  return response.json()
}
