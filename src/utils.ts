import _ from 'lodash'
import type * as tf from 'type-fest'
import { type BRANDED, type TType } from './types/_internal'

export const isArray = <T>(x: T | readonly T[]): x is readonly T[] => Array.isArray(x)
export const isAsync = <T>(x: T | Promise<T>): x is Promise<T> => x instanceof Promise
export const isFunction = (x: unknown): x is (...args: readonly unknown[]) => unknown => typeof x === 'function'

export const conditionalOmit = <T extends Record<string, unknown>>(
  x: T,
  predicate: (value: T[keyof T]) => boolean
): T => Object.fromEntries(Object.entries(x).filter(([_, value]) => !predicate(value as T[keyof T]))) as T

export namespace u {
  export type Fn = (...args: readonly any[]) => any
  export type Ctor = abstract new (...args: readonly unknown[]) => unknown
  export type AnyRecord = Record<PropertyKey, unknown>

  export type BuiltIn =
    | { readonly [Symbol.toStringTag]: string }
    | Fn
    | Ctor
    | Date
    | Error
    | Generator
    | Primitive
    | Promise<unknown>
    | readonly unknown[]
    | ReadonlyMap<unknown, unknown>
    | ReadonlySet<unknown>
    | RegExp
  export type Primitive = string | number | bigint | boolean | symbol | null | undefined
  export type Falsy = false | '' | 0 | 0n | null | undefined

  export type Not<T, U> = T extends U ? never : T
  export type Defined<T> = Not<T, undefined>

  export type Except<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>

  export type Try<A, B, Catch = never> = A extends B ? A : Catch

  export type Equals<A, B> = (<X>() => X extends A ? 1 : 0) extends <Y>() => Y extends B ? 1 : 0 ? 1 : 0

  export type StripKey<T, K extends keyof T> = T extends unknown ? Except<T, K> : never
  export type LooseStripKey<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never

  export type UnionToIntersection<T> = (T extends unknown ? (x: T) => void : never) extends (
    y: infer Intersection
  ) => void
    ? Intersection
    : never

  export type GetUnionLast<T> = (
    (T extends unknown ? (x: () => T) => void : never) extends (y: infer Intersection) => void ? Intersection : never
  ) extends () => infer Last
    ? Last
    : never

  export type UnionToTuple<T, _Res extends readonly unknown[] = []> = [T] extends [never]
    ? _Res
    : UnionToTuple<Exclude<T, GetUnionLast<T>>, [GetUnionLast<T>, ..._Res]>

  export type AssertTTypes<T extends readonly unknown[]> = Try<T, readonly TType[]>
}

export namespace u {
  export const isArray = <T>(x: T | T[]): x is T[] => _.isArray(x)
  export const isFalsy = (x: unknown): x is Falsy => !x
  export const isFunction = (x: unknown): x is (...args: readonly unknown[]) => unknown => _.isFunction(x)
  export const isPlainObject = (x: unknown): x is AnyRecord => _.isPlainObject(x)
  export const isSet = <T>(x: T | Set<T>): x is Set<T> => _.isSet(x)
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

  export type Join<T extends ReadonlyArray<string | number>, D extends string> = T extends readonly []
    ? ''
    : T extends readonly [string | number]
    ? `${T[0]}`
    : T extends readonly [string | number, ...infer R extends Array<string | number>]
    ? `${T[0]}${D}${Join<R, D>}`
    : string

  export type Split<S extends string, D extends string> = S extends `${infer H}${D}${infer T}`
    ? [H, ...Split<T, D>]
    : S extends D
    ? []
    : [S]

  export type Replace<T extends string, S extends string, R extends string> = T extends `${infer H}${S}${infer T}`
    ? `${H}${R}${T}`
    : T

  export type ReplaceAll<T extends string, S extends string, R extends string> = Join<Split<T, S>, R>

  export type CamelCase<T extends string> = tf.CamelCase<T>

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

  export const join = <T extends readonly string[], D extends string>(str: T, delimiter: D): Join<T, D> =>
    str.join(delimiter) as Join<T, D>

  export const split = <T extends string, D extends string>(str: T, delimiter: D): Split<T, D> =>
    str.split(delimiter) as Split<T, D>

  export const replace = <T extends string, S extends string, R extends string>(
    str: T,
    search: S,
    replace: R
  ): Replace<T, S, R> => str.replace(search, replace) as Replace<T, S, R>

  export const replaceAll = <T extends string, S extends string, R extends string>(
    str: T,
    search: S,
    replace: R
  ): ReplaceAll<T, S, R> => join(split(str, search), replace)

  export const toCamelCase = <T extends string>(str: T): CamelCase<T> => _.camelCase(str) as CamelCase<T>

  export const toSnakeCase = <T extends string>(str: T): tf.SnakeCase<T> => _.snakeCase(str) as tf.SnakeCase<T>
}

export namespace u {
  /* ---------------------------------------------------- Numeric --------------------------------------------------- */

  export type Numeric = number | bigint
  export type Zero = 0 | 0n
  export type Integer<T extends Numeric> = `${T}` extends `${bigint}` ? T : never
  export type Negative<T extends Numeric> = T extends Zero ? never : `${T}` extends `-${string}` ? T : never
  export type NonNegative<T extends Numeric> = T extends Zero ? T : Negative<T> extends never ? T : never
  export type NonNegativeInteger<T extends number> = NonNegative<Integer<T>>

