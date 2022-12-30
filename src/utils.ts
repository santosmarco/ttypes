export type Defined<T> = T extends undefined ? never : T
export type Equals<A, B> = (<X>() => X extends A ? 1 : 0) extends <Y>() => Y extends B ? 1 : 0 ? 1 : 0
export type Merge<A, B> = Omit<A, keyof B> & B
export type SimplifyFlat<T> = { [K in keyof T]: T[K] }
export type StrictOmit<T, K extends keyof T> = Omit<T, K>
export type StripKey<T, K extends keyof T> = T extends unknown ? StrictOmit<T, K> : never
export type Try<A, B, Catch = never> = A extends B ? A : Catch
export type ValueOf<T> = T[keyof T]

export const isArray = <T>(x: T | readonly T[]): x is readonly T[] => Array.isArray(x)
export const isAsync = <T>(x: T | Promise<T>): x is Promise<T> => x instanceof Promise
export const isFunction = (x: unknown): x is (...args: readonly unknown[]) => unknown => typeof x === 'function'

export const omit = <T extends Record<string, unknown>>(x: T, predicate: (value: ValueOf<T>) => boolean): T =>
  Object.fromEntries(Object.entries(x).filter(([_, value]) => !predicate(value as ValueOf<T>))) as T
