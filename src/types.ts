import memoize from 'micro-memoize'
import { nanoid } from 'nanoid'
import {
  AsyncParseContext,
  OK,
  SyncParseContext,
  TError,
  TIssueKind,
  TParsedType,
  TShow,
  TTypeName,
  cloneDeep,
  getGlobal,
  getParsedType,
  isArray,
  isAsync,
  isFunction,
  type AsyncParseResultOf,
  type BuiltIn,
  type CastToNumber,
  type ConditionalOmit,
  type Ctor,
  type Defined,
  type Equals,
  type LiteralUnion,
  type LooseStripKey,
  type Merge,
  type Narrow,
  type NonNegative,
  type NonNegativeInteger,
  type OmitIndexSignature,
  type ParseContextOf,
  type ParseOptions,
  type ParseResultOf,
  type Primitive,
  type Replace,
  type SimplifyDeep,
  type SimplifyFlat,
  type SyncParseResult,
  type SyncParseResultOf,
  type TDef,
  type TInvalidBufferIssue,
  type TInvalidDateIssue,
  type TInvalidNumberIssue,
  type TInvalidStringIssue,
  type TManifest,
  type TOptions,
  type TTypeNameMap,
  type UnionToIntersection,
} from './_internal'

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TType                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

const handleDef = <D extends TDef>(def: D): D =>
  cloneDeep({
    ...def,
    isOptional: def.isOptional ?? false,
    isNullable: def.isNullable ?? false,
    isReadonly: def.isReadonly ?? false,
  })

export abstract class TTypeBase<O, D extends TDef, I = O> {
  declare readonly $O: O
  declare readonly $I: I

  readonly _def: D

  abstract _parse(ctx: ParseContextOf<this>): ParseResultOf<this>

  protected constructor(def: D) {
    this._def = handleDef(def)
  }

  readonly id: string = nanoid()

  get typeName(): D['typeName'] {
    return this._def.typeName
  }

  clone(): this {
    return this._construct()
  }

  /* ---------------------------------------------------- Parsing --------------------------------------------------- */

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

  parse(data: unknown, options?: SimplifyFlat<ParseOptions>): OutputOf<this> {
    const result = this.safeParse(data, options)
    if (!result.ok) {
      throw result.error
    }

    return result.data
  }

  safeParse(data: unknown, options?: SimplifyFlat<ParseOptions>): SyncParseResultOf<this> {
    const ctx = SyncParseContext.of(this, data, options)
    const result = this._parseSync(ctx)
    return result
  }

  async parseAsync(data: unknown, options?: SimplifyFlat<ParseOptions>): Promise<OutputOf<this>> {
    const result = await this.safeParseAsync(data, options)
    if (!result.ok) {
      throw result.error
    }

    return result.data
  }

  async safeParseAsync(data: unknown, options?: SimplifyFlat<ParseOptions>): AsyncParseResultOf<this> {
    const ctx = AsyncParseContext.of(this, data, options)
    const result = this._parseAsync(ctx)
    return result
  }

  guard(data: unknown, options?: SimplifyFlat<ParseOptions>): data is O {
    return this.safeParse(data, options).ok
  }

  /* ----------------------------------------------- Options/Manifest ----------------------------------------------- */

  options(options: D['options']): this {
    return this._construct({ ...this._def, options: { ...this._def.options, ...options } })
  }

  manifest(manifest: TManifest<O>): this {
    return this._construct({ ...this._def, manifest: { ...this._def.manifest, ...manifest } })
  }

  describe(): TManifest<O> {
    return { ...(this._def.manifest as TManifest<O>) }
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  _construct(def?: D): this {
    return Reflect.construct<[def: D], this>(this.constructor as new (def: D) => this, [{ ...this._def, ...def }])
  }
}

export abstract class TType<O, D extends TDef, I = O> extends TTypeBase<O, D, I> {
  protected constructor(def: D) {
    super(def)

    this._parse = memoize(this._parse.bind(this))
    this._parseSync = this._parseSync.bind(this)
    this._parseAsync = this._parseAsync.bind(this)
    this.parse = this.parse.bind(this)
    this.safeParse = this.safeParse.bind(this)
    this.parseAsync = this.parseAsync.bind(this)
    this.safeParseAsync = this.safeParseAsync.bind(this)
    this.guard = this.guard.bind(this)
    this.clone = this.clone.bind(this)
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
    this.isT = this.isT.bind(this)

    Object.keys(this).forEach((k) => Object.defineProperty(this, k, { enumerable: !/^(?:_|\$)\w*/.exec(k) }))
  }

  get hint(): string {
    const uncolored = TShow(this)
    const { colorsEnabled } = { ...getGlobal().getOptions(), ...this._def.options }
    return colorsEnabled ? TShow.colorize(uncolored) : uncolored
  }

  /* --------------------------------------------------- Utilities -------------------------------------------------- */

  optional(): TOptional<this> {
    return TOptional.create(this, this._def.options)
  }

  nullable(): TNullable<this> {
    return TNullable.create(this, this._def.options)
  }

  nullish(): TOptional<TNullable<this>> {
    return TOptional.create(TNullable.create(this, this._def.options), this._def.options)
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

  /* ---------------------------------------------------- Checks ---------------------------------------------------- */

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

  /* ---------------------------------------------------------------------------------------------------------------- */

  isT<T extends readonly [TTypeName, ...TTypeName[]]>(...types: T): this is TTypeNameMap<T[number]> {
    return types.includes(this.typeName)
  }
}

export type AnyTTypeBase<O = unknown, I = unknown> = TTypeBase<O, TDef, I>
export type AnyTType<O = unknown, I = unknown> = TType<O, TDef, I>

export type OutputOf<T extends { readonly $O: unknown }> = T['$O']
export type InputOf<T extends { readonly $I: unknown }> = T['$I']

/* ------------------------------------------------------------------------------------------------------------------ */

export const ChecksManager = {
  of<T extends TType<unknown, TDef & { readonly checks: ReadonlyArray<{ readonly check: string }> }>>(
    type: T
  ): {
    add(check: T['_def']['checks'][number]): T
    remove(kind: T['_def']['checks'][number]['check']): T
    checkExists(kind: T['_def']['checks'][number]['check']): boolean
  } {
    return {
      add(check): T {
        return type._construct({
          ...type._def,
          checks: [...type._def.checks, check].filter((c, i, arr) => arr.findIndex((c2) => c2.check === c.check) === i),
        })
      },

      remove(kind): T {
        return type._construct({ ...type._def, checks: type._def.checks.filter((check) => check.check !== kind) })
      },

      checkExists(kind): boolean {
        return type._def.checks.some((check) => check.check === kind)
      },
    }
  },
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TAny                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TAnyDef extends TDef {
  readonly typeName: TTypeName.Any
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class TAny extends TType<any, TAnyDef> {
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return OK(ctx.data)
  }

  static create(options?: SimplifyFlat<TOptions>): TAny {
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
    return OK(ctx.data)
  }

  static create(options?: SimplifyFlat<TOptions>): TUnknown {
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
            if (ctx.common.abortEarly) return ctx.abort()
          }

          break
        case 'max':
          if (check.expected.inclusive ? data.length > check.expected.value : data.length >= check.expected.value) {
            ctx.addIssue(
              { kind: TIssueKind.InvalidString, payload: { ...check, received: data.length } },
              check.message
            )
            if (ctx.common.abortEarly) return ctx.abort()
          }

          break
        case 'length':
          if (data.length !== check.expected) {
            ctx.addIssue(
              { kind: TIssueKind.InvalidString, payload: { ...check, received: data.length } },
              check.message
            )
            if (ctx.common.abortEarly) return ctx.abort()
          }

          break
        case 'pattern':
          if (!check.expected.pattern.test(data)) {
            ctx.addIssue({ kind: TIssueKind.InvalidString, payload: { ...check, received: data } }, check.message)
            if (ctx.common.abortEarly) return ctx.abort()
          }

          break
        case 'replace':
          const transformed = data.replace(check.expected.pattern, check.expected.replacement)
          if (transformed === data) {
            ctx.addIssue({ kind: TIssueKind.InvalidString, payload: { ...check, received: data } }, check.message)
            if (ctx.common.abortEarly) return ctx.abort()
          } else {
            ctx.setData(transformed)
          }

          break
        case 'alphanum':
        case 'email':
        case 'cuid':
        case 'uuid':
        case 'iso_duration':
          if (!TString._internals.regexes[check.check].test(data)) {
            ctx.addIssue(
              {
                kind: TIssueKind.InvalidString,
                payload: { check: check.check, received: data } as Extract<
                  TInvalidStringIssue,
                  { readonly check: typeof check.check }
                >,
              },
              check.message
            )
            if (ctx.common.abortEarly) return ctx.abort()
          }

          break
        case 'iso_date':
          const validated = TString._internals.validators.isIsoDate(ctx.data)
          if (validated) {
            ctx.setData(validated)
          } else {
            ctx.addIssue({ kind: TIssueKind.InvalidString, payload: { ...check, received: data } }, check.message)
            if (ctx.common.abortEarly) return ctx.abort()
          }

          break
        case 'base64':
          if (
            !TString._internals.regexes[check.check][
              check.expected.paddingRequired ? 'paddingRequired' : 'paddingNotRequired'
            ][check.expected.urlSafe ? 'urlSafe' : 'urlUnsafe'].test(data)
          ) {
            ctx.addIssue({ kind: TIssueKind.InvalidString, payload: { ...check, received: data } }, check.message)
            if (ctx.common.abortEarly) return ctx.abort()
          }

          break
        case 'url':
          try {
            // eslint-disable-next-line no-new
            new URL(data)
          } catch {
            ctx.addIssue({ kind: TIssueKind.InvalidString, payload: { ...check, received: data } }, check.message)
            if (ctx.common.abortEarly) return ctx.abort()
          }

          break
        case 'starts_with':
          if (!data.startsWith(check.expected)) {
            ctx.addIssue({ kind: TIssueKind.InvalidString, payload: { ...check, received: data } }, check.message)
            if (ctx.common.abortEarly) return ctx.abort()
          }

          break
        case 'ends_with':
          if (!data.endsWith(check.expected)) {
            ctx.addIssue({ kind: TIssueKind.InvalidString, payload: { ...check, received: data } }, check.message)
            if (ctx.common.abortEarly) return ctx.abort()
          }

          break
        case 'contains':
          if (!data.includes(check.expected)) {
            ctx.addIssue({ kind: TIssueKind.InvalidString, payload: { ...check, received: data } }, check.message)
            if (ctx.common.abortEarly) return ctx.abort()
          }

          break

        default:
          TError.assertNever(check)
      }
    }

