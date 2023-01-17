import util from 'util'
import type { TChecks } from './checks'
import { type TDef } from './def'
import { getGlobal } from './global'
import { type ParseContextOf, type ParsePath, type TParsedType } from './parse'
import { type InputOf, type TType } from './types/_internal'
import { u } from './utils'

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
  MissingKeys: 'missing_keys',
  UnrecognizedKeys: 'unrecognized_keys',
  InvalidUnion: 'invalid_union',
  InvalidDiscriminator: 'invalid_discriminator',
  InvalidIntersection: 'invalid_intersection',
  InvalidString: 'invalid_string',
  InvalidNumber: 'invalid_number',
  InvalidBigInt: 'invalid_bigint',
  InvalidDate: 'invalid_date',
  InvalidArray: 'invalid_array',
  InvalidSet: 'invalid_set',
  InvalidTuple: 'invalid_tuple',
  InvalidRecord: 'invalid_record',
  InvalidBuffer: 'invalid_buffer',
  Forbidden: 'forbidden',
  Custom: 'custom',
} as const

export type EIssueKind = typeof IssueKind

export type IssueKind = EIssueKind[keyof EIssueKind]

export type ToChecks<T extends TIssue> = ReadonlyArray<
  u.LooseStripKey<T['payload'], 'received' | `_${string}`> & { readonly message: string | undefined }
>

/* ----------------------------------------------------- Issues ----------------------------------------------------- */

export type IssueBase<K extends IssueKind, P extends object | null = null> = u.SimplifyDeep<
  {
    readonly kind: K
    readonly path: ParsePath
    readonly data: unknown
    readonly message: string
  } & (P extends null ? { readonly payload?: never } : { readonly payload: Readonly<P> })
>

export type RequiredIssue = IssueBase<EIssueKind['Required']>

export type InvalidTypeIssue = IssueBase<
  EIssueKind['InvalidType'],
  { readonly expected: TParsedType; readonly received: TParsedType }
>

export type InvalidLiteralIssue = IssueBase<
  EIssueKind['InvalidLiteral'],
  {
    readonly expected: { readonly value: u.Primitive; readonly formatted: u.Literalized }
    readonly received: { readonly value: u.Primitive; readonly formatted: u.Literalized }
  }
>

export type InvalidEnumValueIssue = IssueBase<
  EIssueKind['InvalidEnumValue'],
  {
    readonly expected: { readonly values: readonly u.Primitive[]; readonly formatted: readonly u.Literalized[] }
    readonly received: { readonly value: u.Primitive; readonly formatted: u.Literalized }
  }
>

export type InvalidThisTypeIssue = IssueBase<EIssueKind['InvalidThisType'], { readonly issues: readonly TIssue[] }>
export type InvalidArgumentsIssue = IssueBase<EIssueKind['InvalidArguments'], { readonly issues: readonly TIssue[] }>
export type InvalidReturnTypeIssue = IssueBase<EIssueKind['InvalidReturnType'], { readonly issues: readonly TIssue[] }>

export type InvalidInstanceIssue = IssueBase<EIssueKind['InvalidInstance'], { readonly expected: string }>

export type MissingKeysIssue = IssueBase<EIssueKind['MissingKeys'], { readonly keys: readonly PropertyKey[] }>
export type UnrecognizedKeysIssue = IssueBase<EIssueKind['UnrecognizedKeys'], { readonly keys: readonly PropertyKey[] }>

export type InvalidUnionIssue = IssueBase<EIssueKind['InvalidUnion'], { readonly issues: readonly TIssue[] }>

export type InvalidDiscriminatorIssue = IssueBase<
  EIssueKind['InvalidDiscriminator'],
  {
    readonly expected: { readonly values: readonly u.Primitive[]; readonly formatted: readonly u.Literalized[] }
    readonly received: { readonly value: u.Primitive; readonly formatted: u.Literalized }
  }
>

export type InvalidIntersectionIssue = IssueBase<EIssueKind['InvalidIntersection']>

