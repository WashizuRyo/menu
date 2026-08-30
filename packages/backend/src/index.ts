import type { D1Database } from '@cloudflare/workers-types/index.ts'
import { sValidator } from '@hono/standard-validator'
import { createRecipeInputSchema } from '@menu/shared'
import { drizzle } from 'drizzle-orm/d1'
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { HTTPException } from 'hono/http-exception'
import { recipes } from './db/schema.js'
import { toRecipe } from './mapper/recipe.js'

interface Bindings {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()
  .get('/', (context) => {
    return context.json({ message: 'Menu API' })
  })
  .get('/api/health', (context) => {
    return context.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    })
  })
  .get('/api/recipes', async (context) => {
    const db = drizzle(context.env.DB)
    const recipeRows = await db
      .select()
      .from(recipes)
      .orderBy(recipes.createdAt)

    return context.json(
      {
        recipes: recipeRows.map(toRecipe),
      },
      200,
    )
  })
  .post(
    '/api/recipes',
    bodyLimit({
      maxSize: 256 * 1024,
      onError: (context) => context.json({ error: 'request too large' }, 413),
    }),
    sValidator('json', createRecipeInputSchema, (result, context) => {
      if (!result.success) {
        return context.json({ error: 'validation failed' }, 400)
      }
    }),
    async (context) => {
      const db = drizzle(context.env.DB)
      const input = context.req.valid('json')
      const [recipeRow] = await db.insert(recipes).values(input).returning()

      if (!recipeRow) {
        throw new Error('Failed to create recipe')
      }

      return context.json({ recipe: toRecipe(recipeRow) }, 201)
    },
  )

app.onError((error, context) => {
  if (
    error instanceof HTTPException &&
    error.status === 400 &&
    error.message === 'Malformed JSON in request body'
  ) {
    return context.json({ error: 'Invalid JSON' }, 400)
  }

  console.error(
    JSON.stringify({
      message: 'Unhandled request error',
      error: error.message,
    }),
  )

  return context.json({ error: 'Internal Server Error' }, 500)
})

export default app

export type AppType = typeof app
