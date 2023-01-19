import _ from 'lodash'
import { TChecks } from '../checks'
import type { TDef } from '../def'
import { TError } from '../error'
import { IssueKind, type InvalidStringIssue } from '../issues'
import { TManifest } from '../manifest'
import type { TOptions } from '../options'
import { TParsedType, type ParseContextOf, type ParseResultOf } from '../parse'
import { TTypeName } from '../type-names'
import { u } from '../utils'
import { TType, type OutputOf, type TSuperDefault } from './_internal'

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TString                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TStringTransform =
  | { readonly kind: 'lowercase' }
  | { readonly kind: 'uppercase' }
  | { readonly kind: 'capitalize' }
  | { readonly kind: 'uncapitalize' }
  | { readonly kind: 'trim' }
  | { readonly kind: 'replace'; readonly search: RegExp | string; readonly replace: string; readonly all?: boolean }

export type TStringInput<Coerce extends boolean> = Coerce extends true ? any : string

// export type TStringOutput<
//   Transforms extends ReadonlyArray<TStringTransform['kind']>,
//   OutputFormat extends string
// > = Transforms extends readonly []
//   ? OutputFormat
//   : Transforms extends readonly [
//       infer H extends TStringTransform['kind'],
//       ...infer R extends ReadonlyArray<TStringTransform['kind']>
//     ]
//   ? {
//       lowercase: Lowercase<TStringOutput<R, OutputFormat>>
//       uppercase: Uppercase<TStringOutput<R, OutputFormat>>
//       capitalize: Capitalize<TStringOutput<R, OutputFormat>>
//       uncapitalize: Uncapitalize<TStringOutput<R, OutputFormat>>
//       trim: TStringOutput<R, OutputFormat>
//       replace: TStringOutput<R, OutputFormat>
//     }[H]
//   : never

export type TStringOutput<
  _Transforms extends ReadonlyArray<TStringTransform['kind']>,
  OutputFormat extends string
> = OutputFormat

export type TStringManifestFormat =
  | 'alphanumeric'
  | 'base64'
  | 'cuid'
  | 'email'
  | 'iso_date'
  | 'iso_duration'
  | 'numeric'
  | 'url'
  | 'uuid'

export interface TStringDef<Coerce extends boolean = boolean> extends TDef {
  readonly typeName: TTypeName.String
  readonly transforms: readonly TStringTransform[]
  readonly checks: TChecks.FromIssue<InvalidStringIssue>
  readonly coerce: Coerce
}

export class TString<
  Transforms extends ReadonlyArray<TStringTransform['kind']> = [],
  OutputFormat extends string = string,
  Coerce extends boolean = false