export type InvalidStringIssue = IssueBase<
  EIssueKind['InvalidString'],
  | TChecks.Min
  | TChecks.Max
  | TChecks.Length
  | TChecks.Format<'alphanum'>
  | TChecks.Format<'cuid'>
  | TChecks.Format<'email'>
  | TChecks.Format<'iso_date'>
  | TChecks.Format<'iso_duration'>
  | TChecks.Format<'numeric'>
  | TChecks.Format<'url'>
  | TChecks.Format<'uuid'>
  | TChecks.Format<'base64', { readonly options: { readonly paddingRequired: boolean; readonly urlSafe: boolean } }>
  | TChecks.Make<
      'pattern',
      { readonly pattern: RegExp; readonly options: { readonly type: 'enforce' | 'disallow'; readonly name: string } }
    >
  | TChecks.Make<'starts_with', { readonly expected: string }>
  | TChecks.Make<'ends_with', { readonly expected: string }>
  | TChecks.Make<'includes', { readonly expected: string }>
>

export type InvalidNumberIssue = IssueBase<
  EIssueKind['InvalidNumber'],
  | TChecks.Min
  | TChecks.Max
  | TChecks.Range
  | { readonly check: 'integer' }
  | {
      readonly check: 'precision'
      readonly expected: { readonly value: number; readonly inclusive: boolean }
      readonly convert: boolean
      readonly received: number
    }
  | { readonly check: 'port' }
  | { readonly check: 'multiple'; readonly expected: number }
  | { readonly check: 'finite'; readonly enabled: boolean }
  | { readonly check: 'safe'; readonly enabled: boolean }
>

export type InvalidBigIntIssue = IssueBase<
  EIssueKind['InvalidBigInt'],
  | TChecks.Min<bigint>
  | TChecks.Max<bigint>
  | TChecks.Range<bigint>
  | { readonly check: 'multiple'; readonly expected: bigint; readonly received: bigint }
>

export type InvalidDateIssue = IssueBase<
  EIssueKind['InvalidDate'],
  TChecks.Min<Date | 'now', Date> | TChecks.Max<Date | 'now', Date> | TChecks.Range<Date | 'now', Date>
>

export type InvalidArrayIssue = IssueBase<
  EIssueKind['InvalidArray'],
  | TChecks.Min
  | TChecks.Max
  | TChecks.Length
  | TChecks.Make<
      'unique',
      { readonly compareFn: ((a: unknown, b: unknown) => boolean) | undefined; readonly convert: boolean }
    >
  | TChecks.Make<
      'sorted',
      { readonly sortFn: ((a: unknown, b: unknown) => number) | undefined; readonly convert: boolean }
    >
>

export type InvalidSetIssue = IssueBase<EIssueKind['InvalidSet'], TChecks.Min | TChecks.Max | TChecks.Size>

export type InvalidTupleIssue = IssueBase<EIssueKind['InvalidTuple'], TChecks.Length>

export type InvalidRecordIssue = IssueBase<
  EIssueKind['InvalidRecord'],
  | {
      readonly check: 'min_keys'
      readonly expected: { readonly value: number; readonly inclusive: boolean }
      readonly received: number
    }
  | {
      readonly check: 'max_keys'
      readonly expected: { readonly value: number; readonly inclusive: boolean }
      readonly received: number
    }
>

export type InvalidBufferIssue = IssueBase<EIssueKind['InvalidBuffer'], TChecks.Min | TChecks.Max | TChecks.Length>

export type ForbiddenIssue = IssueBase<EIssueKind['Forbidden']>

export type CustomIssue = IssueBase<EIssueKind['Custom'], Record<string, unknown>>

