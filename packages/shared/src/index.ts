export type RecipeUnit =
  | 'g'
  | 'kg'
  | 'ml'
  | 'L'
  | '個'
  | '本'
  | '枚'
  | '片'
  | '束'
  | '玉'
  | '房'
  | '丁'
  | '袋'
  | 'パック'
  | '缶'
  | '瓶'
  | '切れ'
  | '尾'
  | '大さじ'
  | '小さじ'
  | 'カップ'
  | '合'

export type RecipeIngredientAmount =
  | '少々'
  | '適量'
  | 'ひとつまみ'
  | 'お好みで'
  | '適宜'

export type RecipeIngredientQuantity =
  | {
      type: 'numeric'
      value: number
      unit: RecipeUnit
    }
  | {
      type: 'range'
      min: number
      max: number
      unit: RecipeUnit
    }
  | {
      type: 'qualitative'
      value: RecipeIngredientAmount
    }

export type RecipeIngredient = {
  name: string
  quantity: RecipeIngredientQuantity
}

export type RecipeSource =
  | {
      type: 'manual'
    }
  | {
      type: 'youtube'
      url: string
    }

export type Recipe = {
  id: number
  name: string
  ingredients: RecipeIngredient[]
  instructions: string[]
  source: RecipeSource
  createdAt: string
  updatedAt: string
}
