import memoize from 'micro-memoize'
import { nanoid } from 'nanoid'
import {
  AsyncParseContext,
  SyncParseContext,
  TDefined,
  TIntersection,
  TIssueKind,
  TLazy,
  TNullable,
  TOptional,
  TParsedType,
  TPipeline,
  TPromise,
  TReadonly,
  TShow,
  TTypeName,
  TUnion,
  cloneDeep,
  getGlobal,
  isArray,
  isAsync,
  isFunction,
  type AsyncParseResultOf,
  type Defined,
  type NonNegativeInteger,
  type ParseContextOf,
  type ParseOptions,
  type ParseResultOf,
  type Simplify,
  type SyncParseResultOf,
  type TDef,
  type TIterable,
  type TIterableDef,
  type TManifest,
  type TOptions,
  type TTypeNameMap,
  type TUnwrappable,
  type UnwrapDeep,
  TChecks,
  TInvalidNumberIssue,
  LooseStripKey,
  TInvalidStringIssue,
} from '../_internal'

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TType                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export abstract class TType<O, D extends TDef, I = O> {
  declare readonly $O: O
  declare readonly $I: I

  readonly _def: D

  abstract _parse(ctx: ParseContextOf<this>): ParseResultOf<this>

  protected constructor(def: D) {
    this._def = cloneDeep({
      ...def,
      isOptional: def.isOptional ?? false,
      isNullable: def.isNullable ?? false,
      isReadonly: def.isReadonly ?? false,
    })

    this._parse = memoize(this._parse.bind(this))
    this._parseSync = this._parseSync.bind(this)
    this._parseAsync = this._parseAsync.bind(this)
    this.parse = this.parse.bind(this)
    this.safeParse = this.safeParse.bind(this)
    this.parseAsync = this.parseAsync.bind(this)
    this.safeParseAsync = this.safeParseAsync.bind(this)
    this.guard = this.guard.bind(this)
    this.options = this.options.bind(this)
    this.manifest = this.manifest.bind(this)
    this.describe = this.describe.bind(this)
    this.optional = this.optional.bind(this)
    this.nullable = this.nullable.bind(this)
    this.nullish = this.nullish.bind(this)
    this.defined = this.defined.bind(this)
    this.readonly = this.readonly.bind(this)
    this.array = this.array.bind(this)
    this.promise = this.promise.bind(this)
    this.or = this.or.bind(this)
    this.and = this.and.bind(this)
    this.brand = this.brand.bind(this)
    this.default = this.default.bind(this)
    this.catch = this.catch.bind(this)
    this.lazy = this.lazy.bind(this)
    this.pipe = this.pipe.bind(this)
    this.clone = this.clone.bind(this)
    this.isT = this.isT.bind(this)

    Object.keys(this).forEach((k) => Object.defineProperty(this, k, { enumerable: !/^(?:_|\$)\w*/.exec(k) }))
  }

  readonly id: string = nanoid()

  get typeName(): D['typeName'] {
    return this._def.typeName
  }

  get hint(): string {
    const uncolored = TShow(this)
    const { colorsEnabled } = { ...getGlobal().getOptions(), ...this._def.options }
    return colorsEnabled ? TShow.colorize(uncolored) : uncolored
  }

  _parseSync(ctx: ParseContextOf<this>): SyncParseResultOf<this> {
    const result = this._parse(ctx)
    if (isAsync(result)) {
      throw new Error('Synchronous parse encountered Promise. Use `.parseAsync()`/`.safeParseAsync()` instead.')
    }

    return result
  }

  async _parseAsync(ctx: ParseContextOf<this>): AsyncParseResultOf<this> {
    const result = this._parse(ctx)
    return Promise.resolve(result)
  }

  parse(data: unknown, options?: Simplify<ParseOptions>): OutputOf<this> {
    const result = this.safeParse(data, options)
    if (!result.ok) {
      throw result.error
    }

    return result.data
  }

  safeParse(data: unknown, options?: Simplify<ParseOptions>): SyncParseResultOf<this> {
    const ctx = SyncParseContext.of(this, data, options)
    const result = this._parseSync(ctx)
    return result
  }

  async parseAsync(data: unknown, options?: Simplify<ParseOptions>): Promise<OutputOf<this>> {
    const result = await this.safeParseAsync(data, options)
    if (!result.ok) {
      throw result.error
    }

    return result.data
  }

  async safeParseAsync(data: unknown, options?: Simplify<ParseOptions>): AsyncParseResultOf<this> {
    const ctx = AsyncParseContext.of(this, data, options)
    const result = this._parseAsync(ctx)
    return result
  }

  guard(data: unknown, options?: Simplify<ParseOptions>): data is O {
    return this.safeParse(data, options).ok
  }

  options(options: D['options']): this {
    return this._construct({ ...this._def, options: { ...this._def.options, ...options } })
  }

  manifest(manifest: TManifest<O>): this {
    return this._construct({ ...this._def, manifest: { ...this._def.manifest, ...manifest } })
  }

  describe(): TManifest<O> {
    return { ...(this._def.manifest as TManifest<O>) }
  }

  optional(): TOptional<this> {
    return TOptional.create(this, this._def.options)
  }

  nullable(): TNullable<this> {
    return TNullable.create(this, this._def.options)
  }

  nullish(): TOptional<TNullable<this>> {
    return this.nullable().optional()
  }

  defined(): TDefined<this> {
    return TDefined.create(this, this._def.options)
  }

  readonly(): TReadonly<this> {
    return TReadonly.create(this, this._def.options)
  }

  array(): TArray<this> {
    return TArray.create(this, this._def.options)
  }

  promise(): TPromise<this> {
    return TPromise.create(this, this._def.options)
  }

  or<T extends readonly [AnyTType, ...AnyTType[]]>(...alternatives: T): TUnion<[this, ...T]> {
    return new TUnion({ typeName: TTypeName.Union, members: [this, ...alternatives], options: this._def.options })
  }

  and<T extends readonly [AnyTType, ...AnyTType[]]>(...intersectees: T): TIntersection<[this, ...T]> {
    return new TIntersection({
      typeName: TTypeName.Intersection,
      members: [this, ...intersectees],
      options: this._def.options,
    })
  }

  brand<T extends PropertyKey>(brand: T): TBrand<this, T> {
    return TBrand.create(this, brand, this._def.options)
  }

  default<T extends Defined<O>>(defaultValue: T): TDefault<this, T>
  default<T extends Defined<O>>(getDefault: () => T): TDefault<this, T>
  default<T extends Defined<O>>(defaultValueOrGetter: T | (() => T)): TDefault<this, T> {
    return TDefault.create(this, defaultValueOrGetter, this._def.options)
  }

  catch<T extends O>(catchValue: T): TCatch<this, T>
  catch<T extends O>(getCatch: () => T): TCatch<this, T>
  catch<T extends O>(catchValueOrGetter: T | (() => T)): TCatch<this, T> {
    return TCatch.create(this, catchValueOrGetter, this._def.options)
  }

  lazy(): TLazy<this> {
    return TLazy.create(() => this, this._def.options)
  }

  pipe<T extends AnyTType<unknown, I>>(type: T): TPipeline<this, T> {
    return TPipeline.create(this, type, this._def.options)
  }

  clone(): this {
    return this._construct()
  }

  get isOptional(): boolean {
    return Boolean(this._def.isOptional)
  }

  get isNullable(): boolean {
    return Boolean(this._def.isNullable)
  }

  get isNullish(): boolean {
    return this.isOptional && this.isNullable
  }

  get isRequired(): boolean {
    return !this.isOptional
  }

  get isReadonly(): boolean {
    return Boolean(this._def.isReadonly)
  }

  isT<T extends readonly [TTypeName, ...TTypeName[]]>(...types: T): this is TTypeNameMap<T[number]> {
    return types.includes(this.typeName)
  }

  _construct(def?: D): this {
    return Reflect.construct<[def: D], this>(this.constructor as new (def: D) => this, [{ ...this._def, ...def }])
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */

export type AnyTType<O = unknown, I = unknown> = TType<O, TDef, I>

export type OutputOf<T extends AnyTType> = T['$O']
export type InputOf<T extends AnyTType> = T['$I']

/* ------------------------------------------------------------------------------------------------------------------ */

export const ttype = () => TType

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TAny                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TAnyDef extends TDef {
  readonly typeName: TTypeName.Any
}

export class TAny extends TType<any, TAnyDef> {
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return ctx.success(ctx.data)
  }

  static create(options?: Simplify<TOptions>): TAny {
    return new TAny({ typeName: TTypeName.Any, options: { ...options }, isOptional: true, isNullable: true })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TUnknown                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TUnknownDef extends TDef {
  readonly typeName: TTypeName.Unknown
}

export class TUnknown extends TType<unknown, TUnknownDef> {
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return ctx.success(ctx.data)
  }

  static create(options?: Simplify<TOptions>): TUnknown {
    return new TUnknown({ typeName: TTypeName.Unknown, options: { ...options }, isOptional: true, isNullable: true })
  }
}

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

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TNumber                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TNumberInput<C extends boolean> = C extends true ? any : number

export interface TNumberDef<C extends boolean> extends TDef {
  readonly typeName: TTypeName.Number
  readonly checks: ReadonlyArray<
    LooseStripKey<TInvalidNumberIssue['payload'], 'received'> & { readonly message: string | undefined }
  >
  readonly coerce: C
}

export class TNumber<C extends boolean = boolean> extends TType<number, TNumberDef<C>, TNumberInput<C>> {
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (typeof ctx.data !== 'number' || Number.isNaN(ctx.data)) {
      return ctx.invalidType({ expected: TParsedType.Number }).abort()
    }

    return ctx.success(ctx.data)
  }

  /* --------------------------------------------------- Coercion --------------------------------------------------- */

  coerce<V extends boolean = true>(value = true as V): TNumber<V> {
    return new TNumber({ ...this._def, coerce: value })
  }

  /* ---------------------------------------------------- Checks ---------------------------------------------------- */

  min(value: number, options?: { readonly inclusive?: boolean; readonly message?: string }): this {
    return this._checks.add({
      check: 'min',
      expected: { value, inclusive: options?.inclusive ?? true },
      message: options?.message,
    })
  }

  gt(value: number, options?: { readonly message?: string }): this {
    return this.min(value, { inclusive: false, message: options?.message })
  }

  gte(value: number, options?: { readonly message?: string }): this {
    return this.min(value, { inclusive: true, message: options?.message })
  }

  max(value: number, options?: { readonly inclusive?: boolean; readonly message?: string }): this {
    return this._checks.add({
      check: 'max',
      expected: { value, inclusive: options?.inclusive ?? true },
      message: options?.message,
    })
  }

  lt(value: number, options?: { readonly message?: string }): this {
    return this.max(value, { inclusive: false, message: options?.message })
  }

  lte(value: number, options?: { readonly message?: string }): this {
    return this.max(value, { inclusive: true, message: options?.message })
  }

  integer(options?: { readonly message?: string }): this {
    return this._checks.add({ check: 'integer', message: options?.message })
  }

  int(options?: { readonly message?: string }): this {
    return this.integer(options)
  }

  positive(options?: { readonly message?: string }): this {
    return this._checks.add({ check: 'positive', message: options?.message })
  }

  nonpositive(options?: { readonly message?: string }): this {
    return this._checks.add({ check: 'nonpositive', message: options?.message })
  }

  negative(options?: { readonly message?: string }): this {
    return this._checks.add({ check: 'negative', message: options?.message })
  }

  nonnegative(options?: { readonly message?: string }): this {
    return this._checks.add({ check: 'nonnegative', message: options?.message })
  }

  finite(options?: { readonly message?: string }): this {
    return this._checks.add({ check: 'finite', message: options?.message })
  }

  unsafe(options?: { readonly message?: string }): this {
    return this._checks.add({ check: 'unsafe', message: options?.message })
  }

  multipleOf(value: number, options?: { readonly message?: string }): this {
    return this._checks.add({ check: 'multipleOf', expected: value, message: options?.message })
  }

  step(value: number, options?: { readonly message?: string }): this {
    return this.multipleOf(value, options)
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  private readonly _checks = TChecks.of(this)

  static create(options?: Simplify<TOptions>): TNumber<false> {
    return new TNumber({ typeName: TTypeName.Number, checks: [], coerce: false, options: { ...options } })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TNever                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TNeverOptions = TOptions<{
  additionalIssueKind: TIssueKind.Forbidden
}>

export interface TNeverDef extends TDef {
  readonly typeName: TTypeName.Never
  readonly options: TNeverOptions
}

export class TNever extends TType<never, TNeverDef> {
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return ctx.addIssue({ kind: TIssueKind.Forbidden }, this._def.options.messages?.forbidden).abort()
  }

  static create(options?: Simplify<TNeverOptions>): TNever {
    return new TNever({ typeName: TTypeName.Never, options: { ...options } })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TArray                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

console.log(TDefined)

export type TArrayCardinality = 'many' | 'atleastone'

export type TArrayIO<T extends AnyTType, C extends TArrayCardinality, IO extends '$I' | '$O' = '$O'> = {
  many: Array<T[IO]>
  atleastone: [T[IO], ...Array<T[IO]>]
}[C]

export type FlattenTArray<T extends AnyTArray> = T['element'] extends TArray<infer U, infer C> ? TArray<U, C> : T

export type FlattenTArrayDeep<T extends AnyTArray> = T['element'] extends TArray<infer U, infer C>
  ? FlattenTArrayDeep<TArray<U, C>>
  : T

export const flattenTArray = <T extends AnyTArray>(array: T): FlattenTArray<T> =>
  (array.element instanceof TArray ? array.element : array) as FlattenTArray<T>

export const flattenTArrayDeep = <T extends AnyTArray>(array: T): FlattenTArrayDeep<T> =>
  (array.element instanceof TArray ? flattenTArrayDeep(array.element) : array) as FlattenTArrayDeep<T>

export interface TArrayDef<T extends AnyTType, C extends TArrayCardinality> extends TIterableDef<T> {
  readonly typeName: TTypeName.Array
  readonly cardinality: C
  readonly length?: { readonly value: number; readonly message: string | undefined }
  readonly unique?: { readonly message: string | undefined }
}

export class TArray<T extends AnyTType, C extends TArrayCardinality = 'many'>
  extends (await import('./_base')).TType<TArrayIO<T, C>, TArrayDef<T, C>, TArrayIO<T, C, '$I'>>
  implements TIterable<T>
{
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (!isArray(ctx.data)) {
      return ctx.invalidType({ expected: TParsedType.Array }).abort()
    }

    const { element, minItems, maxItems, length, unique } = this._def
    const { data } = ctx

    if (length && data.length !== length.value) {
      ctx.addIssue(
        { kind: TIssueKind.InvalidArray, payload: { check: 'length', expected: length.value, received: data.length } },
        length.message
      )
      if (ctx.common.abortEarly) {
        return ctx.abort()
      }
    } else {
      if (minItems && (minItems.inclusive ? data.length < minItems.value : data.length <= minItems.value)) {
        ctx.addIssue(
          { kind: TIssueKind.InvalidArray, payload: { check: 'min', expected: minItems, received: data.length } },
          minItems.message
        )
        if (ctx.common.abortEarly) {
          return ctx.abort()
        }
      }

      if (maxItems && (maxItems.inclusive ? data.length > maxItems.value : data.length >= maxItems.value)) {
        ctx.addIssue(
          { kind: TIssueKind.InvalidArray, payload: { check: 'max', expected: maxItems, received: data.length } },
          maxItems.message
        )
        if (ctx.common.abortEarly) {
          return ctx.abort()
        }
      }
    }

    if (unique && new Set(ctx.data).size !== ctx.data.length) {
      ctx.addIssue({ kind: TIssueKind.InvalidArray, payload: { check: 'unique' } }, unique.message)
      if (ctx.common.abortEarly) {
        return ctx.abort()
      }
    }

    const result: Array<OutputOf<T>> = []

    if (ctx.isAsync()) {
      return Promise.all(data.map(async (v, i) => element._parseAsync(ctx.child(element, v, [i])))).then((results) => {
        for (const res of results) {
          if (!res.ok) {
            if (ctx.common.abortEarly) {
              return ctx.abort()
            }

            continue
          }

          result.push(res.data)
        }

        return ctx.isValid() ? ctx.success(result as OutputOf<this>) : ctx.abort()
      })
    }

    for (const [i, v] of data.entries()) {
      const res = element._parseSync(ctx.child(element, v, [i]))
      if (!res.ok) {
        if (ctx.common.abortEarly) {
          return ctx.abort()
        }

        continue
      }

      result.push(res.data)
    }

    return ctx.isValid() ? ctx.success(result as OutputOf<this>) : ctx.abort()
  }

  get element(): T {
    return this._def.element
  }

  min<V extends number>(
    value: NonNegativeInteger<V>,
    options?: { readonly inclusive?: boolean; readonly message?: string }
  ): TArray<T, C> {
    return new TArray({
      ...this._def,
      length: undefined,
      minItems: { value, inclusive: options?.inclusive ?? true, message: options?.message },
    })
  }

  max<V extends number>(
    value: NonNegativeInteger<V>,
    options?: { readonly inclusive?: boolean; readonly message?: string }
  ): TArray<T, C> {
    return new TArray({
      ...this._def,
      length: undefined,
      maxItems: { value, inclusive: options?.inclusive ?? true, message: options?.message },
    })
  }

  length<L extends number>(length: NonNegativeInteger<L>, options?: { readonly message?: string }): TArray<T, C> {
    return new TArray({
      ...this._def,
      minItems: undefined,
      maxItems: undefined,
      length: { value: length, message: options?.message },
    })
  }

  nonempty(options?: { readonly message?: string }): TArray<T, 'atleastone'> {
    const { minItems } = this._def
    const updatedMin = minItems && minItems.value > 1 ? minItems : { value: 1, inclusive: true }
    const minItemsWithMsg = {
      ...updatedMin,
      message: options?.message ?? ('message' in updatedMin ? updatedMin.message : undefined),
    }
    return new TArray({ ...this._def, cardinality: 'atleastone', length: undefined, minItems: minItemsWithMsg })
  }

  sparse(enabled?: true): TArray<TOptional<T>, C>
  sparse(enabled: false): TArray<TDefined<T>, C>
  sparse(enabled = true): TArray<TOptional<T> | TDefined<T>, C> {
    return new TArray({ ...this._def, element: this.element[enabled ? 'optional' : 'defined']() })
  }

  partial(): TArray<TOptional<T>, C> {
    return this.sparse(true)
  }

  unique(options?: { readonly message?: string }): TArray<T, C> {
    return new TArray({ ...this._def, unique: { message: options?.message } })
  }

  flatten(): FlattenTArray<this> {
    return new TArray({ ...this._def, element: flattenTArray(this) }) as FlattenTArray<this>
  }

  flattenDeep(): FlattenTArrayDeep<this> {
    return new TArray({ ...this._def, element: flattenTArrayDeep(this) }) as FlattenTArrayDeep<this>
  }

  toSet(): TSet<T> {
    return new TSet({ ...this._def, typeName: TTypeName.Set, size: this._def.length })
  }

  static create<T extends AnyTType>(element: T, options?: Simplify<TOptions>): TArray<T> {
    return new TArray({ typeName: TTypeName.Array, element, cardinality: 'many', options: { ...options } })
  }
}

export type AnyTArray = TArray<AnyTType, TArrayCardinality>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TTuple                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TTupleItems = readonly [AnyTType, ...AnyTType[]] | readonly []

export type TTupleIO<
  T extends TTupleItems,
  R extends AnyTType | undefined,
  IO extends '$I' | '$O' = '$O'
> = T extends readonly []
  ? R extends AnyTType
    ? [...Array<R[IO]>]
    : []
  : T extends readonly [infer Head extends AnyTType, ...infer Rest extends TTupleItems]
  ? [Head[IO], ...TTupleIO<Rest, R, IO>]
  : never

export type TTupleOptions = TOptions<{
  additionalIssueKind: TIssueKind.InvalidTuple
}>

export interface TTupleDef<T extends TTupleItems, R extends AnyTType | undefined = undefined> extends TDef {
  readonly typeName: TTypeName.Tuple
  readonly options: TTupleOptions
  readonly items: T
  readonly rest: R
}

export class TTuple<T extends TTupleItems, R extends AnyTType | undefined = undefined> extends TType<
  TTupleIO<T, R>,
  TTupleDef<T, R>,
  TTupleIO<T, R, '$I'>
> {
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (!isArray(ctx.data)) {
      return ctx.invalidType({ expected: TParsedType.Tuple }).abort()
    }

    const { items, rest } = this._def
    const { data } = ctx

    if (data.length < items.length || (!rest && data.length > items.length)) {
      ctx.addIssue(
        { kind: TIssueKind.InvalidTuple, payload: { check: 'length', expected: items.length, received: data.length } },
        this._def.options.messages?.invalidTuple
      )
      if (ctx.common.abortEarly) {
        return ctx.abort()
      }
    }

    const result: unknown[] = []

    if (ctx.isAsync()) {
      return Promise.all(
        data.map(async (v, i) => {
          const schema = items[i] ?? rest
          if (!schema) {
            return null
          }

          return schema._parseAsync(ctx.child(schema, v, [i]))
        })
      ).then((results) => {
        const validResults = results.filter((res): res is NonNullable<typeof res> => Boolean(res))

        for (const res of validResults) {
          if (!res.ok) {
            if (ctx.common.abortEarly) {
              return ctx.abort()
            }

            continue
          }

          result.push(res.data)
        }

        return ctx.isValid() ? ctx.success(result as OutputOf<this>) : ctx.abort()
      })
    }

    for (const [i, v] of data.entries()) {
      const schema = items[i] ?? rest
      if (!schema) {
        continue
      }

      const res = schema._parseSync(ctx.child(schema, v, [i]))
      if (!res.ok) {
        if (ctx.common.abortEarly) {
          return ctx.abort()
        }

        continue
      }

      result.push(res.data)
    }

    return ctx.isValid() ? ctx.success(result as OutputOf<this>) : ctx.abort()
  }

  get items(): T {
    return this._def.items
  }

  get restType(): R {
    return this._def.rest
  }

  rest<R_ extends AnyTType>(rest: R_): TTuple<T, R_> {
    return new TTuple({ ...this._def, rest })
  }

  removeRest(): TTuple<T> {
    return new TTuple({ ...this._def, rest: undefined })
  }

  static create<T extends TTupleItems>(items: T, options?: Simplify<TTupleOptions>): TTuple<T>
  static create<T extends TTupleItems, R extends AnyTType>(
    items: T,
    rest: R,
    options?: Simplify<TTupleOptions>
  ): TTuple<T, R>
  static create<T extends TTupleItems, R extends AnyTType>(
    items: T,
    restOrOptions?: R | Simplify<TTupleOptions>,
    maybeOptions?: Simplify<TTupleOptions>
  ): TTuple<T, R | undefined> {
    const rest = restOrOptions instanceof TType ? restOrOptions : undefined
    const options = restOrOptions instanceof TType ? maybeOptions : restOrOptions
    return new TTuple({ typeName: TTypeName.Tuple, items, rest, options: { ...options } })
  }
}

export type AnyTTuple = TTuple<TTupleItems, AnyTType | undefined>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TSet                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TSetDef<T extends AnyTType> extends TIterableDef<T> {
  readonly typeName: TTypeName.Set
  readonly size?: { readonly value: number; readonly message: string | undefined }
}

export class TSet<T extends AnyTType>
  extends TType<Set<OutputOf<T>>, TSetDef<T>, Set<InputOf<T>>>
  implements TIterable<T>
{
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (!(ctx.data instanceof Set)) {
      return ctx.invalidType({ expected: TParsedType.Set }).abort()
    }

    const { element, minItems, maxItems, size } = this._def
    const { data } = ctx

    if (size && data.size !== size.value) {
      ctx.addIssue(
        { kind: TIssueKind.InvalidSet, payload: { check: 'size', expected: size.value, received: data.size } },
        size.message
      )
      if (ctx.common.abortEarly) {
        return ctx.abort()
      }
    } else {
      if (minItems && (minItems.inclusive ? data.size < minItems.value : data.size <= minItems.value)) {
        ctx.addIssue(
          { kind: TIssueKind.InvalidSet, payload: { check: 'min', expected: minItems, received: data.size } },
          minItems.message
        )
        if (ctx.common.abortEarly) {
          return ctx.abort()
        }
      }

      if (maxItems && (maxItems.inclusive ? data.size > maxItems.value : data.size >= maxItems.value)) {
        ctx.addIssue(
          { kind: TIssueKind.InvalidSet, payload: { check: 'max', expected: maxItems, received: data.size } },
          maxItems.message
        )
        if (ctx.common.abortEarly) {
          return ctx.abort()
        }
      }
    }

    const result = new Set<OutputOf<T>>()

    if (ctx.isAsync()) {
      return Promise.all([...data].map(async (v, i) => element._parseAsync(ctx.child(element, v, [i])))).then(
        (results) => {
          for (const res of results) {
            if (!res.ok) {
              if (ctx.common.abortEarly) {
                return ctx.abort()
              }

              continue
            }

            result.add(res.data)
          }

          return ctx.isValid() ? ctx.success(result) : ctx.abort()
        }
      )
    }

    for (const [i, v] of [...data].entries()) {
      const res = element._parseSync(ctx.child(element, v, [i]))
      if (!res.ok) {
        if (ctx.common.abortEarly) {
          return ctx.abort()
        }

        continue
      }

      result.add(res.data)
    }

    return ctx.isValid() ? ctx.success(result) : ctx.abort()
  }

  get element(): T {
    return this._def.element
  }

  min<V extends number>(
    value: NonNegativeInteger<V>,
    options?: { readonly inclusive?: boolean; readonly message?: string }
  ): TSet<T> {
    return new TSet({
      ...this._def,
      size: undefined,
      minItems: { value, inclusive: options?.inclusive ?? true, message: options?.message },
    })
  }

  max<V extends number>(
    value: NonNegativeInteger<V>,
    options?: { readonly inclusive?: boolean; readonly message?: string }
  ): TSet<T> {
    return new TSet({
      ...this._def,
      size: undefined,
      maxItems: { value, inclusive: options?.inclusive ?? true, message: options?.message },
    })
  }

  size<S extends number>(size: NonNegativeInteger<S>, options?: { readonly message?: string }): TSet<T> {
    return new TSet({
      ...this._def,
      minItems: undefined,
      maxItems: undefined,
      size: { value: size, message: options?.message },
    })
  }

  sparse(enabled?: true): TSet<TOptional<T>>
  sparse(enabled: false): TSet<TDefined<T>>
  sparse(enabled = true): TSet<TOptional<T> | TDefined<T>> {
    return new TSet({ ...this._def, element: this.element[enabled ? 'optional' : 'defined']() })
  }

  partial(): TSet<TOptional<T>> {
    return this.sparse(true)
  }

  toArray(): TArray<T> {
    return new TArray({ ...this._def, typeName: TTypeName.Array, cardinality: 'many', length: this._def.size })
  }

  static create<T extends AnyTType>(element: T, options?: Simplify<TOptions>): TSet<T> {
    return new TSet({ typeName: TTypeName.Set, element, options: { ...options } })
  }
}

export type AnyTSet = TSet<AnyTType>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TBigInt                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TBigIntDef extends TDef {
  readonly typeName: TTypeName.BigInt
}

export class TBigInt extends TType<bigint, TBigIntDef> {
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (typeof ctx.data !== 'bigint') {
      return ctx.invalidType({ expected: TParsedType.BigInt }).abort()
    }

    return ctx.success(ctx.data)
  }

  static create(options?: Simplify<TOptions>): TBigInt {
    return new TBigInt({ typeName: TTypeName.BigInt, options: { ...options } })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TBoolean                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TBooleanDef extends TDef {
  readonly typeName: TTypeName.Boolean
}

export class TBoolean extends TType<boolean, TBooleanDef> {
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return typeof ctx.data === 'boolean'
      ? ctx.success(ctx.data)
      : ctx.invalidType({ expected: TParsedType.Boolean }).abort()
  }

  static create(options?: Simplify<TOptions>): TBoolean {
    return new TBoolean({ typeName: TTypeName.Boolean, options: { ...options } })
  }
}

/* ------------------------------------------------------ TTrue ----------------------------------------------------- */

export interface TTrueDef extends TDef {
  readonly typeName: TTypeName.True
}

export class TTrue extends TType<true, TTrueDef> {
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return ctx.data === true ? ctx.success(ctx.data) : ctx.invalidType({ expected: TParsedType.True }).abort()
  }

  static create(options?: Simplify<TOptions>): TTrue {
    return new TTrue({ typeName: TTypeName.True, options: { ...options } })
  }
}

/* ----------------------------------------------------- TFalse ----------------------------------------------------- */

export interface TFalseDef extends TDef {
  readonly typeName: TTypeName.False
}

export class TFalse extends TType<false, TFalseDef> {
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return ctx.data === false ? ctx.success(ctx.data) : ctx.invalidType({ expected: TParsedType.False }).abort()
  }

  static create(options?: Simplify<TOptions>): TFalse {
    return new TFalse({ typeName: TTypeName.False, options: { ...options } })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TObject                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TObjectShape = Record<string, AnyTType>
export type TObjectUnknownKeys = 'passthrough' | 'strict' | 'strip'
export type TObjectCatchall = AnyTType

export type TObjectIO<
  S extends TObjectShape,
  UK extends TObjectUnknownKeys | undefined,
  C extends TObjectCatchall | undefined,
  IO extends '$I' | '$O' = '$O'
> = Simplify<
  EnforceOptional<{ [K in keyof S]: S[K][IO] }> &
    (C extends AnyTType
      ? Record<string, C[IO]>
      : UK extends 'passthrough'
      ? Record<string, unknown>
      : UK extends 'strict'
      ? Record<string, never>
      : unknown)
> extends infer X
  ? { 0: X; 1: Record<string, never> }[Equals<X, {}>]
  : never

export type PartialShape<S extends TObjectShape, K extends ReadonlyArray<keyof S> = ReadonlyArray<keyof S>> = {
  [K_ in keyof S]: K_ extends K[number] ? TOptional<S[K_]> : S[K_]
}
export type DepartialShape<S extends TObjectShape, K extends ReadonlyArray<keyof S> = ReadonlyArray<keyof S>> = {
  [K_ in keyof S]: K_ extends K[number] ? TDefined<S[K_]> : S[K_]
}

type TuplePaths<T extends readonly unknown[]> = ConditionalExcept<
  OmitIndexSignature<{ [K in keyof T as `${K & number}` extends `${number}` ? K : never]: K }>,
  never
> extends infer X
  ? {
      [K in keyof X]: K & string extends infer StrK extends string
        ? `[${StrK}]` | `.${StrK}` | (T[K & keyof T] extends TObject<infer S> ? `[${StrK}].${ShapePaths<S>}` : never)
        : never
    }[keyof X]
  : never

export type ShapePaths<T extends TObjectShape> = {
  [K in keyof T]:
    | K
    | (T[K] extends AnyTObject
        ? `${K & string}.${ShapePaths<T[K]['shape']> & string}`
        : T[K] extends AnyTTuple
        ? `${K & string}${TuplePaths<T[K]['items']>}`
        : never)
}[keyof T] &
  string

export type CreateTObjectShapeArg<S extends TObjectShape> = {
  [K in keyof S]: Exclude<S[K], AnyTRef> | TRef<Exclude<ShapePaths<S>, K>, undefined>
}

export const resolveObjectRefs = <S extends TObjectShape>(shape: S): S => {
  const resolvedShape = {} as S

  for (const k of Object.keys(shape)) {
    const v = shape[k]

    if (v.isT(TTypeName.Ref)) {
      resolvedShape[k as keyof S] = v.resolve(shape) as S[keyof S]
    } else if (v.isT(TTypeName.Object)) {
      resolvedShape[k as keyof S] = v.extend(resolveObjectRefs(v.shape)) as unknown as S[keyof S]
    } else {
      resolvedShape[k as keyof S] = v as S[keyof S]
    }
  }

  return resolvedShape
}

export const pick = <T extends Record<string, unknown>, K extends keyof T>(obj: T, keys: readonly K[]): Pick<T, K> =>
  Object.fromEntries(keys.map((k) => [k, obj[k]])) as Pick<T, K>

export const omit = <T extends Record<string, unknown>, K extends keyof T>(obj: T, keys: readonly K[]): Omit<T, K> =>
  Object.fromEntries(Object.entries(obj).filter(([k]) => !keys.includes(k as K))) as Omit<T, K>

export type TObjectOptions = TOptions<{
  additionalIssueKind: TIssueKind.UnrecognizedKeys
}>

export interface TObjectDef<
  S extends TObjectShape,
  UK extends TObjectUnknownKeys | undefined,
  C extends TObjectCatchall | undefined
> extends TDef {
  readonly typeName: TTypeName.Object
  readonly options: TObjectOptions
  readonly shape: S
  readonly unknownKeys: UK
  readonly catchall: C
}

export class TObject<
  S extends TObjectShape,
  UK extends TObjectUnknownKeys | undefined = TObjectUnknownKeys | undefined,
  C extends TObjectCatchall | undefined = TObjectCatchall | undefined
> extends TType<TObjectIO<S, UK, C>, TObjectDef<S, UK, C>, TObjectIO<S, UK, C, '$I'>> {
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (typeof ctx.data !== 'object' || ctx.data === null) {
      return ctx.invalidType({ expected: TParsedType.Object }).abort()
    }

    const { shape, unknownKeys, catchall } = this._def
    const data = ctx.data as Record<string, unknown>

    const extraKeys: string[] = []
    if (!catchall || unknownKeys !== 'strip') {
      for (const k of Object.keys(data)) {
        if (!(k in shape)) {
          extraKeys.push(k)
        }
      }
    }

    const result: Record<string, unknown> = {}

    if (ctx.isAsync()) {
      return Promise.all(
        Object.entries(shape).map(async ([k, v]) => Promise.all([k, v._parseAsync(ctx.child(v, data[k], [k]))]))
      ).then(async (results) => {
        if (catchall) {
          const extraKeysResults = await Promise.all(
            extraKeys.map(async (k) => Promise.all([k, catchall._parseAsync(ctx.child(catchall, data[k], [k]))]))
          )
          results.push(...extraKeysResults)
        } else if (unknownKeys === 'passthrough') {
          for (const k of extraKeys) {
            results.push([k, ctx.success(data[k])])
          }
        } else if (unknownKeys === 'strict') {
          if (extraKeys.length > 0) {
            ctx.addIssue(
              { kind: TIssueKind.UnrecognizedKeys, payload: { keys: extraKeys } },
              this._def.options.messages?.unrecognizedKeys
            )
            if (ctx.common.abortEarly) {
              return ctx.abort()
            }
          }
        }

        for (const [k, res] of results) {
          if (!res.ok) {
            if (ctx.common.abortEarly) {
              return ctx.abort()
            }

            continue
          }

          if (k in data) {
            result[k] = res.data
          }
        }

        return ctx.isValid() ? ctx.success(result as OutputOf<this>) : ctx.abort()
      })
    }

    const results: Array<[string, SyncParseResult<unknown, unknown>]> = []

    for (const [k, v] of Object.entries(shape)) {
      results.push([k, v._parseSync(ctx.child(v, data[k], [k]))])
    }

    if (catchall) {
      for (const k of extraKeys) {
        results.push([k, catchall._parseSync(ctx.child(catchall, data[k], [k]))])
      }
    } else if (unknownKeys === 'passthrough') {
      for (const k of extraKeys) {
        results.push([k, ctx.success(data[k])])
      }
    } else if (unknownKeys === 'strict') {
      if (extraKeys.length > 0) {
        ctx.addIssue(
          { kind: TIssueKind.UnrecognizedKeys, payload: { keys: extraKeys } },
          this._def.options.messages?.unrecognizedKeys
        )
        if (ctx.common.abortEarly) {
          return ctx.abort()
        }
      }
    }

    for (const [k, res] of results) {
      if (!res.ok) {
        if (ctx.common.abortEarly) {
          return ctx.abort()
        }

        continue
      }

      if (k in data) {
        result[k] = res.data
      }
    }

    return ctx.isValid() ? ctx.success(result as OutputOf<this>) : ctx.abort()
  }

  get shape(): S {
    return this._def.shape
  }

  passthrough(): TObject<S, 'passthrough'> {
    return this._setUnknownKeys('passthrough')
  }

  strict(): TObject<S, 'strict'> {
    return this._setUnknownKeys('strict')
  }

  strip(): TObject<S> {
    return this._setUnknownKeys('strip')
  }

  catchall<T extends TObjectCatchall>(catchall: T): TObject<S, undefined, T> {
    return new TObject({ ...this._def, unknownKeys: undefined, catchall })
  }

  keyof(): TEnum<UnionToEnumValues<keyof S>> {
    return TEnum.create(Object.keys(this.shape) as UnionToEnumValues<keyof S>)
  }

  pick<K extends readonly [keyof S, ...Array<keyof S>]>(keys: K): TObject<Pick<S, K[number]>, UK, C> {
    return this._setShape(pick(this.shape, keys))
  }

  omit<K extends readonly [keyof S, ...Array<keyof S>]>(keys: K): TObject<Omit<S, K[number]>, UK, C> {
    return this._setShape(omit(this.shape, keys))
  }

  augment<T extends TObjectShape>(shape: T): TObject<Merge<S, T>, UK, C> {
    return this._setShape({ ...this.shape, ...shape } as Merge<S, T>)
  }

  extend<T extends TObjectShape>(shape: T): TObject<Merge<S, T>, UK, C> {
    return this.augment(shape)
  }

  merge<S_ extends TObjectShape, UK_ extends TObjectUnknownKeys | undefined, C_ extends TObjectCatchall | undefined>(
    object: TObject<S_, UK_, C_>
  ): TObject<Merge<S, S_>, UK_, C_> {
    return object._setShape(this.augment(object.shape).shape)
  }

  partial(): TObject<PartialShape<S>, UK, C>
  partial<K extends readonly [keyof S, ...Array<keyof S>]>(keys: K): TObject<PartialShape<S, K>, UK, C>
  partial(keys?: ReadonlyArray<keyof S>): TObject<PartialShape<S>, UK, C> {
    return this._setShape(
      Object.fromEntries(
        Object.entries(this.shape).map(([k, v]) => [
          k,
          (keys ?? Object.keys(this.shape)).includes(k) ? v.optional() : v,
        ])
      ) as PartialShape<S>
    )
  }

  departial(): TObject<DepartialShape<S>, UK, C>
  departial<K extends readonly [keyof S, ...Array<keyof S>]>(keys: K): TObject<DepartialShape<S, K>, UK, C>
  departial(keys?: ReadonlyArray<keyof S>): TObject<DepartialShape<S>, UK, C> {
    return this._setShape(
      Object.fromEntries(
        Object.entries(this.shape).map(([k, v]) => [k, (keys ?? Object.keys(this.shape)).includes(k) ? v.defined() : v])
      ) as DepartialShape<S>
    )
  }

  private _setShape<T extends TObjectShape>(shape: T): TObject<T, UK, C> {
    return new TObject({ ...this._def, shape })
  }

  private _setUnknownKeys<T extends TObjectUnknownKeys>(unknownKeys: T): TObject<S, T> {
    return new TObject({ ...this._def, unknownKeys, catchall: undefined })
  }

  static create = Object.assign(this._makeCreate(), {
    passthrough: this._makeCreate('passthrough'),
    strict: this._makeCreate('strict'),
    strip: this._makeCreate(),
    lazy: <S extends TObjectShape>(shape: () => S, options?: Simplify<TOptions>) =>
      this._makeCreate()(shape(), options),
  })

  private static _makeCreate<UK extends TObjectUnknownKeys = 'strip'>(unknownKeys = 'strip' as UK) {
    return <S extends TObjectShape>(shape: CreateTObjectShapeArg<S>, options?: Simplify<TOptions>): TObject<S, UK> =>
      new TObject({
        typeName: TTypeName.Object,
        shape: resolveObjectRefs(shape) as S,
        unknownKeys,
        catchall: undefined,
        options: { ...options },
      })
  }
}

export type SomeTObject = TObject<Record<string, AnyTType>>
export type AnyTObject = TObject<any>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TBrand                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export const BRAND = Symbol('BRAND')
export type BRAND = typeof BRAND
export type BRANDED<T, B extends PropertyKey> = T & { readonly [BRAND]: { readonly [K in B]: true } }

export interface TBrandDef<T extends AnyTType, B extends PropertyKey> extends TDef {
  readonly typeName: TTypeName.Brand
  readonly underlying: T
  readonly brand: B
}

export class TBrand<T extends AnyTType, B extends PropertyKey>
  extends TType<BRANDED<OutputOf<T>, B>, TBrandDef<T, B>, InputOf<T>>
  implements TUnwrappable<T>
{
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return this.underlying._parse(ctx.child(this.underlying, ctx.data)) as ParseResultOf<this>
  }

  get underlying(): T {
    return this._def.underlying
  }

  unwrap(): T {
    return this.underlying
  }

  unwrapDeep(): UnwrapDeep<T, TTypeName.Brand> {
    return (this.underlying instanceof TBrand ? this.underlying.unwrapDeep() : this.underlying) as UnwrapDeep<
      T,
      TTypeName.Brand
    >
  }

  getBrand(): B {
    return this._def.brand
  }

  removeBrand(): T {
    return this.underlying
  }

  static create<T extends AnyTType, B extends PropertyKey>(
    underlying: T,
    brand: B,
    options?: Simplify<TOptions>
  ): TBrand<T, B> {
    return new TBrand({ typeName: TTypeName.Brand, underlying, brand, options: { ...options } })
  }
}

