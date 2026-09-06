import { customAlphabet } from 'nanoid'
import * as v from 'valibot'

const ID_ALPHABET =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
const ID_LENGTH = 16

export const createIdGenerator = <const Prefix extends string>(
  prefix: Prefix,
) => {
  const generateRandomPart = customAlphabet(ID_ALPHABET, ID_LENGTH)
  const schema = v.pipe(
    v.string(),
    v.regex(
      new RegExp(`^${prefix}_[0-9A-Za-z]{${ID_LENGTH}}$`),
      `${prefix}_から始まる正しいIDを入力してください`,
    ),
    v.brand(prefix),
  )

  return {
    schema,
    generate: () => v.parse(schema, `${prefix}_${generateRandomPart()}`),
    parse: (input: unknown) => v.parse(schema, input),
    safeParse: (input: unknown) => v.safeParse(schema, input),
  } as const
}
