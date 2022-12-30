import type { ParseContext, ParsePath, TParsedType } from './parse'
import type { AnyTType, TLiteralValue } from './types'
import type { SimplifyFlat } from './utils'

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TIssue                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export enum TIssueKind {
  Required = 'required',
  InvalidType = 'invalid_type',
  InvalidLiteral = 'invalid_literal',
  InvalidArray = 'invalid_array',
  InvalidSet = 'invalid_set',
  Forbidden = 'forbidden',
}

export type TIssueBase<K extends TIssueKind, P extends Record<string, unknown> | null> = SimplifyFlat<
  {
    readonly kind: K
    readonly path: ParsePath
    readonly message: string
  } & (P extends null ? unknown : { readonly payload: Readonly<P> })
>

export type TRequiredIssue = TIssueBase<TIssueKind.Required, null>

export type TInvalidTypeIssue = TIssueBase<
  TIssueKind.InvalidType,
  { readonly expected: TParsedType; readonly received: TParsedType }
>

export type TInvalidLiteralIssue = TIssueBase<
  TIssueKind.InvalidLiteral,
  { readonly expected: TLiteralValue; readonly received: TLiteralValue }
>

export type TInvalidArrayIssue = TIssueBase<
  TIssueKind.InvalidArray,
  | {
      readonly check: 'min'
      readonly expected: { readonly value: number; readonly inclusive: boolean }
      readonly received: number
    }
  | {
      readonly check: 'max'
      readonly expected: { readonly value: number; readonly inclusive: boolean }
      readonly received: number
    }
  | { readonly check: 'length'; readonly expected: number; readonly received: number }
  | { readonly check: 'unique' }
  | { readonly check: 'ordered'; readonly expected: boolean; readonly received: boolean }
>

export type TInvalidSetIssue = TIssueBase<
  TIssueKind.InvalidSet,
  | {
      readonly check: 'min'
      readonly expected: { readonly value: number; readonly inclusive: boolean }
      readonly received: number
    }
  | {
      readonly check: 'max'
      readonly expected: { readonly value: number; readonly inclusive: boolean }
      readonly received: number
    }
  | { readonly check: 'size'; readonly expected: number; readonly received: number }
>

export type TForbiddenIssue = TIssueBase<TIssueKind.Forbidden, null>

export type TIssue =
  | TRequiredIssue
  | TInvalidTypeIssue
  | TInvalidLiteralIssue
  | TInvalidArrayIssue
  | TInvalidSetIssue
  | TForbiddenIssue

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TError                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export class TError<Input> {
  private readonly _type: AnyTType<unknown, Input>
  private readonly _issues: readonly TIssue[]

  constructor(type: AnyTType<unknown, Input>, issues: readonly TIssue[]) {
    this._type = type
    this._issues = issues
  }

  static fromContext<I>(ctx: ParseContext<AnyTType<unknown, I>>): TError<I> {
    return new TError(ctx.schema as AnyTType<unknown, I>, ctx.allIssues)
  }
}
