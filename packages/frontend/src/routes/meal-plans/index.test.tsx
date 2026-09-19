import { MealPlanId, RecipeId } from '@menu/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getMealPlans } from '../../lib/api/meal-plan'
import { routeTree } from '../../routeTree.gen'

vi.mock('../../lib/api/meal-plan', () => ({
  getMealPlans: vi.fn(),
}))

const getMealPlansMock = vi.mocked(getMealPlans)

function renderPage() {
  Object.defineProperty(window, 'scrollTo', {
    configurable: true,
    value: () => undefined,
  })

  const router = createRouter({
    routeTree,
    scrollRestoration: false,
    history: createMemoryHistory({ initialEntries: ['/meal-plans'] }),
  })

  render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false } },
        })
      }
    >
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

describe('献立一覧', () => {
  beforeEach(() => {
    getMealPlansMock.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('一覧ページの見出しを表示する', async () => {
    getMealPlansMock.mockResolvedValue({ mealPlans: [] })
    renderPage()

    expect(
      await screen.findByRole('heading', { name: '献立' }),
    ).toBeInTheDocument()
    expect(screen.getByText('献立がありません')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '献立を作成' })).toBeInTheDocument()
  })

  it('登録済み献立を日付と朝昼夕の表で表示する', async () => {
    const recipeId = RecipeId.generate()
    getMealPlansMock.mockResolvedValue({
      mealPlans: [
        {
          id: MealPlanId.generate(),
          startDate: '2026-09-21',
          endDate: '2026-09-22',
          recipes: [
            {
              mealDate: '2026-09-21',
              mealType: 'dinner',
              recipeId,
              recipeName: '肉じゃが',
            },
          ],
          createdAt: '2026-09-19T00:00:00.000Z',
          updatedAt: '2026-09-19T00:00:00.000Z',
        },
      ],
    })

    renderPage()

    expect(await screen.findByText('2026-09-21')).toBeInTheDocument()
    expect(screen.getByText('2026-09-22')).toBeInTheDocument()
    expect(screen.getByText('肉じゃが')).toBeInTheDocument()
    expect(screen.getAllByText('未設定')).toHaveLength(5)
    expect(
      screen.getByRole('columnheader', { name: '朝食' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: '昼食' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: '夕食' }),
    ).toBeInTheDocument()
  })

  it('取得に失敗したら再試行できるエラーを表示する', async () => {
    getMealPlansMock
      .mockRejectedValueOnce(new Error('通信に失敗しました'))
      .mockResolvedValue({ mealPlans: [] })

    renderPage()

    expect(
      await screen.findByText('献立画面を表示できませんでした'),
    ).toBeInTheDocument()
    expect(screen.getByText('通信に失敗しました')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '再試行' }))

    expect(await screen.findByText('献立がありません')).toBeInTheDocument()
    expect(getMealPlansMock).toHaveBeenCalledTimes(2)
  })
})
