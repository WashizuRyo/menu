import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { menuItems } from './db/schema.js'

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

app.get('/api/menu-items', async (context) => {
  const db = drizzle(context.env.DB)
  const items = await db.select().from(menuItems).orderBy(menuItems.createdAt)

  return context.json({ items })
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
