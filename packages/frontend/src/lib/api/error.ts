import { apiErrorSchema } from '@menu/shared'
import * as v from 'valibot'

export async function throwApiError(
  response: Pick<Response, 'json'>,
  fallbackMessage: string,
): Promise<never> {
  let body: unknown

  try {
    body = await response.json()
  } catch {
    throw new Error(fallbackMessage)
  }

  const result = v.safeParse(apiErrorSchema, body)

  if (result.success) {
    throw new Error(result.output.error)
  }

  throw new Error(fallbackMessage)
}
