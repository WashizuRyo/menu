import { MealPlanId, mealPlanSchema, RecipeId } from '@menu/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as v from 'valibot'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMealPlan } from '../../lib/api/meal-plan'
import { getRecipes } from '../../lib/api/recipe'
import { routeTree } from '../../routeTree.gen'

vi.mock('../../lib/api/meal-plan', () => ({
  createMealPlan: vi.fn(),
}))

vi.mock('../../lib/api/recipe', () => ({
  getRecipes: vi.fn(),
}))

const createMealPlanMock = vi.mocked(createMealPlan)
const getRecipesMock = vi.mocked(getRecipes)
const recipeId = RecipeId.generate()

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  const router = createRouter({
    routeTree,
    scrollRestoration: false,
    history: createMemoryHistory({ initialEntries: ['/meal-plans/new'] }),
  })

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )

  return router
}

describe('新しい献立', () => {
  beforeEach(() => {
    createMealPlanMock.mockReset()
    getRecipesMock.mockResolvedValue({
      recipes: [
        {
          id: recipeId,
          name: '肉じゃが',
          ingredients: [],
          instructions: [],
          source: { type: 'manual' },
          createdAt: '2026-09-01T00:00:00.000Z',
          updatedAt: '2026-09-01T00:00:00.000Z',
        },
      ],
    })
    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      value: vi.fn(),
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('期間とレシピの割当を一括保存してレシピ一覧へ戻る', async () => {
    createMealPlanMock.mockResolvedValue({
      mealPlan: v.parse(mealPlanSchema, {
        id: MealPlanId.generate(),
        startDate: '2026-09-21',
        endDate: '2026-09-22',
        recipes: [
          {
            mealDate: '2026-09-21',
            mealType: 'dinner',
            recipeId,
          },
        ],
        createdAt: '2026-09-19T00:00:00.000Z',
        updatedAt: '2026-09-19T00:00:00.000Z',
      }),
    })
    const user = userEvent.setup()
    const router = renderPage()

    await user.type(
      await screen.findByRole('combobox', { name: '開始日' }),
      '2026-09-21',
    )
    await user.type(
      screen.getByRole('combobox', { name: '終了日' }),
      '2026-09-22',
    )
    await user.click(
      await screen.findByRole('combobox', { name: '2026-09-21 夕食' }),
    )
    await user.keyboard('{ArrowDown}{Enter}')
    await user.click(screen.getByRole('button', { name: '献立を保存' }))

    expect(createMealPlanMock.mock.calls[0]?.[0]).toEqual({
      startDate: '2026-09-21',
      endDate: '2026-09-22',
      recipes: [
        {
          mealDate: '2026-09-21',
          mealType: 'dinner',
          recipeId,
        },
      ],
    })
    expect(router.state.location.pathname).toBe('/recipes')
  })

  it('終了日は開始日より前の日付を選択できない', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(
      await screen.findByRole('combobox', { name: '開始日' }),
      '2026-09-21',
    )
    const endDateInput = screen.getByRole('combobox', { name: '終了日' })
    fireEvent.change(endDateInput, { target: { value: '2026-09-20' } })
    fireEvent.blur(endDateInput)

    expect(endDateInput).toHaveValue('')
  })

  it('開始日は終了日より後の日付を選択できない', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(
      await screen.findByRole('combobox', { name: '終了日' }),
      '2026-09-21',
    )
    const startDateInput = screen.getByRole('combobox', { name: '開始日' })
    fireEvent.change(startDateInput, { target: { value: '2026-09-22' } })
    fireEvent.blur(startDateInput)

    expect(startDateInput).toHaveValue('')
  })

  it('保存に失敗したら理由を表示して入力内容を保持する', async () => {
    createMealPlanMock.mockRejectedValue(new Error('通信に失敗しました'))
    const user = userEvent.setup()
    const router = renderPage()

    const startDateInput = await screen.findByRole('combobox', {
      name: '開始日',
    })
    const endDateInput = screen.getByRole('combobox', { name: '終了日' })
    await user.type(startDateInput, '2026-09-21')
    await user.type(endDateInput, '2026-09-22')
    await user.click(
      await screen.findByRole('combobox', { name: '2026-09-21 夕食' }),
    )
    await user.keyboard('{ArrowDown}{Enter}')
    await user.click(screen.getByRole('button', { name: '献立を保存' }))

    expect(
      await screen.findByText('献立を保存できませんでした'),
    ).toBeInTheDocument()
    expect(screen.getByText('通信に失敗しました')).toBeInTheDocument()
    expect(startDateInput).toHaveValue('2026-09-21')
    expect(endDateInput).toHaveValue('2026-09-22')
    expect(router.state.location.pathname).toBe('/meal-plans/new')
  })

  it('日付が未入力ならエラーを表示して保存しない', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: '献立を保存' }))

    expect(
      await screen.findAllByText('YYYY-MM-DD形式の日付を入力してください'),
    ).toHaveLength(2)
    expect(createMealPlanMock).not.toHaveBeenCalled()
  })

  it('レシピが未選択ならエラーを表示して保存しない', async () => {
    const user = userEvent.setup()
    renderPage()

    const startDateInput = await screen.findByRole('combobox', {
      name: '開始日',
    })
    const endDateInput = screen.getByRole('combobox', { name: '終了日' })
    fireEvent.change(startDateInput, { target: { value: '2026-09-21' } })
    fireEvent.change(endDateInput, { target: { value: '2026-09-22' } })
    fireEvent.blur(endDateInput)
    await screen.findByRole('combobox', { name: '2026-09-21 夕食' })
    await user.click(screen.getByRole('button', { name: '献立を保存' }))

    expect(
      await screen.findByText('レシピを1件以上選択してください'),
    ).toBeInTheDocument()
    expect(createMealPlanMock).not.toHaveBeenCalled()
  })

  it('レシピ一覧の取得に失敗したらエラー画面を表示する', async () => {
    getRecipesMock.mockRejectedValue(new Error('通信に失敗しました'))
    renderPage()

    expect(
      await screen.findByText('献立作成画面を表示できませんでした'),
    ).toBeInTheDocument()
    expect(screen.getByText('通信に失敗しました')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '再試行' })).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: '新しい献立' }),
    ).not.toBeInTheDocument()
  })
})
