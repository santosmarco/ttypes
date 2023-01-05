import safeJsonStringify from 'safe-json-stringify'
import { getGlobal } from './global'
import type { AnyParseContext, ParsePath, TParsedType } from './parse'
import type { AnyTType, TEnumValues, TLiteralValue } from './types'
import type { Simplify, StripKey } from './utils'

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TIssue                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export enum TIssueKind {
  Required = 'required',
  InvalidType = 'invalid_type',
  InvalidLiteral = 'invalid_literal',
  InvalidEnumValue = 'invalid_enum_value',
  InvalidString = 'invalid_string',
  InvalidNumber = 'invalid_number',
  InvalidArray = 'invalid_array',
  InvalidTuple = 'invalid_tuple',
  InvalidSet = 'invalid_set',
  UnrecognizedKeys = 'unrecognized_keys',
  InvalidUnion = 'invalid_union',
  InvalidIntersection = 'invalid_intersection',
  Forbidden = 'forbidden',
}

export type TIssueBase<K extends TIssueKind, P extends Record<string, unknown> | undefined> = Simplify<
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

export type TInvalidEnumValueIssue = TIssueBase<
  TIssueKind.InvalidEnumValue,
  { readonly expected: TEnumValues; readonly received: string }
>

export type TInvalidStringIssue = TIssueBase<
  TIssueKind.InvalidString,
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
  | {
      readonly check: 'pattern'
      readonly expected: { readonly pattern: RegExp; readonly name: string }
      readonly received: string
    }
  | {
      readonly check: 'replace'
      readonly expected: { readonly pattern: RegExp; readonly name: string; readonly replacement: string }
      readonly received: string
    }
  | { readonly check: 'email'; readonly received: string }
  | { readonly check: 'url'; readonly received: string }
  | { readonly check: 'cuid'; readonly received: string }
  | { readonly check: 'uuid'; readonly received: string }
  | { readonly check: 'isoDuration' }
  | {
      readonly check: 'base64'
      readonly expected: { readonly paddingRequired: boolean; readonly urlSafe: boolean }
      readonly received: string
    }
  | { readonly check: 'startsWith'; readonly expected: string; readonly received: string }
  | { readonly check: 'endsWith'; readonly expected: string; readonly received: string }
  | {
      readonly check: 'contains'
      readonly expected: string
      readonly received: string
    }
>

export type TInvalidNumberIssue = TIssueBase<
  TIssueKind.InvalidNumber,
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
  | { readonly check: 'integer' }
  | { readonly check: 'positive' }
  | { readonly check: 'negative' }
  | { readonly check: 'finite' }
  | { readonly check: 'safeInteger' }
  | { readonly check: 'multipleOf'; readonly expected: number; readonly received: number }
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
  | { readonly check: 'ordered' }
>

export type TInvalidTupleIssue = TIssueBase<
  TIssueKind.InvalidTuple,
  { readonly check: 'length'; readonly expected: number; readonly received: number }
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

export type TUrecognizedKeysIssue = TIssueBase<TIssueKind.UnrecognizedKeys, { readonly keys: readonly string[] }>

export type TInvalidUnionIssue = TIssueBase<TIssueKind.InvalidUnion, { readonly issues: readonly TIssue[] }>

export type TInvalidIntersectionIssue = TIssueBase<TIssueKind.InvalidIntersection, undefined>

export type TForbiddenIssue = TIssueBase<TIssueKind.Forbidden, undefined>

export type TIssue =
  | TRequiredIssue
  | TInvalidTypeIssue
  | TInvalidLiteralIssue
  | TInvalidEnumValueIssue
  | TInvalidStringIssue
  | TInvalidNumberIssue
  | TInvalidArrayIssue
  | TInvalidTupleIssue
  | TInvalidSetIssue
  | TUrecognizedKeysIssue
  | TInvalidUnionIssue
  | TInvalidIntersectionIssue
  | TForbiddenIssue

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TError                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TErrorFormatter = (issues: readonly TIssue[]) => string

