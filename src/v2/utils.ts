import typeDetect from 'type-detect'
import type * as TF from 'type-fest'
import { TParsedType } from '../parse'

export namespace utils {
  namespace _internals {
    export type Narrow<T> =
      | (T extends readonly [] ? T : never)
      | (T extends string | number | bigint | boolean ? T : never)
      | { [K in keyof T]: T[K] extends Function ? T[K] : Narrow<T[K]> }

    export const makeIsType =
      <T>(type: 'Array' | 'Promise' | 'Date' | 'function' | 'Map' | 'RegExp' | 'null' | 'Set') =>
      <U>(x: U): x is Extract<U, T> =>
        typeDetect(x) === type

    export const makeIsBuffer =
      () =>
      <T>(x: T): x is Extract<T, Buffer> =>
        Boolean(
          typeof x === 'object' &&
            x !== null &&
            'constructor' in x &&
            'isBuffer' in x.constructor &&
            typeof x.constructor.isBuffer === 'function' &&
            x.constructor.isBuffer(x)
        )
  }

  export type AnyFn = (...args: readonly any[]) => any
  export type AnyCtor = abstract new (...args: readonly any[]) => any
  export type AnyPromise = Promise<unknown>
  export type AnyMap = Map<unknown, unknown>
  export type AnySet = Set<unknown>

  export type Primitive = string | number | bigint | boolean | symbol | null | undefined

  export type Defined<T> = T extends undefined ? never : T

  export type Try<T, U, Catch = never> = T extends U ? T : Catch
  export type Test<T, U> = Extract<T, U> extends infer X ? ([X, never] extends [never, X] ? U : X) : never

  export type StrictOmit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>
  export type StrictExclude<T, U extends T> = Exclude<T, U>

  export type Simplify<T> = { [K in keyof T]: T[K] } & {}

  export const BRAND = Symbol('t.BRAND')
  export type BRAND = typeof BRAND
  export type BRANDED<T, B> = T & { readonly [BRAND]: B }
  export type UNBRANDED<T> = Omit<T, BRAND>

  export type Exact<T, U> = TF.Exact<T, U>

  export type Merge<A, B> = Omit<A, keyof B> & B
  export type MergeDeep<A, B> = TF.MergeDeep<A, B>

  export type ReadonlyDeep<T> = TF.ReadonlyDeep<T>

  export type OptionalKeysOf<T> = Exclude<{ [K in keyof T]: T extends Record<K, T[K]> ? never : K }[keyof T], undefined>
  export type RequiredKeysOf<T> = Exclude<keyof T, OptionalKeysOf<T>>
  export type HasKey<T, K extends keyof Required<T>> = K extends keyof T ? 1 : 0

  export type LiteralUnion<T, B extends Primitive> = T | (B & Record<never, never>)

  export type CamelCase<T extends string> = TF.CamelCase<T>
  export type CamelCaseProperties<T> = TF.CamelCasedProperties<T>

  export type Narrow<T> = Try<T, [], _internals.Narrow<T>>

  export const isArray = _internals.makeIsType<readonly unknown[]>(TParsedType.Array)
  export const isAsync = _internals.makeIsType<AnyPromise>(TParsedType.Promise)
  export const isBuffer = _internals.makeIsBuffer()
  export const isDate = _internals.makeIsType<Date>(TParsedType.Date)
  export const isFunction = _internals.makeIsType<AnyFn>(TParsedType.Function)
  export const isMap = _internals.makeIsType<AnyMap>(TParsedType.Map)
  export const isNull = _internals.makeIsType<null>(TParsedType.Null)
  export const isRegExp = _internals.makeIsType<RegExp>(TParsedType.RegExp)
  export const isSet = _internals.makeIsType<AnySet>(TParsedType.Set)

  export const enbrand = <T, B>(x: T, _brand: B): BRANDED<T, B> => x as BRANDED<T, B>
  export const debrand = <T>(x: T): UNBRANDED<T> => x
}
