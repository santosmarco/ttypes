import type { TChecks } from './checks'
import { type ManifestType } from './manifest'
import type { ParsePath } from './parse'
import type { u } from './utils'

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TIssue                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export enum IssueKind {
  Required = 'required',
  InvalidType = 'invalid_type',
  InvalidLiteral = 'invalid_literal',
  InvalidEnumValue = 'invalid_enum_value',
  InvalidThisType = 'invalid_this_type',
  InvalidArguments = 'invalid_arguments',
  InvalidReturnType = 'invalid_return_type',
  InvalidInstance = 'invalid_instance',
  MissingKeys = 'missing_keys',
  UnrecognizedKeys = 'unrecognized_keys',
  InvalidUnion = 'invalid_union',
  InvalidDiscriminator = 'invalid_discriminator',
  InvalidIntersection = 'invalid_intersection',
  InvalidString = 'invalid_string',
  InvalidNumber = 'invalid_number',
  InvalidBigInt = 'invalid_bigint',
  InvalidDate = 'invalid_date',
  InvalidArray = 'invalid_array',
  InvalidSet = 'invalid_set',
  InvalidTuple = 'invalid_tuple',
  InvalidRecord = 'invalid_record',
  InvalidBuffer = 'invalid_buffer',
  Forbidden = 'forbidden',
  Custom = 'custom',
}

export type IssueCode<K extends IssueKind> = K | `${K}`

export type WithPayload<P extends object | null> = P extends null
  ? { readonly payload?: never }
  : { readonly payload: Readonly<Omit<P, `_${string}`>> }

export type IssueBase<K extends IssueKind, P extends object | null = null> = u.SimplifyDeep<
  WithPayload<P> & {
    readonly code: IssueCode<K>
    readonly path: ParsePath
    readonly data: unknown
    readonly message: string
    readonly _internals: { readonly fullPayload: P }
  }
>

export type RequiredIssue = IssueBase<IssueKind.Required>

export type InvalidTypeIssue = IssueBase<
  IssueKind.InvalidType,
  { readonly expected: ManifestType; readonly received: string }
>

export type InvalidLiteralIssue = IssueBase<
  IssueKind.InvalidLiteral,
  {
    readonly expected: { readonly value: u.Primitive; readonly formatted: u.Literalized }
    readonly received: { readonly value: u.Primitive; readonly formatted: u.Literalized }
  }
>

export type InvalidEnumValueIssue = IssueBase<
  IssueKind.InvalidEnumValue,
  {
    readonly expected: { readonly values: readonly u.Primitive[]; readonly formatted: readonly u.Literalized[] }
    readonly received: { readonly value: u.Primitive; readonly formatted: u.Literalized }
  }
>

export type InvalidThisTypeIssue = IssueBase<IssueKind.InvalidThisType, { readonly issues: readonly TIssue[] }>
export type InvalidArgumentsIssue = IssueBase<IssueKind.InvalidArguments, { readonly issues: readonly TIssue[] }>
export type InvalidReturnTypeIssue = IssueBase<IssueKind.InvalidReturnType, { readonly issues: readonly TIssue[] }>

export type InvalidInstanceIssue = IssueBase<IssueKind.InvalidInstance, { readonly expected: string }>

export type MissingKeysIssue = IssueBase<IssueKind.MissingKeys, { readonly keys: readonly PropertyKey[] }>
export type UnrecognizedKeysIssue = IssueBase<IssueKind.UnrecognizedKeys, { readonly keys: readonly PropertyKey[] }>

export type InvalidUnionIssue = IssueBase<IssueKind.InvalidUnion, { readonly issues: readonly TIssue[] }>

export type InvalidDiscriminatorIssue = IssueBase<
  IssueKind.InvalidDiscriminator,
  {
    readonly expected: { readonly values: readonly u.Primitive[]; readonly formatted: readonly u.Literalized[] }
    readonly received: { readonly value: u.Primitive; readonly formatted: u.Literalized }
  }
>

export type InvalidIntersectionIssue = IssueBase<IssueKind.InvalidIntersection>

