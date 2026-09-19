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
import { Spinner } from '@astryxdesign/core/Spinner'
import { proportional, Table } from '@astryxdesign/core/Table'
import { Heading, Text } from '@astryxdesign/core/Text'
import type { ISODateString, MealPlan, MealType, RecipeId } from '@menu/shared'
import { isoDateStringSchema, MEAL_TYPES } from '@menu/shared'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import type { ErrorComponentProps } from '@tanstack/react-router'
import { createFileRoute } from '@tanstack/react-router'
import { parse } from 'valibot'
import { getMealPlans } from '../../lib/api/meal-plan'

export const Route = createFileRoute('/meal-plans/')({
  component: MealPlansPage,
  pendingComponent: MealPlansPending,
  errorComponent: MealPlansError,
})

interface MealPlanTableRow extends Record<string, unknown> {
  mealDate: ISODateString
  recipes: Record<MealType, { id: RecipeId; name: string }[]>
}

function getMealTypeLabel(mealType: MealType): string {
  switch (mealType) {
    case 'breakfast':
      return '朝食'
    case 'lunch':
      return '昼食'
    case 'dinner':
      return '夕食'
    default: {
      const exhaustiveMealType: never = mealType
      throw new Error(`未対応の食事区分です: ${exhaustiveMealType}`)
    }
  }
}

function toRows(mealPlan: MealPlan): MealPlanTableRow[] {
  const rows: MealPlanTableRow[] = []
  const currentDate = new Date(`${mealPlan.startDate}T00:00:00.000Z`)
  const lastDate = new Date(`${mealPlan.endDate}T00:00:00.000Z`)

  while (currentDate <= lastDate) {
    const mealDate = parse(
      isoDateStringSchema,
      currentDate.toISOString().slice(0, 10),
    )
    const getRecipes = (mealType: MealType) =>
      mealPlan.recipes
        .filter(
          (recipe) =>
            recipe.mealDate === mealDate && recipe.mealType === mealType,
        )
        .map((recipe) => ({ id: recipe.recipeId, name: recipe.recipeName }))

    rows.push({
      mealDate,
      recipes: {
        breakfast: getRecipes('breakfast'),
        lunch: getRecipes('lunch'),
        dinner: getRecipes('dinner'),
      },
    })

    currentDate.setUTCDate(currentDate.getUTCDate() + 1)
  }

  return rows
}

function MealPlansPage() {
  return (
    <Layout
      height="auto"
      contentWidth={960}
      padding={6}
      content={
        <LayoutContent role="main">
          <MealPlansContent />
        </LayoutContent>
      }
    />
  )
}

function MealPlansContent() {
  const mealPlans = useSuspenseQuery({
    queryKey: ['meal-plans'],
    queryFn: getMealPlans,
  })

  return (
    <VStack gap={6}>
      <HStack gap={4} hAlign="between" wrap="wrap">
        <VStack gap={2}>
          <Heading level={1}>献立</Heading>
          <Text color="secondary">作成した献立を日付ごとに確認できます。</Text>
        </VStack>
        <Button label="新しい献立" variant="primary" href="/meal-plans/new" />
      </HStack>

      {mealPlans.data.mealPlans.length === 0 ? (
        <EmptyState
          title="献立がありません"
          description="献立を作成すると、ここに日付ごとの食事が表示されます。"
          actions={
            <Button
              label="献立を作成"
              variant="primary"
              href="/meal-plans/new"
            />
          }
        />
      ) : (
        <VStack gap={6}>
          {mealPlans.data.mealPlans.map((mealPlan) => (
            <VStack key={mealPlan.id} gap={3}>
              <Heading level={2}>
                {mealPlan.startDate}〜{mealPlan.endDate}
              </Heading>
              <Section padding={0}>
                <Table
                  data={toRows(mealPlan)}
                  columns={[
                    {
                      key: 'mealDate',
                      header: '日付',
                      width: proportional(1),
                      renderCell: (row) => (
                        <Text weight="semibold">{row.mealDate}</Text>
                      ),
                    },
                    ...MEAL_TYPES.map((mealType) => ({
                      key: mealType,
                      header: getMealTypeLabel(mealType),
                      width: proportional(1),
                      renderCell: (row: MealPlanTableRow) =>
                        row.recipes[mealType].length > 0 ? (
                          <VStack gap={1}>
                            {row.recipes[mealType].map(({ id, name }) => (
                              <Text key={id}>{name}</Text>
                            ))}
                          </VStack>
                        ) : (
                          <Text color="secondary">未設定</Text>
                        ),
                    })),
                  ]}
                  idKey="mealDate"
                  dividers="grid"
                  verticalAlign="middle"
                />
              </Section>
            </VStack>
          ))}
        </VStack>
      )}
    </VStack>
  )
}

function MealPlansPending() {
  return (
    <Layout
      height="auto"
      contentWidth={960}
      padding={6}
      content={
        <LayoutContent role="main">
          <Section padding={6} aria-live="polite">
            <Spinner label="献立画面を読み込み中…" />
          </Section>
        </LayoutContent>
      }
    />
  )
}

function MealPlansError({ error, reset }: ErrorComponentProps) {
  const queryClient = useQueryClient()

  return (
    <Layout
      height="auto"
      contentWidth={960}
      padding={6}
      content={
        <LayoutContent role="main">
          <Banner
            status="error"
            title="献立画面を表示できませんでした"
            description={error.message}
            endContent={
              <Button
                label="再試行"
                size="sm"
                variant="secondary"
                onClick={() => {
                  queryClient.removeQueries({ queryKey: ['meal-plans'] })
                  reset()
                }}
              />
            }
          />
        </LayoutContent>
      }
    />
  )
}
