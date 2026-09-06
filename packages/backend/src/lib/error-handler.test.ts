import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { describe, expect, test } from 'vitest'
import {
  BadGatewayError,
  PayloadTooLargeError,
  ServiceUnavailableError,
  UnprocessableEntityError,
  ValidationError,
} from './api-error.js'
import { onApiError } from './error-handler.js'

function createApp(error: Error) {
  return new Hono()
    .get('/', () => {
      throw error
    })
    .onError(onApiError)
}

describe('onApiError', () => {
  test.each([
    [new ValidationError('validation failed'), 400, 'validation failed'],
    [new PayloadTooLargeError('request too large'), 413, 'request too large'],
    [new UnprocessableEntityError('unprocessable'), 422, 'unprocessable'],
    [new BadGatewayError('upstream failed'), 502, 'upstream failed'],
    [
      new ServiceUnavailableError('service unavailable'),
      503,
      'service unavailable',
    ],
  ])(
    'API例外を status %i と error JSON に変換する',
    async (error, status, message) => {
      const response = await createApp(error).request('/')

      expect(response.status).toBe(status)
      expect(await response.json()).toEqual({ error: message })
    },
  )

  test('想定外の例外の詳細を公開せず500を返す', async () => {
    const response = await createApp(
      new Error('database credential leaked'),
    ).request('/')

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'Internal Server Error' })
  })

  test('malformed JSON のHTTP例外を400に正規化する', async () => {
    const response = await createApp(
      new HTTPException(400, { message: 'Malformed JSON in request body' }),
    ).request('/')

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'Invalid JSON' })
  })
})
