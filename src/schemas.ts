import * as T from '@sinclair/typebox'
import { TypeCompiler } from '@sinclair/typebox/compiler'
import { Custom } from '@sinclair/typebox/custom'
import Ajv from 'ajv'
import addErrors from 'ajv-errors'
import type { FormatName } from 'ajv-formats'
import addFormats from 'ajv-formats'
import addKeywords from 'ajv-keywords'
import mergeDeep from 'merge-deep'
import type { CamelCase } from 'type-fest'
import { TIssueKind } from './error'

export enum TKind {
  BigInt = 'T_BigInt',
  Intersection = 'T_Intersection',
  Nullable = 'T_Nullable',
  Optional = 'T_Optional',
  Symbol = 'T_Symbol',
}

export type TKindMap<T extends TKind = TKind> = {
  [TKind.BigInt]: null
  [TKind.Intersection]: T.TSchema
  [TKind.Nullable]: { readonly underlying: T.TSchema }
  [TKind.Optional]: {
    readonly [T.Modifier]: 'Optional'
    readonly underlying: T.TSchema
  }
  [TKind.Symbol]: null
}[T]

Custom.Set<TKindMap<TKind.BigInt>>(
  TKind.BigInt,
  (_schema, value) => typeof value === 'bigint'
)

Custom.Set<TKindMap<TKind.Nullable>>(
  TKind.Nullable,
  (schema, value) =>
    value === null || TypeCompiler.Compile(schema.underlying).Check(value)
)

Custom.Set<TKindMap<TKind.Optional>>(
  TKind.Optional,
  (schema, value) =>
    value === undefined || TypeCompiler.Compile(schema.underlying).Check(value)
)

Custom.Set<TKindMap<TKind.Symbol>>(
  TKind.Symbol,
  (_schema, value) => typeof value === 'symbol'
)

Custom.Set(TKind.Intersection, (schema, value) => typeof value === 'bigint')

export const TCustom = <T extends TKind, U extends TKindMap<T>>(
  kind: T,
  ...args: U extends null ? [] : [payload: Omit<U, typeof T.Kind>]
): T.TSchema => T.Type.Unsafe({ [T.Kind]: kind, ...args[0] })

/* -------------------------------- TSchemas -------------------------------- */

export interface TSchemaCreateParamsOptions {
  readonly additionalIssueKinds?: readonly Exclude<
    TIssueKind,
    TIssueKind.InvalidType
  >[]
}

export interface TSchemaCreateParams<
  Opts extends TSchemaCreateParamsOptions | null = null
> {
  readonly messages?: {
    readonly [K in
      | TIssueKind.InvalidType
      | ('additionalIssueKinds' extends keyof Opts
          ? Opts['additionalIssueKinds'][number &
              keyof Opts['additionalIssueKinds']] &
              string
          : never) as CamelCase<K>]?: string
  }
}

export interface TSchemaErrorMessageObj {
  readonly type?: string
  readonly typeof?: string
  readonly format?: string
  readonly forbidden?: string
}

export interface TSchema {
  readonly type?:
    | 'string'
    | 'number'
    | 'integer'
    | 'boolean'
    | 'array'
    | 'object'
    | 'null'
  readonly typeof?: 'bigint' | 'symbol' | 'undefined'
  readonly format?: FormatName
  readonly forbidden?: boolean
  readonly errorMessage?: TSchemaErrorMessageObj
}

export const processCreateParams = (
  params: TSchemaCreateParams<Required<TSchemaCreateParamsOptions>>
): {
  readonly errorMessage: Required<TSchemaErrorMessageObj>
} => ({
  errorMessage: {
    type: params.messages?.invalidType ?? TIssueKind.InvalidType,
    typeof: params.messages?.invalidType ?? TIssueKind.InvalidType,
    format: params.messages?.invalidFormat ?? TIssueKind.InvalidFormat,
    forbidden: params.messages?.forbidden ?? TIssueKind.Forbidden,
  },
})

const makeSchemaBuilder =
  <T extends TSchema, U extends TSchemaCreateParamsOptions | null>(
    onBuild: (options: T & TSchemaCreateParams<U>) => T
  ) =>
  (optionsAndParams: Partial<T> & TSchemaCreateParams<U>) =>
    onBuild(mergeDeep(processCreateParams(optionsAndParams)))

export const TSchemas = {
  any: makeSchemaBuilder(() => ({})),
  unknown: makeSchemaBuilder(() => ({})),
  string: makeSchemaBuilder(() => ({ type: 'string' })),
  number: makeSchemaBuilder(() => ({ type: 'number' })),
  integer: makeSchemaBuilder(() => ({ type: 'integer' })),
  boolean: makeSchemaBuilder(() => ({ type: 'boolean' })),
  null: makeSchemaBuilder(() => ({ type: 'null' })),
  bigint: makeSchemaBuilder(() => ({ typeof: 'bigint' })),
  symbol: makeSchemaBuilder(() => ({ typeof: 'symbol' })),
  undefined: makeSchemaBuilder(() => ({ typeof: 'undefined' })),
  never: makeSchemaBuilder(() => ({ forbidden: true })),

  withFormat: <T extends TSchema>(
    schema: T,
    format: FormatName,
    errorMessage: string | undefined
  ): T =>
    mergeDeep(schema, {
      format,
      errorMessage: {
        format: errorMessage ?? TIssueKind.InvalidFormat,
      },
    }),
} as const

/* ------------------------------- TValidator ------------------------------- */

const createAjv = (): Ajv => {
  const base = new Ajv({ allErrors: true })

  const withErrors = addErrors(base)

  const withFormats = addFormats(withErrors, [
    'date',
    'time',
    'date-time',
    'duration',
    'uri',
    'uri-reference',
    'uri-template',
    'url',
    'email',
    'hostname',
    'ipv4',
    'ipv6',
    'regex',
    'uuid',
    'json-pointer',
    'json-pointer-uri-fragment',
    'relative-json-pointer',
    'byte',
    'int32',
    'int64',
    'float',
    'double',
    'password',
    'binary',
  ])

  const withKeywords = addKeywords(withFormats, ['instanceof'])
    .addKeyword({
      keyword: 'typeof',
      validate: (schema: TSchema, data: unknown) =>
        typeof data === schema.typeof,
    })
    .addKeyword({
      keyword: 'forbidden',
      validate: () => false,
    })

  return withKeywords
}

export const TValidator = createAjv()
