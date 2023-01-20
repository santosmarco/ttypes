import _ from 'lodash'
import type * as tf from 'type-fest'
import { type BRANDED, type TType } from './types/_internal'

export namespace u {
  export type Strictness = 'loose' | 'strict'

  export type _<T> = { [K in keyof T]: T[K] } & {}

  export type Primitive = bigint | boolean | number | string | symbol | null | undefined
  export type Falsy = '' | 0 | 0n | false | null | undefined

  export type List<T = any> = readonly T[]

  export type TypedArray = BigInt64Array | BigUint64Array | Float32Array | Float64Array | Int8Array | Int16Array | Int32Array | Uint8Array | Uint8ClampedArray | Uint16Array | Uint32Array

  export type Fn<A extends List = List, R = any> = (...args: A) => R

  export type Ctor<A extends List = List, R = any> = new (...args: A) => R
  export type AbstractCtor<A extends List = List, R = any> = abstract new (...args: A) => R
  export type AnyCtor = AbstractCtor | Ctor

  export type BuiltIn = AnyCtor | Date | Error | Fn | Generator | List | Primitive | Promise<any> | ReadonlyMap<any, any> | ReadonlySet<any> | RegExp | { readonly [Symbol.toStringTag]: string }

  export type AnyRecord = Record<PropertyKey, unknown>

  export type Not<T, U> = T extends U ? never : T
  export type Defined<T> = Not<T, undefined>

  export type Nullish<T> = T | null | undefined

  export type Except<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>

  export type At<T, K extends PropertyKey, S extends Strictness = 'strict'> = {
    strict: T[K & keyof T]
    loose: T extends unknown ? At<T, K> : never
  }[S]

  export type OptionalKeysOf<T> = { [K in keyof T]: undefined extends T[K] ? K : never }[keyof T]
  export type RequiredKeysOf<T> = { [K in keyof T]: undefined extends T[K] ? never : K }[keyof T]
  export type EnforceOptional<T> = Partial<Pick<T, OptionalKeysOf<T>>> & Pick<T, RequiredKeysOf<T>>

  export type ConditionalKeys<T, Condition> = NonNullable<{ [K in keyof T]: T[K] extends Condition ? K : never }[keyof T]>
  export type ConditionalPick<T, Condition> = Pick<T, ConditionalKeys<T, Condition>>
  export type ConditionalOmit<T, Condition> = Omit<T, ConditionalKeys<T, Condition>>

  export type OmitIndexSignature<T> = _<{ [K in keyof T as {} extends Record<K, unknown> ? never : K]: T[K] }>

  export type Merge<A, B> = _<B & Omit<A, keyof B>>
  export type MergeAll<T extends readonly [unknown, unknown, ...unknown[]]> = T extends readonly [infer A, infer B]
    ? Merge<A, B>
    : T extends readonly [infer A, infer B, infer C, ...infer D]
    ? Merge<A, MergeAll<[B, C, ...D]>>
    : never

  export type Intersect<A, B> = _<Pick<A, Extract<keyof A, keyof B>>>
  export type Diff<A, B> = _<Pick<A, Exclude<keyof A, keyof B>>>

  export type Patch<T, U, P> = _<{ [K in keyof T]: T[K] extends P ? At<U, K> : T[K] }>

  export type RequireAtLeastOne<T> = tf.RequireAtLeastOne<T>
  export type RequireExactlyOne<T> = tf.RequireExactlyOne<T>

  export type ReadonlyDeep<T> = T extends readonly unknown[] ? Readonly<T> : T extends BuiltIn ? T : { readonly [K in keyof T]: ReadonlyDeep<T[K]> }

  export type Try<A, B, Catch = never> = A extends B ? A : Catch

  export type Equals<A, B> = (<X>() => X extends A ? 1 : 0) extends <Y>() => Y extends B ? 1 : 0 ? 1 : 0

  export type StripKey<T, K extends keyof T> = T extends unknown ? Except<T, K> : never
  export type LooseStripKey<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never

