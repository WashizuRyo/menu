import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { valibotSchema } from '@ai-sdk/valibot'
import { sValidator } from '@hono/standard-validator'
import {
  recipeIngredientNumericQuantitySchema,
  recipeIngredientQualitativeQuantitySchema,
  recipeIngredientRangeQuantitySchema,
  recipeIngredientsSchema,
  recipeInstructionsSchema,
  recipeNameSchema,
  recipeYoutubeUrlSchema,
} from '@menu/shared'
import { generateText, Output } from 'ai'
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import * as v from 'valibot'
import type { Bindings } from '../env.js'
import {
  BadGatewayError,
  PayloadTooLargeError,
  ServiceUnavailableError,
  UnprocessableEntityError,
  ValidationError,
} from '../lib/api-error.js'
import { onApiError } from '../lib/error-handler.js'

const youtubeSummaryInputSchema = v.strictObject({
  url: recipeYoutubeUrlSchema,
})

const youtubeSummaryResponseSchema = v.strictObject({
  name: recipeNameSchema,
  ingredients: recipeIngredientsSchema,
  instructions: recipeInstructionsSchema,
})

const youtubeSummarySchema = v.strictObject({
  isRecipeVideo: v.pipe(
    v.boolean(),
    v.description('料理動画かどうか。料理動画の場合はtrue、それ以外はfalse'),
  ),
  title: v.pipe(v.string(), v.description('料理名')),
  ingredients: v.array(
    v.strictObject({
      name: v.pipe(v.string(), v.description('食材名')),
      quantity: v.pipe(
        v.strictObject({
          numeric: v.pipe(
            v.nullable(recipeIngredientNumericQuantitySchema),
            v.description('単一数量。該当しない場合はnull'),
          ),
          range: v.pipe(
            v.nullable(recipeIngredientRangeQuantitySchema),
            v.description('数量の範囲。該当しない場合はnull'),
          ),
          qualitative: v.pipe(
            v.nullable(recipeIngredientQualitativeQuantitySchema),
            v.description('適量などの定性的な数量。該当しない場合はnull'),
          ),
        }),
        v.description(
          '数量。numeric、range、qualitativeのうち、該当するものだけobjectを設定する。それ以外のフィールドは必ずnullにする。',
        ),
      ),
    }),
  ),
  instructions: v.pipe(
    v.array(v.string()),
    v.description('料理の作り方。手順を順番どおりに並べる'),
  ),
})

export type YoutubeSummary = v.InferOutput<typeof youtubeSummarySchema>

function toRecipeIngredientQuantity(
  quantity: YoutubeSummary['ingredients'][number]['quantity'],
) {
  const values = [
    quantity.numeric,
    quantity.range,
    quantity.qualitative,
  ].filter((value) => value !== null)

  if (values.length !== 1) {
    throw new Error(
      '数量はnumeric、range、qualitativeのいずれか1つを指定してください',
    )
  }

  return values[0]
}

const app = new Hono<{ Bindings: Bindings }>()
  .post(
    '/summarize',
    bodyLimit({
      maxSize: 16 * 1024,
      onError: () => {
        throw new PayloadTooLargeError('request too large')
      },
    }),
    sValidator('json', youtubeSummaryInputSchema, (result) => {
      if (!result.success) {
        throw new ValidationError('validation failed')
      }
    }),
    async (context) => {
      if (!context.env.GEMINI_API_KEY) {
        console.error(
          JSON.stringify({ message: 'Gemini API key is not configured' }),
        )
        throw new ServiceUnavailableError(
          'YouTubeの要約サービスを利用できません',
        )
      }

      const { url } = context.req.valid('json')

      let output: YoutubeSummary

      try {
        const googleProvider = createGoogleGenerativeAI({
          apiKey: context.env.GEMINI_API_KEY,
        })
        const result = await generateText({
          model: googleProvider('gemini-3.5-flash-lite'),
          output: Output.object({
            schema: valibotSchema(youtubeSummarySchema),
          }),
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'このYouTube動画から料理情報を抽出し、日本語でレシピ化してください。',
                },
                {
                  type: 'file',
                  data: url,
                  mediaType: 'video/mp4',
                },
              ],
            },
          ],
        })
        output = result.output
      } catch (error) {
        console.error(
          JSON.stringify({
            message: 'Gemini YouTube summarization failed',
            error: error instanceof Error ? error.message : String(error),
          }),
        )
        throw new BadGatewayError('YouTubeの要約に失敗しました')
      }

      if (!output.isRecipeVideo) {
        throw new UnprocessableEntityError(
          '料理動画ではないためレシピを作成できません',
        )
      }

      try {
        return context.json(
          v.parse(youtubeSummaryResponseSchema, {
            name: output.title,
            ingredients: output.ingredients.map(({ name, quantity }) => ({
              name,
              quantity: toRecipeIngredientQuantity(quantity),
            })),
            instructions: output.instructions,
          }),
        )
      } catch (error) {
        console.error(
          JSON.stringify({
            message: 'Gemini YouTube summarization output conversion failed',
            error: error instanceof Error ? error.message : String(error),
          }),
        )
        throw new BadGatewayError('YouTubeの要約に失敗しました')
      }
    },
  )
  .onError(onApiError)

export default app