export const DEFAULT_ERROR_FORMATTER: TErrorFormatter = (issues) =>
  safeJsonStringify(
    issues,
    (_, value) => {
      if (typeof value === 'bigint') {
        return `${String(value)}n`
      }

      if (typeof value === 'symbol') {
        return value.toString()
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return value
    },
    2
  )

export type TErrorMapInput = StripKey<TIssue, 'message'>
export type TErrorMapFn = (issue: TErrorMapInput) => string
export type TErrorMapDict = { readonly [K in TIssueKind]?: (issue: Extract<TErrorMapInput, { kind: K }>) => string }
export type TErrorMap = TErrorMapFn | TErrorMapDict

export const DEFAULT_ERROR_MAP: TErrorMapFn = (issue) => {
  switch (issue.kind) {
    case TIssueKind.Required:
      return 'Required'
    case TIssueKind.InvalidType:
      return `Expected ${issue.payload.expected}, got ${issue.payload.received}`
    case TIssueKind.InvalidLiteral:
      return `Expected ${String(issue.payload.expected)}, got ${String(issue.payload.received)}`
    case TIssueKind.InvalidArray:
      if (issue.payload.check === 'min') {
        return `Array must contain ${issue.payload.expected.inclusive ? 'at least' : 'over'} ${
          issue.payload.expected.value
        } item(s)`
      }

      if (issue.payload.check === 'max') {
        return `Array must contain ${issue.payload.expected.inclusive ? 'at most' : 'under'} ${
          issue.payload.expected.value
        } item(s)`
      }

      if (issue.payload.check === 'length') {
        return `Array must contain exactly ${issue.payload.expected} item(s)`
      }

      if (issue.payload.check === 'unique') {
        return 'Array must contain unique items'
      }

      if (issue.payload.check === 'ordered') {
        return 'Array must be ordered'
      }

      break
    case TIssueKind.InvalidSet:
      if (issue.payload.check === 'min') {
        return `Set must contain ${issue.payload.expected.inclusive ? 'at least' : 'over'} ${
          issue.payload.expected.value
        } item(s)`
      }

      if (issue.payload.check === 'max') {
        return `Set must contain ${issue.payload.expected.inclusive ? 'at most' : 'under'} ${
          issue.payload.expected.value
        } item(s)`
      }

      if (issue.payload.check === 'size') {
        return `Set must contain exactly ${issue.payload.expected} item(s)`
      }

      break
    case TIssueKind.InvalidUnion:
      return 'Invalid union'
    case TIssueKind.InvalidIntersection:
      return 'Invalid intersection'
    case TIssueKind.Forbidden:
      return 'Forbidden'

    default:
      return 'Unknown issue'
  }

  return 'Unknown issue'
}

export const resolveErrorMaps = (maps: ReadonlyArray<TErrorMap | undefined>): TErrorMapFn => {
  return (issue) => {
    const msgs = [...maps]
      .reverse()
      .map((map) =>
        (typeof map === 'function'
          ? map
          : (issue: TErrorMapInput): string | undefined => (map?.[issue.kind] as TErrorMapFn | undefined)?.(issue))(
          issue
        )
      )
      .filter((msg): msg is NonNullable<typeof msg> => Boolean(msg))

    return msgs[0] ?? DEFAULT_ERROR_MAP(issue)
  }
}

export class TError<I> extends Error {
  private readonly _schema: AnyTType<unknown, I>
  private readonly _issues: readonly TIssue[]

  constructor(schema: AnyTType<unknown, I>, issues: readonly TIssue[]) {
    super()
    this._schema = schema
    this._issues = issues
  }

  override get name(): 'TError' {
    return 'TError'
  }

  override get message(): string {
    return getGlobal().getErrorFormatter()(this.issues)
  }

  get schema(): AnyTType<unknown, I> {
    return this._schema
  }

  get origin(): AnyTType<unknown, I> {
    return this.schema
  }

  get issues(): readonly TIssue[] {
    return this._issues
  }

  static fromContext(ctx: AnyParseContext): AnyTError {
    return new TError(ctx.root.schema, ctx.allIssues)
  }

  static readonly defaultFormatter: TErrorFormatter = DEFAULT_ERROR_FORMATTER
  static readonly defaultIssueMap: TErrorMap = DEFAULT_ERROR_MAP

  static assertNever(_x: never): never {
    throw new Error('Impossible')
  }
}

export type AnyTError = TError<unknown>