> extends TType<TStringOutput<Transforms, OutputFormat>, TStringDef<Coerce>, TStringInput<Coerce>> {
  get _manifest() {
    const formats = _.compact([
      this.isAlphanumeric && 'alphanumeric',
      this.isBase64 && 'base64',
      this.isCuid && 'cuid',
      this.isEmail && 'email',
      this.isIsoDate && 'iso_date',
      this.isIsoDuration && 'iso_duration',
      this.isNumeric && 'numeric',
      this.isUrl && 'url',
      this.isUuid && 'uuid',
    ])

    return TManifest<TStringInput<Coerce>>()({
      type: this._def.coerce ? TParsedType.Any : TParsedType.String,
      min: this.minLength ?? null,
      max: this.maxLength ?? null,
      formats: formats.length ? formats : null,
      transforms: this._def.transforms.length ? this._def.transforms.map((t) => t.kind) : null,
      patterns: this.patterns,
      prefix: this.prefix ?? null,
      suffix: this.suffix ?? null,
      substrings: this.substrings,
      coerce: this._def.coerce,
      required: !this._def.coerce as Coerce extends true ? false : true,
      nullable: this._def.coerce,
    })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (this._def.coerce) {
      ctx.setData(String(ctx.data))
    }

    if (typeof ctx.data !== 'string') {
      return ctx.invalidType({ expected: TParsedType.String }).abort()
    }

    for (const transform of this._def.transforms) {
      if (transform.kind === 'trim') {
        ctx.setData(ctx.data.trim())
      } else if (transform.kind === 'replace') {
        ctx.setData(
          typeof transform.search === 'string' && transform.all
            ? ctx.data.split(transform.search).join(transform.replace)
            : ctx.data.replace(transform.search, transform.replace)
        )
      } else if (transform.kind === 'lowercase') {
        ctx.setData(ctx.data.toLowerCase())
      } else if (transform.kind === 'uppercase') {
        ctx.setData(ctx.data.toUpperCase())
      } else if (transform.kind === 'capitalize') {
        ctx.setData(ctx.data[0].toUpperCase() + ctx.data.slice(1))
      } else if (transform.kind === 'uncapitalize') {
        ctx.setData(ctx.data[0].toLowerCase() + ctx.data.slice(1))
      } else {
        TError.assertNever(transform)
      }
    }

    const { data } = ctx

    for (const check of this._def.checks) {
      if (check.check === 'min' || check.check === 'max' || check.check === 'length') {
        if (
          !{
            min: TChecks.handleMin,
            max: TChecks.handleMax,
            length: TChecks.handleExact,
          }[check.check](data.length, check.expected)
        ) {
          ctx.addIssue(
            IssueKind.InvalidString,
            { check: check.check, expected: check.expected, received: data.length },
            check.message
          )
          if (ctx.common.abortEarly) {
            return ctx.abort()
          }
        }
      } else if (
        check.check === 'alphanum' ||
        check.check === 'cuid' ||
        check.check === 'email' ||
        check.check === 'iso_duration' ||
        check.check === 'uuid'
      ) {
        if (!TString._internals.rx[check.check].test(data)) {
          ctx.addIssue(IssueKind.InvalidString, { check: check.check }, check.message)
          if (ctx.common.abortEarly) {
            return ctx.abort()
          }
        }
      } else if (check.check === 'base64') {
        const { paddingRequired, urlSafe } = check.options
        if (!TString._internals.rx[check.check][u.literalize(paddingRequired)][u.literalize(urlSafe)].test(data)) {
          ctx.addIssue(IssueKind.InvalidString, { check: check.check, options: check.options }, check.message)
          if (ctx.common.abortEarly) {
            return ctx.abort()
          }
        }
      } else if (check.check === 'pattern') {
        const matches = check.pattern.exec(data)
        if ({ enforce: !matches, disallow: matches }[check.options.type]) {
          ctx.addIssue(
            IssueKind.InvalidString,
            { check: check.check, pattern: check.pattern, options: check.options },
            check.message
          )
          if (ctx.common.abortEarly) {
            return ctx.abort()
          }
        }
      } else if (check.check === 'numeric') {
        if (Number.isNaN(Number(data))) {
          ctx.addIssue(IssueKind.InvalidString, { check: check.check }, check.message)
          if (ctx.common.abortEarly) {
            return ctx.abort()
          }
        }
      } else if (check.check === 'url') {
        try {
          // eslint-disable-next-line no-new
          new URL(data)
        } catch {
          ctx.addIssue(IssueKind.InvalidString, { check: check.check }, check.message)
          if (ctx.common.abortEarly) {
            return ctx.abort()
          }
        }
      } else if (check.check === 'iso_date') {
        const validated = TString._internals.validateIsoDate(ctx.data)
        if (validated) {
          ctx.setData(validated)
        } else {
          ctx.addIssue(IssueKind.InvalidString, { check: check.check }, check.message)
          if (ctx.common.abortEarly) {
            return ctx.abort()
          }
        }
      } else if (check.check === 'starts_with' || check.check === 'ends_with' || check.check === 'includes') {
        if (!data[u.toCamelCase(check.check)](check.expected)) {
          ctx.addIssue(IssueKind.InvalidString, { check: check.check, expected: check.expected }, check.message)
          if (ctx.common.abortEarly) {
            return ctx.abort()
          }
        }
      } else {
        TError.assertNever(check)
      }
    }

    return ctx.isValid() ? ctx.success(data as OutputOf<this>) : ctx.abort()
  }

  /* --------------------------------------------------- Coercion --------------------------------------------------- */

  coerce<C extends boolean = true>(value = true as C): TString<Transforms, OutputFormat, C> {
    return new TString({ ...this._def, coerce: value })
  }

  /* ---------------------------------------------------- Checks ---------------------------------------------------- */

  min<V extends number>(
    value: u.NonNegativeInteger<V>,
    options?: { readonly inclusive?: boolean; readonly message?: string }
  ): this {
    return this._addCheck({
      check: 'min',
      expected: { value, inclusive: options?.inclusive ?? true },
      message: options?.message,
    })
  }

  max<V extends number>(
    value: u.NonNegativeInteger<V>,
    options?: { readonly inclusive?: boolean; readonly message?: string }
  ): this {
    return this._addCheck({
      check: 'max',
      expected: { value, inclusive: options?.inclusive ?? true },
      message: options?.message,
    })
  }

  length<V extends number>(value: u.NonNegativeInteger<V>, options?: { readonly message?: string }): this {
    return this._addCheck({
      check: 'length',
      expected: { value, inclusive: true },
      message: options?.message,
    })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  pattern(
    pattern: RegExp,
    options?: { readonly type?: 'enforce' | 'disallow'; readonly name?: string; readonly message?: string }
  ): this {
    return this._addCheck({
      check: 'pattern',
      pattern,
      options: { type: options?.type ?? 'enforce', name: options?.name ?? String(pattern) },
      message: options?.message,
    })
  }

  regex(
    pattern: RegExp,
    options?: { readonly type?: 'enforce' | 'disallow'; readonly name?: string; readonly message?: string }
  ): this {
    return this.pattern(pattern, options)
  }

  enforce(pattern: RegExp, options?: { readonly name?: string; readonly message?: string }): this {
    return this.pattern(pattern, { ...options, type: 'enforce' })
  }

  disallow(pattern: RegExp, options?: { readonly name?: string; readonly message?: string }): this {
    return this.pattern(pattern, { ...options, type: 'disallow' })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  alphanumeric(options?: { readonly message?: string }): this {
    return this._addCheck({ check: 'alphanum', message: options?.message })
  }

  alphanum(options?: { readonly message?: string }): this {
    return this.alphanumeric(options)
  }

  numeric(options?: { readonly message?: string }): TString<Transforms, `${number}`, Coerce> {
    return this._addCheck({ check: 'numeric', message: options?.message }) as TString<Transforms, `${number}`, Coerce>
  }

  num(options?: { readonly message?: string }): TString<Transforms, `${number}`, Coerce> {
    return this.numeric(options)
  }

  cuid(options?: { readonly message?: string }): this {
    return this._addCheck({ check: 'cuid', message: options?.message })
  }

  uuid(options?: { readonly message?: string }): this {
    return this._addCheck({ check: 'uuid', message: options?.message })
  }

  email(options?: { readonly message?: string }): this {
    return this._addCheck({ check: 'email', message: options?.message })
  }

  url(options?: { readonly message?: string }): this {
    return this._addCheck({ check: 'url', message: options?.message })
  }

  isoDate(options?: { readonly message?: string }): this {
    return this._addCheck({ check: 'iso_date', message: options?.message })
  }

  isoDuration(options?: { readonly message?: string }): this {
    return this._addCheck({ check: 'iso_duration', message: options?.message })
  }

  base64(options?: {
    readonly paddingRequired?: boolean
    readonly urlSafe?: boolean
    readonly message?: string
  }): this {
    return this._addCheck({
      check: 'base64',
      options: { paddingRequired: options?.paddingRequired ?? true, urlSafe: options?.urlSafe ?? false },
      message: options?.message,
    })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  startsWith<P extends string>(
    prefix: P,
    options?: { readonly message?: string }
  ): TString<Transforms, `${P}${OutputFormat}`, Coerce> {
    return this._addCheck(
      { check: 'starts_with', expected: prefix, message: options?.message },
      { unique: true }
    ) as TString<Transforms, `${P}${OutputFormat}`, Coerce>
  }

  endsWith<S extends string>(
    suffix: S,
    options?: { readonly message?: string }
  ): TString<Transforms, `${OutputFormat}${S}`, Coerce> {
    return this._addCheck(
      { check: 'ends_with', expected: suffix, message: options?.message },
      { unique: true }
    ) as TString<Transforms, `${OutputFormat}${S}`, Coerce>
  }

  includes(substring: string, options?: { readonly message?: string }): this {
    return this._addCheck({ check: 'includes', expected: substring, message: options?.message })
  }

  contains(substring: string, options?: { readonly message?: string }): this {
    return this.includes(substring, options)
  }

  /* -------------------------------------------------- Transforms -------------------------------------------------- */

  trim(): TString<[...Transforms, 'trim'], OutputFormat, Coerce> {
    return this._addTransform({ kind: 'trim' })
  }

  lowercase(): TString<[...Transforms, 'lowercase'], OutputFormat, Coerce> {
    return this._addTransform({ kind: 'lowercase' })
  }

  uppercase(): TString<[...Transforms, 'uppercase'], OutputFormat, Coerce> {
    return this._addTransform({ kind: 'uppercase' })
  }

  capitalize(): TString<[...Transforms, 'capitalize'], OutputFormat, Coerce> {
    return this._addTransform({ kind: 'capitalize' })
  }

  uncapitalize(): TString<[...Transforms, 'uncapitalize'], OutputFormat, Coerce> {
    return this._addTransform({ kind: 'uncapitalize' })
  }

  replace<S extends RegExp | string>(
    search: S,
    replace: string,
    ...args: S extends RegExp ? [] : [options?: { readonly all?: boolean }]
  ): TString<[...Transforms, 'replace'], OutputFormat, Coerce> {
    const options = args?.[0] ?? {}
    return this._addTransform({ kind: 'replace', search, replace, all: options?.all ?? false })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  ensure(): TSuperDefault<this, ''> {
    return this.superDefault('')
  }

  /* ---------------------------------------------------- Getters --------------------------------------------------- */

  get minLength(): number | undefined {
    return this._getChecks('min', 'length').reduce<number | undefined>(
      (min, check) => (min === undefined || check.expected.value > min ? check.expected.value : min),
      undefined
    )
  }

  get maxLength(): number | undefined {
    return this._getChecks('max', 'length').reduce<number | undefined>(
      (max, check) => (max === undefined || check.expected.value < max ? check.expected.value : max),
      undefined
    )
  }

  get isAlphanumeric(): boolean {
    return this._hasCheck('alphanum')
  }

  get isNumeric(): boolean {
    return this._hasCheck('numeric')
  }

  get isCuid(): boolean {
    return this._hasCheck('cuid')
  }

  get isUuid(): boolean {
    return this._hasCheck('uuid')
  }

  get isEmail(): boolean {
    return this._hasCheck('email')
  }

  get isUrl(): boolean {
    return this._hasCheck('url')
  }

  get isIsoDate(): boolean {
    return this._hasCheck('iso_date')
  }

  get isIsoDuration(): boolean {
    return this._hasCheck('iso_duration')
  }

  get isBase64(): boolean {
    return this._hasCheck('base64')
  }

  get patterns(): ReadonlyArray<RegExp | { readonly regex: RegExp; readonly name: string }> {
    return this._getChecks('pattern').map((p) =>
      p.options.name === String(p.pattern) ? p.pattern : { regex: p.pattern, name: p.options.name }
    )
  }

  get prefix(): string | undefined {
    return this._getChecks('starts_with')[0]?.expected
  }

  get suffix(): string | undefined {
    return this._getChecks('ends_with')[0]?.expected
  }

  get substrings(): readonly string[] {
    return this._getChecks('includes').map((check) => check.expected)
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  private _addTransform<K extends TStringTransform['kind']>(
    transform: Extract<TStringTransform, { readonly kind: K }>
  ): TString<[...Transforms, K], OutputFormat, Coerce> {
    return new TString({ ...this._def, transforms: [...this._def.transforms, transform] })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create(options?: TOptions): TString {
    return new TString({
      typeName: TTypeName.String,
      transforms: [],
      checks: [],
      coerce: false,
      options: { ...options },
    })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static readonly _internals = {
    rx: {
      alphanum: /^[a-zA-Z0-9]+$/,
      cuid: /^c[^\s-]{8,}$/i,
      uuid: /^([a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[a-f0-9]{4}-[a-f0-9]{12}|00000000-0000-0000-0000-000000000000)$/i,
      email:
        /^(([^<>()[\].,;:\s@"]+(\.[^<>()[\].,;:\s@"]+)*)|(".+"))@((?!-)([^<>()[\].,;:\s@"]+\.)+[^<>()[\].,;:\s@"]{1,})[^-<>()[\].,;:\s@"]$/i,
      iso_date:
        /^(?:[-+]\d{2})?(?:\d{4}(?!\d{2}\b))(?:(-?)(?:(?:0[1-9]|1[0-2])(?:\1(?:[12]\d|0[1-9]|3[01]))?|W(?:[0-4]\d|5[0-2])(?:-?[1-7])?|(?:00[1-9]|0[1-9]\d|[12]\d{2}|3(?:[0-5]\d|6[1-6])))(?![T]$|[T][\d]+Z$)(?:[T\s](?:(?:(?:[01]\d|2[0-3])(?:(:?)[0-5]\d)?|24:?00)(?:[.,]\d+(?!:))?)(?:\2[0-5]\d(?:[.,]\d+)?)?(?:[Z]|(?:[+-])(?:[01]\d|2[0-3])(?::?[0-5]\d)?)?)?)?$/,
      iso_duration: /^P(?!$)(\d+Y)?(\d+M)?(\d+W)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+S)?)?$/,
      base64: {
        true: {
          true: /^(?:[\w-]{2}[\w-]{2})*(?:[\w-]{2}==|[\w-]{3}=)?$/,
          false: /^(?:[A-Za-z0-9+/]{2}[A-Za-z0-9+/]{2})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/,
        },
        false: {
          true: /^(?:[\w-]{2}[\w-]{2})*(?:[\w-]{2}(==)?|[\w-]{3}=?)?$/,
          false: /^(?:[A-Za-z0-9+/]{2}[A-Za-z0-9+/]{2})*(?:[A-Za-z0-9+/]{2}(==)?|[A-Za-z0-9+/]{3}=?)?$/,
        },
      },
    },

    validateIsoDate(value: string) {
      if (!TString._internals.rx.iso_date.test(value)) {
        return null
      }

      if (/.*T.*[+-]\d\d$/.test(value)) {
        value += '00'
      }

      const date = new Date(value)
      if (Number.isNaN(date.getTime())) {
        return null
      }

      return date.toISOString()
    },
  } as const
}

export type AnyTString = TString<Array<TStringTransform['kind']>, string, boolean>
