import cloneDeep_ from 'clone-deep'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Fn = (...args: readonly any[]) => any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Ctor = abstract new (...args: readonly any[]) => any
export type BuiltIn =
  | { readonly [Symbol.toStringTag]: string }
  | Ctor
  | Date
  | Error
  | Fn
  | Generator
  | Promise<unknown>
  | readonly unknown[]
  | ReadonlyMap<unknown, unknown>
  | ReadonlySet<unknown>
  | RegExp
export type Defined<T> = T extends undefined ? never : T
export type Equals<A, B> = (<X>() => X extends A ? 1 : 0) extends <Y>() => Y extends B ? 1 : 0 ? 1 : 0
export type Merge<A, B> = Omit<A, keyof B> & B
export type Simplify<T> = { 0: T extends BuiltIn ? T : { [K in keyof T]: Simplify<T[K]> }; 1: T }[Equals<T, unknown>]
export type StrictOmit<T, K extends keyof T> = Omit<T, K>
export type StripKey<T, K extends keyof T> = T extends unknown ? StrictOmit<T, K> : never
export type LooseStripKey<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never
export type Try<A, B, Catch = never> = A extends B ? A : Catch
export type ValueOf<T> = T[keyof T]

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