export type AnyTBrand = TBrand<AnyTType, PropertyKey>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TDefault                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TDefaultDef<T extends AnyTType, D extends Defined<OutputOf<T>>> extends TDef {
  readonly typeName: TTypeName.Default
  readonly underlying: T
  readonly getDefault: () => D
}

export class TDefault<T extends AnyTType, D extends Defined<OutputOf<T>>>
  extends TType<Defined<OutputOf<T>>, TDefaultDef<T, D>, InputOf<T> | undefined>
  implements TUnwrappable<T>
{
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return this.underlying._parse(
      ctx.child(this.underlying, ctx.data === undefined ? this.getDefault() : ctx.data)
    ) as ParseResultOf<this>
  }

  get underlying(): T {
    return this._def.underlying
  }

  unwrap(): T {
    return this.underlying
  }

  unwrapDeep(): UnwrapDeep<T, TTypeName.Default> {
    return (this.underlying instanceof TDefault ? this.underlying.unwrapDeep() : this.underlying) as UnwrapDeep<
      T,
      TTypeName.Default
    >
  }

  getDefault(): D {
    return this._def.getDefault()
  }

  removeDefault(): T {
    return this.underlying
  }

  static create<T extends AnyTType, D extends Defined<OutputOf<T>>>(
    underlying: T,
    defaultValue: D,
    options?: Simplify<TOptions>
  ): TDefault<T, D>
  static create<T extends AnyTType, D extends Defined<OutputOf<T>>>(
    underlying: T,
    getDefault: () => D,
    options?: Simplify<TOptions>
  ): TDefault<T, D>
  static create<T extends AnyTType, D extends Defined<OutputOf<T>>>(
    underlying: T,
    defaultValueOrGetter: D | (() => D),
    options?: Simplify<TOptions>
  ): TDefault<T, D>
  static create<T extends AnyTType, D extends Defined<OutputOf<T>>>(
    underlying: T,
    defaultValueOrGetter: D | (() => D),
    options?: Simplify<TOptions>
  ): TDefault<T, D> {
    return new TDefault({
      typeName: TTypeName.Default,
      underlying,
      getDefault: isFunction(defaultValueOrGetter) ? defaultValueOrGetter : (): D => defaultValueOrGetter,
      options: { ...options },
      isOptional: true,
    })
  }
}

