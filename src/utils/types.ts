import type { Add, Subtract } from 'ts-arithmetic'

export type Fn = (...args: readonly unknown[]) => unknown
export type Ctor = abstract new (...args: readonly unknown[]) => unknown

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

export type LiteralUnion<T, U extends Primitive> = T | (U & Record<never, never>)

export type UnionToIntersection<T> = (T extends unknown ? (x: T) => void : never) extends (i: infer I) => void
  ? I
  : never

/* ----------------------------------------------------- Arrays ----------------------------------------------------- */

export type AssertArray<T, U = unknown> = T extends readonly U[] ? T : never

export type Includes<T extends readonly unknown[], Item> = T extends readonly [T[0], ...infer rest]
  ? { 0: Includes<rest, Item>; 1: 1 }[Equals<T[0], Item>]
  : 0

/* ---------------------------------------------------- Numerics ---------------------------------------------------- */

export type Numeric = number | bigint
export type Zero = 0 | 0n
export type Integer<T extends number> = `${T}` extends `${bigint}` ? T : never
export type Negative<T extends Numeric> = T extends Zero ? never : `${T}` extends `-${string}` ? T : never
export type NonNegative<T extends Numeric> = T extends Zero ? T : Negative<T> extends never ? T : never
export type NonNegativeInteger<T extends number> = NonNegative<Integer<T>>

/**
 * Generates a union of number literals from `S` (inclusive) to `E` (exclusive by default).
 *
 * To make `E` inclusive, pass `{ maxInclusive: true }` as the third argument.
 */
export type NumericRange<
  S extends number,
  E extends number,
  Opts extends { readonly maxInclusive?: boolean } = {},
  _Res extends number = S
> = E extends (Opts['maxInclusive'] extends true ? _Res : Subtract<_Res, 1>)
  ? _Res
  : NumericRange<S, E, Opts, _Res | Add<_Res, 1>>

/* ---------------------------------------------------- Coercers ---------------------------------------------------- */

export type ToNumber<T extends string> = T extends `${infer N extends number}` ? N : never
export type ToBoolean<T extends 0 | 1> = T extends 0 ? false : true

/* ---------------------------------------------------- Functions --------------------------------------------------- */

type _Narrow<T> =
  | (T extends readonly [] ? T : never)
  | (T extends string | number | bigint | boolean ? T : never)
  | { [K in keyof T]: T[K] extends Function ? T[K] : _Narrow<T[K]> }
export type Narrow<T> = Try<T, [], _Narrow<T>>