  export type UnionToIntersection<T> = (T extends unknown ? (x: T) => void : never) extends (y: infer Intersection) => void ? Intersection : never

  export type GetUnionLast<T> = ((T extends unknown ? (x: () => T) => void : never) extends (y: infer Intersection) => void ? Intersection : never) extends () => infer Last ? Last : never

  export type UnionToTuple<T, _Res extends readonly unknown[] = []> = [T] extends [never] ? _Res : UnionToTuple<Exclude<T, GetUnionLast<T>>, [GetUnionLast<T>, ..._Res]>

  declare const __brand: unique symbol
  export type Brand<T, B> = T & { get [__brand](): B }

  export type AllKeys<T> = T extends unknown ? keyof T : never

  export type LiteralUnion<T, U extends Primitive> = T | (Record<never, never> & U)

  export type Str<T> = T & string

  declare const TYPE_ERROR: unique symbol
  export type $TypeError<Msg extends string> = [typeof TYPE_ERROR, Msg]
  export type $TTypeError<Msg extends string> = TType<$TypeError<Msg>>

  export const invert = <T extends boolean>(x: T): T extends true ? false : true => !x as T extends true ? false : true

  export const ifExtends = <T, U, Then, Otherwise>(x: T, y: Narrow<U>, then: Narrow<Then>, otherwise: Narrow<Otherwise>) => (x === y ? then : otherwise) as T extends U ? Then : Otherwise
}

export namespace u {
  export const isArray = (x: unknown): x is readonly unknown[] => _.isArray(x)
  export const isAsync = <T>(x: Promise<T> | T): x is Promise<T> => Boolean(x && (typeof x === 'object' || typeof x === 'function') && 'then' in x && typeof x.then === 'function')
  export const isBigInt = (x: unknown): x is bigint => typeof x === 'bigint'
  export const isBoolean = (x: unknown): x is boolean => typeof x === 'boolean'
  export const isBuffer = (x: unknown): x is Buffer => _.isBuffer(x)
  export const isObject = (x: unknown): x is AnyRecord => _.isObject(x)
  export const isDate = (x: unknown): x is Date => _.isDate(x)
  export const isFalsy = (x: unknown): x is Falsy => !x
  export const isFunction = (x: unknown): x is Fn => _.isFunction(x)
  export const isMap = (x: unknown): x is Map<unknown, unknown> => _.isMap(x)
  export const isNil = (x: unknown): x is null | undefined => _.isNil(x)
  export const isNull = (x: unknown): x is null => _.isNull(x)
  export const isNumber = (x: unknown): x is number => _.isNumber(x)
  export const isRegExp = (x: unknown): x is RegExp => _.isRegExp(x)
  export const isSet = <T>(x: Set<T> | T): x is Set<T> => _.isSet(x)
  export const isString = (x: unknown): x is string => _.isString(x)
  export const isSymbol = (x: unknown): x is symbol => _.isSymbol(x)
  export const isTypedArray = (x: unknown): x is TypedArray => _.isTypedArray(x)
  export const isUndefined = (x: unknown): x is undefined => _.isUndefined(x)
  export const isWeakMap = (x: unknown): x is WeakMap<object, unknown> => _.isWeakMap(x)
  export const isWeakSet = (x: unknown): x is WeakSet<object> => _.isWeakSet(x)
  export const isPrimitive = (x: unknown): x is Primitive => isNil(x) || isString(x) || isNumber(x) || isBigInt(x) || isBoolean(x) || isSymbol(x)

  export const isConstructor = (x: unknown): x is Ctor => {
    try {
      // eslint-disable-next-line no-new
      new (x as new (...args: readonly any[]) => any)()
      return true
    } catch {
      return false
    }
  }
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
    : T extends boolean | number | null | undefined
    ? `${T}`
    : never

