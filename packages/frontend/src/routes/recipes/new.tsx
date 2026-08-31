import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { FormLayout } from '@astryxdesign/core/FormLayout'
import {
  HStack,
  Layout,
  LayoutContent,
  Section,
  VStack,
} from '@astryxdesign/core/Layout'
import { RadioList, RadioListItem } from '@astryxdesign/core/RadioList'
import { Selector } from '@astryxdesign/core/Selector'
import { Heading, Text } from '@astryxdesign/core/Text'
import { TextArea } from '@astryxdesign/core/TextArea'
import { TextInput } from '@astryxdesign/core/TextInput'
import { valibotResolver } from '@hookform/resolvers/valibot'
import {
  type CreateRecipeInput,
  createRecipeInputSchema,
  RECIPE_INGREDIENT_AMOUNTS,
  RECIPE_INGREDIENT_QUANTITY_TYPES,
  RECIPE_UNITS,
  type RecipeIngredientQuantityType,
  type RecipeSourceType,
  recipeInstructionSchema,
} from '@menu/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import {
  type Control,
  Controller,
  type UseFormGetFieldState,
  useFieldArray,
  useForm,
} from 'react-hook-form'
import * as v from 'valibot'
import { createRecipe } from '../../lib/api/recipe'

const recipeInstructionFormSchema = v.pipe(
  v.strictObject({
    value: recipeInstructionSchema,
  }),
  v.transform(({ value }) => value),
)

const createRecipeFormSchema = v.strictObject({
  ...createRecipeInputSchema.entries,
  instructions: v.pipe(
    v.array(recipeInstructionFormSchema),
    createRecipeInputSchema.entries.instructions,
  ),
})

type CreateRecipeFormValues = v.InferInput<typeof createRecipeFormSchema>
type CreateRecipeFormControl = Control<
  CreateRecipeFormValues,
  unknown,
  CreateRecipeInput
>

const unitOptions = RECIPE_UNITS.map((unit) => ({
  value: unit,
  label: unit,
}))

const amountOptions = RECIPE_INGREDIENT_AMOUNTS.map((amount) => ({
  value: amount,
  label: amount,
}))

const quantityTypeLabels = {
  numeric: '数値',
  range: '範囲',
  qualitative: '目安',
} satisfies Record<RecipeIngredientQuantityType, string>

const quantityTypeOptions = Object.values(RECIPE_INGREDIENT_QUANTITY_TYPES).map(
  (value) => ({
    value,
    label: quantityTypeLabels[value],
  }),
)

export const Route = createFileRoute('/recipes/new')({
  component: NewRecipePage,
})

function toAstryxInputStatus(message?: string) {
  return message ? ({ type: 'error', message } as const) : undefined
}

function toNumberInputValue(value: number): string {
  return Number.isFinite(value) ? String(value) : ''
}

function IngredientQuantityControls({
  control,
  getFieldState,
  index,
}: {
  control: CreateRecipeFormControl
  getFieldState: UseFormGetFieldState<CreateRecipeFormValues>
  index: number
}) {
  return (
    <Controller
      control={control}
      name={`ingredients.${index}.quantity`}
      render={({ field }) => {
        const quantity = field.value

        function renderQuantityFields() {
          switch (quantity.type) {
            case 'numeric':
              return (
                <FormLayout direction="horizontal">
                  <TextInput
                    label="数量"
                    value={toNumberInputValue(quantity.value)}
                    onChange={(value) =>
                      field.onChange({
                        ...quantity,
                        value: value === '' ? Number.NaN : Number(value),
                      })
                    }
                    status={toAstryxInputStatus(
                      getFieldState(`ingredients.${index}.quantity.value`).error
                        ?.message,
                    )}
                    placeholder="例：200"
                    width="100%"
                  />
                  <Selector
                    label="単位"
                    value={quantity.unit}
                    onChange={(unit) => field.onChange({ ...quantity, unit })}
                    options={unitOptions}
                    width="100%"
                  />
                </FormLayout>
              )
            case 'range':
              return (
                <FormLayout direction="horizontal">
                  <TextInput
                    label="最小値"
                    value={toNumberInputValue(quantity.min)}
                    onChange={(value) =>
                      field.onChange({
                        ...quantity,
                        min: value === '' ? Number.NaN : Number(value),
                      })
                    }
                    status={toAstryxInputStatus(
                      getFieldState(`ingredients.${index}.quantity.min`).error
                        ?.message,
                    )}
                    width="100%"
                  />
                  <TextInput
                    label="最大値"
                    value={toNumberInputValue(quantity.max)}
                    onChange={(value) =>
                      field.onChange({
                        ...quantity,
                        max: value === '' ? Number.NaN : Number(value),
                      })
                    }
                    status={toAstryxInputStatus(
                      getFieldState(`ingredients.${index}.quantity.max`).error
                        ?.message,
                    )}
                    width="100%"
                  />
                  <Selector
                    label="単位"
                    value={quantity.unit}
                    onChange={(unit) => field.onChange({ ...quantity, unit })}
                    options={unitOptions}
                    width="100%"
                  />
                </FormLayout>
              )
            case 'qualitative':
              return (
                <Selector
                  label="分量"
                  value={quantity.value}
                  onChange={(value) => field.onChange({ ...quantity, value })}
                  options={amountOptions}
                  width="100%"
                />
              )
            default: {
              const exhaustiveType: never = quantity
              throw new Error(`未対応の数量タイプです: ${exhaustiveType}`)
            }
          }
        }

        return (
          <>
            <Selector
              label="分量の入力方法"
              value={quantity.type}
              onChange={(value) =>
                field.onChange(
                  createInitialQuantity(value as RecipeIngredientQuantityType),
                )
              }
              options={quantityTypeOptions}
              width="100%"
            />
            {renderQuantityFields()}
          </>
        )
      }}
    />
  )
}

