import {
  type CreateRecipeInput,
  MealPlanId,
  type Recipe,
  RecipeId,
} from '@menu/shared'
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

describe('GET /api/meal-plans', () => {
  test('献立が登録されていない場合は空配列を返す', async () => {
    const response = await server.fetch('/api/meal-plans')

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ mealPlans: [] })
  })

  test('献立と割り当てられたレシピ名を返す', async () => {
    const mealPlanId = MealPlanId.generate()
    const recipeId = RecipeId.generate()
    const env = await worker.getEnv()

    await env.DB.prepare(
      `INSERT INTO recipes (id, name, ingredients, instructions, source)
       VALUES (?, ?, ?, ?, ?)`,
    )
      .bind(
        recipeId,
        '味噌汁',
        JSON.stringify([]),
        JSON.stringify([]),
        JSON.stringify({ type: 'manual' }),
      )
      .run()
    await env.DB.prepare(
      `INSERT INTO meal_plans (id, start_date, end_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
      .bind(
        mealPlanId,
        '2026-09-07',
        '2026-09-13',
        1_700_000_000,
        1_700_000_100,
      )
      .run()
    await env.DB.prepare(
      `INSERT INTO meal_plan_recipes (
        meal_plan_db_id, meal_date, meal_type, recipe_db_id
      )
      SELECT meal_plans.db_id, ?, ?, recipes.db_id
      FROM meal_plans CROSS JOIN recipes
      WHERE meal_plans.id = ? AND recipes.id = ?`,
    )
      .bind('2026-09-07', 'dinner', mealPlanId, recipeId)
      .run()

    const response = await server.fetch('/api/meal-plans')

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      mealPlans: [
        {
          id: mealPlanId,
          startDate: '2026-09-07',
          endDate: '2026-09-13',
          recipes: [
            {
              mealDate: '2026-09-07',
              mealType: 'dinner',
              recipeId,
              recipeName: '味噌汁',
            },
          ],
          createdAt: '2023-11-14T22:13:20.000Z',
          updatedAt: '2023-11-14T22:15:00.000Z',
        },
      ],
    })
  })

  test('開始日の新しい献立を先に、献立内のレシピを日付と朝昼夕順に返す', async () => {
    const env = await worker.getEnv()
    const dinnerRecipeId = RecipeId.generate()
    const breakfastRecipeId = RecipeId.generate()
    const lunchRecipeId = RecipeId.generate()
    const olderPlanId = MealPlanId.generate()
    const newerPlanId = MealPlanId.generate()

    await env.DB.prepare(
      `INSERT INTO recipes (id, name, ingredients, instructions, source)
       VALUES (?, ?, ?, ?, ?), (?, ?, ?, ?, ?), (?, ?, ?, ?, ?)`,
    )
      .bind(
        dinnerRecipeId,
        '夕食',
        JSON.stringify([]),
        JSON.stringify([]),
        JSON.stringify({ type: 'manual' }),
        breakfastRecipeId,
        '朝食',
        JSON.stringify([]),
        JSON.stringify([]),
        JSON.stringify({ type: 'manual' }),
        lunchRecipeId,
        '昼食',
        JSON.stringify([]),
        JSON.stringify([]),
        JSON.stringify({ type: 'manual' }),
      )
      .run()
    await env.DB.prepare(
      `INSERT INTO meal_plans (id, start_date, end_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?), (?, ?, ?, ?, ?)`,
    )
      .bind(
        olderPlanId,
        '2026-09-01',
        '2026-09-07',
        1_700_000_300,
        1_700_000_300,
        newerPlanId,
        '2026-09-14',
        '2026-09-20',
        1_700_000_200,
        1_700_000_200,
      )
      .run()

    await env.DB.prepare(
      `INSERT INTO meal_plan_recipes (
        meal_plan_db_id, meal_date, meal_type, recipe_db_id
      )
      SELECT meal_plans.db_id, ?, ?, recipes.db_id
      FROM meal_plans CROSS JOIN recipes
      WHERE meal_plans.id = ? AND recipes.id = ?`,
    )
      .bind('2026-09-15', 'dinner', newerPlanId, dinnerRecipeId)
      .run()
    await env.DB.prepare(
      `INSERT INTO meal_plan_recipes (
        meal_plan_db_id, meal_date, meal_type, recipe_db_id
      )
      SELECT meal_plans.db_id, ?, ?, recipes.db_id
      FROM meal_plans CROSS JOIN recipes
      WHERE meal_plans.id = ? AND recipes.id = ?`,
    )
      .bind('2026-09-14', 'lunch', newerPlanId, lunchRecipeId)
      .run()
    await env.DB.prepare(
      `INSERT INTO meal_plan_recipes (
        meal_plan_db_id, meal_date, meal_type, recipe_db_id
      )
      SELECT meal_plans.db_id, ?, ?, recipes.db_id
      FROM meal_plans CROSS JOIN recipes
      WHERE meal_plans.id = ? AND recipes.id = ?`,
    )
      .bind('2026-09-14', 'breakfast', newerPlanId, breakfastRecipeId)
      .run()
    await env.DB.prepare(
      `INSERT INTO meal_plan_recipes (
        meal_plan_db_id, meal_date, meal_type, recipe_db_id
      )
      SELECT meal_plans.db_id, ?, ?, recipes.db_id
      FROM meal_plans CROSS JOIN recipes
      WHERE meal_plans.id = ? AND recipes.id = ?`,
    )
      .bind('2026-09-01', 'dinner', olderPlanId, dinnerRecipeId)
      .run()

    const response = await server.fetch('/api/meal-plans')

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      mealPlans: [
        {
          id: newerPlanId,
          startDate: '2026-09-14',
          endDate: '2026-09-20',
          recipes: [
            {
              mealDate: '2026-09-14',
              mealType: 'breakfast',
              recipeId: breakfastRecipeId,
              recipeName: '朝食',
            },
            {
              mealDate: '2026-09-14',
              mealType: 'lunch',
              recipeId: lunchRecipeId,
              recipeName: '昼食',
            },
            {
              mealDate: '2026-09-15',
              mealType: 'dinner',
              recipeId: dinnerRecipeId,
              recipeName: '夕食',
            },
          ],
          createdAt: '2023-11-14T22:16:40.000Z',
          updatedAt: '2023-11-14T22:16:40.000Z',
        },
        {
          id: olderPlanId,
          startDate: '2026-09-01',
          endDate: '2026-09-07',
          recipes: [
            {
              mealDate: '2026-09-01',
              mealType: 'dinner',
              recipeId: dinnerRecipeId,
              recipeName: '夕食',
            },
          ],
          createdAt: '2023-11-14T22:18:20.000Z',
          updatedAt: '2023-11-14T22:18:20.000Z',
        },
      ],
    })
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
            recipeName: '味噌汁',
          },
        ],
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      },
    })
  })

  test('レシピが未割り当ての献立は作成できない', async () => {
    const env = await worker.getEnv()
    const response = await server.fetch('/api/meal-plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startDate: '2026-09-07',
        endDate: '2026-09-13',
        recipes: [],
      }),
    })

    const mealPlanCount = await env.DB.prepare(
      'SELECT count(*) AS value FROM meal_plans',
    ).first<{ value: number }>()

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'validation failed' })
    expect(mealPlanCount?.value).toBe(0)
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
            mealDate: '2026-09-14',
            mealType: 'dinner',
            recipeId,
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
        JSON.stringify([]),
        JSON.stringify([]),
        JSON.stringify({ type: 'manual' }),
      )
      .run()
    await env.DB.exec('DROP TABLE meal_plan_recipes')

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

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'Internal Server Error' })
  })
})