  export type Join<T extends ReadonlyArray<number | string>, D extends string> = T extends readonly []
    ? ''
    : T extends readonly [number | string]
    ? `${T[0]}`
    : T extends readonly [number | string, ...infer R extends Array<number | string>]
    ? `${T[0]}${D}${Join<R, D>}`
    : string

  export type Split<S extends string, D extends string> = S extends `${infer H}${D}${infer T}` ? [H, ...Split<T, D>] : S extends D ? [] : [S]

  export type Replace<T extends string, S extends string, R extends string> = T extends `${infer H}${S}${infer T}` ? `${H}${R}${T}` : T

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

  export const join = <T extends readonly string[], D extends string>(str: T, delimiter: D): Join<T, D> => str.join(delimiter) as Join<T, D>

  export const split = <T extends string, D extends string>(str: T, delimiter: D): Split<T, D> => str.split(delimiter) as Split<T, D>

  export const replace = <T extends string, S extends string, R extends string>(str: T, search: S, replace: R): Replace<T, S, R> => str.replace(search, replace) as Replace<T, S, R>

  export const replaceAll = <T extends string, S extends string, R extends string>(str: T, search: S, replace: R): ReplaceAll<T, S, R> => join(split(str, search), replace)

  export const toCamelCase = <T extends string>(str: T): CamelCase<T> => _.camelCase(str) as CamelCase<T>

  export const toSnakeCase = <T extends string>(str: T): tf.SnakeCase<T> => _.snakeCase(str) as tf.SnakeCase<T>
}

export namespace u {
  /* ---------------------------------------------------- Numeric --------------------------------------------------- */
  export type Numeric = bigint | number
  export type Zero = 0 | 0n
  export type Integer<T extends Numeric> = `${T}` extends `${bigint}` ? T : never
  export type Negative<T extends Numeric> = T extends Zero ? never : `${T}` extends `-${string}` ? T : never
  export type NonNegative<T extends Numeric> = T extends Zero ? T : Negative<T> extends never ? T : never
  export type NonNegativeInteger<T extends number> = NonNegative<Integer<T>>

  export type ToNum<T> = T extends `${infer N extends number}` ? N : never
}

export namespace u {
  /* ---------------------------------------------------- Objects --------------------------------------------------- */
  export const cloneDeep = <T>(obj: T): T => _.cloneDeep(obj)

  export const keys = <T extends AnyRecord>(obj: T): List<keyof T> => [...Object.keys(obj), ...Object.getOwnPropertySymbols(obj)]
  export const values = <T extends AnyRecord>(obj: T): List<T[keyof T]> => keys(obj).map((k) => obj[k])
  export const entries = <T extends AnyRecord>(obj: T): List<[keyof T, T[keyof T]]> => keys(obj).map((k) => [k, obj[k]])
  export const fromEntries = <K extends PropertyKey, V>(entries: List<[K, V]>): Record<K, V> => entries.reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {}) as Record<K, V>

  export const pick = <T extends object, K extends keyof T>(obj: T, keys: readonly K[]): Pick<T, K> => _.pick(obj, keys)
  export const omit = <T extends object, K extends keyof T>(obj: T, keys: readonly K[]): Except<T, K> => _.omit(obj, keys)

  export const merge = <A, B>(a: A, b: B): Merge<A, B> => _.merge(cloneDeep(a), cloneDeep(b))
  export const mergeAll = <T extends readonly [unknown, unknown, ...unknown[]]>(...objs: T): MergeAll<T> => objs.reduce((acc, x) => merge(acc, x), {}) as MergeAll<T>

  export const intersect = <A extends AnyRecord, B extends AnyRecord>(a: A, b: B): Intersect<A, B> => pick(a, keys(b))
  export const diff = <A extends AnyRecord, B extends AnyRecord>(a: A, b: B): Diff<A, B> => omit(a, keys(b))

  export const enbrand = <T extends AnyRecord, B extends string>(obj: T, _brand: B): Brand<T, B> => obj as Brand<T, B>

  export const readonlyDeep = <T extends object>(obj: T): ReadonlyDeep<T> => cloneDeep(obj) as ReadonlyDeep<T>

  export const toSnakeCaseProps = <T extends AnyRecord>(obj: T): tf.SnakeCasedProperties<T> => fromEntries(entries(obj).map(([k, v]) => [toSnakeCase(String(k)), v])) as tf.SnakeCasedProperties<T>
}