export type AnyTDefault = TDefault<AnyTType, unknown>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TCatch                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TCatchDef<T extends AnyTType, C extends OutputOf<T>> extends TDef {
  readonly typeName: TTypeName.Catch
  readonly underlying: T
  readonly getCatch: () => C
}

export class TCatch<T extends AnyTType, C extends OutputOf<T>>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extends TType<OutputOf<T> | C, TCatchDef<T, C>, any>
  implements TUnwrappable<T>
{
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    const result = this.underlying._parse(ctx.child(this.underlying, ctx.data))
    return isAsync(result)
      ? result.then((res) => ctx.success(res.ok ? res.data : this.getCatch()))
      : ctx.success(result.ok ? result.data : this.getCatch())
  }

  get underlying(): T {
    return this._def.underlying
  }

  unwrap(): T {
    return this.underlying
  }

  unwrapDeep(): UnwrapDeep<T, TTypeName.Catch> {
    return (this.underlying instanceof TCatch ? this.underlying.unwrapDeep() : this.underlying) as UnwrapDeep<
      T,
      TTypeName.Catch
    >
  }

  getCatch(): C {
    return this._def.getCatch()
  }

  removeCatch(): T {
    return this.underlying
  }

  static create<T extends AnyTType, C extends OutputOf<T>>(
    underlying: T,
    catchValue: C,
    options?: Simplify<TOptions>
  ): TCatch<T, C>
  static create<T extends AnyTType, C extends OutputOf<T>>(
    underlying: T,
    getCatch: () => C,
    options?: Simplify<TOptions>
  ): TCatch<T, C>
  static create<T extends AnyTType, C extends OutputOf<T>>(
    underlying: T,
    catchValueOrGetter: C | (() => C),
    options?: Simplify<TOptions>
  ): TCatch<T, C>
  static create<T extends AnyTType, C extends OutputOf<T>>(
    underlying: T,
    catchValueOrGetter: C | (() => C),
    options?: Simplify<TOptions>
  ): TCatch<T, C> {
    return new TCatch({
      typeName: TTypeName.Catch,
      underlying,
      getCatch: isFunction(catchValueOrGetter) ? catchValueOrGetter : (): C => catchValueOrGetter,
      options: { ...options },
    })
  }
}

