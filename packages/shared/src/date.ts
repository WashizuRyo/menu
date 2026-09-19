import * as v from 'valibot'

export type ISODateString =
  `${number}${number}${number}${number}-${number}${number}-${number}${number}`

const isValidCalendarDate = (value: string): boolean => {
  // Dateは存在しない日付を自動補正するため、変換後の日付と元の値を比較する。
  const date = new Date(`${value}T00:00:00.000Z`)

  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  )
}

export const isoDateStringSchema = v.pipe(
  v.string(),
  v.isoDate('YYYY-MM-DD形式の日付を入力してください'),
  v.check(isValidCalendarDate, '実在する日付を入力してください'),
  v.transform((value) => value as ISODateString),
)