export type InvalidStringIssue = IssueBase<
  IssueKind.InvalidString,
  | TChecks.Format<'alphanum'>
  | TChecks.Format<'base64', { readonly options: { readonly paddingRequired: boolean; readonly urlSafe: boolean } }>
  | TChecks.Format<'cuid'>
  | TChecks.Format<'email'>
  | TChecks.Format<'iso_date'>
  | TChecks.Format<'iso_duration'>
  | TChecks.Format<'numeric'>
  | TChecks.Format<'url'>
  | TChecks.Format<'uuid'>
  | TChecks.Length
  | TChecks.Make<
      'pattern',
      { readonly pattern: RegExp; readonly options: { readonly type: 'disallow' | 'enforce'; readonly name: string } }
    >
  | TChecks.Make<'ends_with', { readonly expected: string }>
  | TChecks.Make<'includes', { readonly expected: string }>
  | TChecks.Make<'starts_with', { readonly expected: string }>
  | TChecks.Max
  | TChecks.Min
>

export type InvalidNumberIssue = IssueBase<
  IssueKind.InvalidNumber,
  | TChecks.Make<
      'precision',
      {
        readonly expected: { readonly value: number; readonly inclusive: boolean }
        readonly convert: boolean
        readonly received: number
      }
    >
  | TChecks.Make<'finite', { readonly enabled: boolean }>
  | TChecks.Make<'integer'>
  | TChecks.Make<'multiple', { readonly expected: number }>
  | TChecks.Make<'port'>
  | TChecks.Make<'safe', { readonly enabled: boolean }>
  | TChecks.Max
  | TChecks.Min
  | TChecks.Range
>

export type InvalidBigIntIssue = IssueBase<
  IssueKind.InvalidBigInt,
  | TChecks.Make<'multiple', { readonly expected: bigint }>
  | TChecks.Max<bigint>
  | TChecks.Min<bigint>
  | TChecks.Range<bigint>
>

export type InvalidDateIssue = IssueBase<
  IssueKind.InvalidDate,
  TChecks.Max<Date | 'now', Date> | TChecks.Min<Date | 'now', Date> | TChecks.Range<Date | 'now', Date>
>

export type InvalidArrayIssue = IssueBase<
  IssueKind.InvalidArray,
  | TChecks.Length
  | TChecks.Make<
      'sorted',
      { readonly _sortFn: ((a: unknown, b: unknown) => number) | undefined; readonly enforce: boolean }
    >
  | TChecks.Make<
      'unique',
      {
        readonly _compareFn: ((a: unknown, b: unknown) => boolean) | undefined
        readonly enforce: boolean
        readonly received: { readonly nonUnique: readonly unknown[] }
      }
    >
  | TChecks.Max
  | TChecks.Min
>

export type InvalidSetIssue = IssueBase<IssueKind.InvalidSet, TChecks.Max | TChecks.Min | TChecks.Size>

export type InvalidTupleIssue = IssueBase<IssueKind.InvalidTuple, TChecks.Length>

export type InvalidRecordIssue = IssueBase<
  IssueKind.InvalidRecord,
  | {
      readonly check: 'max_keys'
      readonly expected: { readonly value: number; readonly inclusive: boolean }
      readonly received: number
    }
  | {
      readonly check: 'min_keys'
      readonly expected: { readonly value: number; readonly inclusive: boolean }
      readonly received: number
    }
>

export type InvalidBufferIssue = IssueBase<IssueKind.InvalidBuffer, TChecks.Length | TChecks.Max | TChecks.Min>

export type ForbiddenIssue = IssueBase<IssueKind.Forbidden>

export type CustomIssue = IssueBase<IssueKind.Custom, Record<string, unknown>>

type IssueMap<K extends IssueKind = IssueKind> = K extends unknown
  ? {
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
  : never

export type FullIssue<K extends IssueKind = IssueKind> = IssueMap<K>

export type TIssue<K extends IssueKind = IssueKind> = u.StripKey<FullIssue<K>, '_internals'>

export type OptionalDataIssue<K extends IssueKind = IssueKind> = u.StripKey<TIssue<K>, 'data'> & {
  readonly data?: unknown
}
