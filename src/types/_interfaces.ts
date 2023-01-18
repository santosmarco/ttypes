import type { TTypeName } from '../type-names'
import type { TType } from './_internal'

export type UnwrapDeep<T extends TType, TN extends TTypeName> = T extends {
  readonly typeName: TN
  readonly underlying: infer U extends TType
}
  ? UnwrapDeep<U, TN>
  : T

export type UnwrapUntil<T, Target extends TType> = T extends { readonly typeName: infer U }
  ? U extends Target['typeName']
    ? T
    : T extends { readonly underlying: infer U extends TType }
    ? U['typeName'] extends Target['typeName']
      ? U
      : UnwrapUntil<U, Target>
    : T
  : T

export interface TUnwrappable<T extends TType> extends TType {
  readonly underlying: T
  unwrap(): T
  unwrapDeep(): UnwrapDeep<T, this['typeName']>
}
