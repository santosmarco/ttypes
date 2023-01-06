import type { Primitive } from './types'

export type Literalize<T extends Primitive> = T extends string
  ? `"${T}"`
  : T extends bigint
  ? `${T}n`
  : T extends symbol
  ? `Symbol(${string})`
  : T extends number | boolean | null | undefined
  ? `${T}`
  : never

export const literalize = <T extends Primitive>(value: T): Literalize<T> =>
  ((): string => {
    if (typeof value === 'string') {
      return `"${value}"`
    }

    if (typeof value === 'bigint') {
      return `${value}n`
    }

    if (typeof value === 'symbol') {
      return `Symbol(${value.description ?? ''})`
    }

    return String(value)
  })() as Literalize<T>