export type AnyTCatch = TCatch<AnyTType, unknown>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TDate                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TDateDef extends TDef {
  readonly typeName: TTypeName.Date
}

export class TDate extends TType<Date, TDateDef> {
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (!(ctx.data instanceof Date)) {
      return ctx.invalidType({ expected: TParsedType.Date }).abort()
    }

    return ctx.success(ctx.data)
  }

  static create(options?: Simplify<TOptions>): TDate {
    return new TDate({ typeName: TTypeName.Date, options: { ...options } })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TLiteral                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TLiteralOptions = TOptions<{
  additionalIssueKind: TIssueKind.InvalidLiteral
}>

export interface TLiteralDef<T extends Primitive> extends TDef {
  readonly typeName: TTypeName.Literal
  readonly options: TLiteralOptions
  readonly value: T
}

export const getLiteralParsedType = (value: Primitive): TParsedType => {
  if (value === null) {
    return TParsedType.Null
  }

  switch (typeof value) {
    case 'string':
      return TParsedType.String
    case 'number':
      return TParsedType.Number
    case 'bigint':
      return TParsedType.BigInt
    case 'boolean':
      return TParsedType.Boolean
    case 'symbol':
      return TParsedType.Symbol
    case 'undefined':
      return TParsedType.Undefined

    default:
      return TParsedType.Unknown
  }
}

export class TLiteral<T extends Primitive> extends TType<T, TLiteralDef<T>> {
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    const { value } = this._def

    const expectedParsedType = getLiteralParsedType(value)

    if (ctx.parsedType !== expectedParsedType) {
      return ctx.invalidType({ expected: expectedParsedType }).abort()
    }

    if (ctx.data !== value) {
      return ctx
        .addIssue(
          { kind: TIssueKind.InvalidLiteral, payload: { expected: value, received: ctx.data as Primitive } },
          this._def.options.messages?.invalidLiteral
        )
        .abort()
    }

    return ctx.success(ctx.data as T)
  }

  get value(): T {
    return this._def.value
  }

  static create<T extends Primitive>(value: T, options?: Simplify<TLiteralOptions>): TLiteral<T> {
    return new TLiteral({
      typeName: TTypeName.Literal,
      value,
      options: { ...options },
      isOptional: value === undefined,
      isNullable: value === null,
    })
  }
}