export type TIssue<K extends IssueKind = IssueKind> = {
  [IssueKind.Required]: RequiredIssue
  [IssueKind.InvalidType]: InvalidTypeIssue
  [IssueKind.InvalidLiteral]: InvalidLiteralIssue
  [IssueKind.InvalidEnumValue]: InvalidEnumValueIssue
  [IssueKind.InvalidThisType]: InvalidThisTypeIssue
  [IssueKind.InvalidArguments]: InvalidArgumentsIssue
  [IssueKind.InvalidReturnType]: InvalidReturnTypeIssue
  [IssueKind.InvalidInstance]: InvalidInstanceIssue
  [IssueKind.MissingKeys]: MissingKeysIssue
  [IssueKind.UnrecognizedKeys]: UnrecognizedKeysIssue
  [IssueKind.InvalidUnion]: InvalidUnionIssue
  [IssueKind.InvalidDiscriminator]: InvalidDiscriminatorIssue
  [IssueKind.InvalidIntersection]: InvalidIntersectionIssue
  [IssueKind.InvalidString]: InvalidStringIssue
  [IssueKind.InvalidNumber]: InvalidNumberIssue
  [IssueKind.InvalidBigInt]: InvalidBigIntIssue
  [IssueKind.InvalidDate]: InvalidDateIssue
  [IssueKind.InvalidArray]: InvalidArrayIssue
  [IssueKind.InvalidSet]: InvalidSetIssue
  [IssueKind.InvalidTuple]: InvalidTupleIssue
  [IssueKind.InvalidRecord]: InvalidRecordIssue
  [IssueKind.InvalidBuffer]: InvalidBufferIssue
  [IssueKind.Forbidden]: ForbiddenIssue
  [IssueKind.Custom]: CustomIssue
}[K]

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TError                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TErrorFormatter = (issues: readonly TIssue[]) => string

export const DEFAULT_ERROR_FORMATTER: TErrorFormatter = (issues) =>
  util.inspect(issues, {
    colors: Boolean(getGlobal().getOptions().colorsEnabled),
    depth: Infinity,
    maxArrayLength: Infinity,
    maxStringLength: Infinity,
    sorted: true,
  })

export type ErrorMapIssueInput = u.StripKey<TIssue, 'message'>
export type TErrorMapFn = (issue: ErrorMapIssueInput) => string
export type TErrorMapDict = { readonly [K in IssueKind]?: (issue: Extract<ErrorMapIssueInput, { kind: K }>) => string }
export type TErrorMap = TErrorMapFn | TErrorMapDict

