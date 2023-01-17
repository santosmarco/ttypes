import _ from 'lodash'
import type * as tf from 'type-fest'

export const isArray = <T>(x: T | readonly T[]): x is readonly T[] => Array.isArray(x)
export const isAsync = <T>(x: T | Promise<T>): x is Promise<T> => x instanceof Promise
export const isFunction = (x: unknown): x is (...args: readonly unknown[]) => unknown => typeof x === 'function'

export const conditionalOmit = <T extends Record<string, unknown>>(
  x: T,
  predicate: (value: T[keyof T]) => boolean
): T => Object.fromEntries(Object.entries(x).filter(([_, value]) => !predicate(value as T[keyof T]))) as T

export namespace u {
  export type Primitive = string | number | bigint | boolean | symbol | null | undefined
  export type Falsy = false | '' | 0 | 0n | null | undefined

  export type AnyFn = (...args: readonly any[]) => any
  export type AnyRecord = Record<PropertyKey, unknown>

  export type Not<T, U> = T extends U ? never : T
  export type Defined<T> = Not<T, undefined>

  export type Except<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>

  export type Try<A, B, Catch = never> = A extends B ? A : Catch

  export type Equals<A, B> = (<X>() => X extends A ? 1 : 0) extends <Y>() => Y extends B ? 1 : 0 ? 1 : 0

  export type StripKey<T, K extends keyof T> = T extends unknown ? Except<T, K> : never
}

export namespace u {
  export const isPlainObject = (x: unknown): x is AnyRecord => _.isPlainObject(x)
  export const isArray = <T>(x: T | T[]): x is T[] => _.isArray(x)
  export const isSet = <T>(x: T | Set<T>): x is Set<T> => _.isSet(x)
  export const isFunction = (x: unknown): x is (...args: readonly unknown[]) => unknown => _.isFunction(x)
  export const isFalsy = (x: unknown): x is Falsy => !x
  export const isPrimitive = (x: unknown): x is Primitive =>
    typeof x === 'string' ||
    typeof x === 'number' ||
    typeof x === 'bigint' ||
    typeof x === 'boolean' ||
    typeof x === 'symbol' ||
    x === null ||
    x === undefined
  export const isAsync = <T>(x: T | Promise<T>): x is Promise<T> =>
    Boolean(x && (typeof x === 'object' || typeof x === 'function') && 'then' in x && typeof x.then === 'function')
}

export namespace u {
  /* ---------------------------------------------------- Strings --------------------------------------------------- */

  export type Literalized<T extends Primitive = Primitive> = T extends string
    ? T extends ''
      ? 'empty string'
      : `"${T}"`
    : T extends bigint
    ? `${T}n`
    : T extends symbol
    ? `Symbol(${string})`
    : T extends number | boolean | null | undefined
    ? `${T}`
    : never

  export const literalize = <T extends Primitive>(value: T): Literalized<T> =>
    ((): string => {
      if (typeof value === 'string') {
        return value ? `"${value}"` : 'empty string'
      }

      if (typeof value === 'bigint') {
        return `${value}n`
      }

      if (typeof value === 'symbol') {
        return `Symbol(${value.description ?? ''})`
      }

      return String(value)
    })() as Literalized<T>

  export const toCamelCase = <T extends string>(str: T): tf.CamelCase<T> => _.camelCase(str) as tf.CamelCase<T>
  export const toSnakeCase = <T extends string>(str: T): tf.SnakeCase<T> => _.snakeCase(str) as tf.SnakeCase<T>
}

export namespace u {
  /* ---------------------------------------------------- Numeric --------------------------------------------------- */

  export type Numeric = number | bigint
  export type Zero = 0 | 0n
  export type Integer<T extends number> = `${T}` extends `${bigint}` ? T : never
  export type Negative<T extends Numeric> = T extends Zero ? never : `${T}` extends `-${string}` ? T : never
  export type NonNegative<T extends Numeric> = T extends Zero ? T : Negative<T> extends never ? T : never
  export type NonNegativeInteger<T extends number> = NonNegative<Integer<T>>
}

export namespace u {
  /* ---------------------------------------------------- Objects --------------------------------------------------- */

  export type Merge<A, B> = Omit<A, keyof B> & B

  export type MergeAll<T extends readonly [unknown, unknown, ...unknown[]]> = T extends readonly [infer A, infer B]
    ? Merge<A, B>
    : T extends readonly [infer A, infer B, infer C, ...infer D]
    ? Merge<A, MergeAll<[B, C, ...D]>>
    : never

