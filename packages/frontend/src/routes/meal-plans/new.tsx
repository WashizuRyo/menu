import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import type { ISODateString } from '@astryxdesign/core/Calendar'
import { DateInput } from '@astryxdesign/core/DateInput'
import { FormLayout } from '@astryxdesign/core/FormLayout'
import {
  HStack,
  Layout,
  LayoutContent,
  Section,
  VStack,
} from '@astryxdesign/core/Layout'
import { Selector } from '@astryxdesign/core/Selector'
import { proportional, Table } from '@astryxdesign/core/Table'
import { Heading, Text } from '@astryxdesign/core/Text'
import { valibotResolver } from '@hookform/resolvers/valibot'
import {
  type CreateMealPlanInput,
  MEAL_TYPES,
  type MealType,
  mealPlanDateSchema,
  RecipeId,
} from '@menu/shared'
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import {
  createFileRoute,
  type ErrorComponentProps,
  useNavigate,
} from '@tanstack/react-router'
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form'
import * as v from 'valibot'
import { createMealPlan } from '../../lib/api/meal-plan'
import { getRecipes } from '../../lib/api/recipe'

const mealPlanDayFormSchema = v.strictObject({
  mealDate: mealPlanDateSchema,
  breakfast: v.nullable(RecipeId.schema),
  lunch: v.nullable(RecipeId.schema),
  dinner: v.nullable(RecipeId.schema),
})

const createMealPlanFormSchema = v.pipe(
  v.strictObject({
    startDate: mealPlanDateSchema,
    endDate: mealPlanDateSchema,
    days: v.array(mealPlanDayFormSchema),
  }),
  v.transform(
    ({ startDate, endDate, days }): CreateMealPlanInput => ({
      startDate,
      endDate,
      recipes: days.flatMap((day) =>
        MEAL_TYPES.flatMap((mealType) => {
          const recipeId = day[mealType]

          return recipeId
            ? [{ mealDate: day.mealDate, mealType, recipeId }]
            : []
        }),
      ),
    }),
  ),
)

type CreateMealPlanFormValues = v.InferInput<typeof createMealPlanFormSchema>