export type AnyTLiteral = TLiteral<Primitive>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TEnum                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TEnumValues = readonly [string | number, ...Array<string | number>]

type UnionToIntersectionFn<T> = (T extends unknown ? (x: () => T) => void : never) extends (
  i: infer Intersection
) => void
  ? Intersection
  : never

type GetUnionLast<T> = UnionToIntersectionFn<T> extends () => infer Last ? Last : never

type UnionToTuple<T, _Acc extends readonly unknown[] = []> = [T] extends [never]
  ? _Acc
  : UnionToTuple<Exclude<T, GetUnionLast<T>>, [GetUnionLast<T>, ..._Acc]>

type ToEnumValues<T> = T extends TEnumValues ? T : never

export type UnionToEnumValues<T> = ToEnumValues<UnionToTuple<T>>

export type TEnumOptions = TOptions<{
  additionalIssueKind: TIssueKind.InvalidEnumValue
}>

export interface TEnumDef<T extends TEnumValues> extends TDef {
  readonly typeName: TTypeName.Enum
  readonly options: TEnumOptions
  readonly values: T
}

export class TEnum<T extends TEnumValues> extends TType<T[number], TEnumDef<T>> {
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (typeof ctx.data !== 'string') {
      return ctx.invalidType({ expected: TParsedType.String }).abort()
    }

