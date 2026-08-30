import * as v from 'valibot'

export const recipeUnitSchema = v.picklist([
  'g',
  'kg',
  'ml',
  'L',
  '個',
  '本',
  '枚',
  '片',
  '束',
  '玉',
  '房',
  '丁',
  '袋',
  'パック',
  '缶',
  '瓶',
  '切れ',
  '尾',
  '大さじ',
  '小さじ',
  'カップ',
  '合',
])

export const recipeIngredientAmountSchema = v.picklist([
  '少々',
  '適量',
  'ひとつまみ',
  'お好みで',
  '適宜',
])

export const recipeIngredientQuantitySchema = v.variant('type', [
  v.strictObject({
    type: v.literal('numeric'),
    value: v.number(),
    unit: recipeUnitSchema,
  }),
  v.strictObject({
    type: v.literal('range'),
    min: v.number(),
    max: v.number(),
    unit: recipeUnitSchema,
  }),
  v.strictObject({
    type: v.literal('qualitative'),
    value: recipeIngredientAmountSchema,
  }),
])

export const recipeIngredientSchema = v.strictObject({
  name: v.string(),
  quantity: recipeIngredientQuantitySchema,
})

export const recipeSourceSchema = v.variant('type', [
  v.strictObject({
    type: v.literal('manual'),
  }),
  v.strictObject({
    type: v.literal('youtube'),
    url: v.string(),
  }),
])

export const recipeSchema = v.strictObject({
  id: v.number(),
  name: v.string(),
  ingredients: v.array(recipeIngredientSchema),
  instructions: v.array(v.string()),
  source: recipeSourceSchema,
  createdAt: v.string(),
  updatedAt: v.string(),
})
