import { type CreateRecipeInput, type Recipe, RecipeId } from '@menu/shared'
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
    const id = RecipeId.generate()
    const env = await worker.getEnv()
    await env.DB.prepare(
      `INSERT INTO recipes (
        id,
        name,
        ingredients,
        instructions,
        source,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        id,
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
          id,
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

describe('POST /api/recipes', () => {
  const validCreateRecipeInput = {
    name: '味噌汁',
    ingredients: [
      { name: '豆腐', quantity: { type: 'numeric', value: 1, unit: '丁' } },
    ],
    instructions: ['だしを沸かす', '豆腐と味噌を加える'],
    source: { type: 'manual' },
  } satisfies CreateRecipeInput

  test('レシピを作成して返す', async () => {
    const response = await server.fetch('/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validCreateRecipeInput),
    })

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({
      recipe: {
        id: expect.stringMatching(/^rcp_[0-9A-Za-z]{16}$/),
        name: '味噌汁',
        ingredients: [
          {
            name: '豆腐',
            quantity: { type: 'numeric', value: 1, unit: '丁' },
          },
        ],
        instructions: ['だしを沸かす', '豆腐と味噌を加える'],
        source: { type: 'manual' },
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      },
    })
  })

  test('不正な入力の場合は400を返す', async () => {
    const response = await server.fetch('/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...validCreateRecipeInput,
        name: '',
      }),
    })

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'validation failed' })
  })

  test('リクエストボディが256 KiBを超える場合は413を返す', async () => {
    const response = await server.fetch('/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...validCreateRecipeInput,
        name: 'a'.repeat(256 * 1024),
      }),
    })

    expect(response.status).toBe(413)
    expect(await response.json()).toEqual({ error: 'request too large' })
  })

  test('不正なJSONの場合は400を返す', async () => {
    const response = await server.fetch('/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{',
    })

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'Invalid JSON' })
  })
})

describe('POST /api/meal-plans', () => {
  test('献立を作成して返す', async () => {
    const recipeId = RecipeId.generate()
    const env = await worker.getEnv()
    await env.DB.prepare(
      `INSERT INTO recipes (
        id,
        name,
        ingredients,
        instructions,
        source
      ) VALUES (?, ?, ?, ?, ?)`,
    )
      .bind(
        recipeId,
        '味噌汁',
        JSON.stringify([
          { name: '豆腐', quantity: { type: 'numeric', value: 1, unit: '丁' } },
        ]),
        JSON.stringify(['だしを沸かす', '豆腐と味噌を加える']),
        JSON.stringify({ type: 'manual' }),
      )
      .run()

    const response = await server.fetch('/api/meal-plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startDate: '2026-09-07',
        endDate: '2026-09-13',
        recipes: [
          {
            mealDate: '2026-09-07',
            mealType: 'dinner',
            recipeId,
          },
        ],
      }),
    })

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({
      mealPlan: {
        id: expect.stringMatching(/^mpln_[0-9A-Za-z]{16}$/),
        startDate: '2026-09-07',
        endDate: '2026-09-13',
        recipes: [
          {
            mealDate: '2026-09-07',
            mealType: 'dinner',
            recipeId,
          },
        ],
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      },
    })
  })

  test('レシピが未割り当てでも献立を作成できる', async () => {
    const response = await server.fetch('/api/meal-plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startDate: '2026-09-07',
        endDate: '2026-09-13',
        recipes: [],
      }),
    })

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({
      mealPlan: {
        id: expect.stringMatching(/^mpln_[0-9A-Za-z]{16}$/),
        startDate: '2026-09-07',
        endDate: '2026-09-13',
        recipes: [],
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      },
    })
  })

  test('存在しないレシピは割り当てられない', async () => {
    const response = await server.fetch('/api/meal-plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startDate: '2026-09-07',
        endDate: '2026-09-13',
        recipes: [
          {
            mealDate: '2026-09-07',
            mealType: 'dinner',
            recipeId: RecipeId.generate(),
          },
        ],
      }),
    })

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'validation failed' })
  })

  test('献立期間外の日付にはレシピを割り当てられない', async () => {
    const response = await server.fetch('/api/meal-plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startDate: '2026-09-07',
        endDate: '2026-09-13',
        recipes: [
          {
            mealDate: '2026-09-14',
            mealType: 'dinner',
            recipeId: RecipeId.generate(),
          },
        ],
      }),
    })

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'validation failed' })
  })

  test('リクエストボディが256 KiBを超える場合は413を返す', async () => {
    const response = await server.fetch('/api/meal-plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startDate: 'a'.repeat(256 * 1024),
        endDate: '2026-09-13',
        recipes: [],
      }),
    })

    expect(response.status).toBe(413)
    expect(await response.json()).toEqual({ error: 'request too large' })
  })

  test('不正なJSONの場合は400を返す', async () => {
    const response = await server.fetch('/api/meal-plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{',
    })

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'Invalid JSON' })
  })

  test('献立の保存に失敗した場合は500を返す', async () => {
    const env = await worker.getEnv()
    await env.DB.exec('DROP TABLE meal_plan_recipes')

    const response = await server.fetch('/api/meal-plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startDate: '2026-09-07',
        endDate: '2026-09-13',
        recipes: [],
      }),
    })

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'Internal Server Error' })
  })
})
