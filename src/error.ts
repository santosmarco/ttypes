import safeJsonStringify from 'safe-json-stringify'
import {
  getGlobal,
  type AnyParseContext,
  type AnyTTypeBase,
  type ParsePath,
  type Primitive,
  type SimplifyDeep,
  type StripKey,
  type TEnumValues,
  type TParsedType,
  type ValueOf,
} from './_internal'

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TIssue                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export const TIssueKind = {
  Required: 'required',
  InvalidType: 'invalid_type',
  InvalidLiteral: 'invalid_literal',
  InvalidEnumValue: 'invalid_enum_value',
  InvalidString: 'invalid_string',
  InvalidNumber: 'invalid_number',
  InvalidBigInt: 'invalid_bigint',
  InvalidBuffer: 'invalid_buffer',
  InvalidDate: 'invalid_date',
  InvalidArray: 'invalid_array',
  InvalidTuple: 'invalid_tuple',
  InvalidSet: 'invalid_set',
  InvalidInstance: 'invalid_instance',
  UnrecognizedKeys: 'unrecognized_keys',
  InvalidUnion: 'invalid_union',
  InvalidIntersection: 'invalid_intersection',
  Forbidden: 'forbidden',
} as const

export type ETIssueKind = typeof TIssueKind
export type TIssueKind = ValueOf<ETIssueKind>

export type TIssueBase<K extends TIssueKind, P extends Record<string, unknown> | undefined> = SimplifyDeep<
  {
    readonly kind: K
    readonly path: ParsePath
    readonly message: string
  } & (P extends undefined ? { readonly payload?: never } : { readonly payload: Readonly<P> })
>

export type TRequiredIssue = TIssueBase<ETIssueKind['Required'], undefined>

export type TInvalidTypeIssue = TIssueBase<
  ETIssueKind['InvalidType'],
  { readonly expected: TParsedType; readonly received: TParsedType }
>

export type TInvalidLiteralIssue = TIssueBase<
  ETIssueKind['InvalidLiteral'],
  { readonly expected: Primitive; readonly received: Primitive }
>

export type TInvalidEnumValueIssue = TIssueBase<
  ETIssueKind['InvalidEnumValue'],
  { readonly expected: TEnumValues; readonly received: string }
>

export type TInvalidStringIssue = TIssueBase<
  ETIssueKind['InvalidString'],
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
      readonly expected: { readonly pattern: RegExp; readonly type: 'enforce' | 'disallow'; readonly name: string }
      readonly received: string
    }
  | { readonly check: 'alphanum'; readonly received: string }
  | { readonly check: 'email'; readonly received: string }
  | { readonly check: 'url'; readonly received: string }
  | { readonly check: 'cuid'; readonly received: string }
  | { readonly check: 'uuid'; readonly received: string }
  | { readonly check: 'iso_date'; readonly received: string }
  | { readonly check: 'iso_duration'; readonly received: string }
  | {
      readonly check: 'base64'
      readonly expected: { readonly paddingRequired: boolean; readonly urlSafe: boolean }
      readonly received: string
    }
  | { readonly check: 'starts_with'; readonly expected: string; readonly received: string }
  | { readonly check: 'ends_with'; readonly expected: string; readonly received: string }
  | {
      readonly check: 'contains'
      readonly expected: string
      readonly received: string
    }
>

export type TInvalidNumberIssue = TIssueBase<
  ETIssueKind['InvalidNumber'],
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
  | {
      readonly check: 'range'
      readonly expected: {
        readonly min: { readonly value: number; readonly inclusive: boolean }
        readonly max: { readonly value: number; readonly inclusive: boolean }
      }
      readonly received: number
    }
  | { readonly check: 'integer'; readonly received: number }
  | { readonly check: 'positive'; readonly received: number }
  | { readonly check: 'nonpositive'; readonly received: number }
  | { readonly check: 'negative'; readonly received: number }
  | { readonly check: 'nonnegative'; readonly received: number }
  | { readonly check: 'finite'; readonly received: number }
  | { readonly check: 'port'; readonly received: number }
  | { readonly check: 'multiple'; readonly expected: number; readonly received: number }
>

export type TInvalidBigIntIssue = TIssueBase<
  ETIssueKind['InvalidBigInt'],
  | {
      readonly check: 'min'
      readonly expected: { readonly value: bigint; readonly inclusive: boolean }
      readonly received: bigint
    }
  | {
      readonly check: 'max'
      readonly expected: { readonly value: bigint; readonly inclusive: boolean }
      readonly received: bigint
    }
  | {
      readonly check: 'range'
      readonly expected: {
        readonly min: { readonly value: bigint; readonly inclusive: boolean }
        readonly max: { readonly value: bigint; readonly inclusive: boolean }
      }
      readonly received: bigint
    }
  | { readonly check: 'positive'; readonly received: bigint }
  | { readonly check: 'nonpositive'; readonly received: bigint }
  | { readonly check: 'negative'; readonly received: bigint }
  | { readonly check: 'nonnegative'; readonly received: bigint }
  | { readonly check: 'multiple'; readonly expected: bigint; readonly received: bigint }
