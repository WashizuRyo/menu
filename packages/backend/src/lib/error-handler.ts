import type { ApiErrorResponse } from '@menu/shared'
import type { ErrorHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { ApiError } from './api-error.js'

export const onApiError: ErrorHandler = (error, context) => {
  if (error instanceof ApiError) {
    return context.json<ApiErrorResponse>(
      { error: error.message },
      error.status,
    )
  }

  if (
    error instanceof HTTPException &&
    error.status === 400 &&
    error.message === 'Malformed JSON in request body'
  ) {
    return context.json<ApiErrorResponse>({ error: 'Invalid JSON' }, 400)
  }

  console.error(
    JSON.stringify({
      message: 'Unhandled request error',
      error: error instanceof Error ? error.message : String(error),
    }),
  )

  return context.json<ApiErrorResponse>({ error: 'Internal Server Error' }, 500)
}