    const { values } = this._def

    if (!values.includes(ctx.data)) {
      return ctx
        .addIssue(
          { kind: TIssueKind.InvalidEnumValue, payload: { expected: values, received: ctx.data } },
          this._def.options.messages?.invalidEnumValue
        )
        .abort()
    }

    return ctx.success(ctx.data)
  }

  get values(): Readonly<T> {
    return this._def.values
  }

  get enum(): { readonly [K in T[number]]: K } {
    return this.values.reduce((acc, value) => ({ ...acc, [value]: value }), {} as { readonly [K in T[number]]: K })
  }

  static create<T extends string | number, U extends readonly [T, ...T[]]>(
    values: U,
    options?: Simplify<TEnumOptions>
  ): TEnum<U> {
    return new TEnum({ typeName: TTypeName.Enum, values, options: { ...options } })
  }
}

export type AnyTEnum = TEnum<readonly [string | number, ...Array<string | number>]>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                     TNativeEnum                                                    */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface EnumLike {
  readonly [x: string]: string | number
  readonly [x: number]: string
}

export const getValidEnum = (enum_: EnumLike): Readonly<Record<string, string | number>> =>
  Object.fromEntries(
    Object.keys(enum_)
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      .filter((k) => typeof enum_[enum_[k]!] !== 'number')
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      .map((k) => [k, enum_[k]!])
  )