  export type ToNum<T> = T extends `${infer N extends number}` ? N : never
}

export namespace u {
  /* ---------------------------------------------------- Objects --------------------------------------------------- */
  export type OptionalKeysOf<T extends object> = { [K in keyof T]: undefined extends T[K] ? K : never }[keyof T]
  export type RequiredKeysOf<T extends object> = { [K in keyof T]: undefined extends T[K] ? never : K }[keyof T]
  export type EnforceOptional<T extends object> = Pick<T, RequiredKeysOf<T>> & Partial<Pick<T, OptionalKeysOf<T>>>

  export type ConditionalKeys<T, Condition> = NonNullable<
    { [K in keyof T]: T[K] extends Condition ? K : never }[keyof T]
  >
  export type ConditionalPick<T, Condition> = Pick<T, ConditionalKeys<T, Condition>>
  export type ConditionalOmit<T, Condition> = Omit<T, ConditionalKeys<T, Condition>>

  export type OmitIndexSignature<T> = { [K in keyof T as {} extends Record<K, unknown> ? never : K]: T[K] }

  export type Merge<A, B> = Omit<A, keyof B> & B
  export type MergeAll<T extends readonly [unknown, unknown, ...unknown[]]> = T extends readonly [infer A, infer B]
    ? Merge<A, B>
    : T extends readonly [infer A, infer B, infer C, ...infer D]
    ? Merge<A, MergeAll<[B, C, ...D]>>
    : never

  export type Intersect<A, B> = Pick<A, Extract<keyof A, keyof B>>
  export type Diff<A, B> = Pick<A, Exclude<keyof A, keyof B>>

  export type RequireAtLeastOne<T> = tf.RequireAtLeastOne<T>
  export type RequireExactlyOne<T> = tf.RequireExactlyOne<T>

  export type ReadonlyDeep<T> = T extends readonly unknown[]
    ? Readonly<T>
    : T extends BuiltIn
    ? T
    : { readonly [K in keyof T]: ReadonlyDeep<T[K]> }

  export const cloneDeep = <T>(obj: T): T => _.cloneDeep(obj)

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

  export const merge = <A, B>(a: A, b: B): Merge<A, B> => _.merge(cloneDeep(a), cloneDeep(b))
  export const mergeAll = <T extends readonly [unknown, unknown, ...unknown[]]>(...objs: T): MergeAll<T> =>
    objs.reduce((acc, x) => merge(acc, x), {}) as MergeAll<T>

  export const intersect = <A extends AnyRecord, B extends AnyRecord>(a: A, b: B): Intersect<A, B> => pick(a, keys(b))
  export const diff = <A extends AnyRecord, B extends AnyRecord>(a: A, b: B): Diff<A, B> => omit(a, keys(b))

  export const enbrand = <T extends AnyRecord, B extends string>(obj: T, _brand: B): BRANDED<T, B> =>
    obj as BRANDED<T, B>

  export const readonlyDeep = <T extends object>(obj: T): ReadonlyDeep<T> => cloneDeep(obj) as ReadonlyDeep<T>

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

  export type Filter<T extends readonly unknown[], U> = T extends readonly []
    ? []
    : T extends readonly [infer H, ...infer R]
    ? H extends U
      ? Filter<R, U>
      : [H, ...Filter<R, U>]
    : never

  export const head = <T extends readonly unknown[]>(arr: T): Head<T> => arr[0] as Head<T>
  export const tail = <T extends readonly unknown[]>(arr: T): Tail<T> => arr.slice(1) as Tail<T>
  export const reverse = <T extends readonly unknown[]>(arr: T): Reverse<T> => arr.slice().reverse() as Reverse<T>
  export const last = <T extends readonly unknown[]>(arr: T): Last<T> => head(reverse(arr))
  export const includes = <T>(arr: Narrow<readonly T[]>, x: unknown): x is T => tail([x, ...arr]).includes(x)
  export const filterFalsy = <T>(item: T): item is Exclude<T, Falsy> => Boolean(item)
  export const toTuple = <T>(items: readonly T[]): UnionToTuple<T> => items as UnionToTuple<T>
  export const atLeastTwo = <T extends readonly unknown[]>(arr: T): [Head<T>, Head<Tail<T>>, ...Tail<Tail<T>>] => [
    head(arr),
    head(tail(arr)),
    ...tail(tail(arr)),
  ]
}

export namespace u {
  export type Simplify<T> = T extends BuiltIn ? T : { [K in keyof T]: T[K] } & {}
  export type SimplifyDeep<T> = T extends BuiltIn
    ? T
    : Equals<T, unknown> extends 1
    ? T
    : { [K in keyof T]: SimplifyDeep<T[K]> } & {}
  export type Narrow<T> = Try<T, [], _internals.Narrow<T>>

  export const simplify = <T>(x: T): Simplify<T> => x as Simplify<T>
  export const widen = <T>(x: Narrow<T>): T => x as T

  namespace _internals {
    export type Narrow<T> =
      | (T extends readonly [] ? T : never)
      | (T extends string | number | bigint | boolean ? T : never)
      | { [K in keyof T]: T[K] extends Fn ? T[K] : Narrow<T[K]> }
  }
}