function createInitialQuantity(
  type: RecipeIngredientQuantityType,
): CreateRecipeInput['ingredients'][number]['quantity'] {
  switch (type) {
    case 'numeric':
      return { type, value: 1, unit: 'g' }
    case 'range':
      return { type, min: 1, max: 2, unit: 'g' }
    case 'qualitative':
      return { type, value: '適量' }
    default: {
      const exhaustiveType: never = type
      throw new Error(`未対応の数量タイプです: ${exhaustiveType}`)
    }
  }
}

function NewRecipePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const {
    control,
    formState: { errors },
    getFieldState,
    handleSubmit,
    setValue,
  } = useForm({
    defaultValues: {
      name: '',
      ingredients: [
        {
          name: '',
          quantity: {
            type: 'numeric',
            value: 1,
            unit: 'g',
          },
        },
      ],
      instructions: [{ value: '' }],
      source: { type: 'manual' },
    },
    resolver: valibotResolver(createRecipeFormSchema),
  })
  const ingredients = useFieldArray({ control, name: 'ingredients' })
  const instructions = useFieldArray({ control, name: 'instructions' })
  const [sourceType, setSourceType] = useState<RecipeSourceType | null>(null)

  const mutation = useMutation({
    mutationFn: createRecipe,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['recipes'] })
      await navigate({ to: '/recipes' })
    },
  })

  const handleSourceSelect = (type: RecipeSourceType) => {
    setValue(
      'source',
      type === 'youtube' ? { type: 'youtube', url: '' } : { type: 'manual' },
      { shouldDirty: true },
    )
    setSourceType(type)
  }

  if (sourceType === null) {
    return <RecipeSourceSelection onSelect={handleSourceSelect} />
  }

  return (
    <Layout
      height="auto"
      contentWidth={720}
      padding={6}
      content={
        <LayoutContent role="main">
          <form
            onSubmit={handleSubmit((formData) => mutation.mutate(formData))}
          >
            <VStack gap={6}>
              <VStack gap={2}>
                <Heading level={1}>新しいレシピ</Heading>
                <Text color="secondary">
                  材料と手順を入力して、献立に使えるレシピを登録します。
                </Text>
              </VStack>

              {mutation.isError ? (
                <Banner
                  status="error"
                  title="レシピを保存できませんでした"
                  description={mutation.error.message}
                />
              ) : null}

              <Section padding={5}>
                <FormLayout defaultOptionality="required">
                  <Controller
                    control={control}
                    name="name"
                    render={({ field, fieldState }) => (
                      <TextInput
                        label="レシピ名"
                        value={field.value}
                        onChange={field.onChange}
                        status={toAstryxInputStatus(fieldState.error?.message)}
                        placeholder="例：鶏肉と野菜のカレー"
                        hasAutoFocus
                        width="100%"
                      />
                    )}
                  />
                </FormLayout>
              </Section>

              <Section padding={5}>
                <VStack gap={5}>
                  <VStack gap={1}>
                    <Heading level={2}>材料</Heading>
                    <Text color="secondary">
                      必要な材料と分量を1件ずつ入力してください。
                    </Text>
                  </VStack>

                  {ingredients.fields.map((ingredient, index) => {
                    return (
                      <Section key={ingredient.id} variant="muted" padding={4}>
                        <VStack gap={4}>
                          <HStack gap={3} hAlign="between" vAlign="center">
                            <Heading level={3}>材料 {index + 1}</Heading>
                            <Button
                              label="この材料を削除"
                              variant="ghost"
                              size="sm"
                              isDisabled={ingredients.fields.length === 1}
                              onClick={() => ingredients.remove(index)}
                            />
                          </HStack>

                          <FormLayout defaultOptionality="required">
                            <Controller
                              control={control}
                              name={`ingredients.${index}.name`}
                              render={({ field, fieldState }) => (
                                <TextInput
                                  label="材料名"
                                  value={field.value}
                                  onChange={field.onChange}
                                  status={toAstryxInputStatus(
                                    fieldState.error?.message,
                                  )}
                                  placeholder="例：鶏もも肉"
                                  width="100%"
                                />
                              )}
                            />

                            <IngredientQuantityControls
                              control={control}
                              getFieldState={getFieldState}
                              index={index}
                            />
                          </FormLayout>
                        </VStack>
                      </Section>
                    )
                  })}

                  {errors.ingredients?.root?.message ? (
                    <Banner
                      status="error"
                      title={errors.ingredients.root.message}
                    />
                  ) : null}

                  <Button
                    label="材料を追加"
                    variant="secondary"
                    onClick={() =>
                      ingredients.append({
                        name: '',
                        quantity: {
                          type: 'numeric',
                          value: 1,
                          unit: 'g',
                        },
                      })
                    }
                  />
                </VStack>
              </Section>

              <Section padding={5}>
                <VStack gap={5}>
                  <VStack gap={1}>
                    <Heading level={2}>作り方</Heading>
                    <Text color="secondary">
                      調理する順番に手順を入力してください。
                    </Text>
                  </VStack>

                  {instructions.fields.map((instruction, index) => (
                    <Section key={instruction.id} variant="muted" padding={4}>
                      <VStack gap={3}>
                        <HStack gap={3} hAlign="between" vAlign="center">
                          <Heading level={3}>手順 {index + 1}</Heading>
                          <Button
                            label="この手順を削除"
                            variant="ghost"
                            size="sm"
                            isDisabled={instructions.fields.length === 1}
                            onClick={() => instructions.remove(index)}
                          />
                        </HStack>
                        <Controller
                          control={control}
                          name={`instructions.${index}.value`}
                          render={({ field, fieldState }) => (
                            <TextArea
                              label={`手順 ${index + 1}`}
                              isLabelHidden
                              value={field.value}
                              onChange={field.onChange}
                              status={toAstryxInputStatus(
                                fieldState.error?.message,
                              )}
                              placeholder="例：玉ねぎを薄切りにして、弱火で炒めます"
                              rows={3}
                              maxLength={1_000}
                              width="100%"
                            />
                          )}
                        />
                      </VStack>
                    </Section>
                  ))}

                  {errors.instructions?.root?.message ? (
                    <Banner
                      status="error"
                      title={errors.instructions.root.message}
                    />
                  ) : null}

                  <Button
                    label="手順を追加"
                    variant="secondary"
                    onClick={() => instructions.append({ value: '' })}
                  />
                </VStack>
              </Section>

              <HStack gap={3} hAlign="end" wrap="wrap">
                <Button
                  label="キャンセル"
                  variant="secondary"
                  href="/recipes"
                />
                <Button
                  label="レシピを保存"
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

function RecipeSourceSelection({
  onSelect,
}: {
  onSelect: (type: RecipeSourceType) => void
}) {
  return (
    <Layout
      height="auto"
      contentWidth={720}
      padding={6}
      content={
        <LayoutContent role="main">
          <VStack gap={6}>
            <VStack gap={2}>
              <Heading level={1}>新しいレシピ</Heading>
              <Text color="secondary">
                最初に、レシピの登録方法を選んでください。
              </Text>
            </VStack>

            <Section padding={5}>
              <RadioList
                label="登録方法"
                description="選択すると、レシピの入力フォームを表示します。"
                value=""
                onChange={(value) => onSelect(value as RecipeSourceType)}
                orientation="horizontal"
              >
                <RadioListItem
                  label="手入力"
                  description="材料と作り方を入力します"
                  value="manual"
                />
                <RadioListItem
                  label="YouTube"
                  description="動画のURLとレシピを入力します"
                  value="youtube"
                />
              </RadioList>
            </Section>

            <HStack hAlign="end">
              <Button label="キャンセル" variant="secondary" href="/recipes" />
            </HStack>
          </VStack>
        </LayoutContent>
      }
    />
  )
}
