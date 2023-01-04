import { getGlobal } from './global'
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
  InvalidUnion = 'invalid_union',
  Forbidden = 'forbidden',
}

export type TIssueBase<K extends TIssueKind, P extends Record<string, unknown> | undefined> = SimplifyFlat<
  {
    readonly kind: K
    readonly path: ParsePath
    readonly message: string
  } & (P extends undefined ? unknown : { readonly payload: Readonly<P> })
>

export type TRequiredIssue = TIssueBase<TIssueKind.Required, undefined>

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

export type TUnionIssue = TIssueBase<TIssueKind.InvalidUnion, { readonly issues: readonly TIssue[] }>

export type TForbiddenIssue = TIssueBase<TIssueKind.Forbidden, undefined>

export type TIssue =
  | TRequiredIssue
  | TInvalidTypeIssue
  | TInvalidLiteralIssue
  | TInvalidArrayIssue
  | TInvalidSetIssue
  | TUnionIssue
  | TForbiddenIssue

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TError                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export class TError<I> extends Error {
  private readonly _type: AnyTType<unknown, I>
  private readonly _issues: readonly TIssue[]

  constructor(type: AnyTType<unknown, I>, issues: readonly TIssue[]) {
    super(getGlobal().getErrorFormatter()(issues))
    this._type = type
    this._issues = issues
  }

  get origin(): AnyTType<unknown, I> {
    return this._type
  }

  get issues(): readonly TIssue[] {
    return this._issues
  }

  static readonly defaultFormatter: TErrorFormatter = (issues) => JSON.stringify(issues, null, 2)

  static fromContext<I>(ctx: ParseContext<AnyTType<unknown, I>>): TError<I> {
    return new TError(ctx.schema as AnyTType<unknown, I>, ctx.allIssues)
  }
}

export type TErrorFormatter = (issues: readonly TIssue[]) => string
