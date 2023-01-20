import type { FullIssue } from './issues'
import type { TType } from './types/_internal'
import type { u } from './utils'

export namespace TChecks {
  export interface Base<K extends string = string> {
    readonly check: K
  }

  export type Make<K extends string, P extends u.AnyRecord | null = null> = Base<K> &
    (P extends null ? unknown : Readonly<P>)

  /* ---------------------------------------------------------------------------------------------------------------- */

  export interface Min<V extends u.Numeric | Date | 'now' = number, RV = V> extends Base<'min'> {
    readonly expected: { readonly value: V; readonly inclusive: boolean }
    readonly received: RV
  }

  export interface Max<V extends u.Numeric | Date | 'now' = number, RV = V> extends Base<'max'> {
    readonly expected: { readonly value: V; readonly inclusive: boolean }
    readonly received: RV
  }

  export interface Range<V extends u.Numeric | Date | 'now' = number, RV = V> extends Base<'range'> {
    readonly expected: {
      readonly min: { readonly value: V; readonly inclusive: boolean }
      readonly max: { readonly value: V; readonly inclusive: boolean }
    }
    readonly received: RV
  }

  export interface Exact<K extends string = string> extends Base<K> {
    readonly expected: { readonly value: number; readonly inclusive: boolean }
    readonly received: number
  }

  export interface Length extends Exact<'length'> {}
  export interface Size extends Exact<'size'> {}

  export type Format<K extends string, P extends u.AnyRecord | null = null> = Make<K, P>

  /* ---------------------------------------------------------------------------------------------------------------- */

  export type FromIssue<T extends FullIssue, Extra extends readonly Base[] = []> = ReadonlyArray<
    | (u.LooseStripKey<T['_internals']['fullPayload'], 'received'> & { readonly message: string | undefined })
    | Extra[number]
  >

  export type Of<T extends TType> = NonNullable<T['$D']['checks']>[number]

  export type KindsOf<T extends TType> = Of<T>['check']

  export type GetByKind<C extends Base, K extends C['check']> = C extends { readonly check: K } ? C : never

  /* ---------------------------------------------------------------------------------------------------------------- */

  export const handleMin = <V extends u.Numeric | Date | 'now' = number, RV = V>(
    value: V,
    expected: Min<V, RV>['expected']
  ): boolean => {
    return expected.inclusive ? value >= expected.value : value > expected.value
  }

  export const handleMax = <V extends u.Numeric | Date | 'now' = number, RV = V>(
    value: V,
    expected: Max<V, RV>['expected']
  ): boolean => {
    return handleMin(expected.value, { value, inclusive: expected.inclusive })
  }

  export const handleRange = <V extends u.Numeric | Date | 'now' = number, RV = V>(
    value: V,
    expected: Range<V, RV>['expected']
  ): boolean => {
    return handleMin(value, expected.min) && handleMax(value, expected.max)
  }

  export const handleExact = (value: number, expected: Exact['expected']): boolean => {
    return value === expected.value
  }
}
