export type Try<A, B, Catch = never> = A extends B ? A : Catch

export type Equals<A, B> = (<X>() => X extends A ? 1 : 0) extends <Y>() => Y extends B ? 1 : 0 ? 1 : 0

export type Merge<A, B> = Omit<A, keyof B> & B

export const merge = <A, B>(a: A, b: B): Merge<A, B> => ({ ...a, ...b })

export type SimplifyFlat<T> = { [K in keyof T]: T[K] }

export type StrictOmit<T, K extends keyof T> = Omit<T, K>
export type StripKey<T, K extends keyof T> = T extends unknown ? StrictOmit<T, K> : never

export type EnforcePartialTuple<T extends readonly unknown[]> = T extends readonly []
  ? T
  : T extends readonly [infer H, ...infer R]
  ? [...(H extends undefined ? [H?] : [H]), ...EnforcePartialTuple<R>]
  : T

export const isAsync = <T>(x: T | Promise<T>): x is Promise<T> => x instanceof Promise
export const isArray = <T>(x: T | readonly T[]): x is readonly T[] => Array.isArray(x)

export const omit = <T extends object>(x: T, predicate: (value: T) => boolean): T =>
  Object.fromEntries(Object.entries(x).filter(([_, value]) => !predicate(value))) as T