  export type Intersect<A, B> = Pick<A, Extract<keyof A, keyof B>>

  export type Diff<A, B> = Pick<A, Exclude<keyof A, keyof B>>

  export type RequireAtLeastOne<T> = tf.RequireAtLeastOne<T>

  export const keys = <T extends AnyRecord>(obj: T): ReadonlyArray<keyof T> => [
    ...Object.keys(obj),
    ...Object.getOwnPropertySymbols(obj),
  ]

  export const values = <T extends AnyRecord>(obj: T): ReadonlyArray<T[keyof T]> => keys(obj).map((k) => obj[k])

  export const entries = <T extends AnyRecord>(obj: T): ReadonlyArray<[keyof T, T[keyof T]]> =>
    keys(obj).map((k) => [k, obj[k]])

  export const fromEntries = <K extends PropertyKey, V>(entries: ReadonlyArray<[K, V]>): Record<K, V> =>
    entries.reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {}) as Record<K, V>

  export const pick = <T extends object, K extends keyof T>(obj: T, keys: readonly K[]): Pick<T, K> => _.pick(obj, keys)

  export const omit = <T extends object, K extends keyof T>(obj: T, keys: readonly K[]): Except<T, K> =>
    _.omit(obj, keys)

  export const cloneDeep = <T>(obj: T): T => _.cloneDeep(obj)

  export const merge = <A, B>(a: A, b: B): Merge<A, B> => _.merge(cloneDeep(a), cloneDeep(b))

  export const mergeAll = <T extends readonly [unknown, unknown, ...unknown[]]>(...objs: T): MergeAll<T> =>
    objs.reduce((acc, x) => merge(acc, x), {}) as MergeAll<T>

  export const intersect = <A extends AnyRecord, B extends AnyRecord>(a: A, b: B): Intersect<A, B> => pick(a, keys(b))

  export const diff = <A extends AnyRecord, B extends AnyRecord>(a: A, b: B): Diff<A, B> => omit(a, keys(b))

  export const toSnakeCaseProps = <T extends AnyRecord>(obj: T): tf.SnakeCasedProperties<T> =>
    fromEntries(entries(obj).map(([k, v]) => [toSnakeCase(String(k)), v])) as tf.SnakeCasedProperties<T>
}

export namespace u {
  /* ---------------------------------------------------- Arrays ---------------------------------------------------- */

  export type Head<T extends readonly unknown[], Catch = never> = T extends readonly []
    ? Catch
    : T extends readonly [infer H, ...unknown[]]
    ? H
    : T[number] | Catch

  export type Tail<T extends readonly unknown[]> = T extends readonly []
    ? []
    : T extends readonly [unknown, ...infer R]
    ? [...R]
    : [...T]

  export type Reverse<T extends readonly unknown[]> = T extends readonly []
    ? []
    : T extends readonly [infer H, ...infer R]
    ? [...Reverse<R>, H]
    : [...T]

  export type Last<T extends readonly unknown[], Catch = never> = Head<Reverse<T>, Catch>

  export const head = <T extends readonly unknown[]>(arr: T): Head<T> => arr[0] as Head<T>
  export const tail = <T extends readonly unknown[]>(arr: T): Tail<T> => arr.slice(1) as Tail<T>
  export const reverse = <T extends readonly unknown[]>(arr: T): Reverse<T> => arr.slice().reverse() as Reverse<T>
  export const last = <T extends readonly unknown[]>(arr: T): Last<T> => head(reverse(arr))
  export const includes = <T>(arr: Narrow<readonly T[]>, x: unknown): x is T => tail([x, ...arr]).includes(x)
  export const filterFalsy = <T>(item: T): item is Exclude<T, Falsy> => Boolean(item)
}

export namespace u {
  export type Simplify<T> = { [K in keyof T]: T[K] } & {}
  export type Narrow<T> = Try<T, [], _internals.Narrow<T>>

  export const simplify = <T>(x: T): Simplify<T> => x as Simplify<T>
  export const widen = <T>(x: Narrow<T>): T => x as T

  namespace _internals {
    export type Narrow<T> =
      | (T extends readonly [] ? T : never)
      | (T extends string | number | bigint | boolean ? T : never)
      | { [K in keyof T]: T[K] extends AnyFn ? T[K] : Narrow<T[K]> }
  }
}
