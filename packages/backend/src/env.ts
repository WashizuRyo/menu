import type { D1Database } from '@cloudflare/workers-types/index.ts'

export interface Bindings {
  DB: D1Database
  GEMINI_API_KEY: string
}
