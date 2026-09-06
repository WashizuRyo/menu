import { sValidator } from '@hono/standard-validator'
import { createRecipeInputSchema } from '@menu/shared'
import { drizzle } from 'drizzle-orm/d1'
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { recipes } from './db/schema.js'
import type { Bindings } from './env.js'
import { PayloadTooLargeError, ValidationError } from './lib/api-error.js'
import { onApiError } from './lib/error-handler.js'
import { toRecipe } from './mapper/recipe.js'
import youtube from './routes/youtube.js'

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
  .route('/api/youtube', youtube)
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
      onError: () => {
        throw new PayloadTooLargeError('request too large')
      },
    }),
    sValidator('json', createRecipeInputSchema, (result) => {
      if (!result.success) {
        throw new ValidationError('validation failed')
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
  .onError(onApiError)

export default app

export type AppType = typeof app
