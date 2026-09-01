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
import { summarizeYoutube } from '../../lib/api/youtube'
import { routeTree } from '../../routeTree.gen'

vi.mock('../../lib/api/recipe', () => ({
  createRecipe: vi.fn(),
  getRecipes: vi.fn(),
}))

vi.mock('../../lib/api/youtube', () => ({
  summarizeYoutube: vi.fn(),
}))

const createRecipeMock = vi.mocked(createRecipe)
const getRecipesMock = vi.mocked(getRecipes)
const summarizeYoutubeMock = vi.mocked(summarizeYoutube)

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
    summarizeYoutubeMock.mockReset()
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

  describe('YouTube動画からの入力', () => {
    it('解析結果で入力済みのレシピ内容を置き換える', async () => {
      summarizeYoutubeMock.mockResolvedValue({
        name: '卵かけご飯',
        ingredients: [
          {
            name: '卵',
            quantity: { type: 'numeric', value: 1, unit: '個' },
          },
          {
            name: '醤油',
            quantity: { type: 'qualitative', value: '適量' },
          },
        ],
        instructions: ['ご飯に卵を割り入れる', '醤油をかけて混ぜる'],
      })
      const user = userEvent.setup()
      renderPage()

      await user.type(
        await screen.findByRole('textbox', { name: 'レシピ名' }),
        '入力済みの料理',
      )
      await user.type(
        screen.getByRole('textbox', { name: 'YouTube URL（任意）' }),
        'https://youtu.be/example',
      )
      await user.type(
        screen.getByRole('textbox', { name: '材料名' }),
        '古い材料',
      )
      await user.type(
        screen.getByRole('textbox', { name: '手順 1' }),
        '古い手順',
      )
      await user.click(screen.getByRole('button', { name: '動画から入力' }))

      expect(
        await screen.findByRole('textbox', { name: 'レシピ名' }),
      ).toHaveValue('卵かけご飯')
      expect(screen.getAllByRole('textbox', { name: '材料名' })).toHaveLength(2)
      expect(
        screen.getAllByRole('textbox', { name: /^手順 \d+$/ }),
      ).toHaveLength(2)
      expect(screen.queryByDisplayValue('古い材料')).not.toBeInTheDocument()
      expect(screen.queryByDisplayValue('古い手順')).not.toBeInTheDocument()
      expect(
        screen.getByRole('textbox', { name: 'YouTube URL（任意）' }),
      ).toHaveValue('https://youtu.be/example')
    })

    it('YouTube URLが空ならエラーを表示して動画を解析しない', async () => {
      const user = userEvent.setup()
      renderPage()

      await user.click(
        await screen.findByRole('button', { name: '動画から入力' }),
      )

      expect(
        await screen.findByText('YouTube URLを入力してください'),
      ).toBeInTheDocument()
      expect(summarizeYoutubeMock).not.toHaveBeenCalled()
    })

    it('解析に失敗したら理由を表示して入力内容を保持する', async () => {
      summarizeYoutubeMock.mockRejectedValue(
        new Error('料理動画ではないためレシピを作成できません'),
      )
      const user = userEvent.setup()
      renderPage()

      await user.type(
        await screen.findByRole('textbox', { name: 'レシピ名' }),
        '入力済みの料理',
      )
      await user.type(
        screen.getByRole('textbox', { name: 'YouTube URL（任意）' }),
        'https://youtu.be/example',
      )
      await user.type(
        screen.getByRole('textbox', { name: '材料名' }),
        '古い材料',
      )
      await user.click(screen.getByRole('button', { name: '動画から入力' }))

      expect(
        await screen.findByText('動画を解析できませんでした'),
      ).toBeInTheDocument()
      expect(
        screen.getByText('料理動画ではないためレシピを作成できません'),
      ).toBeInTheDocument()
      expect(screen.getByRole('textbox', { name: 'レシピ名' })).toHaveValue(
        '入力済みの料理',
      )
      expect(screen.getByRole('textbox', { name: '材料名' })).toHaveValue(
        '古い材料',
      )
    })

    it('解析中はレシピを保存できない', async () => {
      summarizeYoutubeMock.mockImplementation(() => new Promise(() => {}))
      const user = userEvent.setup()
      renderPage()

      await user.type(
        await screen.findByRole('textbox', { name: 'YouTube URL（任意）' }),
        'https://youtu.be/example',
      )
      await user.click(screen.getByRole('button', { name: '動画から入力' }))

      expect(
        screen.getByRole('button', { name: '動画から入力' }),
      ).toBeDisabled()
      expect(
        screen.getByRole('button', { name: 'レシピを保存' }),
      ).toBeDisabled()
    })
  })
})