export namespace u {
  /* ---------------------------------------------------- Arrays ---------------------------------------------------- */
  export type Head<T extends readonly unknown[], Catch = never> = T extends readonly [] ? Catch : T extends readonly [infer H, ...unknown[]] ? H : Catch | T[number]

  export type Tail<T extends readonly unknown[]> = T extends readonly [] ? [] : T extends readonly [unknown, ...infer R] ? R : T

  export type Reverse<T extends readonly unknown[]> = T extends readonly [] ? [] : T extends readonly [infer H, ...infer R] ? [...Reverse<R>, H] : T

  export type Last<T extends readonly unknown[], Catch = never> = Head<Reverse<T>, Catch>

  export type Filter<T extends readonly unknown[], U> = T extends readonly [] ? [] : T extends readonly [infer H, ...infer R] ? (H extends U ? [H, ...Filter<R, U>] : Filter<R, U>) : []

  export type BuildTuple<T, N extends number, _Acc extends readonly unknown[] = []> = _Acc['length'] extends N ? _Acc : BuildTuple<T, N, [..._Acc, T]>

  export const head = <T extends readonly unknown[], D = never>(arr: T, def?: D): Head<T, D> => (arr[0] ?? def) as Head<T, D>
  export const tail = <T extends readonly unknown[]>(arr: T): Tail<T> => arr.slice(1) as Tail<T>
  export const reverse = <T extends readonly unknown[]>(arr: T): Reverse<T> => arr.slice().reverse() as Reverse<T>
  export const last = <T extends readonly unknown[], D = never>(arr: T, def?: D): Last<T, D> => head(reverse(arr), def)
  export const includes = <T>(arr: Narrow<readonly T[]>, x: unknown): x is T => tail([x, ...arr]).includes(x)

  export const filterFalsy = <T>(item: T): item is Exclude<T, Falsy> => item !== false || item !== null || item !== undefined || item !== 0 || item !== '' || item !== BigInt(0)
  export const map = <T extends readonly unknown[], U>(arr: T, fn: (x: T[number], i: number) => U): { [K in keyof T]: U } => arr.map(fn) as { [K in keyof T]: U }
  export const buildTuple = <T, N extends number>(x: T, n: N): BuildTuple<T, N> => Array(n).fill(x) as BuildTuple<T, N>

  export function filter<T extends readonly unknown[], U>(arr: T | null | undefined, fn: (x: T[number], i: number) => x is U): Filter<T, U>
  export function filter<T extends readonly unknown[]>(arr: T | null | undefined, fn: (x: T[number], i: number) => boolean): T[]
  export function filter(arr: readonly unknown[] | null | undefined, fn: (x: unknown, i: number) => unknown) {
    return _.filter(arr, fn)
  }
}

export namespace u {
  export type Simplify<T> = T extends BRANDED<unknown, any> | BuiltIn ? T : { [K in keyof T]: T[K] } & {}
  export type SimplifyDeep<T> = T extends BRANDED<unknown, any> | BuiltIn ? T : Equals<T, unknown> extends 1 ? T : { [K in keyof T]: SimplifyDeep<T[K]> } & {}

  export type Narrow<T> = Try<T, [], _internals.Narrow<T>>

  export const widen = <T>(x: Narrow<T>): T => x as T

  namespace _internals {
    export type Narrow<T> = (T extends [] ? [] : never) | (T extends bigint | boolean | number | string ? T : never) | { [K in keyof T]: T[K] extends Function ? T[K] : Narrow<T[K]> }
  }
}
