import type { AppType } from '@menu/backend'
import { hc } from 'hono/client'

const client = hc<AppType>('/')

export async function summarizeYoutube(url: string) {
  const response = await client.api.youtube.summarize.$post({ json: { url } })

  if (!response.ok) {
    const body = await response.json()
    throw new Error(
      'error' in body ? body.error : 'YouTube動画を解析できませんでした',
    )
  }

  return response.json()
}
