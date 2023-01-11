import { TParsedType } from '../parse'
import { arrayUtils } from './arrays'
import { stringUtils } from './strings'

export interface ObjectUtils {
  isObject(obj: unknown): obj is objectUtils.AnyRecord
  keys<T extends objectUtils.AnyRecord>(obj: T): ReadonlyArray<keyof T>
  keys(obj: object): readonly PropertyKey[]
  values<T extends objectUtils.AnyRecord>(obj: T): ReadonlyArray<T[keyof T]>
  values(obj: object): readonly unknown[]
  entries<T extends objectUtils.AnyRecord>(obj: T): ReadonlyArray<[key: keyof T, value: T[keyof T]]>
  fromEntries<K extends PropertyKey, V>(entries: ReadonlyArray<[key: K, value: V]>): Record<K, V>
  pick<T extends objectUtils.AnyRecord, K extends keyof T>(obj: T, keys: readonly K[]): Pick<T, K>
  omit<T extends objectUtils.AnyRecord, K extends keyof T>(obj: T, keys: readonly K[]): Omit<T, K>
  intersect<A extends objectUtils.AnyRecord, B extends objectUtils.AnyRecord>(a: A, b: B): objectUtils.Intersect<A, B>
  diff<A extends objectUtils.AnyRecord, B extends objectUtils.AnyRecord>(a: A, b: B): objectUtils.Diff<A, B>
  camelCaseProperties<T extends objectUtils.AnyRecord>(obj: T): objectUtils.CamelCaseProperties<T>
  snakeCaseProperties<T extends objectUtils.AnyRecord>(obj: T): objectUtils.SnakeCaseProperties<T>
}

export const objectUtils: ObjectUtils = {
  isObject(obj: unknown): obj is objectUtils.AnyRecord {
    return obj !== null && typeof obj === 'object' && TParsedType.get(obj) === TParsedType.Object
  },

  keys(obj: object) {
    return [...Object.keys(obj), ...Object.getOwnPropertySymbols(obj)]
  },

  values(obj: object) {
    return objectUtils.keys(obj).map((k) => obj[k as keyof typeof obj])
  },

  entries(obj) {
    return objectUtils.keys(obj).map((k) => [k, obj[k]])
  },

  fromEntries<K extends PropertyKey, V>(entries: ReadonlyArray<[K, V]>) {
    return Object.fromEntries(entries) as Record<K, V>
  },

  pick<T extends objectUtils.AnyRecord, K extends keyof T>(obj: T, keys: readonly K[]) {
    return objectUtils.fromEntries(keys.map((k) => [k, obj[k]])) as Pick<T, keyof T>
  },

  omit(obj, keys) {
    return objectUtils.pick(
      obj,
      objectUtils.keys(obj).filter((k) => !arrayUtils.includes(keys, k))
    )
  },

  intersect(a, b) {
    return objectUtils.pick(
      a,
      objectUtils.keys(a).filter((k) => k in b)
    )
  },

  diff(a, b) {
    return objectUtils.pick(
      a,
      objectUtils.keys(a).filter((k) => !(k in b))
    )
  },

  camelCaseProperties(obj) {
    return objectUtils.fromEntries(
      objectUtils.entries(obj).map(([k, v]) => [stringUtils.camelCase(String(k)), v])
    ) as objectUtils.CamelCaseProperties<typeof obj>
  },

  snakeCaseProperties(obj) {
    return objectUtils.fromEntries(
      objectUtils.entries(obj).map(([k, v]) => [stringUtils.snakeCase(String(k)), v])
    ) as objectUtils.SnakeCaseProperties<typeof obj>
  },
}

export namespace objectUtils {
  export type AnyRecord = Record<PropertyKey, unknown>

  export type OmitIndexSignature<T> = { [K in keyof T as {} extends Record<K, unknown> ? never : K]: T[K] }

  export type Merge<A, B> = Omit<A, keyof B> & B
  export type Intersect<A, B> = Pick<A, Extract<keyof A, keyof B>>
  export type Diff<A, B> = Pick<A, Exclude<keyof A, keyof B>>

  export type StrictOmit<T, K extends keyof T> = Omit<T, K>

  export type ConditionalKeys<T, Condition> = NonNullable<
    { [K in keyof T]: T[K] extends Condition ? K : never }[keyof T]
  >
  export type ConditionalPick<T, Condition> = Pick<T, ConditionalKeys<T, Condition>>
  export type ConditionalOmit<T, Condition> = Omit<T, ConditionalKeys<T, Condition>>

  export type StripKey<T, K extends keyof T> = T extends unknown ? StrictOmit<T, K> : never
  export type LooseStripKey<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never

  export type OptionalKeysOf<T> = Exclude<{ [K in keyof T]: T extends Record<K, T[K]> ? never : K }[keyof T], undefined>

  export type CamelCaseProperties<T> = { [K in keyof T as stringUtils.CamelCase<K & string>]: T[K] }
  export type SnakeCaseProperties<T> = { [K in keyof T as stringUtils.SnakeCase<K & string>]: T[K] }
}
