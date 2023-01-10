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
  type objectUtils,
  type stringUtils,
} from './_internal'

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TIssue                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

/* ------------------------------------------------------ Kind ------------------------------------------------------ */

export const IssueKind = {
  Required: 'required',
  InvalidType: 'invalid_type',
  InvalidLiteral: 'invalid_literal',
  InvalidEnumValue: 'invalid_enum_value',
  InvalidThisType: 'invalid_this_type',
  InvalidArguments: 'invalid_arguments',
  InvalidReturnType: 'invalid_return_type',
  InvalidInstance: 'invalid_instance',
  UnrecognizedKeys: 'unrecognized_keys',
  InvalidUnion: 'invalid_union',
  InvalidIntersection: 'invalid_intersection',
  InvalidString: 'invalid_string',
  InvalidNumber: 'invalid_number',
  InvalidBigInt: 'invalid_bigint',
  InvalidDate: 'invalid_date',
  InvalidArray: 'invalid_array',
  InvalidSet: 'invalid_set',
  InvalidTuple: 'invalid_tuple',
  InvalidBuffer: 'invalid_buffer',
  Forbidden: 'forbidden',
} as const

export type EIssueKind = typeof IssueKind

export type IssueKind = ValueOf<EIssueKind>

/* ----------------------------------------------------- Checks ----------------------------------------------------- */

export interface MinCheck<V = number, RV = V> {
  readonly check: 'min'
  readonly expected: { readonly value: V; readonly inclusive: boolean }
  readonly received: RV
}

export interface MaxCheck<V = number, RV = V> {
  readonly check: 'max'
  readonly expected: { readonly value: V; readonly inclusive: boolean }
  readonly received: RV
}

export interface RangeCheck<V = number, RV = V> {
  readonly check: 'range'
  readonly expected: {
    readonly min: { readonly value: V; readonly inclusive: boolean }
    readonly max: { readonly value: V; readonly inclusive: boolean }
  }
  readonly received: RV
}

export interface LengthCheck {
  readonly check: 'length'
  readonly expected: number
  readonly received: number
}

/* ----------------------------------------------------- Issues ----------------------------------------------------- */

export type IssueBase<
  K extends IssueKind,
  P extends objectUtils.OmitIndexSignature<objectUtils.AnyRecord> | undefined = undefined
> = SimplifyDeep<
  {
    readonly kind: K
    readonly path: ParsePath
    readonly message: string
  } & (P extends undefined ? { readonly payload?: never } : { readonly payload: Readonly<P> })
>

export type RequiredIssue = IssueBase<EIssueKind['Required']>

export type InvalidTypeIssue = IssueBase<
  EIssueKind['InvalidType'],
  { readonly expected: TParsedType; readonly received: TParsedType }
>

export type InvalidLiteralIssue = IssueBase<
  EIssueKind['InvalidLiteral'],
  { readonly expected: Primitive; readonly received: Primitive }
>

export type InvalidEnumValueIssue = IssueBase<
  EIssueKind['InvalidEnumValue'],
  {
    readonly expected: {
      readonly values: TEnumValues
      readonly formatted: ReadonlyArray<stringUtils.Literalize<string> | stringUtils.Literalize<number>>
    }
    readonly received: {
      readonly value: string | number
      readonly formatted: stringUtils.Literalize<string> | stringUtils.Literalize<number>
    }
  }
>

export type InvalidThisTypeIssue = IssueBase<EIssueKind['InvalidThisType'], { readonly issues: readonly TIssue[] }>
export type InvalidArgumentsIssue = IssueBase<EIssueKind['InvalidArguments'], { readonly issues: readonly TIssue[] }>
export type InvalidReturnTypeIssue = IssueBase<EIssueKind['InvalidReturnType'], { readonly issues: readonly TIssue[] }>

export type InvalidInstanceIssue = IssueBase<EIssueKind['InvalidInstance'], { readonly expected: string }>

export type UnrecognizedKeysIssue = IssueBase<EIssueKind['UnrecognizedKeys'], { readonly keys: readonly PropertyKey[] }>

export type InvalidUnionIssue = IssueBase<EIssueKind['InvalidUnion'], { readonly issues: readonly TIssue[] }>
export type InvalidIntersectionIssue = IssueBase<EIssueKind['InvalidIntersection']>

export type InvalidStringIssue = IssueBase<
  EIssueKind['InvalidString'],
  | MinCheck
  | MaxCheck
  | LengthCheck
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
  | { readonly check: 'contains'; readonly expected: string; readonly received: string }
>

