import { generateText } from 'ai'
import { describe, expect, test, vi } from 'vitest'
import app, { type YoutubeSummary } from './youtube.js'

vi.mock('ai', () => ({
  generateText: vi.fn(),
  Output: { object: vi.fn() },
}))

const generateTextMock = vi.mocked(generateText)

describe('POST /api/youtube/summarize', () => {
  test('YouTube URL以外は400を返す', async () => {
    const response = await app.request(
      '/summarize',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com/video' }),
      },
      {},
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'validation failed' })
  })

  test('Gemini APIキー未設定時は503を返す', async () => {
    const response = await app.request(
      '/summarize',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://www.youtube.com/watch?v=test' }),
      },
      {},
    )

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({
      error: 'Gemini API key is not configured',
    })
  })

  test('リクエストボディが16 KiBを超える場合は413を返す', async () => {
    const response = await app.request(
      '/summarize',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: `https://youtu.be/${'a'.repeat(16 * 1024)}`,
        }),
      },
      {},
    )

    expect(response.status).toBe(413)
    expect(await response.json()).toEqual({ error: 'request too large' })
  })

  test('料理動画ではない場合は422を返す', async () => {
    generateTextMock.mockResolvedValueOnce({
      output: {
        isRecipeVideo: false,
        title: '',
        ingredients: [],
        instructions: [],
      } satisfies YoutubeSummary,
    } as Awaited<ReturnType<typeof generateText>>)

    const response = await app.request(
      '/summarize',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://www.youtube.com/watch?v=test' }),
      },
      { GEMINI_API_KEY: 'test-api-key' },
    )

    expect(response.status).toBe(422)
    expect(await response.json()).toEqual({
      error: '料理動画ではないためレシピを作成できません',
    })
  })

  test('料理動画から抽出したレシピを返す', async () => {
    generateTextMock.mockResolvedValueOnce({
      output: {
        isRecipeVideo: true,
        title: '卵かけご飯',
        ingredients: [
          {
            name: '卵',
            quantity: {
              numeric: { type: 'numeric', value: 1, unit: '個' },
              range: null,
              qualitative: null,
            },
          },
        ],
        instructions: ['ご飯に卵を割り入れる', '醤油をかけて混ぜる'],
      } satisfies YoutubeSummary,
    } as Awaited<ReturnType<typeof generateText>>)

    const response = await app.request(
      '/summarize',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://www.youtube.com/watch?v=test' }),
      },
      { GEMINI_API_KEY: 'test-api-key' },
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      name: '卵かけご飯',
      ingredients: [
        {
          name: '卵',
          quantity: { type: 'numeric', value: 1, unit: '個' },
        },
      ],
      instructions: ['ご飯に卵を割り入れる', '醤油をかけて混ぜる'],
    })
  })
})