export const DEFAULT_ERROR_MAP: TErrorMapFn = (issue) => {
  switch (issue.kind) {
    case IssueKind.Required:
      return 'Required'
    case IssueKind.InvalidType:
      return `Expected ${issue.payload.expected}, received ${issue.payload.received}`
    case IssueKind.InvalidLiteral:
      return `Expected the literal value ${String(issue.payload.expected.formatted)}, got ${String(
        issue.payload.received.formatted
      )}`
    case IssueKind.InvalidEnumValue:
      return `Expected one of: ${issue.payload.expected.formatted.join(' | ')}; got ${issue.payload.received.formatted}`
    case IssueKind.InvalidThisType:
      return 'Invalid `this` context type'
    case IssueKind.InvalidArguments:
      return 'Invalid arguments'
    case IssueKind.InvalidReturnType:
      return 'Invalid return type'
    case IssueKind.InvalidInstance:
      return `Expected an instance of ${issue.payload.expected}`
    case IssueKind.MissingKeys:
      return `Missing key(s) in object: ${issue.payload.keys.map(u.literalize).join(', ')}`
    case IssueKind.UnrecognizedKeys:
      return `Unrecognized key(s) found in object: ${issue.payload.keys.map(u.literalize).join(', ')}`
    case IssueKind.InvalidUnion:
      return 'Invalid union'
    case IssueKind.InvalidIntersection:
      return 'Invalid intersection'
    case IssueKind.InvalidString:
      if (issue.payload.check === 'min')
        return `String must contain ${issue.payload.expected.inclusive ? 'at least' : 'over'} ${
          issue.payload.expected.value
        } character(s)`
      if (issue.payload.check === 'max')
        return `String must contain ${issue.payload.expected.inclusive ? 'at most' : 'under'} ${
          issue.payload.expected.value
        } character(s)`
      if (issue.payload.check === 'length')
        return `String must contain exactly ${issue.payload.expected.value} character(s)`
      if (issue.payload.check === 'pattern')
        return `String must ${issue.payload.options.type === 'enforce' ? 'match' : 'not match'} the pattern: ${
          issue.payload.options.name
        }`
      if (issue.payload.check === 'alphanum') return 'String must contain only alphanumeric characters'
      if (issue.payload.check === 'email') return 'String must be a valid email address'
      if (issue.payload.check === 'url') return 'String must be a valid URL'
      if (issue.payload.check === 'cuid') return 'String must be a valid CUID'
      if (issue.payload.check === 'uuid') return 'String must be a valid UUID'
      if (issue.payload.check === 'iso_date') return 'String must be a valid ISO date'
      if (issue.payload.check === 'iso_duration') return 'String must be a valid ISO duration'
      if (issue.payload.check === 'base64') return 'String must be a valid base64 string'
      if (issue.payload.check === 'numeric') return 'String must be numeric'
      if (issue.payload.check === 'starts_with') return `String must start with "${issue.payload.expected}"`
      if (issue.payload.check === 'ends_with') return `String must end with "${issue.payload.expected}"`
      if (issue.payload.check === 'includes') return `String must contain the substring "${issue.payload.expected}"`
      return TError.assertNever(issue.payload)
    case IssueKind.InvalidNumber:
      if (issue.payload.check === 'min')
        return `Number must be ${issue.payload.expected.inclusive ? 'greater than or equal to' : 'greater than'} ${
          issue.payload.expected.value
        }`
      if (issue.payload.check === 'max')
        return `Number must be ${issue.payload.expected.inclusive ? 'less than or equal to' : 'less than'} ${
          issue.payload.expected.value
        }`
      if (issue.payload.check === 'range')
        return `Number must be between ${issue.payload.expected.min.value} (${
          issue.payload.expected.min.inclusive ? 'inclusive' : 'exclusive'
        }) and ${issue.payload.expected.max.value} (${
          issue.payload.expected.max.inclusive ? 'inclusive' : 'exclusive'
        })`
      if (issue.payload.check === 'integer') return 'Value must be an integer'
      if (issue.payload.check === 'port') return 'Value must be a valid port number'
      if (issue.payload.check === 'multiple') return `Value must be a multiple of ${issue.payload.expected}`
      if (issue.payload.check === 'finite') return 'Value must be finite'
      if (issue.payload.check === 'safe') return 'Value must be a safe number'
      if (issue.payload.check === 'precision')
        return `Value must contain ${issue.payload.expected.inclusive ? 'less than or equal to' : 'less than'} ${
          issue.payload.expected.value
        } decimal places, got ${issue.payload.received}`
      return TError.assertNever(issue.payload)
    case IssueKind.InvalidBigInt:
      if (issue.payload.check === 'min')
        return `BigInt must be ${issue.payload.expected.inclusive ? 'greater than or equal to' : 'greater than'} ${
          issue.payload.expected.value
        }n`
      if (issue.payload.check === 'max')
        return `BigInt must be ${issue.payload.expected.inclusive ? 'less than or equal to' : 'less than'} ${
          issue.payload.expected.value
        }n`
      if (issue.payload.check === 'range')
        return `BigInt must be between ${issue.payload.expected.min.value}n (${
          issue.payload.expected.min.inclusive ? 'inclusive' : 'exclusive'
        }) and ${issue.payload.expected.max.value}n (${
          issue.payload.expected.max.inclusive ? 'inclusive' : 'exclusive'
        })`
      if (issue.payload.check === 'multiple') return `Number must be a multiple of ${issue.payload.expected}`
      return TError.assertNever(issue.payload)
    case IssueKind.InvalidDate:
      if (issue.payload.check === 'min')
        return `Date must be ${issue.payload.expected.inclusive ? 'greater than or equal to' : 'greater than'} ${
          issue.payload.expected.value === 'now' ? 'the current time' : issue.payload.expected.value.toISOString()
        }`
      if (issue.payload.check === 'max')
        return `Date must be ${issue.payload.expected.inclusive ? 'less than or equal to' : 'less than'} ${
          issue.payload.expected.value === 'now' ? 'the current time' : issue.payload.expected.value.toISOString()
        }`
      if (issue.payload.check === 'range')
        return `Date must be between ${
          issue.payload.expected.min.value === 'now'
            ? 'the current time'
            : issue.payload.expected.min.value.toISOString()
        } (${issue.payload.expected.min.inclusive ? 'inclusive' : 'exclusive'}) and ${
          issue.payload.expected.max.value === 'now'
            ? 'the current time'
            : issue.payload.expected.max.value.toISOString()
        } (${issue.payload.expected.max.inclusive ? 'inclusive' : 'exclusive'})`
      return TError.assertNever(issue.payload)
    case IssueKind.InvalidArray:
      if (issue.payload.check === 'min')
        return `Array must contain ${issue.payload.expected.inclusive ? 'at least' : 'over'} ${
          issue.payload.expected.value
        } item(s)`
      if (issue.payload.check === 'max')
        return `Array must contain ${issue.payload.expected.inclusive ? 'at most' : 'under'} ${
          issue.payload.expected.value
        } item(s)`
      if (issue.payload.check === 'length') return `Array must contain exactly ${issue.payload.expected.value} item(s)`
      if (issue.payload.check === 'unique') return 'Array must contain unique items'
      if (issue.payload.check === 'sorted') return 'Array must be sorted'
      return TError.assertNever(issue.payload)
    case IssueKind.InvalidSet:
      if (issue.payload.check === 'min')
        return `Set must contain ${issue.payload.expected.inclusive ? 'at least' : 'over'} ${
          issue.payload.expected.value
        } item(s)`
      if (issue.payload.check === 'max')
        return `Set must contain ${issue.payload.expected.inclusive ? 'at most' : 'under'} ${
          issue.payload.expected.value
        } item(s)`
      if (issue.payload.check === 'size') return `Set must contain exactly ${issue.payload.expected.value} item(s)`
      return TError.assertNever(issue.payload)
    case IssueKind.InvalidTuple:
      return 'Invalid tuple'
    case IssueKind.InvalidBuffer:
      if (issue.payload.check === 'min')
        return `Buffer must contain ${issue.payload.expected.inclusive ? 'at least' : 'over'} ${
          issue.payload.expected.value
        } byte(s)`
      if (issue.payload.check === 'max')
        return `Buffer must contain ${issue.payload.expected.inclusive ? 'at most' : 'under'} ${
          issue.payload.expected.value
        } byte(s)`
      if (issue.payload.check === 'length') return `Buffer must contain exactly ${issue.payload.expected.value} byte(s)`
      return TError.assertNever(issue.payload)
    case IssueKind.Forbidden:
      return 'Forbidden'
    case IssueKind.Custom:
      return 'message' in issue && typeof issue.message === 'string' ? issue.message : 'Custom error'

    default:
      return TError.assertNever(issue)
  }
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

export class TError<I, T extends TType<unknown, TDef, I> = TType<unknown, TDef, I>> extends Error {
  private readonly _schema: T
  private readonly _issues: readonly TIssue[]

  constructor(schema: T, issues: readonly TIssue[]) {
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

  get schema(): T {
    return this._schema
  }

  get origin(): T {
    return this.schema
  }

  get issues(): readonly TIssue[] {
    return this._issues
  }

  static fromContext<T extends TType>(ctx: ParseContextOf<T>): TError<InputOf<T>, T> {
    return new TError(ctx.root.schema as T, ctx.allIssues)
  }

  static assertNever(_x: never): never {
    throw new Error('Impossible')
  }

  static readonly defaultFormatter: TErrorFormatter = DEFAULT_ERROR_FORMATTER
  static readonly defaultIssueMap: TErrorMap = DEFAULT_ERROR_MAP
}

export type AnyTError = TError<unknown>