export interface TNativeEnumDef<T extends EnumLike> extends TDef {
  readonly typeName: TTypeName.NativeEnum
  readonly options: TEnumOptions
  readonly enum: T
}

export class TNativeEnum<T extends EnumLike> extends TType<T[keyof T], TNativeEnumDef<T>> {
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return ctx.abort()
  }

  get enum(): T {
    return getValidEnum(this._def.enum) as T
  }

  get values(): Readonly<UnionToEnumValues<T[keyof T]>> {
    return Object.values(this.enum) as UnionToEnumValues<T[keyof T]>
  }

  static create<T extends EnumLike>(enum_: T, options?: Simplify<TEnumOptions>): TNativeEnum<T> {
    return new TNativeEnum({ typeName: TTypeName.NativeEnum, enum: enum_, options: { ...options } })
  }
}

export type AnyTNativeEnum = TNativeEnum<EnumLike>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TNaN                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TNaNDef extends TDef {
  readonly typeName: TTypeName.NaN
}

export class TNaN extends TType<number, TNaNDef> {
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return typeof ctx.data !== 'number' || !Number.isNaN(ctx.data)
      ? ctx.invalidType({ expected: TParsedType.NaN }).abort()
      : ctx.success(ctx.data)
  }

  static create(options?: Simplify<TOptions>): TNaN {
    return new TNaN({ typeName: TTypeName.NaN, options: { ...options } })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TSymbol                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TSymbolDef extends TDef {
  readonly typeName: TTypeName.Symbol
}

export class TSymbol extends TType<symbol, TSymbolDef> {
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return typeof ctx.data === 'symbol'
      ? ctx.success(ctx.data)
      : ctx.invalidType({ expected: TParsedType.Symbol }).abort()
  }

  static create(options?: Simplify<TOptions>): TSymbol {
    return new TSymbol({ typeName: TTypeName.Symbol, options: { ...options } })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TBuffer                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TBufferDef extends TDef {
  readonly typeName: TTypeName.Buffer
}

export class TBuffer extends TType<Buffer, TBufferDef> {
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return Buffer.isBuffer(ctx.data) ? ctx.success(ctx.data) : ctx.invalidType({ expected: TParsedType.Buffer }).abort()
  }

  static create(options?: Simplify<TOptions>): TBuffer {
    return new TBuffer({ typeName: TTypeName.Buffer, options: { ...options } })
  }
}