    return ctx.isValid() ? OK(data as OutputOf<this>) : ctx.abort()
  }

  /* --------------------------------------------------- Coercion --------------------------------------------------- */

  coerce<T_ extends boolean = true>(value = true as T_): TString<T, T_> {
    return new TString({ ...this._def, coerce: value })
  }

  /* -------------------------------------------- Character count checks -------------------------------------------- */

  min<V extends number>(
    value: NonNegativeInteger<V>,
    options?: { readonly inclusive?: boolean; readonly message?: string }
  ): this {
    return this._checks
      .add({ check: 'min', expected: { value, inclusive: options?.inclusive ?? true }, message: options?.message })
      ._checks.remove('length')
  }

  max<V extends number>(
    value: NonNegativeInteger<V>,
    options?: { readonly inclusive?: boolean; readonly message?: string }
  ): this {
    return this._checks
      .add({ check: 'max', expected: { value, inclusive: options?.inclusive ?? true }, message: options?.message })
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

  isoDate(options?: { readonly message?: string }): this {
    return this._checks.add({ check: 'iso_date', message: options?.message })
  }

  isoDuration(options?: { readonly message?: string }): this {
    return this._checks.add({ check: 'iso_duration', message: options?.message })
  }

  get isIsoDuration(): boolean {
    return this._checks.checkExists('iso_duration')
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
    return this._checks.add({ check: 'starts_with', expected: prefix, message: options?.message })
  }

  endsWith(suffix: string, options?: { readonly message?: string }): this {
    return this._checks.add({ check: 'ends_with', expected: suffix, message: options?.message })
  }

  contains(substring: string, options?: { readonly message?: string }): this {
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

  private readonly _checks = ChecksManager.of(this)

  private _addTransform<T_ extends TStringTransform>(transform: T_): TString<[...T, T_], C> {
    return new TString({ ...this._def, transforms: [...new Set([...this._def.transforms, transform])] })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create(options?: SimplifyFlat<TOptions>): TString<[], false> {
    return new TString({
      typeName: TTypeName.String,
      checks: [],
      transforms: [],
      coerce: false,
      options: { ...options },
    })
  }

  private static readonly _internals: {
    readonly regexes: Readonly<Record<'alphanum' | 'email' | 'cuid' | 'uuid' | 'iso_date' | 'iso_duration', RegExp>> & {
      readonly base64: {
        readonly paddingRequired: { readonly urlSafe: RegExp; readonly urlUnsafe: RegExp }
        readonly paddingNotRequired: { readonly urlSafe: RegExp; readonly urlUnsafe: RegExp }
      }
    }
    readonly validators: {
      isIsoDate(data: string): string | null
    }
  } = {
    regexes: {
      alphanum: /^[a-zA-Z0-9]+$/,
      email:
        /^(([^<>()[\].,;:\s@"]+(\.[^<>()[\].,;:\s@"]+)*)|(".+"))@((?!-)([^<>()[\].,;:\s@"]+\.)+[^<>()[\].,;:\s@"]{1,})[^-<>()[\].,;:\s@"]$/i,
      cuid: /^c[^\s-]{8,}$/i,
      uuid: /^([a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[a-f0-9]{4}-[a-f0-9]{12}|00000000-0000-0000-0000-000000000000)$/i,
      iso_date:
        /^(?:[-+]\d{2})?(?:\d{4}(?!\d{2}\b))(?:(-?)(?:(?:0[1-9]|1[0-2])(?:\1(?:[12]\d|0[1-9]|3[01]))?|W(?:[0-4]\d|5[0-2])(?:-?[1-7])?|(?:00[1-9]|0[1-9]\d|[12]\d{2}|3(?:[0-5]\d|6[1-6])))(?![T]$|[T][\d]+Z$)(?:[T\s](?:(?:(?:[01]\d|2[0-3])(?:(:?)[0-5]\d)?|24:?00)(?:[.,]\d+(?!:))?)(?:\2[0-5]\d(?:[.,]\d+)?)?(?:[Z]|(?:[+-])(?:[01]\d|2[0-3])(?::?[0-5]\d)?)?)?)?$/,
      iso_duration: /^P(?!$)(\d+Y)?(\d+M)?(\d+W)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+S)?)?$/,
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

    validators: {
      isIsoDate(value) {
        if (!TString._internals.regexes.iso_date.test(value)) {
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
    const { checks, coerce } = this._def

    if (coerce) {
      ctx.setData(Number(ctx.data))
    }

    if (typeof ctx.data !== 'number' || Number.isNaN(ctx.data)) {
      return ctx.invalidType({ expected: TParsedType.Number }).abort()
    }

    const { data } = ctx

    for (const check of checks) {
      switch (check.check) {
        case 'min':
          if (check.expected.inclusive ? data < check.expected.value : data <= check.expected.value) {
            ctx.addIssue({ kind: TIssueKind.InvalidNumber, payload: { ...check, received: data } }, check.message)
            if (ctx.common.abortEarly) return ctx.abort()
          }

          break
        case 'max':
          if (check.expected.inclusive ? data > check.expected.value : data >= check.expected.value) {
            ctx.addIssue({ kind: TIssueKind.InvalidNumber, payload: { ...check, received: data } }, check.message)
            if (ctx.common.abortEarly) return ctx.abort()
          }

          break
        case 'range':
          if (
            (check.expected.min.inclusive ? data < check.expected.min.value : data <= check.expected.min.value) ||
            (check.expected.max.inclusive ? data > check.expected.max.value : data >= check.expected.max.value)
          ) {
            ctx.addIssue({ kind: TIssueKind.InvalidNumber, payload: { ...check, received: data } }, check.message)
            if (ctx.common.abortEarly) return ctx.abort()
          }

          break
        case 'integer':
          if (!Number.isInteger(data)) {
            ctx.addIssue({ kind: TIssueKind.InvalidNumber, payload: { ...check, received: data } }, check.message)
            if (ctx.common.abortEarly) return ctx.abort()
          }

          break
        case 'positive':
          if (data <= 0) {
            ctx.addIssue({ kind: TIssueKind.InvalidNumber, payload: { ...check, received: data } }, check.message)
            if (ctx.common.abortEarly) return ctx.abort()
          }

          break
        case 'nonpositive':
          if (data > 0) {
            ctx.addIssue({ kind: TIssueKind.InvalidNumber, payload: { ...check, received: data } }, check.message)
            if (ctx.common.abortEarly) return ctx.abort()
          }

          break
        case 'negative':
          if (data >= 0) {
            ctx.addIssue({ kind: TIssueKind.InvalidNumber, payload: { ...check, received: data } }, check.message)
            if (ctx.common.abortEarly) return ctx.abort()
          }

          break
        case 'nonnegative':
          if (data < 0) {
            ctx.addIssue({ kind: TIssueKind.InvalidNumber, payload: { ...check, received: data } }, check.message)
            if (ctx.common.abortEarly) return ctx.abort()
          }

          break
        case 'finite':
          if (!Number.isFinite(data)) {
            ctx.addIssue({ kind: TIssueKind.InvalidNumber, payload: { ...check, received: data } }, check.message)
            if (ctx.common.abortEarly) return ctx.abort()
          }

          break
        case 'port':
          if (data < 0 || data > 65535) {
            ctx.addIssue({ kind: TIssueKind.InvalidNumber, payload: { ...check, received: data } }, check.message)
            if (ctx.common.abortEarly) return ctx.abort()
          }

          break
        case 'multiple':
          if (TNumber._internals.floatSafeRemainder(data, check.expected) !== 0) {
            ctx.addIssue({ kind: TIssueKind.InvalidNumber, payload: { ...check, received: data } }, check.message)
            if (ctx.common.abortEarly) return ctx.abort()
          }

          break

        default:
          TError.assertNever(check)
      }
    }

    return ctx.isValid() ? OK(data) : ctx.abort()
  }

  /* --------------------------------------------------- Coercion --------------------------------------------------- */

  coerce<T extends boolean = true>(value = true as T): TNumber<T> {
    return new TNumber({ ...this._def, coerce: value })
  }

  /* ---------------------------------------------------- Checks ---------------------------------------------------- */

  min(value: number, options?: { readonly inclusive?: boolean; readonly message?: string }): this {
    return this._checks
      .add({ check: 'min', expected: { value, inclusive: options?.inclusive ?? true }, message: options?.message })
      ._checks.remove('range')
  }

  gt(value: number, options?: { readonly message?: string }): this {
    return this.min(value, { inclusive: false, message: options?.message })
  }

  gte(value: number, options?: { readonly message?: string }): this {
    return this.min(value, { inclusive: true, message: options?.message })
  }

  max(value: number, options?: { readonly inclusive?: boolean; readonly message?: string }): this {
    return this._checks
      .add({ check: 'max', expected: { value, inclusive: options?.inclusive ?? true }, message: options?.message })
      ._checks.remove('range')
  }

  lt(value: number, options?: { readonly message?: string }): this {
    return this.max(value, { inclusive: false, message: options?.message })
  }

  lte(value: number, options?: { readonly message?: string }): this {
    return this.max(value, { inclusive: true, message: options?.message })
  }

  range(
    min: number,
    max: number,
    options?: { readonly minInclusive?: boolean; readonly maxInclusive?: boolean; readonly message?: string }
  ): this {
    return this._checks
      .add({
        check: 'range',
        expected: {
          min: { value: min, inclusive: options?.minInclusive ?? true },
          max: { value: max, inclusive: options?.maxInclusive ?? true },
        },
        message: options?.message,
      })
      ._checks.remove('min')
      ._checks.remove('max')
  }

  between(
    min: number,
    max: number,
    options?: { readonly minInclusive?: boolean; readonly maxInclusive?: boolean; readonly message?: string }
  ): this {
    return this.range(min, max, options)
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

  port(options?: { readonly message?: string }): this {
    return this._checks.add({ check: 'port', message: options?.message })
  }

  multiple(value: number, options?: { readonly message?: string }): this {
    return this._checks.add({ check: 'multiple', expected: value, message: options?.message })
  }

  step(value: number, options?: { readonly message?: string }): this {
    return this.multiple(value, options)
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  private readonly _checks = ChecksManager.of(this)

  static create(options?: SimplifyFlat<TOptions>): TNumber<false> {
    return new TNumber({ typeName: TTypeName.Number, checks: [], coerce: false, options: { ...options } })
  }

  private static readonly _internals: {
    floatSafeRemainder(value: number, step: number): number
  } = {
    floatSafeRemainder(value, step) {
      const valDecCount = (value.toString().split('.')[1] || '').length
      const stepDecCount = (step.toString().split('.')[1] || '').length
      const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount
      const valInt = parseInt(value.toFixed(decCount).replace('.', ''), 10)
      const stepInt = parseInt(step.toFixed(decCount).replace('.', ''), 10)
      return (valInt % stepInt) / 10 ** decCount
    },
  }
}

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
      : OK(ctx.data)
  }

  static create(options?: SimplifyFlat<TOptions>): TNaN {
    return new TNaN({ typeName: TTypeName.NaN, options: { ...options } })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TBigInt                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TBigIntInput<C extends boolean> = bigint | (C extends true ? string | number | boolean : never)

export interface TBigIntDef<C extends boolean> extends TDef {
  readonly typeName: TTypeName.BigInt
  readonly coerce: C
}

export class TBigInt<C extends boolean = boolean> extends TType<bigint, TBigIntDef<C>, TBigIntInput<C>> {
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (
      this._def.coerce &&
      (typeof ctx.data === 'string' || typeof ctx.data === 'number' || typeof ctx.data === 'boolean')
    ) {
      ctx.setData(BigInt(ctx.data))
    }

    if (typeof ctx.data !== 'bigint') {
      return ctx.invalidType({ expected: TParsedType.BigInt }).abort()
    }

    return OK(ctx.data)
  }

  /* --------------------------------------------------- Coercion --------------------------------------------------- */

  coerce<T extends boolean = true>(value = true as T): TBigInt<T> {
    return new TBigInt({ ...this._def, coerce: value })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create(options?: SimplifyFlat<TOptions>): TBigInt<false> {
    return new TBigInt({ typeName: TTypeName.BigInt, coerce: false, options: { ...options } })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TBoolean                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TBooleanCoercion =
  | boolean
  | { readonly truthy?: readonly Primitive[]; readonly falsy?: readonly Primitive[] }

export type TBooleanInput<C extends TBooleanCoercion> = C extends true
  ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any
  : C extends Record<string, unknown>
  ? C['falsy'] extends ReadonlyArray<infer F>
    ? F | (C['truthy'] extends ReadonlyArray<infer T> ? T : never)
    : C['truthy'] extends ReadonlyArray<infer T>
    ? T
    : never
  : boolean

export interface TBooleanDef<C extends TBooleanCoercion> extends TDef {
  readonly typeName: TTypeName.Boolean
  readonly coerce: C
}

export class TBoolean<C extends TBooleanCoercion = TBooleanCoercion> extends TType<
  boolean,
  TBooleanDef<C>,
  TBooleanInput<C>
> {
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    const { coerce } = this._def

    if (coerce) {
      if (coerce === true) {
        ctx.setData(Boolean(ctx.data))
      } else if (coerce.truthy?.includes(ctx.data as Primitive)) {
        ctx.setData(true)
      } else if (coerce.falsy?.includes(ctx.data as Primitive)) {
        ctx.setData(false)
      }
    }

    if (typeof ctx.data !== 'boolean') {
      return ctx.invalidType({ expected: TParsedType.Boolean }).abort()
    }

    return OK(ctx.data as OutputOf<this>)
  }

  /* --------------------------------------------------- Coercion --------------------------------------------------- */

  coerce<T extends TBooleanCoercion>(value: Narrow<T>): TBoolean<T> {
    return new TBoolean({ ...this._def, coerce: value as T })
  }

  truthy<T extends readonly [Primitive, ...Primitive[]]>(
    ...values: T
  ): TBoolean<C extends Record<string, unknown> ? SimplifyFlat<Merge<C, { truthy: T }>> : { truthy: T }> {
    return new TBoolean({
      ...this._def,
      coerce: { ...(typeof this._def.coerce === 'object' ? this._def.coerce : {}), truthy: values },
    }) as unknown as TBoolean<C extends Record<string, unknown> ? SimplifyFlat<Merge<C, { truthy: T }>> : { truthy: T }>
  }

  falsy<T extends readonly [Primitive, ...Primitive[]]>(
    ...values: T
  ): TBoolean<C extends Record<string, unknown> ? SimplifyFlat<Merge<C, { falsy: T }>> : { falsy: T }> {
    return new TBoolean({
      ...this._def,
      coerce: { ...(typeof this._def.coerce === 'object' ? this._def.coerce : {}), falsy: values },
    }) as unknown as TBoolean<C extends Record<string, unknown> ? SimplifyFlat<Merge<C, { falsy: T }>> : { falsy: T }>
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create(options?: SimplifyFlat<TOptions>): TBoolean<false> {
    return new TBoolean({ typeName: TTypeName.Boolean, coerce: false, options: { ...options } })
  }
}

/* ------------------------------------------------------ TTrue ----------------------------------------------------- */

export interface TTrueDef extends TDef {
  readonly typeName: TTypeName.True
}

export class TTrue extends TType<true, TTrueDef> {
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return ctx.data === true ? OK(ctx.data) : ctx.invalidType({ expected: TParsedType.True }).abort()
  }

  static create(options?: SimplifyFlat<TOptions>): TTrue {
    return new TTrue({ typeName: TTypeName.True, options: { ...options } })
  }
}

/* ----------------------------------------------------- TFalse ----------------------------------------------------- */

export interface TFalseDef extends TDef {
  readonly typeName: TTypeName.False
}

export class TFalse extends TType<false, TFalseDef> {
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return ctx.data === false ? OK(ctx.data) : ctx.invalidType({ expected: TParsedType.False }).abort()
  }

  static create(options?: SimplifyFlat<TOptions>): TFalse {
    return new TFalse({ typeName: TTypeName.False, options: { ...options } })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TDate                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TDateCheckInput = Date | number | LiteralUnion<'now', string>

export type TDateInput<C extends boolean> = Date | (C extends true ? string | number : never)

const handleTDateCheckInput = (value: Date | 'now', currentDate: Date): Date => (value === 'now' ? currentDate : value)

export interface TDateDef<C extends boolean> extends TDef {
  readonly typeName: TTypeName.Date
  readonly checks: ReadonlyArray<
    LooseStripKey<TInvalidDateIssue['payload'], 'received'> & { readonly message: string | undefined }
  >
  readonly coerce: C
}

export class TDate<C extends boolean = boolean> extends TType<Date, TDateDef<C>, TDateInput<C>> {
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    const { checks, coerce } = this._def

    if (coerce && (typeof ctx.data === 'string' || typeof ctx.data === 'number')) {
      ctx.setData(new Date(ctx.data))
    }

    if (!(ctx.data instanceof Date)) {
      return ctx.invalidType({ expected: TParsedType.Date }).abort()
    }

    const { data } = ctx

    const currentDate = new Date()

    for (const check of checks) {
      switch (check.check) {
        case 'min':
          if (
            check.expected.inclusive
              ? data < handleTDateCheckInput(check.expected.value, currentDate)
              : data <= handleTDateCheckInput(check.expected.value, currentDate)
          ) {
            ctx.addIssue({ kind: TIssueKind.InvalidDate, payload: { ...check, received: data } }, check.message)
            if (ctx.common.abortEarly) return ctx.abort()
          }

          break
        case 'max':
          if (
            check.expected.inclusive
              ? data > handleTDateCheckInput(check.expected.value, currentDate)
              : data >= handleTDateCheckInput(check.expected.value, currentDate)
          ) {
            ctx.addIssue({ kind: TIssueKind.InvalidDate, payload: { ...check, received: data } }, check.message)
            if (ctx.common.abortEarly) return ctx.abort()
          }

          break
        case 'range':
          if (
            (check.expected.min.inclusive
              ? data < handleTDateCheckInput(check.expected.min.value, currentDate)
              : data <= handleTDateCheckInput(check.expected.min.value, currentDate)) ||
            (check.expected.max.inclusive
              ? data > handleTDateCheckInput(check.expected.max.value, currentDate)
              : data >= handleTDateCheckInput(check.expected.max.value, currentDate))
          ) {
            ctx.addIssue({ kind: TIssueKind.InvalidDate, payload: { ...check, received: data } }, check.message)
            if (ctx.common.abortEarly) return ctx.abort()
          }

          break

        default:
          TError.assertNever(check)
      }
    }

    return ctx.isValid() ? OK(data) : ctx.abort()
  }

  /* --------------------------------------------------- Coercion --------------------------------------------------- */

  coerce<T extends boolean = true>(value = true as T): TDate<T> {
    return new TDate({ ...this._def, coerce: value })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  min(value: TDateCheckInput, options?: { readonly inclusive?: boolean; readonly message?: string }): this {
    return this._checks
      .add({
        check: 'min',
        expected: { value: value === 'now' ? 'now' : new Date(value), inclusive: options?.inclusive ?? true },
        message: options?.message,
      })
      ._checks.remove('range')
  }

  after(value: TDateCheckInput, options?: { readonly message?: string }): this {
    return this.min(value, { inclusive: false, message: options?.message })
  }

  sameOrAfter(value: TDateCheckInput, options?: { readonly message?: string }): this {
    return this.min(value, { inclusive: true, message: options?.message })
  }

  max(value: TDateCheckInput, options?: { readonly inclusive?: boolean; readonly message?: string }): this {
    return this._checks
      .add({
        check: 'max',
        expected: { value: value === 'now' ? 'now' : new Date(value), inclusive: options?.inclusive ?? true },
        message: options?.message,
      })
      ._checks.remove('range')
  }

  before(value: TDateCheckInput, options?: { readonly message?: string }): this {
    return this.max(value, { inclusive: false, message: options?.message })
  }

  sameOrBefore(value: TDateCheckInput, options?: { readonly message?: string }): this {
    return this.max(value, { inclusive: true, message: options?.message })
  }

  range(
    min: TDateCheckInput,
    max: TDateCheckInput,
    options?: { readonly minInclusive?: boolean; readonly maxInclusive?: boolean; readonly message?: string }
  ): this {
    return this._checks
      .add({
        check: 'range',
        expected: {
          min: { value: min === 'now' ? 'now' : new Date(min), inclusive: options?.minInclusive ?? true },
          max: { value: max === 'now' ? 'now' : new Date(max), inclusive: options?.maxInclusive ?? true },
        },
        message: options?.message,
      })
      ._checks.remove('min')
      ._checks.remove('max')
  }

  between(
    min: TDateCheckInput,
    max: TDateCheckInput,
    options?: { readonly minInclusive?: boolean; readonly maxInclusive?: boolean; readonly message?: string }
  ): this {
    return this.range(min, max, options)
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  private readonly _checks = ChecksManager.of(this)

  static create(options?: SimplifyFlat<TOptions>): TDate<false> {
    return new TDate({ typeName: TTypeName.Date, checks: [], coerce: false, options: { ...options } })
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
    return typeof ctx.data === 'symbol' ? OK(ctx.data) : ctx.invalidType({ expected: TParsedType.Symbol }).abort()
  }

  static create(options?: SimplifyFlat<TOptions>): TSymbol {
    return new TSymbol({ typeName: TTypeName.Symbol, options: { ...options } })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TBuffer                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TBufferDef extends TDef {
  readonly typeName: TTypeName.Buffer
  readonly checks: ReadonlyArray<
    LooseStripKey<TInvalidBufferIssue['payload'], 'received'> & { readonly message: string | undefined }
  >
}

export class TBuffer extends TType<Buffer, TBufferDef> {
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (!Buffer.isBuffer(ctx.data)) {
      return ctx.invalidType({ expected: TParsedType.Buffer }).abort()
    }

    const { checks } = this._def
    const { data } = ctx

    for (const check of checks) {
      switch (check.check) {
        case 'min':
          if (check.expected.inclusive ? data.length < check.expected.value : data.length <= check.expected.value) {
            ctx.addIssue(
              { kind: TIssueKind.InvalidString, payload: { ...check, received: data.length } },
              check.message
            )
            if (ctx.common.abortEarly) return ctx.abort()
          }

          break
        case 'max':
          if (check.expected.inclusive ? data.length > check.expected.value : data.length >= check.expected.value) {
            ctx.addIssue(
              { kind: TIssueKind.InvalidString, payload: { ...check, received: data.length } },
              check.message
            )
            if (ctx.common.abortEarly) return ctx.abort()
          }

          break
        case 'length':
          if (data.length !== check.expected) {
            ctx.addIssue(
              { kind: TIssueKind.InvalidString, payload: { ...check, received: data.length } },
              check.message
            )
            if (ctx.common.abortEarly) return ctx.abort()
          }

          break

        default:
          TError.assertNever(check)
      }
    }

    return ctx.isValid() ? OK(data) : ctx.abort()
  }

  min<V extends number>(
    value: NonNegative<V>,
    options?: { readonly inclusive?: boolean; readonly message?: string }
  ): this {
    return this._checks
      .add({ check: 'min', expected: { value, inclusive: options?.inclusive ?? true }, message: options?.message })
      ._checks.remove('length')
  }

  max<V extends number>(
    value: NonNegative<V>,
    options?: { readonly inclusive?: boolean; readonly message?: string }
  ): this {
    return this._checks
      .add({ check: 'max', expected: { value, inclusive: options?.inclusive ?? true }, message: options?.message })
      ._checks.remove('length')
  }

  length<L extends number>(length: NonNegative<L>, options?: { readonly message?: string }): this {
    return this._checks
      .add({ check: 'length', expected: length, message: options?.message })
      ._checks.remove('min')
      ._checks.remove('max')
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  private readonly _checks = ChecksManager.of(this)

  static create(options?: SimplifyFlat<TOptions>): TBuffer {
    return new TBuffer({ typeName: TTypeName.Buffer, checks: [], options: { ...options } })
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

    return OK(ctx.data as T)
  }

  get value(): T {
    return this._def.value
  }

  static create<T extends Primitive>(value: T, options?: SimplifyFlat<TLiteralOptions>): TLiteral<T> {
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

    return OK(ctx.data)
  }

  get values(): Readonly<T> {
    return this._def.values
  }

  get enum(): { readonly [K in T[number]]: K } {
    return this.values.reduce((acc, value) => ({ ...acc, [value]: value }), {} as { readonly [K in T[number]]: K })
  }

  static create<T extends string | number, U extends readonly [T, ...T[]]>(
    values: U,
    options?: SimplifyFlat<TEnumOptions>
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
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {}

  get enum(): T {
    return getValidEnum(this._def.enum) as T
  }

  get values(): Readonly<UnionToEnumValues<T[keyof T]>> {
    return Object.values(this.enum) as UnionToEnumValues<T[keyof T]>
  }

  static create<T extends EnumLike>(enum_: T, options?: SimplifyFlat<TEnumOptions>): TNativeEnum<T> {
    return new TNativeEnum({ typeName: TTypeName.NativeEnum, enum: enum_, options: { ...options } })
  }
}

export type AnyTNativeEnum = TNativeEnum<EnumLike>

/* ---------------------------------------------------- TIterable --------------------------------------------------- */

export interface TIterableDef<T extends AnyTType> extends TDef {
  readonly typeName: TTypeName.Array | TTypeName.Set
  readonly element: T
  readonly minItems?: { readonly value: number; readonly inclusive: boolean; readonly message: string | undefined }
  readonly maxItems?: { readonly value: number; readonly inclusive: boolean; readonly message: string | undefined }
}

export interface TIterable<T extends AnyTType> extends AnyTType {
  readonly element: T
  min<V extends number>(
    value: NonNegativeInteger<V>,
    options?: { readonly inclusive?: boolean; readonly message?: string }
  ): TIterable<T>
  max<V extends number>(
    value: NonNegativeInteger<V>,
    options?: { readonly inclusive?: boolean; readonly message?: string }
  ): TIterable<T>
  sparse(enabled?: true): TIterable<TOptional<T>>
  sparse(enabled: false): TIterable<TDefined<T>>
  partial(): TIterable<TOptional<T>>
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TArray                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

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
  extends TType<TArrayIO<T, C>, TArrayDef<T, C>, TArrayIO<T, C, '$I'>>
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

        return ctx.isValid() ? OK(result as OutputOf<this>) : ctx.abort()
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

    return ctx.isValid() ? OK(result as OutputOf<this>) : ctx.abort()
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

  required(): TArray<TDefined<T>, C> {
    return this.sparse(false)
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

  static create<T extends AnyTType>(element: T, options?: SimplifyFlat<TOptions>): TArray<T> {
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

        return ctx.isValid() ? OK(result as OutputOf<this>) : ctx.abort()
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

    return ctx.isValid() ? OK(result as OutputOf<this>) : ctx.abort()
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

  static create<T extends TTupleItems>(items: T, options?: SimplifyFlat<TTupleOptions>): TTuple<T>
  static create<T extends TTupleItems, R extends AnyTType>(
    items: T,
    rest: R,
    options?: SimplifyFlat<TTupleOptions>
  ): TTuple<T, R>
  static create<T extends TTupleItems, R extends AnyTType>(
    items: T,
    restOrOptions?: R | SimplifyFlat<TTupleOptions>,
    maybeOptions?: SimplifyFlat<TTupleOptions>
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

          return ctx.isValid() ? OK(result) : ctx.abort()
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

    return ctx.isValid() ? OK(result) : ctx.abort()
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

  required(): TSet<TDefined<T>> {
    return this.sparse(false)
  }

  toArray(): TArray<T> {
    return new TArray({ ...this._def, typeName: TTypeName.Array, cardinality: 'many', length: this._def.size })
  }

  static create<T extends AnyTType>(element: T, options?: SimplifyFlat<TOptions>): TSet<T> {
    return new TSet({ typeName: TTypeName.Set, element, options: { ...options } })
  }
}

export type AnyTSet = TSet<AnyTType>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TRecord                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TRecordDef<K extends AnyTType<PropertyKey, PropertyKey>, V extends AnyTType> extends TDef {
  readonly typeName: TTypeName.Record
  readonly keys: K
  readonly values: V
}

export class TRecord<K extends AnyTType<PropertyKey, PropertyKey>, V extends AnyTType> extends TType<
  Record<OutputOf<K>, OutputOf<V>>,
  TRecordDef<K, V>,
  Record<InputOf<K>, InputOf<V>>
> {
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (typeof ctx.data !== 'object' || ctx.data === null) {
      return ctx.invalidType({ expected: TParsedType.Object }).abort()
    }

    const { keys, values } = this._def
    const { data } = ctx

    const result = {} as Record<OutputOf<K>, OutputOf<V>>

    if (ctx.isAsync()) {
      return Promise.all(
        Object.entries(data).map(async ([k, v]) =>
          Promise.all([
            keys._parseAsync(ctx.child(keys, k, [k, 'key'])),
            values._parseAsync(ctx.child(values, v, [k, 'value'])),
          ])
        )
      ).then((results) => {
        for (const [keyRes, valueRes] of results) {
          if (!keyRes.ok || !valueRes.ok) {
            if (ctx.common.abortEarly) {
              return ctx.abort()
            }

            continue
          }

          result[keyRes.data] = valueRes.data
        }

        return ctx.isValid() ? OK(result) : ctx.abort()
      })
    }

    for (const [k, v] of Object.entries(data)) {
      const keyRes = keys._parseSync(ctx.child(keys, k, [k, 'key']))
      const valueRes = values._parseSync(ctx.child(values, v, [k, 'value']))

      if (!keyRes.ok || !valueRes.ok) {
        if (ctx.common.abortEarly) {
          return ctx.abort()
        }

        continue
      }

      result[keyRes.data] = valueRes.data
    }

    return ctx.isValid() ? OK(result) : ctx.abort()
  }

  get keys(): K {
    return this._def.keys
  }

  get values(): V {
    return this._def.values
  }

  get entries(): readonly [keys: K, values: V] {
    return [this.keys, this.values]
  }

  partial(): TRecord<K, TOptional<V>> {
    return new TRecord({ ...this._def, values: this.values.optional() })
  }

  required(): TRecord<K, TDefined<V>> {
    return new TRecord({ ...this._def, values: this.values.defined() })
  }

  toMap(): TMap<K, V> {
    return new TMap({ ...this._def, typeName: TTypeName.Map })
  }

  static create<V extends AnyTType>(values: V, options?: SimplifyFlat<TOptions>): TRecord<TString, V>
  static create<K extends AnyTType<PropertyKey, PropertyKey>, V extends AnyTType>(
    keys: K,
    values: V,
    options?: SimplifyFlat<TOptions>
  ): TRecord<K, V>
  static create(
    valuesOrKeys: AnyTType<PropertyKey, PropertyKey>,
    valuesOrOptions?: AnyTType | SimplifyFlat<TOptions>,
    maybeOptions?: SimplifyFlat<TOptions>
  ): TRecord<AnyTType<PropertyKey, PropertyKey>, AnyTType> {
    if (valuesOrOptions instanceof TType) {
      return new TRecord({
        typeName: TTypeName.Record,
        keys: valuesOrKeys,
        values: valuesOrOptions,
        options: { ...maybeOptions },
      })
    }

    return new TRecord({
      typeName: TTypeName.Record,
      keys: TString.create(),
      values: valuesOrKeys,
      options: { ...valuesOrOptions },
    })
  }
}

export type AnyTRecord = TRecord<AnyTType<PropertyKey, PropertyKey>, AnyTType>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TMap                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TMapDef<K extends AnyTType, V extends AnyTType> extends TDef {
  readonly typeName: TTypeName.Map
  readonly keys: K
  readonly values: V
}

export class TMap<K extends AnyTType, V extends AnyTType> extends TType<
  Map<OutputOf<K>, OutputOf<V>>,
  TMapDef<K, V>,
  Map<InputOf<K>, InputOf<V>>
> {
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (!(ctx.data instanceof Map)) {
      return ctx.invalidType({ expected: TParsedType.Map }).abort()
    }

    const { keys, values } = this._def
    const { data } = ctx

    const result = new Map<OutputOf<K>, OutputOf<V>>()

    if (ctx.isAsync()) {
      return Promise.all(
        [...data.entries()].map(async ([k, v]) =>
          Promise.all([
            keys._parseAsync(ctx.child(keys, k, [k, 'key'])),
            values._parseAsync(ctx.child(values, v, [k, 'value'])),
          ])
        )
      ).then((results) => {
        for (const [keyRes, valueRes] of results) {
          if (!keyRes.ok || !valueRes.ok) {
            if (ctx.common.abortEarly) {
              return ctx.abort()
            }

            continue
          }

          result.set(keyRes.data, valueRes.data)
        }

        return ctx.isValid() ? OK(result) : ctx.abort()
      })
    }

    for (const [k, v] of data.entries()) {
      const keyRes = keys._parseSync(ctx.child(keys, k, [k, 'key']))
      const valueRes = values._parseSync(ctx.child(values, v, [k, 'value']))

      if (!keyRes.ok || !valueRes.ok) {
        if (ctx.common.abortEarly) {
          return ctx.abort()
        }

        continue
      }

      result.set(keyRes.data, valueRes.data)
    }

    return ctx.isValid() ? OK(result) : ctx.abort()
  }

  get keys(): K {
    return this._def.keys
  }

  get values(): V {
    return this._def.values
  }

  get entries(): readonly [keys: K, values: V] {
    return [this.keys, this.values]
  }

  static create<K extends AnyTType, V extends AnyTType>(
    keys: K,
    values: V,
    options?: SimplifyFlat<TOptions>
  ): TMap<K, V> {
    return new TMap({ typeName: TTypeName.Map, keys, values, options: { ...options } })
  }
}

export type AnyTMap = TMap<AnyTType, AnyTType>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TObject                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

type OptionalKeys<T extends Record<string, unknown>> = { [K in keyof T]: undefined extends T[K] ? K : never }[keyof T]
type RequiredKeys<T extends Record<string, unknown>> = { [K in keyof T]: undefined extends T[K] ? never : K }[keyof T]
type EnforceOptional<T extends Record<string, unknown>> = Pick<T, RequiredKeys<T>> & Partial<Pick<T, OptionalKeys<T>>>

export type TObjectShape = Record<string, AnyTType>
export type TObjectUnknownKeys = 'passthrough' | 'strict' | 'strip'
export type TObjectCatchall = AnyTType

export type TObjectIO<
  S extends TObjectShape,
  UK extends TObjectUnknownKeys | undefined,
  C extends TObjectCatchall | undefined,
  IO extends '$I' | '$O' = '$O'
> = SimplifyDeep<
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

export type TObjectShapeArg<S extends TObjectShape> = {
  [K in keyof S]: Exclude<S[K], AnyTRef> | TRef<Exclude<ObjectShapePaths<S>, K>, undefined>
}

export type GetRefResolvedShape<S extends TObjectShape> = {
  [K in keyof S]: S[K] extends TRef<infer R, infer _Ctx> ? ReachSchema<R, S> : S[K]
}

export const resolveShapeRefs = <S extends TObjectShape>(shape: S): GetRefResolvedShape<S> => {
  const resolvedShape = {} as Record<string, unknown>

  for (const k of Object.keys(shape)) {
    const v = shape[k]

    if (v instanceof TRef) {
      resolvedShape[k] = v._contextualize(shape)._resolve()
    } else if (v.isT(TTypeName.Object)) {
      resolvedShape[k] = v.extend(resolveShapeRefs(v.shape))
    } else {
      resolvedShape[k] = v
    }
  }

  return resolvedShape as GetRefResolvedShape<S>
}

export type PartialShape<S extends TObjectShape, K extends ReadonlyArray<keyof S> = ReadonlyArray<keyof S>> = {
  [K_ in keyof S]: K_ extends K[number] ? TOptional<S[K_]> : S[K_]
}
export type RequiredShape<S extends TObjectShape, K extends ReadonlyArray<keyof S> = ReadonlyArray<keyof S>> = {
  [K_ in keyof S]: K_ extends K[number] ? TDefined<S[K_]> : S[K_]
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
            results.push([k, OK(data[k])])
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

        return ctx.isValid() ? OK(result as OutputOf<this>) : ctx.abort()
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
        results.push([k, OK(data[k])])
      }
    } else if (unknownKeys === 'strict') {
      if (extraKeys.length > 0) {
        ctx.addIssue(
          { kind: TIssueKind.UnrecognizedKeys, payload: { keys: extraKeys } },
          this._def.options.messages?.unrecognizedKeys
        )
        if (ctx.common.abortEarly) return ctx.abort()
      }
    }

    for (const [k, res] of results) {
      if (!res.ok) {
        if (ctx.common.abortEarly) return ctx.abort()

        continue
      }

      if (k in data) {
        result[k] = res.data
      }
    }

    return ctx.isValid() ? OK(result as OutputOf<this>) : ctx.abort()
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

  required(): TObject<RequiredShape<S>, UK, C>
  required<K extends readonly [keyof S, ...Array<keyof S>]>(keys: K): TObject<RequiredShape<S, K>, UK, C>
  required(keys?: ReadonlyArray<keyof S>): TObject<RequiredShape<S>, UK, C> {
    return this._setShape(
      Object.fromEntries(
        Object.entries(this.shape).map(([k, v]) => [k, (keys ?? Object.keys(this.shape)).includes(k) ? v.defined() : v])
      ) as RequiredShape<S>
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
    lazy: <S extends TObjectShape>(shape: () => S, options?: SimplifyFlat<TOptions>) =>
      this._makeCreate()(shape(), options),
  })

  private static _makeCreate<UK extends TObjectUnknownKeys = 'strip'>(unknownKeys = 'strip' as UK) {
    return <S extends TObjectShape>(
      shape: TObjectShapeArg<S>,
      options?: SimplifyFlat<TOptions>
    ): TObject<GetRefResolvedShape<S>, UK> =>
      new TObject({
        typeName: TTypeName.Object,
        shape: resolveShapeRefs(shape as S),
        unknownKeys,
        catchall: undefined,
        options: { ...options },
      })
  }
}

export type SomeTObject = TObject<Record<string, AnyTType>>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyTObject = TObject<any>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                     TUndefined                                                     */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TUndefinedDef extends TDef {
  readonly typeName: TTypeName.Undefined
}

export class TUndefined extends TType<undefined, TUndefinedDef> {
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return ctx.data === undefined ? OK(undefined) : ctx.invalidType({ expected: TParsedType.Undefined }).abort()
  }

  static create(options?: SimplifyFlat<TOptions>): TUndefined {
    return new TUndefined({ typeName: TTypeName.Undefined, options: { ...options }, isOptional: true })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TVoid                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TVoidDef extends TDef {
  readonly typeName: TTypeName.Void
}

export class TVoid extends TType<void, TVoidDef> {
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return ctx.data === undefined ? OK(undefined) : ctx.invalidType({ expected: TParsedType.Void }).abort()
  }

  static create(options?: SimplifyFlat<TOptions>): TVoid {
    return new TVoid({ typeName: TTypeName.Void, options: { ...options }, isOptional: true })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TNull                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TNullDef extends TDef {
  readonly typeName: TTypeName.Null
}

export class TNull extends TType<null, TNullDef> {
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return ctx.data === null ? OK(null) : ctx.invalidType({ expected: TParsedType.Null }).abort()
  }

  static create(options?: SimplifyFlat<TOptions>): TNull {
    return new TNull({ typeName: TTypeName.Null, options: { ...options }, isNullable: true })
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

  static create(options?: SimplifyFlat<TNeverOptions>): TNever {
    return new TNever({ typeName: TTypeName.Never, options: { ...options } })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TFunction                                                     */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TFunctionOuterIO<T extends AnyTType, A extends AnyTTuple, R extends AnyTType> = (
  this: T,
  ...args: InputOf<A>
) => OutputOf<R>

export type TFunctionInnerIO<T extends AnyTType, A extends AnyTTuple, R extends AnyTType> = (
  this: T,
  ...args: OutputOf<A>
) => InputOf<R>

export interface TFunctionDef<T extends AnyTType, A extends AnyTTuple, R extends AnyTType> extends TDef {
  readonly typeName: TTypeName.Function
  readonly thisType: T
  readonly parameters: A
  readonly returnType: R
}

export class TFunction<T extends AnyTType, A extends TTuple<TTupleItems, AnyTType>, R extends AnyTType> extends TType<
  TFunctionOuterIO<T, A, R>,
  TFunctionDef<T, A, R>,
  TFunctionInnerIO<T, A, R>
> {
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {}

  get thisType(): T {
    return this._def.thisType
  }

  get parameters(): A {
    return this._def.parameters
  }

  get returnType(): R {
    return this._def.returnType
  }

  this<T_ extends AnyTType>(thisType: T_): TFunction<T_, A, R> {
    return new TFunction({ ...this._def, thisType })
  }

  args<A_ extends TTupleItems>(...args: A_): TFunction<T, TTuple<A_, A['restType']>, R> {
    return new TFunction({
      ...this._def,
      parameters: TTuple.create(args, this._def.parameters.restType),
    })
  }

  returns<R_ extends AnyTType>(returnType: R_): TFunction<T, A, R_> {
    return new TFunction({ ...this._def, returnType })
  }

  implement<F extends TFunctionInnerIO<T, A, R>>(
    fn: F
  ): ReturnType<F> extends OutputOf<R> ? (...args: InputOf<A>) => ReturnType<F> : TFunctionOuterIO<T, A, R> {
    const parsedFn = this.parse(fn)
    return parsedFn as ReturnType<F> extends OutputOf<R>
      ? (...args: InputOf<A>) => ReturnType<F>
      : TFunctionOuterIO<T, A, R>
  }

  validate<F extends TFunctionInnerIO<T, A, R>>(
    fn: F
  ): ReturnType<F> extends OutputOf<R> ? (...args: InputOf<A>) => ReturnType<F> : TFunctionOuterIO<T, A, R> {
    return this.implement(fn)
  }

  strictImplement(fn: TFunctionInnerIO<T, A, R>): TFunctionInnerIO<T, A, R> {
    const parsedFn = this.parse(fn)
    return parsedFn
  }

  static create(options?: SimplifyFlat<TOptions>): TFunction<TAny, TTuple<[], TUnknown>, TUnknown>
  static create<A extends TTupleItems>(
    parameters: A,
    options?: SimplifyFlat<TOptions>
  ): TFunction<TAny, TTuple<A, TUnknown>, TUnknown>
  static create<A extends TTupleItems, R extends AnyTType>(
    parameters: A,
    returnType: R,
    options?: SimplifyFlat<TOptions>
  ): TFunction<TAny, TTuple<A, TUnknown>, R>
  static create<T extends AnyTType, A extends TTupleItems, R extends AnyTType>(
    thisType: T,
    parameters: A,
    returnType: R,
    options?: SimplifyFlat<TOptions>
  ): TFunction<T, TTuple<A, TUnknown>, R>
  static create(
    first?: SimplifyFlat<TOptions> | TTupleItems | AnyTType,
    second?: SimplifyFlat<TOptions> | AnyTType | TTupleItems,
    third?: SimplifyFlat<TOptions> | AnyTType,
    fourth?: SimplifyFlat<TOptions>
  ):
    | TFunction<AnyTType, TTuple<TTupleItems, TUnknown>, AnyTType>
    | TFunction<TAny, TTuple<TTupleItems, TUnknown>, AnyTType> {
    if (first && first instanceof TType && second && isArray(second) && third && third instanceof TType) {
      return new TFunction({
        typeName: TTypeName.Function,
        thisType: first,
        parameters: TTuple.create(second).rest(TUnknown.create()),
        returnType: third,
        options: { ...fourth },
      })
    }

    if (first && isArray(first) && (!second || !(second instanceof TType || Array.isArray(second)))) {
      return new TFunction({
        typeName: TTypeName.Function,
        thisType: TAny.create(),
        parameters: TTuple.create(first).rest(TUnknown.create()),
        returnType: TUnknown.create(),
        options: { ...(second as TOptions) },
      })
    }

    return new TFunction({
      typeName: TTypeName.Function,
      thisType: TAny.create(),
      parameters: TTuple.create([]).rest(TUnknown.create()),
      returnType: TUnknown.create(),
      options: { ...(first as TOptions) },
    })
  }
}

export type AnyTFunction = TFunction<AnyTType, TTuple<TTupleItems, AnyTType>, AnyTType>

/* -------------------------------------------------- TUnwrappable -------------------------------------------------- */

export type UnwrapDeep<T extends AnyTType, TN extends TTypeName> = T extends {
  readonly typeName: TN
  readonly underlying: infer U extends AnyTType
}
  ? UnwrapDeep<U, TN>
  : T

export interface TUnwrappable<T extends AnyTType> extends AnyTType {
  readonly underlying: T
  unwrap(): T
  unwrapDeep(): UnwrapDeep<T, this['typeName']>
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TOptional                                                     */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TOptionalDef<T extends AnyTType> extends TDef {
  readonly typeName: TTypeName.Optional
  readonly underlying: T
}

export class TOptional<T extends AnyTType>
  extends TType<OutputOf<T> | undefined, TOptionalDef<T>, InputOf<T> | undefined>
  implements TUnwrappable<T>
{
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return ctx.data === undefined
      ? OK(undefined)
      : this._def.underlying._parse(ctx.child(this._def.underlying, ctx.data))
  }

  get underlying(): T {
    return this._def.underlying
  }

  unwrap(): T {
    return this.underlying
  }

  unwrapDeep(): UnwrapDeep<T, TTypeName.Optional> {
    return (this.underlying instanceof TOptional ? this.underlying.unwrapDeep() : this.underlying) as UnwrapDeep<
      T,
      TTypeName.Optional
    >
  }

  unwrapNullishDeep(): UnwrapDeep<T, TTypeName.Optional | TTypeName.Nullable> {
    return (
      this.underlying instanceof TOptional || this.underlying instanceof TNullable
        ? this.underlying.unwrapNullishDeep()
        : this.underlying
    ) as UnwrapDeep<T, TTypeName.Optional | TTypeName.Nullable>
  }

  static create<T extends AnyTType>(underlying: T, options?: SimplifyFlat<TOptions>): TOptional<T> {
    return new TOptional({ typeName: TTypeName.Optional, underlying, options: { ...options }, isOptional: true })
  }
}

export type AnyTOptional = TOptional<AnyTType>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TNullable                                                     */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TNullableDef<T extends AnyTType> extends TDef {
  readonly typeName: TTypeName.Nullable

  readonly underlying: T
}

export class TNullable<T extends AnyTType>
  extends TType<OutputOf<T> | null, TNullableDef<T>, InputOf<T> | null>
  implements TUnwrappable<T>
{
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return ctx.data === null ? OK(null) : this._def.underlying._parse(ctx.child(this._def.underlying, ctx.data))
  }

  get underlying(): T {
    return this._def.underlying
  }

  unwrap(): T {
    return this.underlying
  }

  unwrapDeep(): UnwrapDeep<T, TTypeName.Nullable> {
    return (this.underlying instanceof TNullable ? this.underlying.unwrapDeep() : this.underlying) as UnwrapDeep<
      T,
      TTypeName.Nullable
    >
  }

  unwrapNullishDeep(): UnwrapDeep<T, TTypeName.Optional | TTypeName.Nullable> {
    return (
      this.underlying instanceof TOptional || this.underlying instanceof TNullable
        ? this.underlying.unwrapNullishDeep()
        : this.underlying
    ) as UnwrapDeep<T, TTypeName.Optional | TTypeName.Nullable>
  }

  static create<T extends AnyTType>(underlying: T, options?: SimplifyFlat<TOptions>): TNullable<T> {
    return new TNullable({ typeName: TTypeName.Nullable, underlying, options: { ...options }, isNullable: true })
  }
}

export type AnyTNullable = TNullable<AnyTType>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TDefined                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TDefinedDef<T extends AnyTType> extends TDef {
  readonly typeName: TTypeName.Defined
  readonly underlying: T
}

export class TDefined<T extends AnyTType>
  extends TType<Defined<OutputOf<T>>, TDefinedDef<T>, Defined<InputOf<T>>>
  implements TUnwrappable<T>
{
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return ctx.data === undefined
      ? ctx.addIssue({ kind: TIssueKind.Required }, this._def.options.messages?.required).abort()
      : (this._def.underlying._parse(ctx.child(this._def.underlying, ctx.data)) as ParseResultOf<this>)
  }

  get underlying(): T {
    return this._def.underlying
  }

  unwrap(): T {
    return this.underlying
  }

  unwrapDeep(): UnwrapDeep<T, TTypeName.Defined> {
    return (this.underlying instanceof TDefined ? this.underlying.unwrapDeep() : this.underlying) as UnwrapDeep<
      T,
      TTypeName.Defined
    >
  }

  static create<T extends AnyTType>(underlying: T, options?: SimplifyFlat<TOptions>): TDefined<T> {
    return new TDefined({ typeName: TTypeName.Defined, underlying, options: { ...options }, isOptional: false })
  }
}

export type AnyTDefined = TDefined<AnyTType>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TPromise                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TPromiseDef<T extends AnyTType> extends TDef {
  readonly typeName: TTypeName.Promise
  readonly underlying: T
}

export class TPromise<T extends AnyTType> extends TType<Promise<OutputOf<T>>, TPromiseDef<T>, Promise<InputOf<T>>> {
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (!isAsync(ctx.data) && !ctx.isAsync()) {
      return ctx.invalidType({ expected: TParsedType.Promise }).abort()
    }

    return OK(
      (isAsync(ctx.data) ? ctx.data : Promise.resolve(ctx.data)).then(async (awaited) =>
        this.underlying.parseAsync(awaited)
      )
    )
  }

  get underlying(): T {
    return this._def.underlying
  }

  unwrap(): T {
    return this.underlying
  }

  unwrapDeep(): UnwrapDeep<T, TTypeName.Promise> {
    return (this.underlying instanceof TPromise ? this.underlying.unwrapDeep() : this.underlying) as UnwrapDeep<
      T,
      TTypeName.Promise
    >
  }

  static create<T extends AnyTType>(underlying: T, options?: SimplifyFlat<TOptions>): TPromise<T> {
    return new TPromise({ typeName: TTypeName.Promise, underlying, options: { ...options } })
  }
}

export type AnyTPromise = TPromise<AnyTType>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TReadonly                                                     */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TReadonlyIO<T> = T extends ReadonlyMap<infer K, infer V>
  ? ReadonlyMap<K, V>
  : T extends ReadonlySet<infer U>
  ? ReadonlySet<U>
  : T extends readonly unknown[]
  ? Readonly<T>
  : T extends BuiltIn
  ? T
  : { readonly [K in keyof T]: T[K] }

export interface TReadonlyDef<T extends AnyTType> extends TDef {
  readonly typeName: TTypeName.Readonly
  readonly underlying: T
}

export class TReadonly<T extends AnyTType>
  extends TType<TReadonlyIO<OutputOf<T>>, TReadonlyDef<T>, TReadonlyIO<InputOf<T>>>
  implements TUnwrappable<T>
{
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return this._def.underlying._parse(ctx.child(this._def.underlying, ctx.data)) as ParseResultOf<this>
  }

  get underlying(): T {
    return this._def.underlying
  }

  unwrap(): T {
    return this.underlying
  }

  unwrapDeep(): UnwrapDeep<T, TTypeName.Readonly> {
    return (this.underlying instanceof TReadonly ? this.underlying.unwrapDeep() : this.underlying) as UnwrapDeep<
      T,
      TTypeName.Readonly
    >
  }

  static create<T extends AnyTType>(underlying: T, options?: SimplifyFlat<TOptions>): TReadonly<T> {
    return new TReadonly({ typeName: TTypeName.Readonly, underlying, options: { ...options }, isReadonly: true })
  }
}

export type AnyTReadonly = TReadonly<AnyTType>

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
    options?: SimplifyFlat<TOptions>
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
    options?: SimplifyFlat<TOptions>
  ): TDefault<T, D>
  static create<T extends AnyTType, D extends Defined<OutputOf<T>>>(
    underlying: T,
    getDefault: () => D,
    options?: SimplifyFlat<TOptions>
  ): TDefault<T, D>
  static create<T extends AnyTType, D extends Defined<OutputOf<T>>>(
    underlying: T,
    defaultValueOrGetter: D | (() => D),
    options?: SimplifyFlat<TOptions>
  ): TDefault<T, D>
  static create<T extends AnyTType, D extends Defined<OutputOf<T>>>(
    underlying: T,
    defaultValueOrGetter: D | (() => D),
    options?: SimplifyFlat<TOptions>
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
      ? result.then((res) => OK(res.ok ? res.data : this.getCatch()))
      : OK(result.ok ? result.data : this.getCatch())
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
    options?: SimplifyFlat<TOptions>
  ): TCatch<T, C>
  static create<T extends AnyTType, C extends OutputOf<T>>(
    underlying: T,
    getCatch: () => C,
    options?: SimplifyFlat<TOptions>
  ): TCatch<T, C>
  static create<T extends AnyTType, C extends OutputOf<T>>(
    underlying: T,
    catchValueOrGetter: C | (() => C),
    options?: SimplifyFlat<TOptions>
  ): TCatch<T, C>
  static create<T extends AnyTType, C extends OutputOf<T>>(
    underlying: T,
    catchValueOrGetter: C | (() => C),
    options?: SimplifyFlat<TOptions>
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
/*                                                        TLazy                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TLazyDef<T extends AnyTType> extends TDef {
  readonly typeName: TTypeName.Lazy
  readonly getType: () => T
}

export class TLazy<T extends AnyTType> extends TType<OutputOf<T>, TLazyDef<T>, InputOf<T>> implements TUnwrappable<T> {
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    const type = this.underlying
    return type._parse(ctx.child(type, ctx.data))
  }

  get underlying(): T {
    return this._def.getType()
  }

  unwrap(): T {
    return this.underlying
  }

  unwrapDeep(): UnwrapDeep<T, TTypeName.Lazy> {
    return (this.underlying instanceof TLazy ? this.underlying.unwrapDeep() : this.underlying) as UnwrapDeep<
      T,
      TTypeName.Lazy
    >
  }

  static create<T extends AnyTType>(factory: () => T, options?: SimplifyFlat<TOptions>): TLazy<T> {
    return new TLazy({ typeName: TTypeName.Lazy, getType: factory, options: { ...options } })
  }
}

export type AnyTLazy = TLazy<AnyTType>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TUnion                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TUnionOptions = TOptions<{
  additionalIssueKind: TIssueKind.InvalidUnion
}>

export interface TUnionDef<T extends readonly AnyTType[]> extends TDef {
  readonly typeName: TTypeName.Union
  readonly options: TUnionOptions
  readonly members: T
}

export class TUnion<T extends readonly AnyTType[]> extends TType<
  OutputOf<T[number]>,
  TUnionDef<T>,
  InputOf<T[number]>
> {
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    const { members } = this._def

    const handleResults = (results: Array<SyncParseResultOf<T[number]>>): ParseResultOf<this> => {
      const issues = []

      for (const result of results) {
        if (result.ok) {
          return result
        }

        issues.push(...result.error.issues)
      }

      return ctx
        .addIssue({ kind: TIssueKind.InvalidUnion, payload: { issues } }, this._def.options.messages?.invalidUnion)
        .abort()
    }

    if (ctx.isAsync()) {
      return Promise.all(members.map(async (type) => type._parseAsync(ctx.clone(type, ctx.data)))).then(handleResults)
    }

    return handleResults(members.map((type) => type._parseSync(ctx.clone(type, ctx.data))))
  }

  get members(): T {
    return this._def.members
  }

  get alternatives(): T {
    return this.members
  }

  static create<T extends readonly [AnyTType, AnyTType, ...AnyTType[]]>(
    alternatives: T,
    options?: SimplifyFlat<TOptions>
  ): TUnion<T> {
    return new TUnion({ typeName: TTypeName.Union, members: alternatives, options: { ...options } })
  }
}

export type AnyTUnion = TUnion<readonly AnyTType[]>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                    TIntersection                                                   */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TIntersectionOptions = TOptions<{
  additionalIssueKind: TIssueKind.InvalidIntersection
}>

export interface TIntersectionDef<T extends readonly AnyTType[]> extends TDef {
  readonly typeName: TTypeName.Intersection
  readonly options: TIntersectionOptions
  readonly members: T
}

export const intersect = <A, B>(
  a: A,
  b: B
): { readonly ok: true; readonly data: A & B } | { readonly ok: false; readonly data?: never } => {
  // @ts-expect-error This comparison appears to be unintentional because the types 'A' and 'B' have no overlap.
  if (a === b) {
    return { ok: true, data: a }
  }

  const aType = getParsedType(a)
  const bType = getParsedType(b)

  if (aType === TParsedType.Object && bType === TParsedType.Object) {
    const a_ = a as Record<string, unknown>
    const b_ = b as Record<string, unknown>

    const bKeys = Object.keys(b_)
    const sharedKeys = Object.keys(a_).filter((key) => bKeys.includes(key))

    const merged: Record<string, unknown> = {}

    for (const key of sharedKeys) {
      const sharedResult = intersect(a_[key], b_[key])

      if (!sharedResult.ok) {
        return { ok: false }
      }

      merged[key] = sharedResult.data
    }

    return { ok: true, data: merged as A & B }
  }

  if (aType === TParsedType.Array && bType === TParsedType.Array) {
    const a_ = a as unknown[]
    const b_ = b as unknown[]

    if (a_.length !== b_.length) {
      return { ok: false }
    }

    const merged: unknown[] = []

    for (let i = 0; i < a_.length; i++) {
      const sharedResult = intersect(a_[i], b_[i])

      if (!sharedResult.ok) {
        return { ok: false }
      }

      merged[i] = sharedResult.data
    }

    return { ok: true, data: merged as A & B }
  }

  if (aType === TParsedType.Date && bType === TParsedType.Date && Number(a) === Number(b)) {
    return { ok: true, data: a as A & B }
  }

  return { ok: false }
}

export class TIntersection<T extends readonly AnyTType[]> extends TType<
  UnionToIntersection<OutputOf<T[number]>>,
  TIntersectionDef<T>,
  UnionToIntersection<InputOf<T[number]>>
> {
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    const { members } = this._def

    const handleResults = (results: Array<SyncParseResultOf<T[number]>>): ParseResultOf<this> => {
      if (!results[0]?.ok || !results[1]?.ok) {
        return ctx
          .addIssue({ kind: TIssueKind.InvalidIntersection }, this._def.options.messages?.invalidIntersection)
          .abort()
      }

      const intersection = intersect(results[0].data, results[1].data)
      if (!intersection.ok) {
        return ctx
          .addIssue({ kind: TIssueKind.InvalidIntersection }, this._def.options.messages?.invalidIntersection)
          .abort()
      }

      const next = results[2]
      if (!next) {
        return OK(intersection.data as OutputOf<this>)
      }

      if (!next.ok) {
        return ctx
          .addIssue({ kind: TIssueKind.InvalidIntersection }, this._def.options.messages?.invalidIntersection)
          .abort()
      }

      return handleResults([intersection, ...results.slice(1)])
    }

    if (ctx.isAsync()) {
      return Promise.all(members.map(async (type) => type._parseAsync(ctx.clone(type, ctx.data)))).then(handleResults)
    }

    return handleResults(members.map((type) => type._parseSync(ctx.clone(type, ctx.data))))
  }

  get members(): T {
    return this._def.members
  }

  get intersectees(): T {
    return this.members
  }

  static create<T extends readonly [AnyTType, AnyTType, ...AnyTType[]]>(
    intersectees: T,
    options?: SimplifyFlat<TOptions>
  ): TIntersection<T> {
    return new TIntersection({ typeName: TTypeName.Intersection, members: intersectees, options: { ...options } })
  }
}

export type AnyTIntersection = TIntersection<readonly AnyTType[]>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TPipeline                                                     */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TPipelineDef<A extends AnyTType, B extends AnyTType> extends TDef {
  readonly typeName: TTypeName.Pipeline
  readonly from: A
  readonly to: B
}

export class TPipeline<A extends AnyTType, B extends AnyTType> extends TType<
  OutputOf<B>,
  TPipelineDef<A, B>,
  InputOf<A>
> {
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    const { from, to } = this._def

    if (ctx.common.async) {
      return Promise.resolve().then(async () => {
        const fromResult = await from._parseAsync(ctx.child(from, ctx.data))
        if (!fromResult.ok) {
          return fromResult
        }

        return to._parseAsync(ctx.child(to, fromResult.data))
      })
    }

    const fromResult = from._parseSync(ctx.child(from, ctx.data))
    if (!fromResult.ok) {
      return fromResult
    }

    return to._parseSync(ctx.child(to, fromResult.data))
  }

  get from(): A {
    return this._def.from
  }

  get to(): B {
    return this._def.to
  }

  static create<T, TU, U, A extends AnyTType<TU, T>, B extends AnyTType<U, TU>>(
    from: A,
    to: B,
    options?: SimplifyFlat<TOptions>
  ): TPipeline<A, B> {
    return new TPipeline({ typeName: TTypeName.Pipeline, from, to, options: { ...options } })
  }
}

export type AnyTPipeline = TPipeline<AnyTType, AnyTType>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                     TInstanceOf                                                    */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TInstanceOfOptions = TOptions<{
  additionalIssueKind: TIssueKind.InvalidInstance
}>

export interface TInstanceOfDef<T extends Ctor> extends TDef {
  readonly typeName: TTypeName.InstanceOf
  readonly options: TInstanceOfOptions
  readonly cls: T
}

export class TInstanceOf<T extends Ctor> extends TType<InstanceType<T>, TInstanceOfDef<T>> {
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    const { cls } = this._def

    if (ctx.data instanceof cls) {
      return OK(ctx.data)
    }

    return ctx
      .addIssue(
        { kind: TIssueKind.InvalidInstance, payload: { expected: cls.name } },
        this._def.options.messages?.invalidInstance
      )
      .abort()
  }

  get cls(): T {
    return this._def.cls
  }

  static create<T extends Ctor>(cls: T, options?: SimplifyFlat<TInstanceOfOptions>): TInstanceOf<T> {
    return new TInstanceOf({ typeName: TTypeName.InstanceOf, cls, options: { ...options } })
  }
}

export type AnyTInstanceOf = TInstanceOf<Ctor>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                    TPropertyKey                                                    */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TPropertyKeyDef extends TDef {
  readonly typeName: TTypeName.PropertyKey
}

export class TPropertyKey extends TType<PropertyKey, TPropertyKeyDef> {
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return typeof ctx.data === 'string' || typeof ctx.data === 'number' || typeof ctx.data === 'symbol'
      ? OK(ctx.data)
      : ctx.invalidType({ expected: TParsedType.PropertyKey }).abort()
  }

  static create(options?: SimplifyFlat<TOptions>): TPropertyKey {
    return new TPropertyKey({ typeName: TTypeName.PropertyKey, options: { ...options } })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                     TPrimitive                                                     */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TPrimitiveDef extends TDef {
  readonly typeName: TTypeName.Primitive
}

export class TPrimitive extends TType<Primitive, TPrimitiveDef> {
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return ctx.data === null ||
      ctx.data === undefined ||
      typeof ctx.data === 'string' ||
      typeof ctx.data === 'number' ||
      typeof ctx.data === 'boolean' ||
      typeof ctx.data === 'symbol' ||
      typeof ctx.data === 'bigint'
      ? OK(ctx.data)
      : ctx.invalidType({ expected: TParsedType.Primitive }).abort()
  }

  static create(options?: SimplifyFlat<TOptions>): TPrimitive {
    return new TPrimitive({ typeName: TTypeName.Primitive, options: { ...options } })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TFalsy                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TFalsyDef extends TDef {
  readonly typeName: TTypeName.Falsy
}

export class TFalsy extends TType<false | '' | 0 | null | undefined, TFalsyDef> {
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return ctx.data === false || ctx.data === '' || ctx.data === 0 || ctx.data === null || ctx.data === undefined
      ? OK(ctx.data)
      : ctx.invalidType({ expected: TParsedType.Falsy }).abort()
  }

  static create(options?: SimplifyFlat<TOptions>): TFalsy {
    return new TFalsy({ typeName: TTypeName.Falsy, options: { ...options } })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TRef                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TRefContext = TObjectShape | TTupleItems

type TuplePaths<T extends TTupleItems> = ConditionalOmit<
  OmitIndexSignature<{ [K in keyof T as `${K & number}` extends `${number}` ? K : never]: K }>,
  never
> extends infer X
  ? {
      [K in keyof X]: K extends infer K_ extends string
        ?
            | `[${K_}]`
            | `.${K_}`
            | (K_ extends keyof T
                ? T[K_] extends TObject<infer S>
                  ? `${`[${K_}]` | `.${K_}`}.${ObjectShapePaths<S>}`
                  : T[K_] extends TTuple<infer I>
                  ? `${`[${K_}]` | `.${K_}`}${TuplePaths<I>}`
                  : never
                : never)
        : never
    }[keyof X]
  : never

export type ObjectShapePaths<T extends TObjectShape> = {
  [K in keyof T]:
    | K
    | (T[K] extends TObject<infer S>
        ? `${K & string}.${ObjectShapePaths<S>}`
        : T[K] extends TTuple<infer I>
        ? `${K & string}${TuplePaths<I>}`
        : never)
}[keyof T] &
  string

export type AssertTType<T> = T extends AnyTType ? T : never

export type _ReachSchema<R extends string, Ctx extends TRefContext> = Replace<
  Replace<R, '[', '.', { all: true }>,
  ']',
  '.',
  { all: true }
> extends infer R_ extends string
  ? R_ | CastToNumber<R_> extends keyof Ctx
    ? Ctx[R_ & keyof Ctx]
    : R_ extends `${infer Left}${'.'}${infer Right}`
    ? Left extends keyof Ctx
      ? Right extends ''
        ? Ctx[Left]
        : Ctx[Left] extends TObject<infer S>
        ? _ReachSchema<Right, S>
        : Ctx[Left] extends TTuple<infer I>
        ? _ReachSchema<Right, I>
        : Ctx[Left]
      : never
    : never
  : never

export type ReachSchema<R extends string, Ctx extends TRefContext> = AssertTType<_ReachSchema<R, Ctx>>

export interface TRefDef<R extends string, Ctx extends TRefContext | undefined> extends TDef {
  readonly typeName: TTypeName.Ref
  readonly $ref: R
  readonly $ctx: Ctx
}

export class TRef<R extends string, Ctx extends TRefContext | undefined> extends TType<
  OutputOf<ReachSchema<R, NonNullable<Ctx>>>,
  TRefDef<R, Ctx>,
  InputOf<ReachSchema<R, NonNullable<Ctx>>>
> {
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    const underlying = this._resolve()
    return underlying._parse(ctx.child(underlying, ctx.data))
  }

  get $ref(): R {
    return this._def.$ref
  }

  _contextualize<C extends TRefContext>(ctx: C): TRef<R, C> {
    return new TRef({ ...this._def, $ctx: ctx })
  }

  _resolve(): AnyTType {
    const { $ref, $ctx } = this._def

    if (!$ctx) {
      throw new Error(`Unable to resolve path for $ref: ${$ref}`)
    }

    const path = String($ref)
      .split(/[.[\]]/g)
      .filter(Boolean)

    let current = $ctx[(Number.isNaN(Number(path[0])) ? path[0] : Number(path[0])) as keyof TRefContext] as AnyTType

    for (const p of path.slice(1)) {
      const numeric = Number(p)

      if (Number.isNaN(numeric)) {
        if (current.isT(TTypeName.Object)) {
          current = current.shape[p]
        } else if (current.isT(TTypeName.Union)) {
          const next = current.members.find((m) => m.isT(TTypeName.Object) && p in m.shape)
          if (!next) {
            throw new Error(`Unable to resolve path for $ref: ${$ref}`)
          }

          current = next
        } else {
          throw new Error(`Unable to resolve path for $ref: ${$ref}`)
        }
      } else if (current.isT(TTypeName.Tuple)) {
        current = current.items[numeric]
      } else {
        throw new Error(`Unable to resolve path for $ref: ${$ref}`)
      }
    }

    return current.clone()
  }

  static create<R extends string>(ref: R): TRef<R, undefined> {
    return new TRef({ typeName: TTypeName.Ref, $ref: ref, $ctx: undefined, options: {} })
  }
}

export type AnyTRef = TRef<string, TRefContext | undefined>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TCoerce                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export const coerce = {
  boolean: <T extends Exclude<TBooleanCoercion, false> = true>(
    coercion = true as Narrow<T>,
    ...args: Parameters<typeof TBoolean.create>
  ): TBoolean<T> => TBoolean.create(...args).coerce(coercion),
  bigint: (...args: Parameters<typeof TBigInt.create>): TBigInt<true> => TBigInt.create(...args).coerce(),
  date: (...args: Parameters<typeof TDate.create>): TDate<true> => TDate.create(...args).coerce(),
  string: (...args: Parameters<typeof TString.create>): TString<[], true> => TString.create(...args).coerce(),
  number: (...args: Parameters<typeof TNumber.create>): TNumber<true> => TNumber.create(...args).coerce(),
}

/* ---------------------------------------------------- External ---------------------------------------------------- */

export const anyType = TAny.create
export const arrayType = TArray.create
export const bigintType = TBigInt.create
export const booleanType = TBoolean.create
export const brandType = TBrand.create
export const bufferType = TBuffer.create
export const catchType = TCatch.create
export const dateType = TDate.create
export const defaultType = TDefault.create
export const enumType = TEnum.create
export const falseType = TFalse.create
export const falsyType = TFalsy.create
export const functionType = TFunction.create
export const instanceofType = TInstanceOf.create
export const intersectionType = TIntersection.create
export const lazyType = TLazy.create
export const literalType = TLiteral.create
export const mapType = TMap.create
export const nanType = TNaN.create
export const nativeEnumType = TNativeEnum.create
export const neverType = TNever.create
export const nullableType = TNullable.create
export const nullType = TNull.create
export const numberType = TNumber.create
export const objectType = TObject.create
export const optionalType = TOptional.create
export const pipelineType = TPipeline.create
export const primitiveType = TPrimitive.create
export const promiseType = TPromise.create
export const propertykeyType = TPropertyKey.create
export const recordType = TRecord.create
export const refType = TRef.create
export const requiredType = TDefined.create
export const setType = TSet.create
export const stringType = TString.create
export const symbolType = TSymbol.create
export const trueType = TTrue.create
export const tupleType = TTuple.create
export const undefinedType = TUndefined.create
export const unionType = TUnion.create
export const unknownType = TUnknown.create
export const voidType = TVoid.create

export const global = getGlobal

export {
  anyType as any,
  arrayType as array,
  bigintType as bigint,
  booleanType as bool,
  booleanType as boolean,
  brandType as brand,
  bufferType as binary,
  bufferType as buffer,
  catchType as catch,
  dateType as date,
  enumType as enum,
  falseType as false,
  falsyType as falsy,
  functionType as fn,
  functionType as function,
  instanceofType as instanceof,
  intersectionType as intersection,
  lazyType as lazy,
  literalType as literal,
  mapType as map,
  nanType as nan,
  nativeEnumType as nativeEnum,
  neverType as never,
  nullableType as nullable,
  nullType as null,
  numberType as number,
  objectType as object,
  optionalType as optional,
  pipelineType as pipe,
  pipelineType as pipeline,
  primitiveType as primitive,
  promiseType as promise,
  propertykeyType as propertykey,
  recordType as record,
  refType as ref,
  requiredType as required,
  setType as set,
  stringType as string,
  symbolType as symbol,
  trueType as true,
  tupleType as tuple,
  undefinedType as undefined,
  unionType as union,
  unknownType as unknown,
  voidType as void,
}

export type output<T extends AnyTType> = SimplifyDeep<OutputOf<T>>
export type input<T extends AnyTType> = SimplifyDeep<InputOf<T>>
export type infer<T extends AnyTType> = output<T>
