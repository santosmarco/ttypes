import type { TTypeName } from '../type-names'
import type { TType } from './_internal'

export type UnwrapDeep<T extends TType, TN extends TTypeName> = T extends {
  readonly typeName: TN
  readonly underlying: infer U extends TType
}
  ? UnwrapDeep<U, TN>
  : T

export interface TUnwrappable<T extends TType> extends TType {
  readonly underlying: T
  unwrap(): T
  unwrapDeep(): UnwrapDeep<T, this['typeName']>
}
