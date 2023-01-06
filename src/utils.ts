import cloneDeep_ from 'clone-deep'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Fn = (...args: readonly any[]) => any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Ctor = abstract new (...args: readonly any[]) => any
export type Primitive = string | number | bigint | boolean | symbol | null | undefined
export type BuiltIn =
  | { readonly [Symbol.toStringTag]: string }
  | Ctor
  | Date
  | Error
  | Fn
  | Generator
  | Primitive
  | Promise<unknown>
  | readonly unknown[]
  | ReadonlyMap<unknown, unknown>
  | ReadonlySet<unknown>
  | RegExp
export type Defined<T> = T extends undefined ? never : T
export type Equals<A, B> = (<X>() => X extends A ? 1 : 0) extends <Y>() => Y extends B ? 1 : 0 ? 1 : 0
export type Merge<A, B> = Omit<A, keyof B> & B
export type Intersect<A, B> = Pick<A, Extract<keyof A, keyof B>>
export type Diff<A, B> = Pick<A, Exclude<keyof A, keyof B>>
export type SimplifyFlat<T> = { 0: T extends BuiltIn ? T : { [K in keyof T]: T[K] }; 1: T }[Equals<T, unknown>]
export type SimplifyDeep<T> = { 0: T extends BuiltIn ? T : { [K in keyof T]: SimplifyDeep<T[K]> }; 1: T }[Equals<
  T,
  unknown
>]
export type StrictOmit<T, K extends keyof T> = Omit<T, K>
export type StripKey<T, K extends keyof T> = T extends unknown ? StrictOmit<T, K> : never
export type LooseStripKey<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never
export type Try<A, B, Catch = never> = A extends B ? A : Catch
export type ValueOf<T> = T[keyof T]
export type OmitIndexSignature<T> = { [K in keyof T as {} extends Record<K, unknown> ? never : K]: T[K] }
export type ConditionalKeys<T, Condition> = NonNullable<{ [K in keyof T]: T[K] extends Condition ? K : never }[keyof T]>
export type ConditionalOmit<T, Condition> = StrictOmit<T, ConditionalKeys<T, Condition>>
export type LiteralUnion<T, U extends Primitive> = T | (U & Record<never, never>)
export type UnionToIntersection<T> = (T extends unknown ? (x: T) => void : never) extends (
  i: infer Intersection
) => void
  ? Intersection
  : never
type Numeric = number | bigint
type Zero = 0 | 0n
export type Integer<T extends number> = `${T}` extends `${bigint}` ? T : never
export type Negative<T extends Numeric> = T extends Zero ? never : `${T}` extends `-${string}` ? T : never
export type NonNegative<T extends Numeric> = T extends Zero ? T : Negative<T> extends never ? T : never
export type NonNegativeInteger<T extends number> = NonNegative<Integer<T>>
export type ToNumber<T extends string> = T extends `${infer N extends number}` ? N : never
export type ToBoolean<T extends 0 | 1> = T extends 0 ? false : true
export type Split<S extends string, D extends string> = S extends `${infer H}${D}${infer T}`
  ? [H, ...Split<T, D>]
  : S extends D
  ? []
  : [S]
export type Replace<
  T extends string,
  S extends string,
  R extends string,
  Opts extends { readonly all?: boolean } = {}
> = T extends `${infer H}${S}${infer T}`
  ? Opts['all'] extends true
    ? `${H}${R}${Replace<T, S, R, Opts>}`
    : `${H}${R}${T}`
  : T
export type Literalize<T extends Primitive> = T extends string
  ? `"${T}"`
  : T extends bigint
  ? `${T}n`
  : T extends symbol
  ? `Symbol(${string})`
  : T extends number | boolean | null | undefined
  ? `${T}`
  : never
type _NarrowRaw<T> =
  | (T extends [] ? [] : never)
  | (T extends string | number | bigint | boolean ? T : never)
  | { [K in keyof T]: T[K] extends Function ? T[K] : _NarrowRaw<T[K]> }
export type Narrow<T> = Try<T, [], _NarrowRaw<T>>

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

export const isArray = <T>(x: T | readonly T[]): x is readonly T[] => Array.isArray(x)
export const isAsync = <T>(x: T | Promise<T>): x is Promise<T> => x instanceof Promise
export const isFunction = (x: unknown): x is (...args: readonly unknown[]) => unknown => typeof x === 'function'

export const conditionalOmit = <T extends Record<string, unknown>>(
  x: T,
  predicate: (value: ValueOf<T>) => boolean
): T => Object.fromEntries(Object.entries(x).filter(([_, value]) => !predicate(value as ValueOf<T>))) as T

export const cloneDeep = <T>(data: T): T => {
  if (typeof data === 'symbol') {
    return data
  }

  return cloneDeep_(data)
}