>

export type TInvalidBufferIssue = TIssueBase<
  ETIssueKind['InvalidBuffer'],
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
>

export type TInvalidDateIssue = TIssueBase<
  ETIssueKind['InvalidDate'],
  | {
      readonly check: 'min'
      readonly expected: { readonly value: Date | 'now'; readonly inclusive: boolean }
      readonly received: Date
    }
  | {
      readonly check: 'max'
      readonly expected: { readonly value: Date | 'now'; readonly inclusive: boolean }
      readonly received: Date
    }
  | {
      readonly check: 'range'
      readonly expected: {
        readonly min: { readonly value: Date | 'now'; readonly inclusive: boolean }
        readonly max: { readonly value: Date | 'now'; readonly inclusive: boolean }
      }
      readonly received: Date
    }
>

export type TInvalidArrayIssue = TIssueBase<
  ETIssueKind['InvalidArray'],
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
  ETIssueKind['InvalidTuple'],
  { readonly check: 'length'; readonly expected: number; readonly received: number }
>

export type TInvalidSetIssue = TIssueBase<
  ETIssueKind['InvalidSet'],
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

export type TInvalidInstanceIssue = TIssueBase<ETIssueKind['InvalidInstance'], { readonly expected: string }>

export type TUrecognizedKeysIssue = TIssueBase<ETIssueKind['UnrecognizedKeys'], { readonly keys: readonly string[] }>

export type TInvalidUnionIssue = TIssueBase<ETIssueKind['InvalidUnion'], { readonly issues: readonly TIssue[] }>

export type TInvalidIntersectionIssue = TIssueBase<ETIssueKind['InvalidIntersection'], undefined>

export type TForbiddenIssue = TIssueBase<ETIssueKind['Forbidden'], undefined>

export type TIssue<K extends TIssueKind = TIssueKind> = {
  [TIssueKind.Required]: TRequiredIssue
  [TIssueKind.InvalidType]: TInvalidTypeIssue
  [TIssueKind.InvalidLiteral]: TInvalidLiteralIssue
  [TIssueKind.InvalidEnumValue]: TInvalidEnumValueIssue
  [TIssueKind.InvalidString]: TInvalidStringIssue
  [TIssueKind.InvalidNumber]: TInvalidNumberIssue
  [TIssueKind.InvalidBigInt]: TInvalidBigIntIssue
  [TIssueKind.InvalidBuffer]: TInvalidBufferIssue
  [TIssueKind.InvalidDate]: TInvalidDateIssue
  [TIssueKind.InvalidArray]: TInvalidArrayIssue
  [TIssueKind.InvalidTuple]: TInvalidTupleIssue
  [TIssueKind.InvalidSet]: TInvalidSetIssue
  [TIssueKind.InvalidInstance]: TInvalidInstanceIssue
  [TIssueKind.UnrecognizedKeys]: TUrecognizedKeysIssue
  [TIssueKind.InvalidUnion]: TInvalidUnionIssue
  [TIssueKind.InvalidIntersection]: TInvalidIntersectionIssue
  [TIssueKind.Forbidden]: TForbiddenIssue
}[K]

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

export type ErrorMapIssueInput = StripKey<TIssue, 'message'>
export type TErrorMapFn = (issue: ErrorMapIssueInput) => string
export type GenericTErrorMapFn = unknown extends unknown ? (issue: ErrorMapIssueInput) => string : never
export type TErrorMapDict = { readonly [K in TIssueKind]?: (issue: Extract<ErrorMapIssueInput, { kind: K }>) => string }
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
          : (issue: ErrorMapIssueInput): string | undefined => (map?.[issue.kind] as TErrorMapFn | undefined)?.(issue))(
          issue
        )
      )
      .filter((msg): msg is NonNullable<typeof msg> => Boolean(msg))

    return msgs[0] ?? DEFAULT_ERROR_MAP(issue)
  }
}

export class TError<I> extends Error {
  private readonly _schema: AnyTTypeBase<unknown, I>
  private readonly _issues: readonly TIssue[]

  constructor(schema: AnyTTypeBase<unknown, I>, issues: readonly TIssue[]) {
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

  get schema(): AnyTTypeBase<unknown, I> {
    return this._schema
  }

  get origin(): AnyTTypeBase<unknown, I> {
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
