import type { Recipe } from '@menu/shared'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from 'vitest'
import { createTestHarness } from 'wrangler'

const server = createTestHarness({
  root: `${import.meta.dirname}/..`,
  workers: [{ configPath: 'wrangler.test.jsonc' }],
})

const worker = server.getWorker<CloudflareBindings>()

beforeAll(async () => {
  await server.listen()
})

beforeEach(async () => {
  await worker.applyD1Migrations('DB')
})

afterEach(async () => {
  await server.reset()
})

afterAll(async () => {
  await server.close()
})

describe('GET /api/recipes', () => {
  test('登録されているレシピを返す', async () => {
    const env = await worker.getEnv()
    await env.DB.prepare(
      `INSERT INTO recipes (
        name,
        ingredients,
        instructions,
        source,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        '味噌汁',
        JSON.stringify([
          { name: '豆腐', quantity: { type: 'numeric', value: 1, unit: '丁' } },
        ]),
        JSON.stringify(['だしを沸かす', '豆腐と味噌を加える']),
        JSON.stringify({ type: 'manual' }),
        1_700_000_000,
        1_700_000_100,
      )
      .run()

    const response = await server.fetch('/api/recipes')
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      recipes: [
        {
          id: 1,
          name: '味噌汁',
          ingredients: [
            {
              name: '豆腐',
              quantity: { type: 'numeric', value: 1, unit: '丁' },
            },
          ],
          instructions: ['だしを沸かす', '豆腐と味噌を加える'],
          source: { type: 'manual' },
          createdAt: '2023-11-14T22:13:20.000Z',
          updatedAt: '2023-11-14T22:15:00.000Z',
        },
      ],
    } satisfies { recipes: Recipe[] })
  })

  test('レシピが登録されていない場合は空配列を返す', async () => {
    const response = await server.fetch('/api/recipes')

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ recipes: [] })
  })

  test('DBからの取得に失敗した場合は500を返す', async () => {
    const env = await worker.getEnv()
    await env.DB.exec('DROP TABLE recipes')

    const response = await server.fetch('/api/recipes')

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'Internal Server Error' })
  })
})
