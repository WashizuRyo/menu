import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRecipe, getRecipes } from '../../lib/api/recipe'
import { routeTree } from '../../routeTree.gen'

vi.mock('../../lib/api/recipe', () => ({
  createRecipe: vi.fn(),
  getRecipes: vi.fn(),
}))

const createRecipeMock = vi.mocked(createRecipe)
const getRecipesMock = vi.mocked(getRecipes)

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  const router = createRouter({
    routeTree,
    scrollRestoration: false,
    history: createMemoryHistory({ initialEntries: ['/recipes/new'] }),
  })

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )

  return router
}

describe('新しいレシピ', () => {
  beforeEach(() => {
    createRecipeMock.mockReset()
    getRecipesMock.mockResolvedValue({ recipes: [] })
    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      value: vi.fn(),
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('入力したレシピを保存して一覧へ戻る', async () => {
    createRecipeMock.mockResolvedValue({
      recipe: {
        id: 1,
        name: '肉じゃが',
        ingredients: [
          {
            name: 'じゃがいも',
            quantity: { type: 'numeric', value: 1, unit: 'g' },
          },
        ],
        instructions: ['煮込む'],
        source: { type: 'manual' },
        createdAt: '2026-08-31T00:00:00.000Z',
        updatedAt: '2026-08-31T00:00:00.000Z',
      },
    })
    const user = userEvent.setup()
    const router = renderPage()
    await user.type(
      await screen.findByRole('textbox', { name: 'レシピ名' }),
      '肉じゃが',
    )
    await user.type(
      screen.getByRole('textbox', { name: '材料名' }),
      'じゃがいも',
    )
    await user.type(screen.getByRole('textbox', { name: '手順 1' }), '煮込む')
    await user.click(
      await screen.findByRole('button', { name: 'レシピを保存' }),
    )

    expect(createRecipeMock.mock.calls[0]?.[0]).toEqual({
      name: '肉じゃが',
      ingredients: [
        {
          name: 'じゃがいも',
          quantity: { type: 'numeric', value: 1, unit: 'g' },
        },
      ],
      instructions: ['煮込む'],
      source: { type: 'manual' },
    })
    expect(router.state.location.pathname).toBe('/recipes')
  })

  it('必須項目が未入力ならエラーを表示して保存しない', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(
      await screen.findByRole('button', { name: 'レシピを保存' }),
    )

    expect(
      await screen.findByText('レシピ名を入力してください'),
    ).toBeInTheDocument()
    expect(screen.getByText('材料名を入力してください')).toBeInTheDocument()
    expect(screen.getByText('手順を入力してください')).toBeInTheDocument()
    expect(createRecipeMock).not.toHaveBeenCalled()
  })

  it('YouTube URLを入力するとレシピのソースとして保存する', async () => {
    createRecipeMock.mockResolvedValue({
      recipe: {
        id: 1,
        name: '肉じゃが',
        ingredients: [
          {
            name: 'じゃがいも',
            quantity: { type: 'numeric', value: 1, unit: 'g' },
          },
        ],
        instructions: ['煮込む'],
        source: { type: 'youtube', url: 'https://youtu.be/example' },
        createdAt: '2026-08-31T00:00:00.000Z',
        updatedAt: '2026-08-31T00:00:00.000Z',
      },
    })
    const user = userEvent.setup()
    const router = renderPage()
    await user.type(
      await screen.findByRole('textbox', { name: 'レシピ名' }),
      '肉じゃが',
    )
    await user.type(
      await screen.findByRole('textbox', { name: 'YouTube URL（任意）' }),
      'https://youtu.be/example',
    )
    await user.type(
      screen.getByRole('textbox', { name: '材料名' }),
      'じゃがいも',
    )
    await user.type(screen.getByRole('textbox', { name: '手順 1' }), '煮込む')
    await user.click(
      await screen.findByRole('button', { name: 'レシピを保存' }),
    )

    expect(createRecipeMock.mock.calls[0]?.[0].source).toEqual({
      type: 'youtube',
      url: 'https://youtu.be/example',
    })
    expect(router.state.location.pathname).toBe('/recipes')
  })

  it('YouTube URLを空にするとレシピのソースがmanualとして保存する', async () => {
    createRecipeMock.mockResolvedValue({
      recipe: {
        id: 1,
        name: '肉じゃが',
        ingredients: [
          {
            name: 'じゃがいも',
            quantity: { type: 'numeric', value: 1, unit: 'g' },
          },
        ],
        instructions: ['煮込む'],
        source: { type: 'manual' },
        createdAt: '2026-08-31T00:00:00.000Z',
        updatedAt: '2026-08-31T00:00:00.000Z',
      },
    })
    const user = userEvent.setup()
    const router = renderPage()
    await user.type(
      await screen.findByRole('textbox', { name: 'レシピ名' }),
      '肉じゃが',
    )
    const youtubeUrlInput = await screen.findByRole('textbox', {
      name: 'YouTube URL（任意）',
    })
    await user.type(youtubeUrlInput, 'https://youtu.be/example')
    await user.clear(youtubeUrlInput)
    await user.type(
      screen.getByRole('textbox', { name: '材料名' }),
      'じゃがいも',
    )
    await user.type(screen.getByRole('textbox', { name: '手順 1' }), '煮込む')
    await user.click(
      await screen.findByRole('button', { name: 'レシピを保存' }),
    )

    expect(createRecipeMock.mock.calls[0]?.[0].source).toEqual({
      type: 'manual',
    })
    expect(router.state.location.pathname).toBe('/recipes')
  })

  it('保存に失敗したらエラーメッセージを表示する', async () => {
    createRecipeMock.mockRejectedValue(new Error('通信に失敗しました'))
    const user = userEvent.setup()
    const router = renderPage()
    await user.type(
      await screen.findByRole('textbox', { name: 'レシピ名' }),
      '肉じゃが',
    )
    await user.type(
      screen.getByRole('textbox', { name: '材料名' }),
      'じゃがいも',
    )
    await user.type(screen.getByRole('textbox', { name: '手順 1' }), '煮込む')
    await user.click(screen.getByRole('button', { name: 'レシピを保存' }))

    expect(
      await screen.findByText('レシピを保存できませんでした'),
    ).toBeInTheDocument()
    expect(screen.getByText('通信に失敗しました')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/recipes/new')
  })
})