export type InvalidNumberIssue = IssueBase<
  EIssueKind['InvalidNumber'],
  | MinCheck
  | MaxCheck
  | RangeCheck
  | { readonly check: 'integer'; readonly received: number }
  | { readonly check: 'positive'; readonly received: number }
  | { readonly check: 'nonpositive'; readonly received: number }
  | { readonly check: 'negative'; readonly received: number }
  | { readonly check: 'nonnegative'; readonly received: number }
  | { readonly check: 'finite'; readonly received: number }
  | { readonly check: 'port'; readonly received: number }
  | { readonly check: 'multiple'; readonly expected: number; readonly received: number }
>

export type InvalidBigIntIssue = IssueBase<
  EIssueKind['InvalidBigInt'],
  | MinCheck<bigint>
  | MaxCheck<bigint>
  | RangeCheck<bigint>
  | { readonly check: 'positive'; readonly received: bigint }
  | { readonly check: 'nonpositive'; readonly received: bigint }
  | { readonly check: 'negative'; readonly received: bigint }
  | { readonly check: 'nonnegative'; readonly received: bigint }
  | { readonly check: 'multiple'; readonly expected: bigint; readonly received: bigint }
>

export type InvalidDateIssue = IssueBase<
  EIssueKind['InvalidDate'],
  MinCheck<Date | 'now', Date> | MaxCheck<Date | 'now', Date> | RangeCheck<Date | 'now', Date>
>

export type InvalidArrayIssue = IssueBase<
  EIssueKind['InvalidArray'],
  MinCheck | MaxCheck | LengthCheck | { readonly check: 'unique' } | { readonly check: 'ordered' }
>

export type InvalidSetIssue = IssueBase<
  EIssueKind['InvalidSet'],
  MinCheck | MaxCheck | { readonly check: 'size'; readonly expected: number; readonly received: number }
>

export type InvalidTupleIssue = IssueBase<EIssueKind['InvalidTuple'], LengthCheck>

export type InvalidBufferIssue = IssueBase<EIssueKind['InvalidBuffer'], MinCheck | MaxCheck | LengthCheck>

export type ForbiddenIssue = IssueBase<EIssueKind['Forbidden']>

export type TIssue<K extends IssueKind = IssueKind> = {
  [IssueKind.Required]: RequiredIssue
  [IssueKind.InvalidType]: InvalidTypeIssue
  [IssueKind.InvalidLiteral]: InvalidLiteralIssue
  [IssueKind.InvalidEnumValue]: InvalidEnumValueIssue
  [IssueKind.InvalidThisType]: InvalidThisTypeIssue
  [IssueKind.InvalidArguments]: InvalidArgumentsIssue
  [IssueKind.InvalidReturnType]: InvalidReturnTypeIssue
  [IssueKind.InvalidInstance]: InvalidInstanceIssue
  [IssueKind.UnrecognizedKeys]: UnrecognizedKeysIssue
  [IssueKind.InvalidUnion]: InvalidUnionIssue
  [IssueKind.InvalidIntersection]: InvalidIntersectionIssue
  [IssueKind.InvalidString]: InvalidStringIssue
  [IssueKind.InvalidNumber]: InvalidNumberIssue
  [IssueKind.InvalidBigInt]: InvalidBigIntIssue
  [IssueKind.InvalidDate]: InvalidDateIssue
  [IssueKind.InvalidArray]: InvalidArrayIssue
  [IssueKind.InvalidSet]: InvalidSetIssue
  [IssueKind.InvalidTuple]: InvalidTupleIssue
  [IssueKind.InvalidBuffer]: InvalidBufferIssue
  [IssueKind.Forbidden]: ForbiddenIssue
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
export type TErrorMapDict = { readonly [K in IssueKind]?: (issue: Extract<ErrorMapIssueInput, { kind: K }>) => string }
export type TErrorMap = TErrorMapFn | TErrorMapDict

export const DEFAULT_ERROR_MAP: TErrorMapFn = (issue) => {
  switch (issue.kind) {
    case IssueKind.Required:
      return 'Required'
    case IssueKind.InvalidType:
      return `Expected ${issue.payload.expected}, got ${issue.payload.received}`
    case IssueKind.InvalidLiteral:
      return `Expected ${String(issue.payload.expected)}, got ${String(issue.payload.received)}`
    case IssueKind.InvalidArray:
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
    case IssueKind.InvalidSet:
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
    case IssueKind.InvalidUnion:
      return 'Invalid union'
    case IssueKind.InvalidIntersection:
      return 'Invalid intersection'
    case IssueKind.Forbidden:
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
