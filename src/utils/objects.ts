import { TParsedType, TParsedType.get } from '../parse'
import { includes } from './arrays'

export interface ObjectUtils {
  isAnyRecord(obj: unknown): obj is objectUtils.AnyRecord
  keys<T extends objectUtils.AnyRecord>(obj: T): ReadonlyArray<keyof T>
  keys(obj: object): readonly PropertyKey[]
  values<T extends objectUtils.AnyRecord>(obj: T): ReadonlyArray<T[keyof T]>
  values(obj: object): readonly unknown[]
  entries<T extends objectUtils.AnyRecord>(obj: T): ReadonlyArray<[keyof T, T[keyof T]]>
  fromEntries<K extends PropertyKey, V>(entries: ReadonlyArray<[K, V]>): Record<K, V>
  pick<T extends objectUtils.AnyRecord, K extends keyof T>(obj: T, keys: readonly K[]): Pick<T, K>
  omit<T extends objectUtils.AnyRecord, K extends keyof T>(obj: T, keys: readonly K[]): Omit<T, K>
  intersect<A extends objectUtils.AnyRecord, B extends objectUtils.AnyRecord>(a: A, b: B): objectUtils.Intersect<A, B>
  diff<A extends objectUtils.AnyRecord, B extends objectUtils.AnyRecord>(a: A, b: B): objectUtils.Diff<A, B>
}

export const objectUtils: ObjectUtils = {
  isAnyRecord(obj: unknown): obj is objectUtils.AnyRecord {
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
      objectUtils.keys(obj).filter((k) => !includes(keys, k))
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
}

export namespace objectUtils {
  /* ----------------------------------------------------- Types ---------------------------------------------------- */

  export type AnyRecord = Record<PropertyKey, unknown>

  export type OmitIndexSignature<T> = { [K in keyof T as {} extends Record<K, unknown> ? never : K]: T[K] }

  export type ConditionalKeys<T, Condition> = NonNullable<
    { [K in keyof T]: T[K] extends Condition ? K : never }[keyof T]
  >
  export type ConditionalPick<T, Condition> = Pick<T, ConditionalKeys<T, Condition>>
  export type ConditionalOmit<T, Condition> = Omit<T, ConditionalKeys<T, Condition>>

  export type Intersect<A, B> = Pick<A, Extract<keyof A, keyof B>>
  export type Diff<A, B> = Pick<A, Exclude<keyof A, keyof B>>
}
