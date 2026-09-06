import { RecipeId } from '@menu/shared'
import { drizzle } from 'drizzle-orm/d1'
import { getPlatformProxy } from 'wrangler'
import { recipes } from './schema.js'

const devRecipes = [
  {
    id: RecipeId.parse('rcp_0000000000000001'),
    name: '豚の生姜焼き',
    ingredients: [
      {
        name: '豚ロース薄切り肉',
        quantity: { type: 'numeric', value: 300, unit: 'g' },
      },
      {
        name: '玉ねぎ',
        quantity: { type: 'numeric', value: 1, unit: '個' },
      },
      {
        name: 'しょうが',
        quantity: { type: 'numeric', value: 1, unit: '片' },
      },
      {
        name: 'しょうゆ',
        quantity: { type: 'numeric', value: 2, unit: '大さじ' },
      },
      {
        name: 'みりん',
        quantity: { type: 'numeric', value: 2, unit: '大さじ' },
      },
    ],
    instructions: [
      '玉ねぎを薄切りにし、しょうがをすりおろす',
      'フライパンで豚肉と玉ねぎを炒める',
      'しょうゆ、みりん、しょうがを加えて煮絡める',
    ],
    source: { type: 'manual' },
  },
  {
    id: RecipeId.parse('rcp_0000000000000002'),
    name: 'じゃがいもと玉ねぎの味噌汁',
    ingredients: [
      {
        name: 'じゃがいも',
        quantity: { type: 'numeric', value: 2, unit: '個' },
      },
      {
        name: '玉ねぎ',
        quantity: { type: 'numeric', value: 0.5, unit: '個' },
      },
      {
        name: 'だし汁',
        quantity: { type: 'numeric', value: 600, unit: 'ml' },
      },
      {
        name: '味噌',
        quantity: { type: 'numeric', value: 2, unit: '大さじ' },
      },
      {
        name: '青ねぎ',
        quantity: { type: 'qualitative', value: 'お好みで' },
      },
    ],
    instructions: [
      'じゃがいもと玉ねぎを食べやすい大きさに切る',
      'だし汁で具材が柔らかくなるまで煮る',
      '火を弱めて味噌を溶き入れ、青ねぎを散らす',
    ],
    source: { type: 'manual' },
  },
  {
    id: RecipeId.parse('rcp_0000000000000003'),
    name: '鮭ときのこのホイル焼き',
    ingredients: [
      {
        name: '生鮭',
        quantity: { type: 'numeric', value: 2, unit: '切れ' },
      },
      {
        name: 'しめじ',
        quantity: { type: 'numeric', value: 1, unit: 'パック' },
      },
      {
        name: 'えのき',
        quantity: { type: 'numeric', value: 0.5, unit: '束' },
      },
      {
        name: 'バター',
        quantity: { type: 'numeric', value: 20, unit: 'g' },
      },
      {
        name: '塩',
        quantity: { type: 'qualitative', value: '少々' },
      },
    ],
    instructions: [
      'きのこを食べやすい大きさに分ける',
      'アルミホイルに鮭ときのこをのせ、塩とバターを加えて包む',
      'フライパンに並べ、蓋をして中火で15分ほど蒸し焼きにする',
    ],
    source: { type: 'manual' },
  },
  {
    id: RecipeId.parse('rcp_0000000000000004'),
    name: 'ふわふわフレンチトースト',
    ingredients: [
      {
        name: '食パン',
        quantity: { type: 'numeric', value: 2, unit: '枚' },
      },
      {
        name: '卵',
        quantity: { type: 'numeric', value: 2, unit: '個' },
      },
      {
        name: '牛乳',
        quantity: { type: 'numeric', value: 150, unit: 'ml' },
      },
      {
        name: '砂糖',
        quantity: { type: 'numeric', value: 1, unit: '大さじ' },
      },
      {
        name: 'バター',
        quantity: { type: 'qualitative', value: '適量' },
      },
    ],
    instructions: [
      '卵、牛乳、砂糖を混ぜて卵液を作る',
      '食パンを卵液に浸し、両面にしっかり吸わせる',
      'バターを溶かしたフライパンで両面を焼き色がつくまで焼く',
    ],
    source: { type: 'manual' },
  },
] satisfies (typeof recipes.$inferInsert)[]

const platform = await getPlatformProxy<CloudflareBindings>({
  configPath: 'wrangler.jsonc',
  remoteBindings: false,
})

try {
  const db = drizzle(platform.env.DB)

  await db.batch([db.delete(recipes), db.insert(recipes).values(devRecipes)])
} finally {
  await platform.dispose()
}
