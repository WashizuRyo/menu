import * as v from 'valibot'

export const apiErrorSchema = v.strictObject({
  error: v.string(),
})

export type ApiErrorResponse = v.InferOutput<typeof apiErrorSchema>
