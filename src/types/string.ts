import {
  TChecks,
  TError,
  TIssueKind,
  TParsedType,
  TType,
  TTypeName,
  type LooseStripKey,
  type NonNegativeInteger,
  type OutputOf,
  type ParseContextOf,
  type ParseResultOf,
  type Simplify,
  type TDef,
  type TInvalidStringIssue,
  type TOptions,
} from '../_internal'

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TString                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TStringTransform = 'trim' | 'lowercase' | 'uppercase' | 'capitalize' | 'uncapitalize'

export type TStringOutput<T extends readonly TStringTransform[]> = T extends readonly []
  ? string
  : T extends readonly [infer H extends TStringTransform, ...infer R extends TStringTransform[]]
  ? H extends 'trim'
    ? TStringOutput<R>
    : {
        lowercase: Lowercase<TStringOutput<R>>
        uppercase: Uppercase<TStringOutput<R>>
        capitalize: Capitalize<TStringOutput<R>>
        uncapitalize: Uncapitalize<TStringOutput<R>>
      }[Exclude<H, 'trim'>]
  : never

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TStringInput<C extends boolean> = C extends true ? any : string

export interface TStringDef<C extends boolean> extends TDef {
  readonly typeName: TTypeName.String
  readonly transforms: readonly TStringTransform[]
  readonly checks: ReadonlyArray<
    LooseStripKey<TInvalidStringIssue['payload'], 'received'> & { readonly message: string | undefined }
  >
  readonly coerce: C
}

export class TString<
  T extends readonly TStringTransform[] = readonly TStringTransform[],
  C extends boolean = boolean
