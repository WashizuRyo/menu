import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import {
  HStack,
  Layout,
  LayoutContent,
  Section,
  VStack,
} from '@astryxdesign/core/Layout'
import { Link } from '@astryxdesign/core/Link'
import { List, ListItem } from '@astryxdesign/core/List'
import { Spinner } from '@astryxdesign/core/Spinner'
import { Heading, Text } from '@astryxdesign/core/Text'
import { Timestamp } from '@astryxdesign/core/Timestamp'
import type { RecipeIngredient, RecipeIngredientQuantity } from '@menu/shared'
import { useQuery } from '@tanstack/react-query'
import { Navigate, Route, Routes } from 'react-router-dom'
import { getRecipes } from './lib/api/recipe'

function formatQuantity(quantity: RecipeIngredientQuantity): string {
  if (quantity.type === 'numeric') {
    return `${quantity.value}${quantity.unit}`
  }

  if (quantity.type === 'range') {
    return `${quantity.min}〜${quantity.max}${quantity.unit}`
  }

  return quantity.value
}

function formatIngredients(ingredients: RecipeIngredient[]): string {
  return ingredients
    .map(
      (ingredient) =>
        `${ingredient.name}：${formatQuantity(ingredient.quantity)}`,
    )
    .join('、')
}

function RecipesPage() {
  const recipes = useQuery({
    queryKey: ['recipes'],
    queryFn: getRecipes,
  })

  return (
    <Layout
      height="auto"
      contentWidth={960}
      padding={6}
      content={
        <LayoutContent role="main">
          <VStack gap={6}>
            <VStack gap={2}>
              <Heading level={1}>レシピ</Heading>
              <Text color="secondary">
                材料を眺めながら、次につくる一品を選びましょう。
              </Text>
            </VStack>

            {recipes.isPending ? (
              <Section padding={6} aria-live="polite">
                <Spinner label="レシピを読み込み中…" />
              </Section>
            ) : recipes.isError ? (
              <Banner
                status="error"
                title="レシピを取得できませんでした"
                description={recipes.error.message}
                endContent={
                  <Button
                    label="再読み込み"
                    size="sm"
                    variant="secondary"
                    onClick={() => void recipes.refetch()}
                  />
                }
              />
            ) : recipes.data.recipes.length === 0 ? (
              <EmptyState
                title="レシピがありません"
                description="APIにレシピが登録されるとここに表示されます。"
                actions={
                  <Button
                    label="再読み込み"
                    variant="secondary"
                    onClick={() => void recipes.refetch()}
                  />
                }
              />
            ) : (
              <Section padding={0}>
                <List
                  header={
                    <Heading level={2}>
                      {recipes.data.recipes.length}件のレシピ
                    </Heading>
                  }
                  hasDividers
                  density="spacious"
                >
                  {recipes.data.recipes.map((recipe) => (
                    <ListItem
                      key={recipe.id}
                      label={recipe.name}
                      description={
                        <VStack gap={2}>
                          <Text color="secondary" maxLines={2}>
                            {formatIngredients(recipe.ingredients)}
                          </Text>
                          <HStack gap={3} wrap="wrap">
                            <Text type="supporting">
                              {recipe.instructions.length}ステップ
                            </Text>
                            {recipe.source.type === 'manual' ? (
                              <Text type="supporting">手入力</Text>
                            ) : (
                              <Link
                                href={recipe.source.url}
                                isExternalLink
                                isStandalone
                                size="sm"
                              >
                                YouTubeで見る
                              </Link>
                            )}
                          </HStack>
                        </VStack>
                      }
                      endContent={
                        <VStack gap={0.5} hAlign="end">
                          <Text type="supporting">更新</Text>
                          <Timestamp value={recipe.updatedAt} format="auto" />
                        </VStack>
                      }
                    />
                  ))}
                </List>
              </Section>
            )}
          </VStack>
        </LayoutContent>
      }
    />
  )
}

export function App() {
  return (
    <Routes>
      <Route path="/recipes" element={<RecipesPage />} />
      <Route path="*" element={<Navigate to="/recipes" replace />} />
    </Routes>
  )
}