interface MealPlanTableRow extends Record<string, unknown> {
  fieldId: string
  index: number
  mealDate: string
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

export const Route = createFileRoute('/meal-plans/new')({
  component: NewMealPlanPage,
  errorComponent: NewMealPlanError,
})

function toAstryxInputStatus(message?: string) {
  return message ? ({ type: 'error', message } as const) : undefined
}

function syncDays({
  startDate,
  endDate,
  currentDays,
  replaceDays,
}: {
  startDate: string
  endDate: string
  currentDays: CreateMealPlanFormValues['days']
  replaceDays: (days: CreateMealPlanFormValues['days']) => void
}) {
  const parsedStartDate = v.safeParse(mealPlanDateSchema, startDate)
  const parsedEndDate = v.safeParse(mealPlanDateSchema, endDate)

  if (
    !parsedStartDate.success ||
    !parsedEndDate.success ||
    parsedStartDate.output > parsedEndDate.output
  ) {
    replaceDays([])
    return
  }

  const currentDaysByDate = new Map(
    currentDays.map((day) => [day.mealDate, day]),
  )
  const dates: string[] = []
  const currentDate = new Date(`${parsedStartDate.output}T00:00:00.000Z`)
  const endDateValue = new Date(`${parsedEndDate.output}T00:00:00.000Z`)

  while (currentDate <= endDateValue) {
    dates.push(currentDate.toISOString().slice(0, 10))
    currentDate.setUTCDate(currentDate.getUTCDate() + 1)
  }

  replaceDays(
    dates.map(
      (mealDate) =>
        currentDaysByDate.get(mealDate) ?? {
          mealDate,
          breakfast: null,
          lunch: null,
          dinner: null,
        },
    ),
  )
}

function NewMealPlanPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const recipes = useSuspenseQuery({
    queryKey: ['recipes'],
    queryFn: getRecipes,
  })
  const { control, getValues, handleSubmit } = useForm<
    CreateMealPlanFormValues,
    unknown,
    CreateMealPlanInput
  >({
    defaultValues: {
      startDate: '',
      endDate: '',
      days: [],
    },
    resolver: valibotResolver(createMealPlanFormSchema),
  })
  const days = useFieldArray({ control, name: 'days' })
  const startDate = useWatch({ control, name: 'startDate' })
  const endDate = useWatch({ control, name: 'endDate' })
  const parsedStartDate = v.safeParse(mealPlanDateSchema, startDate)
  const parsedEndDate = v.safeParse(mealPlanDateSchema, endDate)
  const mutation = useMutation({
    mutationFn: createMealPlan,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['meal-plans'] })
      await navigate({ to: '/recipes' })
    },
  })

  const recipeOptions = recipes.data.recipes.map((recipe) => ({
    value: recipe.id,
    label: recipe.name,
  }))
  return (
    <Layout
      height="auto"
      contentWidth={960}
      padding={6}
      content={
        <LayoutContent role="main">
          <form onSubmit={handleSubmit((input) => mutation.mutate(input))}>
            <VStack gap={6}>
              <VStack gap={2}>
                <Heading level={1}>新しい献立</Heading>
                <Text color="secondary">
                  期間を決めて、朝食・昼食・夕食にレシピを割り当てます。
                </Text>
              </VStack>

              {mutation.isError ? (
                <Banner
                  status="error"
                  title="献立を保存できませんでした"
                  description={mutation.error.message}
                />
              ) : null}

              <Section padding={5}>
                <VStack gap={4}>
                  <Heading level={2}>期間</Heading>
                  <FormLayout
                    direction="horizontal"
                    defaultOptionality="required"
                  >
                    <Controller
                      control={control}
                      name="startDate"
                      render={({ field, fieldState }) => (
                        <DateInput
                          label="開始日"
                          value={
                            field.value
                              ? (field.value as ISODateString)
                              : undefined
                          }
                          onChange={(value) => {
                            const nextStartDate = value ?? ''

                            field.onChange(nextStartDate)
                            syncDays({
                              startDate: nextStartDate,
                              endDate: getValues('endDate'),
                              currentDays: getValues('days'),
                              replaceDays: days.replace,
                            })
                          }}
                          max={
                            parsedEndDate.success
                              ? (parsedEndDate.output as ISODateString)
                              : undefined
                          }
                          format="system_date"
                          status={toAstryxInputStatus(
                            fieldState.error?.message,
                          )}
                          width="100%"
                          isDisabled={mutation.isPending}
                        />
                      )}
                    />
                    <Controller
                      control={control}
                      name="endDate"
                      render={({ field, fieldState }) => (
                        <DateInput
                          label="終了日"
                          value={
                            field.value
                              ? (field.value as ISODateString)
                              : undefined
                          }
                          onChange={(value) => {
                            const nextEndDate = value ?? ''

                            field.onChange(nextEndDate)
                            syncDays({
                              startDate: getValues('startDate'),
                              endDate: nextEndDate,
                              currentDays: getValues('days'),
                              replaceDays: days.replace,
                            })
                          }}
                          min={
                            parsedStartDate.success
                              ? (parsedStartDate.output as ISODateString)
                              : undefined
                          }
                          format="system_date"
                          status={toAstryxInputStatus(
                            fieldState.error?.message,
                          )}
                          width="100%"
                          isDisabled={mutation.isPending}
                        />
                      )}
                    />
                  </FormLayout>
                </VStack>
              </Section>

              {days.fields.length > 0 ? (
                <Section padding={0}>
                  <Table
                    data={days.fields.map((day, index) => ({
                      fieldId: day.id,
                      index,
                      mealDate: day.mealDate,
                    }))}
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
                        renderCell: (row: MealPlanTableRow) => (
                          <Controller
                            control={control}
                            name={`days.${row.index}.${mealType}`}
                            render={({ field }) => (
                              <Selector
                                label={`${row.mealDate} ${getMealTypeLabel(mealType)}`}
                                isLabelHidden
                                value={field.value ?? ''}
                                onChange={field.onChange}
                                options={recipeOptions}
                                placeholder="未設定"
                                hasClear
                                width="100%"
                                isDisabled={mutation.isPending}
                              />
                            )}
                          />
                        ),
                      })),
                    ]}
                    idKey="fieldId"
                    dividers="grid"
                    verticalAlign="middle"
                  />
                </Section>
              ) : (
                <Section padding={5}>
                  <Text color="secondary">
                    開始日と終了日を入力すると献立表が表示されます。
                  </Text>
                </Section>
              )}

              <HStack gap={3} hAlign="end" wrap="wrap">
                <Button
                  label="キャンセル"
                  variant="secondary"
                  href="/recipes"
                />
                <Button
                  label="献立を保存"
                  variant="primary"
                  type="submit"
                  isLoading={mutation.isPending}
                />
              </HStack>
            </VStack>
          </form>
        </LayoutContent>
      }
    />
  )
}

function NewMealPlanError({ error, reset }: ErrorComponentProps) {
  return (
    <Layout
      height="auto"
      contentWidth={960}
      padding={6}
      content={
        <LayoutContent role="main">
          <Banner
            status="error"
            title="献立作成画面を表示できませんでした"
            description={error.message}
            endContent={
              <Button
                label="再試行"
                size="sm"
                variant="secondary"
                onClick={reset}
              />
            }
          />
        </LayoutContent>
      }
    />
  )
}
