import { MealPlanId, RecipeId } from '@menu/shared'
import { describe, expect, expectTypeOf, test } from 'vitest'

describe('ブランド付き ID', () => {
  test('未検証の文字列と異なる種類の ID を区別する', () => {
    expectTypeOf<'mpln_'>().not.toMatchTypeOf<MealPlanId>()
    expectTypeOf<'mpln_0123456789ABCDEF'>().not.toMatchTypeOf<MealPlanId>()
    expectTypeOf<RecipeId>().not.toMatchTypeOf<MealPlanId>()
    expectTypeOf<MealPlanId>().not.toMatchTypeOf<RecipeId>()
  })

  test('生成とパースでブランド付き ID を取得できる', () => {
    const id = MealPlanId.generate()
    expectTypeOf(id).toEqualTypeOf<MealPlanId>()
    expectTypeOf(RecipeId.generate()).toEqualTypeOf<RecipeId>()
    expectTypeOf(MealPlanId.parse(id)).toEqualTypeOf<MealPlanId>()
    expect(MealPlanId.parse(id)).toBe(id)
    expect(id).toMatch(/^mpln_[0-9A-Za-z]{16}$/)

    const result = MealPlanId.safeParse(id)
    expect(result.success).toBe(true)
    if (result.success) {
      expectTypeOf(result.output).toEqualTypeOf<MealPlanId>()
      expect(result.output).toBe(id)
    }
  })

  test('不正な形式と異なるプレフィックスを拒否する', () => {
    expect(MealPlanId.safeParse('mpln_').success).toBe(false)
    expect(MealPlanId.safeParse(RecipeId.generate()).success).toBe(false)
  })
})
