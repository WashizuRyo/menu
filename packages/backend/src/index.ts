import { drizzle } from 'drizzle-orm/d1'
import { Hono } from 'hono'
import { recipes } from './db/schema.js'

const app = new Hono<{ Bindings: CloudflareBindings }>()

app.get('/', (context) => {
  return context.json({ message: 'Menu API' })
})

app.get('/api/health', (context) => {
  return context.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  })
})

app.get('/api/recipes', async (context) => {
  const db = drizzle(context.env.DB)
  const recipeRows = await db.select().from(recipes).orderBy(recipes.createdAt)

  return context.json({ recipes: recipeRows })
})

app.onError((error, context) => {
  console.error(
    JSON.stringify({
      message: 'Unhandled request error',
      error: error.message,
    }),
  )

  return context.json({ error: 'Internal Server Error' }, 500)
})

export default app
