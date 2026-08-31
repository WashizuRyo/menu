export const RECIPE_UNITS = [
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
] as const

export const RECIPE_INGREDIENT_AMOUNTS = [
  '少々',
  '適量',
  'ひとつまみ',
  'お好みで',
  '適宜',
] as const

export const RECIPE_INGREDIENT_QUANTITY_TYPES = {
  NUMERIC: 'numeric',
  RANGE: 'range',
  QUALITATIVE: 'qualitative',
} as const
