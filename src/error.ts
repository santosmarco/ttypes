import util from 'util'
import type validator from 'validator'
import {
  getGlobal,
  stringUtils,
  type AnyTType,
  type InputOf,
  type LooseStripKey,
  type ParseContextOf,
  type ParsePath,
  type Primitive,
  type SimplifyDeep,
  type StripKey,
  type TParsedType,
  type objectUtils,
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
  InvalidBuffer: 'invalid_buffer',
  Forbidden: 'forbidden',
  Custom: 'custom',
} as const

export type EIssueKind = typeof IssueKind

export type IssueKind = EIssueKind[keyof EIssueKind]

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

export type ToChecks<T extends TIssue> = ReadonlyArray<
  LooseStripKey<T['payload'], 'received'> & { readonly message: string | undefined }
>

/* ----------------------------------------------------- Issues ----------------------------------------------------- */

export type IssueBase<
  K extends IssueKind,
  P extends objectUtils.OmitIndexSignature<objectUtils.AnyRecord> | undefined = undefined
> = SimplifyDeep<
  {
    readonly kind: K
    readonly path: ParsePath
    readonly data: unknown
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
  {
    readonly expected: { readonly value: Primitive; readonly formatted: stringUtils.Literalized }
    readonly received: { readonly value: Primitive; readonly formatted: stringUtils.Literalized }
  }
>

export type InvalidEnumValueIssue = IssueBase<
  EIssueKind['InvalidEnumValue'],
  {
    readonly expected: {
      readonly values: ReadonlyArray<string | number>
      readonly formatted: ReadonlyArray<stringUtils.Literalized<string> | stringUtils.Literalized<number>>
    }
    readonly received: {
      readonly value: string | number
      readonly formatted: stringUtils.Literalized<string> | stringUtils.Literalized<number>
    }
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
    readonly expected: { readonly values: readonly Primitive[]; readonly formatted: readonly stringUtils.Literalized[] }
    readonly received: { readonly value: Primitive; readonly formatted: stringUtils.Literalized }
  }
>

export type InvalidIntersectionIssue = IssueBase<EIssueKind['InvalidIntersection']>

export type InvalidStringIssue = IssueBase<
  EIssueKind['InvalidString'],
  | MinCheck
  | MaxCheck
  | LengthCheck
  | {
      readonly check: 'pattern'
      readonly pattern: RegExp
      readonly options: { readonly type: 'enforce' | 'disallow'; readonly name: string }
    }
  | { readonly check: 'alphanum'; readonly received: string }
  | {
      readonly check: 'email'
      readonly options: Readonly<Required<objectUtils.CamelCaseProperties<validator.IsEmailOptions>>>
    }
  | { readonly check: 'url' }
  | { readonly check: 'cuid' }
  | { readonly check: 'uuid' }
  | { readonly check: 'iso_date' }
  | { readonly check: 'iso_duration' }
  | { readonly check: 'numeric'; readonly options: { readonly noSymbols: boolean } }
  | { readonly check: 'base64'; readonly options: { readonly paddingRequired: boolean; readonly urlSafe: boolean } }
  | { readonly check: 'starts_with'; readonly prefix: string }
  | { readonly check: 'ends_with'; readonly suffix: string }
  | { readonly check: 'contains'; readonly substring: string }
>

export type InvalidNumberIssue = IssueBase<
  EIssueKind['InvalidNumber'],
  | MinCheck
  | MaxCheck
  | RangeCheck
  | { readonly check: 'integer' }
  | { readonly check: 'positive' }
  | { readonly check: 'nonpositive' }
  | { readonly check: 'negative' }
  | { readonly check: 'nonnegative' }
  | { readonly check: 'finite' }
  | { readonly check: 'port' }
  | { readonly check: 'multiple'; readonly expected: number }
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
  MinCheck | MaxCheck | LengthCheck | { readonly check: 'unique' } | { readonly check: 'sorted' }
>

export type InvalidSetIssue = IssueBase<
  EIssueKind['InvalidSet'],
  MinCheck | MaxCheck | { readonly check: 'size'; readonly expected: number; readonly received: number }
>

export type InvalidTupleIssue = IssueBase<EIssueKind['InvalidTuple'], LengthCheck>

export type InvalidBufferIssue = IssueBase<EIssueKind['InvalidBuffer'], MinCheck | MaxCheck | LengthCheck>

export type ForbiddenIssue = IssueBase<EIssueKind['Forbidden']>

export interface CustomIssue {
  readonly path?: ParsePath
  readonly message?: string
  readonly payload?: Record<string, unknown>
}

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
  [IssueKind.InvalidBuffer]: InvalidBufferIssue
  [IssueKind.Forbidden]: ForbiddenIssue
  [IssueKind.Custom]: CustomIssue & { readonly kind: EIssueKind['Custom'] }
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

export type ErrorMapIssueInput = StripKey<TIssue, 'message'>
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
      return `Expected one of ${issue.payload.expected.formatted.join(' | ')}, got ${issue.payload.received.formatted}`
    case IssueKind.InvalidThisType:
      return 'Invalid `this` context type'
    case IssueKind.InvalidArguments:
      return 'Invalid arguments'
    case IssueKind.InvalidReturnType:
      return 'Invalid return type'
    case IssueKind.InvalidInstance:
      return `Expected an instance of ${issue.payload.expected}`
    case IssueKind.MissingKeys:
      return `Missing key(s) in object: ${issue.payload.keys.map(stringUtils.literalize).join(', ')}`
    case IssueKind.UnrecognizedKeys:
      return `Unrecognized key(s) found in object: ${issue.payload.keys.map(stringUtils.literalize).join(', ')}`
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
      if (issue.payload.check === 'length') return `String must contain exactly ${issue.payload.expected} character(s)`
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
      if (issue.payload.check === 'starts_with') return `String must start with "${issue.payload.prefix}"`
      if (issue.payload.check === 'ends_with') return `String must end with "${issue.payload.suffix}"`
      if (issue.payload.check === 'contains') return `String must contain the substring "${issue.payload.substring}"`
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
      if (issue.payload.check === 'integer') return 'Number must be an integer'
      if (issue.payload.check === 'positive') return 'Number must be positive'
      if (issue.payload.check === 'nonpositive') return 'Number must be non-positive'
      if (issue.payload.check === 'negative') return 'Number must be negative'
      if (issue.payload.check === 'nonnegative') return 'Number must be non-negative'
      if (issue.payload.check === 'finite') return 'Number must be finite'
      if (issue.payload.check === 'port') return 'Number must be a valid port number'
      if (issue.payload.check === 'multiple') return `Number must be a multiple of ${issue.payload.expected}`
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
      if (issue.payload.check === 'positive') return 'Number must be positive'
      if (issue.payload.check === 'nonpositive') return 'Number must be non-positive'
      if (issue.payload.check === 'negative') return 'Number must be negative'
      if (issue.payload.check === 'nonnegative') return 'Number must be non-negative'
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
      if (issue.payload.check === 'length') return `Array must contain exactly ${issue.payload.expected} item(s)`
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
      if (issue.payload.check === 'size') return `Set must contain exactly ${issue.payload.expected} item(s)`
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
      if (issue.payload.check === 'length') return `Buffer must contain exactly ${issue.payload.expected} byte(s)`
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

export class TError<I, T extends AnyTType<unknown, I> = AnyTType<unknown, I>> extends Error {
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

  static fromContext<T extends AnyTType>(ctx: ParseContextOf<T>): TError<InputOf<T>, T> {
    return new TError(ctx.root.schema as T, ctx.allIssues)
  }

  static assertNever(_x: never): never {
    throw new Error('Impossible')
  }

  static readonly defaultFormatter: TErrorFormatter = DEFAULT_ERROR_FORMATTER
  static readonly defaultIssueMap: TErrorMap = DEFAULT_ERROR_MAP
}

export type AnyTError = TError<unknown>