> extends TType<TStringOutput<T>, TStringDef<C>, TStringInput<C>> {
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    const { transforms, checks, coerce } = this._def

    if (coerce) {
      ctx.setData(String(ctx.data))
    }

    if (typeof ctx.data !== 'string') {
      return ctx.invalidType({ expected: TParsedType.String }).abort()
    }

    for (const transform of transforms) {
      switch (transform) {
        case 'trim':
          ctx.setData(ctx.data.trim())
          break
        case 'lowercase':
          ctx.setData(ctx.data.toLowerCase())
          break
        case 'uppercase':
          ctx.setData(ctx.data.toUpperCase())
          break
        case 'capitalize':
          ctx.setData(ctx.data.charAt(0).toUpperCase() + ctx.data.slice(1))
          break
        case 'uncapitalize':
          ctx.setData(ctx.data.charAt(0).toLowerCase() + ctx.data.slice(1))
          break

        default:
          TError.assertNever(transform)
      }
    }

    const { data } = ctx

    for (const check of checks) {
      switch (check.check) {
        case 'min':
          if (check.expected.inclusive ? data.length < check.expected.value : data.length <= check.expected.value) {
            ctx.addIssue(
              { kind: TIssueKind.InvalidString, payload: { ...check, received: data.length } },
              check.message
            )
            if (ctx.common.abortEarly) {
              return ctx.abort()
            }
          }

          break
        case 'max':
          if (check.expected.inclusive ? data.length > check.expected.value : data.length >= check.expected.value) {
            ctx.addIssue(
              { kind: TIssueKind.InvalidString, payload: { ...check, received: data.length } },
              check.message
            )
            if (ctx.common.abortEarly) {
              return ctx.abort()
            }
          }

          break
        case 'length':
          if (data.length !== check.expected) {
            ctx.addIssue(
              { kind: TIssueKind.InvalidString, payload: { ...check, received: data.length } },
              check.message
            )
            if (ctx.common.abortEarly) {
              return ctx.abort()
            }
          }

          break
        case 'pattern':
          if (!check.expected.pattern.test(data)) {
            ctx.addIssue({ kind: TIssueKind.InvalidString, payload: { ...check, received: data } }, check.message)
            if (ctx.common.abortEarly) {
              return ctx.abort()
            }
          }

          break

        case 'replace':
          const transformed = data.replace(check.expected.pattern, check.expected.replacement)
          if (transformed === data) {
            ctx.addIssue({ kind: TIssueKind.InvalidString, payload: { ...check, received: data } }, check.message)
            if (ctx.common.abortEarly) {
              return ctx.abort()
            }
          } else {
            ctx.setData(transformed)
          }

          break
        case 'email':
        case 'cuid':
        case 'uuid':
        case 'isoDuration':
          if (!TString._internals.regexes[check.check].test(data)) {
            ;((): (() => ParseContextOf<this>) =>
              ({
                email: () =>
                  ctx.addIssue(
                    { kind: TIssueKind.InvalidString, payload: { check: 'email', received: data } },
                    check.message
                  ),
                cuid: () =>
                  ctx.addIssue(
                    { kind: TIssueKind.InvalidString, payload: { check: 'cuid', received: data } },
                    check.message
                  ),
                uuid: () =>
                  ctx.addIssue(
                    { kind: TIssueKind.InvalidString, payload: { check: 'uuid', received: data } },
                    check.message
                  ),
                isoDuration: () =>
                  ctx.addIssue(
                    { kind: TIssueKind.InvalidString, payload: { check: 'isoDuration', received: data } },
                    check.message
                  ),
              }[check.check]))()()
            if (ctx.common.abortEarly) {
              return ctx.abort()
            }
          }

          break
        case 'base64':
          if (
            !TString._internals.regexes[check.check][
              check.expected.paddingRequired ? 'paddingRequired' : 'paddingNotRequired'
            ][check.expected.urlSafe ? 'urlSafe' : 'urlUnsafe'].test(data)
          ) {
            ctx.addIssue({ kind: TIssueKind.InvalidString, payload: { ...check, received: data } }, check.message)
            if (ctx.common.abortEarly) {
              return ctx.abort()
            }
          }

          break
        case 'url':
          try {
            // eslint-disable-next-line no-new
            new URL(data)
          } catch {
            ctx.addIssue({ kind: TIssueKind.InvalidString, payload: { ...check, received: data } }, check.message)
            if (ctx.common.abortEarly) {
              return ctx.abort()
            }
          }

          break
        case 'startsWith':
          if (!data.startsWith(check.expected)) {
            ctx.addIssue({ kind: TIssueKind.InvalidString, payload: { ...check, received: data } }, check.message)
            if (ctx.common.abortEarly) {
              return ctx.abort()
            }
          }

          break
        case 'endsWith':
          if (!data.endsWith(check.expected)) {
            ctx.addIssue({ kind: TIssueKind.InvalidString, payload: { ...check, received: data } }, check.message)
            if (ctx.common.abortEarly) {
              return ctx.abort()
            }
          }

          break

        case 'contains':
          if (!data.includes(check.expected)) {
            ctx.addIssue({ kind: TIssueKind.InvalidString, payload: { ...check, received: data } }, check.message)
            if (ctx.common.abortEarly) {
              return ctx.abort()
            }
          }

          break
        default:
          TError.assertNever(check)
      }
    }

    return ctx.success(ctx.data as OutputOf<this>)
  }

  /* ---------------------------------------------------- Coercion ---------------------------------------------------- */

  coerce<V extends boolean = true>(value = true as V): TString<T, V> {
    return new TString({ ...this._def, coerce: value })
  }

  /* -------------------------------------------- Character count checks -------------------------------------------- */

  min<V extends number>(
    value: NonNegativeInteger<V>,
    options?: { readonly inclusive?: boolean; readonly message?: string }
  ): this {
    return this._checks
      .add({
        check: 'min',
        expected: { value, inclusive: options?.inclusive ?? true },
        message: options?.message,
      })
      ._checks.remove('length')
  }

  max<V extends number>(
    value: NonNegativeInteger<V>,
    options?: { readonly inclusive?: boolean; readonly message?: string }
  ): this {
    return this._checks
      .add({
        check: 'max',
        expected: { value, inclusive: options?.inclusive ?? true },
        message: options?.message,
      })
      ._checks.remove('length')
  }

  length<L extends number>(length: NonNegativeInteger<L>, options?: { readonly message?: string }): this {
    return this._checks
      .add({ check: 'length', expected: length, message: options?.message })
      ._checks.remove('min')
      ._checks.remove('max')
  }

  /* ------------------------------------------------ Pattern checks ------------------------------------------------ */

  pattern(pattern: RegExp, options?: { readonly name?: string; readonly message?: string }): this {
    return this._checks.add({
      check: 'pattern',
      expected: { pattern, name: options?.name ?? pattern.source },
      message: options?.message,
    })
  }

  regex(pattern: RegExp, options?: { readonly name?: string; readonly message?: string }): this {
    return this.pattern(pattern, options)
  }

  replace(pattern: RegExp, replacement: string, options?: { readonly name?: string; readonly message?: string }): this {
    return this._checks.add({
      check: 'replace',
      expected: { pattern, replacement, name: options?.name ?? pattern.source },
      message: options?.message,
    })
  }

  email(options?: { readonly message?: string }): this {
    return this._checks.add({ check: 'email', message: options?.message })
  }

  get isEmail(): boolean {
    return this._checks.checkExists('email')
  }

  url(options?: { readonly message?: string }): this {
    return this._checks.add({ check: 'url', message: options?.message })
  }

  get isUrl(): boolean {
    return this._checks.checkExists('url')
  }

  cuid(options?: { readonly message?: string }): this {
    return this._checks.add({ check: 'cuid', message: options?.message })
  }

  get isCuid(): boolean {
    return this._checks.checkExists('cuid')
  }

  uuid(options?: { readonly message?: string }): this {
    return this._checks.add({ check: 'uuid', message: options?.message })
  }

  get isUuid(): boolean {
    return this._checks.checkExists('uuid')
  }

  isoDuration(options?: { readonly message?: string }): this {
    return this._checks.add({ check: 'isoDuration', message: options?.message })
  }

  get isIsoDuration(): boolean {
    return this._checks.checkExists('isoDuration')
  }

  base64(options?: {
    readonly paddingRequired?: boolean
    readonly urlSafe?: boolean
    readonly message?: string
  }): this {
    return this._checks.add({
      check: 'base64',
      expected: { paddingRequired: options?.paddingRequired ?? true, urlSafe: options?.urlSafe ?? true },
      message: options?.message,
    })
  }

  get isBase64(): boolean {
    return this._checks.checkExists('base64')
  }

  startsWith(prefix: string, options?: { readonly message?: string }): this {
    return this._checks.add({ check: 'startsWith', expected: prefix, message: options?.message })
  }

  endsWith(suffix: string, options?: { readonly message?: string }): this {
    return this._checks.add({ check: 'endsWith', expected: suffix, message: options?.message })
  }

  constains(substring: string, options?: { readonly message?: string }): this {
    return this._checks.add({ check: 'contains', expected: substring, message: options?.message })
  }

  /* -------------------------------------------------- Transforms -------------------------------------------------- */

  trim(): TString<[...T, 'trim'], C> {
    return this._addTransform('trim')
  }

  lowercase(): TString<[...T, 'lowercase'], C> {
    return this._addTransform('lowercase')
  }

  uppercase(): TString<[...T, 'uppercase'], C> {
    return this._addTransform('uppercase')
  }

  capitalize(): TString<[...T, 'capitalize'], C> {
    return this._addTransform('capitalize')
  }

  uncapitalize(): TString<[...T, 'uncapitalize'], C> {
    return this._addTransform('uncapitalize')
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  private readonly _checks = TChecks.of(this)

  private _addTransform<T_ extends TStringTransform>(transform: T_): TString<[...T, T_], C> {
    return new TString({
      ...this._def,
      transforms: [...new Set([...this._def.transforms, transform])],
    })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create(options?: Simplify<TOptions>): TString<[], false> {
    return new TString({
      typeName: TTypeName.String,
      checks: [],
      transforms: [],
      coerce: false,
      options: { ...options },
    })
  }

  private static readonly _internals: {
    readonly regexes: Readonly<Record<'alphanum' | 'email' | 'cuid' | 'uuid' | 'isoDuration', RegExp>> & {
      readonly base64: {
        readonly paddingRequired: { readonly urlSafe: RegExp; readonly urlUnsafe: RegExp }
        readonly paddingNotRequired: { readonly urlSafe: RegExp; readonly urlUnsafe: RegExp }
      }
    }
  } = {
    regexes: {
      alphanum: /^[a-zA-Z0-9]+$/,
      email:
        /^(([^<>()[\].,;:\s@"]+(\.[^<>()[\].,;:\s@"]+)*)|(".+"))@((?!-)([^<>()[\].,;:\s@"]+\.)+[^<>()[\].,;:\s@"]{1,})[^-<>()[\].,;:\s@"]$/i,
      cuid: /^c[^\s-]{8,}$/i,
      uuid: /^([a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[a-f0-9]{4}-[a-f0-9]{12}|00000000-0000-0000-0000-000000000000)$/i,
      isoDuration: /^P(?!$)(\d+Y)?(\d+M)?(\d+W)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+S)?)?$/,
      base64: {
        paddingRequired: {
          urlSafe: /^(?:[\w-]{2}[\w-]{2})*(?:[\w-]{2}==|[\w-]{3}=)?$/,
          urlUnsafe: /^(?:[A-Za-z0-9+/]{2}[A-Za-z0-9+/]{2})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/,
        },
        paddingNotRequired: {
          urlSafe: /^(?:[\w-]{2}[\w-]{2})*(?:[\w-]{2}(==)?|[\w-]{3}=?)?$/,
          urlUnsafe: /^(?:[A-Za-z0-9+/]{2}[A-Za-z0-9+/]{2})*(?:[A-Za-z0-9+/]{2}(==)?|[A-Za-z0-9+/]{3}=?)?$/,
        },
      },
    },
  }
}
