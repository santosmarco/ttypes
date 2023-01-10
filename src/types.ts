import memoize from 'micro-memoize'
import { nanoid } from 'nanoid'
import type {
  Abs,
  Add,
  Divide,
  Eq,
  Gt,
  GtOrEq,
  IsNegative,
  IsPositive,
  Lt,
  LtOrEq,
  Mod,
  Multiply,
  Negate,
  Pow,
  Subtract,
} from 'ts-arithmetic'
import validator from 'validator'
import {
  AsyncParseContext,
  IssueKind,
  OK,
  SyncParseContext,
  TChecks,
  TError,
  TManifest,
  TParsedType,
  TShow,
  TTypeName,
  arrayUtils,
  cloneUtils,
  getGlobal,
  isAsync,
  isFunction,
  objectUtils,
  stringUtils,
  type AsyncParseResultOf,
  type BuiltIn,
  type Ctor,
  type CustomIssue,
  type Defined,
  type EIssueKind,
  type InvalidBigIntIssue,
  type InvalidBufferIssue,
  type InvalidDateIssue,
  type InvalidNumberIssue,
  type InvalidStringIssue,
  type LiteralUnion,
  type Narrow,
  type NonNegative,
  type NonNegativeInteger,
  type Numeric,
  type ParseContext,
  type ParseContextOf,
  type ParseOptions,
  type ParsePath,
  type ParseResult,
  type ParseResultOf,
  type Primitive,
  type SimplifyDeep,
  type SyncParseResultOf,
  type TDef,
  type TIssue,
  type TOptions,
  type TTypeNameMap,
  type ToBoolean,
  type ToChecks,
  type ToNumber,
  type UnionToIntersection,
  type typeUtils,
} from './_internal'

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TType                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export abstract class TType<O = unknown, D extends TDef = TDef, I = O> {
  declare readonly $O: O
  declare readonly $I: I

  readonly _def: D

  abstract _parse(ctx: ParseContextOf<this>): ParseResultOf<this>
  abstract get _manifest(): TManifest<O>

  protected constructor(def: D) {
    this._def = cloneUtils.cloneDeep(def)

    this._parse = memoize(this._parse.bind(this))
    this._parseSync = this._parseSync.bind(this)
    this._parseAsync = this._parseAsync.bind(this)
    this.parse = this.parse.bind(this)
    this.safeParse = this.safeParse.bind(this)
    this.parseAsync = this.parseAsync.bind(this)
    this.safeParseAsync = this.safeParseAsync.bind(this)
    this.guard = this.guard.bind(this)
    this.assert = this.assert.bind(this)
    this.clone = this.clone.bind(this)
    this.options = this.options.bind(this)
    this.manifest = this.manifest.bind(this)
    this.optional = this.optional.bind(this)
    this.nullable = this.nullable.bind(this)
    this.nullish = this.nullish.bind(this)
    this.defined = this.defined.bind(this)
    this.readonly = this.readonly.bind(this)
    this.array = this.array.bind(this)
    this.record = this.record.bind(this)
    this.promise = this.promise.bind(this)
    this.or = this.or.bind(this)
    this.and = this.and.bind(this)
    this.brand = this.brand.bind(this)
    this.default = this.default.bind(this)
    this.catch = this.catch.bind(this)
    this.lazy = this.lazy.bind(this)
    this.pipe = this.pipe.bind(this)
    this.preprocess = this.preprocess.bind(this)
    this.refine = this.refine.bind(this)
    this.superRefine = this.superRefine.bind(this)
    this.transform = this.transform.bind(this)
    this.isT = this.isT.bind(this)

    objectUtils
      .keys(this)
      .forEach((k) => Object.defineProperty(this, k, { enumerable: !/^(?:_|\$)\w*/.exec(String(k)) }))
  }

  readonly id: string = nanoid()

  get typeName(): D['typeName'] {
    return this._def.typeName
  }

  clone(): this {
    return this._construct()
  }

  get hint(): string {
    const uncolored = TShow(this)
    const { colorsEnabled } = { ...getGlobal().getOptions(), ...this._def.options }
    return colorsEnabled ? TShow.colorize(uncolored) : uncolored
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

  parse(data: unknown, options?: typeUtils.SimplifyFlat<ParseOptions>): OutputOf<this> {
    const result = this.safeParse(data, options)
    if (!result.ok) {
      throw result.error
    }

    return result.data
  }

  safeParse(data: unknown, options?: typeUtils.SimplifyFlat<ParseOptions>): SyncParseResultOf<this> {
    const ctx = SyncParseContext.of(this, data, options)
    const result = this._parseSync(ctx)
    return result
  }

  async parseAsync(data: unknown, options?: typeUtils.SimplifyFlat<ParseOptions>): Promise<OutputOf<this>> {
    const result = await this.safeParseAsync(data, options)
    if (!result.ok) {
      throw result.error
    }

    return result.data
  }

  async safeParseAsync(data: unknown, options?: typeUtils.SimplifyFlat<ParseOptions>): AsyncParseResultOf<this> {
    const ctx = AsyncParseContext.of(this, data, options)
    const result = this._parseAsync(ctx)
    return result
  }

  guard(data: unknown, options?: typeUtils.SimplifyFlat<ParseOptions>): data is O {
    return this.safeParse(data, options).ok
  }

  assert(data: unknown, options?: typeUtils.SimplifyFlat<ParseOptions>): asserts data is O {
    this.parse(data, options)
  }

  /* ----------------------------------------------- Options/Manifest ----------------------------------------------- */

  options(options: D['options']): this {
    return this._construct({ ...this._def, options: { ...this._def.options, ...options } })
  }

  manifest(): TManifest.Final<this>
  manifest(manifest: TManifest.Public<this>): this
  manifest(maybeManifest?: TManifest.Public<this>): TManifest.Final<this> | this {
    if (!maybeManifest) {
      const { type, required, nullable, readonly, ...main } = { ...this._def.manifest, ...this._manifest }

      return cloneUtils.cloneDeep({
        typeName: this.typeName,
        type,
        ...main,
        required,
        nullable,
        readonly,
      }) as TManifest.Final<this>
    }

    return this._construct({ ...this._def, manifest: { ...this.manifest(), ...maybeManifest } })
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

  record(): TRecord<TString, this> {
    return TRecord.create(this, this._def.options)
  }

  promise(): TPromise<this> {
    return TPromise.create(this, this._def.options)
  }

  or<T extends readonly [AnyTType, ...AnyTType[]]>(
    ...alternatives: T
  ): TUnion<[this, arrayUtils.Head<T>, ...arrayUtils.Tail<T>]> {
    return TUnion.create([this, arrayUtils.head(alternatives), ...arrayUtils.tail(alternatives)], this._def.options)
  }

  and<T extends readonly [AnyTType, ...AnyTType[]]>(
    ...intersectees: T
  ): TIntersection<[this, arrayUtils.Head<T>, ...arrayUtils.Tail<T>]> {
    return TIntersection.create(
      [this, arrayUtils.head(intersectees), ...arrayUtils.tail(intersectees)],
      this._def.options
    )
  }

  brand<B extends PropertyKey>(brand: B): TBrand<this, B> {
    return TBrand.create(this, brand, this._def.options)
  }

  default<D_ extends Defined<O>>(defaultValue: D_): TDefault<this, D_>
  default<D_ extends Defined<O>>(getDefault: () => D_): TDefault<this, D_>
  default<D_ extends Defined<O>>(defaultValueOrGetter: D_ | (() => D_)): TDefault<this, D_> {
    return TDefault.create(this, defaultValueOrGetter, this._def.options)
  }

  catch<C extends O>(catchValue: C): TCatch<this, C>
  catch<C extends O>(getCatch: () => C): TCatch<this, C>
  catch<C extends O>(catchValueOrGetter: C | (() => C)): TCatch<this, C> {
    return TCatch.create(this, catchValueOrGetter, this._def.options)
  }

  lazy(): TLazy<this> {
    return TLazy.create(() => this, this._def.options)
  }

  pipe<T extends AnyTType<unknown, I>>(type: T): TPipeline<this, T> {
    return TPipeline.create(this, type, this._def.options)
  }

  preprocess<I_ extends I>(preprocess: (data: unknown) => I_): TPreprocess<this, I_> {
    return TPreprocess.create(preprocess, this, this._def.options)
  }

  refine<O_ extends O>(refinement: (data: O) => data is O_, message?: RefinementMessage<this>): TRefinement<this, O_>
  refine(
    refinement: ((data: O) => boolean | Promise<boolean>) | ((data: O) => unknown),
    message?: RefinementMessage<this>
  ): TRefinement<this>
  refine(refinement: (data: O) => unknown, message?: RefinementMessage<this>): TRefinement<this> {
    return TRefinement.create(this, refinement, { ...this._def.options, refinementMessage: message })
  }

  superRefine<O_ extends O>(refinement: (data: O, ctx: EffectCtx<this>) => data is O_): TRefinement<this, O_>
  superRefine(
    refinement:
      | ((data: O, ctx: EffectCtx<this>) => boolean | Promise<boolean>)
      | ((data: O, ctx: EffectCtx<this>) => unknown)
  ): TRefinement<this>
  superRefine(refinement: (data: O, ctx: EffectCtx<this>) => unknown): TRefinement<this> {
    return TRefinement.create(this, refinement, this._def.options)
  }

  transform<O_>(transform: (data: O, ctx: EffectCtx<this>) => O_ | Promise<O_>): TTransform<this, O_> {
    return TTransform.create(this, transform, this._def.options)
  }

  /* ---------------------------------------------------- Checks ---------------------------------------------------- */

  get isOptional(): boolean {
    return !this.manifest().required
  }

  get isNullable(): boolean {
    return this.manifest().nullable
  }

  get isNullish(): boolean {
    return this.isOptional && this.isNullable
  }

  get isRequired(): boolean {
    return !this.isOptional
  }

  get isReadonly(): boolean {
    return this.manifest().readonly
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  isT<T extends readonly [TTypeName, ...TTypeName[]]>(...types: T): this is TTypeNameMap<T[number]> {
    return types.includes(this.typeName)
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  _construct(def?: D): this {
    return Reflect.construct<[def: D], this>(this.constructor as new (def: D) => this, [{ ...this._def, ...def }])
  }
}

export type AnyTType<O = unknown, I = unknown> = TType<O, TDef, I>

/* ------------------------------------------------------------------------------------------------------------------ */

export type OutputOf<T extends { readonly $O: unknown }> = T['$O']
export type InputOf<T extends { readonly $I: unknown }> = T['$I']
export type ManifestOf<T> = T extends AnyTType ? T['_manifest'] & { readonly typeName: T['typeName'] } : never

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TAny                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TAnyDef extends TDef {
  readonly typeName: TTypeName.Any
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class TAny extends TType<any, TAnyDef> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get _manifest(): TManifest<any> {
    return { ...TManifest.default(TParsedType.Any), required: false, nullable: true }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return OK(ctx.data)
  }

  static create(options?: typeUtils.SimplifyFlat<TOptions>): TAny {
    return new TAny({ typeName: TTypeName.Any, options: { ...options } })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TUnknown                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TUnknownDef extends TDef {
  readonly typeName: TTypeName.Unknown
}

export class TUnknown extends TType<unknown, TUnknownDef> {
  get _manifest(): TManifest {
    return { ...TManifest.default(TParsedType.Unknown), required: false, nullable: true }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return OK(ctx.data)
  }

  static create(options?: typeUtils.SimplifyFlat<TOptions>): TUnknown {
    return new TUnknown({ typeName: TTypeName.Unknown, options: { ...options } })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TString                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TStringTransform =
  | { readonly kind: 'trim' }
  | { readonly kind: 'lowercase' }
  | { readonly kind: 'uppercase' }
  | { readonly kind: 'capitalize' }
  | { readonly kind: 'uncapitalize' }
  | { readonly kind: 'replace'; readonly search: RegExp | string; readonly replace: string; readonly all?: boolean }

export type TStringTransformKind = TStringTransform['kind']

export type TStringOutput<T extends readonly TStringTransformKind[]> = T extends readonly []
  ? string
  : T extends readonly [infer H extends TStringTransformKind, ...infer R extends TStringTransformKind[]]
  ? H extends 'trim' | 'replace'
    ? TStringOutput<R>
    : {
        lowercase: Lowercase<TStringOutput<R>>
        uppercase: Uppercase<TStringOutput<R>>
        capitalize: Capitalize<TStringOutput<R>>
        uncapitalize: Uncapitalize<TStringOutput<R>>
      }[Exclude<H, 'trim' | 'replace'>]
  : never

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TStringInput<C extends boolean> = C extends true ? any : string

export interface TStringManifest<T extends string> extends TManifest<T> {
  readonly transforms: readonly TStringTransform[]
  readonly checks: ToChecks<InvalidStringIssue>
  readonly coerce: boolean
}

export interface TStringDef<C extends boolean> extends TDef {
  readonly typeName: TTypeName.String
  readonly transforms: readonly TStringTransform[]
  readonly checks: ToChecks<InvalidStringIssue>
  readonly coerce: C
}

export class TString<T extends readonly TStringTransformKind[] = [], C extends boolean = false> extends TType<
  TStringOutput<T>,
  TStringDef<C>,
  TStringInput<C>
> {
  get _manifest(): TStringManifest<TStringOutput<T>> {
    const { transforms, checks, coerce } = this._def
    return { ...TManifest.default(TParsedType.String), transforms, checks, coerce }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    const { transforms, checks, coerce } = this._def

    if (coerce) {
      ctx.setData(String(ctx.data))
    }

    if (typeof ctx.data !== 'string') {
      return ctx.invalidType({ expected: TParsedType.String }).abort()
    }

    for (const transform of transforms) {
      switch (transform.kind) {
        case 'trim':
          ctx.setData(ctx.data.trim())

          break
        case 'replace':
          if (typeof transform.search === 'string') {
            ctx.setData(
              transform.all
                ? stringUtils.replaceAll(ctx.data, transform.search, transform.replace)
                : stringUtils.replace(ctx.data, transform.search, transform.replace)
            )
          } else {
            ctx.setData(ctx.data.replace(transform.search, transform.replace))
          }

          break
        case 'lowercase':
        case 'uppercase':
        case 'capitalize':
        case 'uncapitalize':
          ctx.setData(stringUtils[transform.kind](ctx.data))

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
              IssueKind.InvalidString,
              { check: check.check, expected: check.expected, received: data.length },
              check.message
            )
            if (ctx.common.abortEarly) return ctx.abort()
          }

          break
        case 'max':
          if (check.expected.inclusive ? data.length > check.expected.value : data.length >= check.expected.value) {
            ctx.addIssue(
              IssueKind.InvalidString,
              { check: check.check, expected: check.expected, received: data.length },
              check.message
            )
            if (ctx.common.abortEarly) return ctx.abort()
          }

          break
        case 'length':
          if (data.length !== check.expected) {
            ctx.addIssue(
              IssueKind.InvalidString,
              { check: check.check, expected: check.expected, received: data.length },
              check.message
            )
            if (ctx.common.abortEarly) return ctx.abort()
          }

          break
        case 'pattern':
          if (
            {
              enforce: () => !check.pattern.test(data),
              disallow: () => check.pattern.test(data),
            }[check.options.type]()
          ) {
            ctx.addIssue(
              IssueKind.InvalidString,
              { check: check.check, pattern: check.pattern, options: check.options },
              check.message
            )
            if (ctx.common.abortEarly) return ctx.abort()
          }

          break
        case 'alphanum':
        case 'cuid':
        case 'uuid':
        case 'iso_duration':
          if (!TString._internals.re[check.check].test(data)) {
            ctx.addIssue(IssueKind.InvalidString, { check: check.check, received: data }, check.message)
            if (ctx.common.abortEarly) return ctx.abort()
          }

          break
        case 'iso_date':
          const validated = TString._internals.validators.isIsoDate(ctx.data)
          if (validated) {
            ctx.setData(validated)
          } else {
            ctx.addIssue(IssueKind.InvalidString, { check: check.check }, check.message)
            if (ctx.common.abortEarly) return ctx.abort()
          }

          break
        case 'email':
          if (!validator.isEmail(data, objectUtils.snakeCaseProperties(check.options))) {
            ctx.addIssue(IssueKind.InvalidString, { check: check.check, options: check.options }, check.message)
            if (ctx.common.abortEarly) return ctx.abort()
          }

          break
        case 'base64':
          if (
            !TString._internals.re[check.check][
              check.options.paddingRequired ? 'paddingRequired' : 'paddingNotRequired'
            ][check.options.urlSafe ? 'urlSafe' : 'urlUnsafe'].test(data)
          ) {
            ctx.addIssue(IssueKind.InvalidString, { check: check.check, options: check.options }, check.message)
            if (ctx.common.abortEarly) return ctx.abort()
          }

          break
        case 'url':
          try {
            // eslint-disable-next-line no-new
            new URL(data)
          } catch {
            ctx.addIssue(IssueKind.InvalidString, { check: check.check }, check.message)
            if (ctx.common.abortEarly) return ctx.abort()
          }

          break
        case 'starts_with':
          if (!data.startsWith(check.prefix)) {
            ctx.addIssue(IssueKind.InvalidString, { check: check.check, prefix: check.prefix }, check.message)
            if (ctx.common.abortEarly) return ctx.abort()
          }

          break
        case 'ends_with':
          if (!data.endsWith(check.suffix)) {
            ctx.addIssue(IssueKind.InvalidString, { check: check.check, suffix: check.suffix }, check.message)
            if (ctx.common.abortEarly) return ctx.abort()
          }

          break
        case 'contains':
          if (!data.includes(check.substring)) {
            ctx.addIssue(IssueKind.InvalidString, { check: check.check, substring: check.substring }, check.message)
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

  /**
   * Specifies the minimum length allowed for the string.
   *
   * > _This check removes the `length` check if it exists._
   *
   * @template V
   * @param {NonNegativeInteger<V>} value The minimum length allowed. Must be a non-negative integer.
   * @param {{ inclusive?: boolean; message?: string }} [options] Options for this check.
   * @param {boolean} [options.inclusive=true] Whether the requirement is inclusive or exclusive.
   * @param {string} [options.message] The error message to use if the check fails.
   * @returns {TString} A new instance of `TString` with the check added.
   */
  min<V extends number>(
    value: NonNegativeInteger<V>,
    options?: { readonly inclusive?: boolean; readonly message?: string }
  ): this {
    return this._checks.add(
      { check: 'min', expected: { value, inclusive: options?.inclusive ?? true }, message: options?.message },
      { remove: ['length'] }
    )
  }

  get minLength(): number | undefined {
    const min = this._checks.get('min')?.expected
    if (min) return min.inclusive ? min.value : min.value + 1
    return this._checks.get('length')?.expected
  }

  /**
   * Specifies the maximum length allowed for the string.
   *
   * > _This check removes the `length` check if it exists._
   *
   * @template V
   * @param {NonNegativeInteger<V>} value The maximum length allowed. Must be a non-negative integer.
   * @param {{ inclusive?: boolean; message?: string }} [options] Options for this check.
   * @param {boolean} [options.inclusive=true] Whether the requirement is inclusive or exclusive.
   * @param {string} [options.message] The error message to use if the check fails.
   * @returns {TString} A new instance of `TString` with the check added.
   */
  max<V extends number>(
    value: NonNegativeInteger<V>,
    options?: { readonly inclusive?: boolean; readonly message?: string }
  ): this {
    return this._checks.add(
      { check: 'max', expected: { value, inclusive: options?.inclusive ?? true }, message: options?.message },
      { remove: ['length'] }
    )
  }

  get maxLength(): number | undefined {
    const max = this._checks.get('max')?.expected
    if (max) return max.inclusive ? max.value : max.value - 1
    return this._checks.get('length')?.expected
  }

  /**
   * Specifies the exact length allowed for the string.
   *
   * > _This check removes both the `min` and `max` checks if they exist._
   *
   * @template L
   * @param {NonNegativeInteger<L>} length The required length. Must be a non-negative integer.
   * @param {{ message?: string }} [options] Options for this check.
   * @param {string} [options.message] The error message to use if the check fails.
   * @returns {TString} A new instance of `TString` with the check added.
   */
  length<L extends number>(length: NonNegativeInteger<L>, options?: { readonly message?: string }): this {
    return this._checks.add(
      { check: 'length', expected: length, message: options?.message },
      { remove: ['min', 'max'] }
    )
  }

  /* ------------------------------------------------ Pattern checks ------------------------------------------------ */

  /**
   * Specifies a regular expression that the string must or must not match.
   *
   * @param {RegExp} pattern The regular expression to match the string against.
   * @param {({ type?: 'enforce' | 'disallow'; name?: string; message?: string })} [options] Options for this check.
   * @param {('enforce'|'prevent')} [options.type='enforce'] Whether the string must or must not match the specified pattern.
   * - `'enforce'` - Input must match the pattern _(default)_.
   * - `'disallow'` - Input must **not** match the pattern.
   * @param {string} [options.name] A custom name for the pattern. Especially useful for showing in error messages. Defaults to a stringified version of the pattern.
   * @param {string} [options.message] The error message to use if the check fails.
   * @returns {TString} A new instance of `TString` with the check added.
   */
  pattern(
    pattern: RegExp,
    options?: { readonly type?: 'enforce' | 'disallow'; readonly name?: string; readonly message?: string }
  ): this {
    return this._checks.add(
      {
        check: 'pattern',
        pattern,
        options: { type: options?.type ?? 'enforce', name: options?.name ?? String(pattern) },
        message: options?.message,
      },
      { noReplace: true }
    )
  }

  /**
   * Specifies a regular expression that the string must or must not match.
   *
   * > _Alias for {@link TString.pattern|`TString.pattern`}._
   *
   * @param {RegExp} pattern The regular expression to match the string against.
   * @param {({ type?: 'enforce' | 'disallow'; name?: string; message?: string })} [options] Options for this check.
   * @param {('enforce'|'prevent')} [options.type='enforce'] Whether the string must or must not match the specified pattern.
   * - `'enforce'` - Input must match the pattern _(default)_.
   * - `'disallow'` - Input must **not** match the pattern.
   * @param {string} [options.name] A custom name for the pattern. Especially useful for showing in error messages. Defaults to a stringified version of the pattern.
   * @param {string} [options.message] The error message to use if the check fails.
   * @returns {TString} A new instance of `TString` with the check added.
   */
  regex(
    pattern: RegExp,
    options?: { readonly type?: 'enforce' | 'disallow'; readonly name?: string; readonly message?: string }
  ): this {
    return this.pattern(pattern, options)
  }

  /**
   * Specifies a regular expression that the string must **not** match.
   *
   * > _This is a shorthand for {@link TString.pattern|`TString.pattern`} with the `type` option set to `'disallow'`._
   *
   * @param {RegExp} pattern The regular expression to match the string against.
   * @param {({ name?: string; message?: string })} [options] Options for this check.
   * @param {string} [options.name] A custom name for the pattern. Especially useful for showing in error messages. Defaults to a stringified version of the pattern.
   * @param {string} [options.message] The error message to use if the check fails.
   * @returns {TString} A new instance of `TString` with the check added.
   */
  disallow(pattern: RegExp, options?: { readonly name?: string; readonly message?: string }): this {
    return this.pattern(pattern, { ...options, type: 'disallow' })
  }

  /**
   * Requires the string to be a valid email address.
   *
   * @param {*} [options] Options for this check.
   * @param {boolean} [options.allowDisplayName=false] Whether to match strings in the form of `Display Name <email-address>`. _Default: `false`._
   * @param {boolean} [options.requireDisplayName=false] Whether to **require** the string to be in the form of `Display Name <email-address>`. _Default: `false`._
   * @param {boolean} [options.allowUtf8LocalPart=true] Whether to allow UTF-8 characters in the local part of the email address. _Default: `true`._
   * @param {boolean} [options.requireTld=true] Whether to require a top-level domain in the email address. _Default: `true`._
   * @param {boolean} [options.ignoreMaxLength=false] Whether to ignore the standard max length of email addresses. _Default: `false`._
   * @param {boolean} [options.allowIpDomain=false] Whether to allow IP addresses in the host part of the email address. _Default: `false`._
   * @param {boolean} [options.domainSpecificValidation=false] Whether to perform some domain-specific validations,
   * e.g. disallowing certain syntactically valid email addresses that are rejected by GMail. _Default: `false`._
   * @param {string[]} [options.hostBlacklist] An array of blacklisted hostnames.
   * @param {string} [options.blacklistedChars] A string of characters that are not allowed in the name part of the email address.
   * @param {string} [options.message] The error message to use if the check fails.
   * @returns {TString} A new instance of `TString` with the check added.
   */
  email(options?: {
    readonly allowDisplayName?: boolean
    readonly requireDisplayName?: boolean
    readonly allowUtf8LocalPart?: boolean
    readonly requireTld?: boolean
    readonly ignoreMaxLength?: boolean
    readonly allowIpDomain?: boolean
    readonly domainSpecificValidation?: boolean
    readonly hostBlacklist?: readonly string[]
    readonly blacklistedChars?: string
    readonly message?: string
  }): this {
    return this._checks.add({
      check: 'email',
      options: {
        allowDisplayName: options?.allowDisplayName ?? false,
        requireDisplayName: options?.requireDisplayName ?? false,
        allowUtf8LocalPart: options?.allowUtf8LocalPart ?? true,
        requireTld: options?.requireTld ?? true,
        ignoreMaxLength: options?.ignoreMaxLength ?? false,
        allowIpDomain: options?.allowIpDomain ?? false,
        domainSpecificValidation: options?.domainSpecificValidation ?? false,
        hostBlacklist: [...(options?.hostBlacklist ?? [])],
        blacklistedChars: options?.blacklistedChars ?? '',
      },
      message: options?.message,
    })
  }

  get isEmail(): boolean {
    return this._checks.has('email')
  }

  url(options?: { readonly message?: string }): this {
    return this._checks.add({ check: 'url', message: options?.message })
  }

  get isUrl(): boolean {
    return this._checks.has('url')
  }

  cuid(options?: { readonly message?: string }): this {
    return this._checks.add({ check: 'cuid', message: options?.message })
  }

  get isCuid(): boolean {
    return this._checks.has('cuid')
  }

  uuid(options?: { readonly message?: string }): this {
    return this._checks.add({ check: 'uuid', message: options?.message })
  }

  get isUuid(): boolean {
    return this._checks.has('uuid')
  }

  isoDate(options?: { readonly message?: string }): this {
    return this._checks.add({ check: 'iso_date', message: options?.message })
  }

  get isIsoDate(): boolean {
    return this._checks.has('iso_date')
  }

  isoDuration(options?: { readonly message?: string }): this {
    return this._checks.add({ check: 'iso_duration', message: options?.message })
  }

  get isIsoDuration(): boolean {
    return this._checks.has('iso_duration')
  }

  base64(options?: {
    readonly paddingRequired?: boolean
    readonly urlSafe?: boolean
    readonly message?: string
  }): this {
    return this._checks.add({
      check: 'base64',
      options: { paddingRequired: options?.paddingRequired ?? true, urlSafe: options?.urlSafe ?? true },
      message: options?.message,
    })
  }

  get isBase64(): boolean {
    return this._checks.has('base64')
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  startsWith(prefix: string, options?: { readonly message?: string }): this {
    return this._checks.add({ check: 'starts_with', prefix, message: options?.message })
  }

  get prefix(): string | undefined {
    return this._checks.get('starts_with')?.prefix
  }

  endsWith(suffix: string, options?: { readonly message?: string }): this {
    return this._checks.add({ check: 'ends_with', suffix, message: options?.message })
  }

  get suffix(): string | undefined {
    return this._checks.get('ends_with')?.suffix
  }

  contains(substring: string, options?: { readonly message?: string }): this {
    return this._checks.add({ check: 'contains', substring, message: options?.message })
  }

  /* -------------------------------------------------- Transforms -------------------------------------------------- */

  /**
   * Removes leading and trailing whitespace from the string.
   *
   * @returns {TString} A new instance of `TString` with the transform added.
   */
  trim(): TString<[...T, 'trim'], C> {
    return this._addTransform({ kind: 'trim' })
  }

  /**
   * Converts the string to lowercase.
   *
   * @returns {TString} A new instance of `TString` with the transform added.
   */
  lowercase(): TString<[...T, 'lowercase'], C> {
    return this._addTransform({ kind: 'lowercase' })
  }

  /**
   * Converts the string to uppercase.
   *
   * @returns {TString} A new instance of `TString` with the transform added.
   */
  uppercase(): TString<[...T, 'uppercase'], C> {
    return this._addTransform({ kind: 'uppercase' })
  }

  /**
   * Converts the string to capitalized.
   *
   * @returns {TString} A new instance of `TString` with the transform added.
   */
  capitalize(): TString<[...T, 'capitalize'], C> {
    return this._addTransform({ kind: 'capitalize' })
  }

  /**
   * Converts the string to uncapitalized.
   *
   * @returns {TString} A new instance of `TString` with the transform added.
   */
  uncapitalize(): TString<[...T, 'uncapitalize'], C> {
    return this._addTransform({ kind: 'uncapitalize' })
  }

  /**
   * Replaces the first (or all) occurrence(s) of a substring or regular expression with a replacement string.
   *
   * @param {(RegExp | string)} search The string or regular expression to search for.
   * @param {string} replace The string to replace with.
   * @param {{ all?: boolean }} [options] Options for this check.
   * @param {boolean} [options.all=true] Whether to replace all occurrences of the `search` string/pattern or just the first.
   * **Note:** This only works when `search` is a string. If you want the same behavior for a regular expression, use the `g` flag.
   * @returns {TString} A new instance of `TString` with the transform added.
   */
  replace(
    search: RegExp | string,
    replace: string,
    options?: { readonly all?: boolean }
  ): TString<[...T, 'replace'], C> {
    return this._addTransform({ kind: 'replace', search, replace, all: options?.all ?? true })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  private readonly _checks = TChecks.of(this)

  private _addTransform<K extends TStringTransformKind>(
    transform: Extract<TStringTransform, { readonly kind: K }>
  ): TString<[...T, K], C> {
    return new TString({ ...this._def, transforms: [...this._def.transforms, transform] })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create(options?: typeUtils.SimplifyFlat<TOptions>): TString {
    return new TString({
      typeName: TTypeName.String,
      checks: [],
      transforms: [],
      coerce: false,
      options: { ...options },
    })
  }

  static readonly _internals: {
    readonly re: Readonly<Record<'alphanum' | 'email' | 'cuid' | 'uuid' | 'iso_date' | 'iso_duration', RegExp>> & {
      readonly base64: {
        readonly paddingRequired: { readonly urlSafe: RegExp; readonly urlUnsafe: RegExp }
        readonly paddingNotRequired: { readonly urlSafe: RegExp; readonly urlUnsafe: RegExp }
      }
    }
    readonly validators: {
      isIsoDate(data: string): string | null
    }
  } = {
    re: {
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
        if (!TString._internals.re.iso_date.test(value)) {
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

export type AnyTString = TString<TStringTransformKind[], boolean>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TNumber                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TNumberInput<C extends boolean> = C extends true ? any : number

export interface TNumberManifest extends TManifest<number> {
  readonly checks: ToChecks<InvalidNumberIssue>
  readonly coerce: boolean
}

export interface TNumberDef<C extends boolean> extends TDef {
  readonly typeName: TTypeName.Number
  readonly checks: ToChecks<InvalidNumberIssue>
  readonly coerce: C
}

export class TNumber<C extends boolean = false> extends TType<number, TNumberDef<C>, TNumberInput<C>> {
  get _manifest(): TNumberManifest {
    const { checks, coerce } = this._def
    return { ...TManifest.default(this.isInteger ? TParsedType.Integer : TParsedType.Number), checks, coerce }
  }

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
            ctx.addIssue(IssueKind.InvalidNumber, { ...check, received: data }, check.message)
            if (ctx.common.abortEarly) return ctx.abort()
          }

          break
        case 'max':
          if (check.expected.inclusive ? data > check.expected.value : data >= check.expected.value) {
            ctx.addIssue(IssueKind.InvalidNumber, { ...check, received: data }, check.message)
            if (ctx.common.abortEarly) return ctx.abort()
          }

          break
        case 'range':
          if (
            (check.expected.min.inclusive ? data < check.expected.min.value : data <= check.expected.min.value) ||
            (check.expected.max.inclusive ? data > check.expected.max.value : data >= check.expected.max.value)
          ) {
            ctx.addIssue(IssueKind.InvalidNumber, { ...check, received: data }, check.message)
            if (ctx.common.abortEarly) return ctx.abort()
          }

          break
        case 'integer':
          if (!Number.isInteger(data)) {
            ctx.addIssue(IssueKind.InvalidNumber, { ...check, received: data }, check.message)
            if (ctx.common.abortEarly) return ctx.abort()
          }

          break
        case 'positive':
          if (data <= 0) {
            ctx.addIssue(IssueKind.InvalidNumber, { ...check, received: data }, check.message)
            if (ctx.common.abortEarly) return ctx.abort()
          }

          break
        case 'nonpositive':
          if (data > 0) {
            ctx.addIssue(IssueKind.InvalidNumber, { ...check, received: data }, check.message)
            if (ctx.common.abortEarly) return ctx.abort()
          }

          break
        case 'negative':
          if (data >= 0) {
            ctx.addIssue(IssueKind.InvalidNumber, { ...check, received: data }, check.message)
            if (ctx.common.abortEarly) return ctx.abort()
          }

          break
        case 'nonnegative':
          if (data < 0) {
            ctx.addIssue(IssueKind.InvalidNumber, { ...check, received: data }, check.message)
            if (ctx.common.abortEarly) return ctx.abort()
          }

          break
        case 'finite':
          if (!Number.isFinite(data)) {
            ctx.addIssue(IssueKind.InvalidNumber, { ...check, received: data }, check.message)
            if (ctx.common.abortEarly) return ctx.abort()
          }

          break
        case 'port':
          if (data < 0 || data > 65535) {
            ctx.addIssue(IssueKind.InvalidNumber, { ...check, received: data }, check.message)
            if (ctx.common.abortEarly) return ctx.abort()
          }

          break
        case 'multiple':
          if (TNumber._internals.floatSafeRemainder(data, check.expected) !== 0) {
            ctx.addIssue(IssueKind.InvalidNumber, { ...check, received: data }, check.message)
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
    return this._checks.add(
      { check: 'min', expected: { value, inclusive: options?.inclusive ?? true }, message: options?.message },
      { remove: ['range'] }
    )
  }

  gt(value: number, options?: { readonly message?: string }): this {
    return this.min(value, { inclusive: false, message: options?.message })
  }

  gte(value: number, options?: { readonly message?: string }): this {
    return this.min(value, { inclusive: true, message: options?.message })
  }

  get minValue(): number | undefined {
    const min = this._checks.get('min')?.expected
    if (min) return min.inclusive ? min.value : min.value + 1
    const range = this._checks.get('range')?.expected
    return range && (range.min.inclusive ? range.min.value : range.min.value + 1)
  }

  max(value: number, options?: { readonly inclusive?: boolean; readonly message?: string }): this {
    return this._checks.add(
      { check: 'max', expected: { value, inclusive: options?.inclusive ?? true }, message: options?.message },
      { remove: ['range'] }
    )
  }

  lt(value: number, options?: { readonly message?: string }): this {
    return this.max(value, { inclusive: false, message: options?.message })
  }

  lte(value: number, options?: { readonly message?: string }): this {
    return this.max(value, { inclusive: true, message: options?.message })
  }

  get maxValue(): number | undefined {
    const max = this._checks.get('max')?.expected
    if (max) return max.inclusive ? max.value : max.value - 1
    const range = this._checks.get('range')?.expected
    return range && (range.max.inclusive ? range.max.value : range.max.value - 1)
  }

  range(
    min: number,
    max: number,
    options?: { readonly minInclusive?: boolean; readonly maxInclusive?: boolean; readonly message?: string }
  ): this {
    return this._checks.add(
      {
        check: 'range',
        expected: {
          min: { value: min, inclusive: options?.minInclusive ?? true },
          max: { value: max, inclusive: options?.maxInclusive ?? true },
        },
        message: options?.message,
      },
      { remove: ['min', 'max'] }
    )
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

  get isInteger(): boolean {
    return this._checks.has('integer')
  }

  positive(options?: { readonly message?: string }): this {
    return this._checks.add({ check: 'positive', message: options?.message })
  }

  get isPositive(): boolean {
    return this._checks.has('positive')
  }

  nonpositive(options?: { readonly message?: string }): this {
    return this._checks.add({ check: 'nonpositive', message: options?.message })
  }

  negative(options?: { readonly message?: string }): this {
    return this._checks.add({ check: 'negative', message: options?.message })
  }

  get isNegative(): boolean {
    return this._checks.has('negative')
  }

  nonnegative(options?: { readonly message?: string }): this {
    return this._checks.add({ check: 'nonnegative', message: options?.message })
  }

  finite(options?: { readonly message?: string }): this {
    return this._checks.add({ check: 'finite', message: options?.message })
  }

  get isFinite(): boolean {
    return this._checks.has('finite')
  }

  port(options?: { readonly message?: string }): this {
    return this._checks.add({ check: 'port', message: options?.message })
  }

  get isPort(): boolean {
    return this._checks.has('port')
  }

  multiple(value: number, options?: { readonly message?: string }): this {
    return this._checks.add({ check: 'multiple', expected: value, message: options?.message })
  }

  step(value: number, options?: { readonly message?: string }): this {
    return this.multiple(value, options)
  }

  get isMultiple(): boolean {
    return this._checks.has('multiple')
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  private readonly _checks = TChecks.of(this)

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create(options?: typeUtils.SimplifyFlat<TOptions>): TNumber {
    return new TNumber({ typeName: TTypeName.Number, checks: [], coerce: false, options: { ...options } })
  }

  static readonly _internals: {
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

export type AnyTNumber = TNumber<boolean>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TNaN                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TNaNDef extends TDef {
  readonly typeName: TTypeName.NaN
}

export class TNaN extends TType<number, TNaNDef> {
  get _manifest(): TManifest<number> {
    return { ...TManifest.default(TParsedType.NaN) }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return typeof ctx.data !== 'number' || !Number.isNaN(ctx.data)
      ? ctx.invalidType({ expected: TParsedType.NaN }).abort()
      : OK(ctx.data)
  }

  static create(options?: typeUtils.SimplifyFlat<TOptions>): TNaN {
    return new TNaN({ typeName: TTypeName.NaN, options: { ...options } })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TBigInt                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TBigIntInput<C extends boolean> = bigint | (C extends true ? string | number | boolean : never)

export interface TBigIntManifest extends TManifest<bigint> {
  readonly checks: ToChecks<InvalidBigIntIssue>
  readonly coerce: boolean
}

export interface TBigIntDef<C extends boolean> extends TDef {
  readonly typeName: TTypeName.BigInt
  readonly checks: ToChecks<InvalidBigIntIssue>
  readonly coerce: C
}

export class TBigInt<C extends boolean = true> extends TType<bigint, TBigIntDef<C>, TBigIntInput<C>> {
  get _manifest(): TBigIntManifest {
    const { checks, coerce } = this._def
    return { ...TManifest.default(TParsedType.BigInt), checks, coerce }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    const { coerce, checks } = this._def

    if (coerce && (typeof ctx.data === 'string' || typeof ctx.data === 'number' || typeof ctx.data === 'boolean')) {
      ctx.setData(BigInt(ctx.data))
    }

    if (typeof ctx.data !== 'bigint') {
      return ctx.invalidType({ expected: TParsedType.BigInt }).abort()
    }

    const { data } = ctx

    for (const check of checks) {
      switch (check.check) {
        case 'min':
          if (check.expected.inclusive ? data < check.expected.value : data <= check.expected.value) {
            ctx.addIssue(IssueKind.InvalidBigInt, { ...check, received: data }, check.message)
            if (ctx.common.abortEarly) return ctx.abort()
          }

          break
        case 'max':
          if (check.expected.inclusive ? data > check.expected.value : data >= check.expected.value) {
            ctx.addIssue(IssueKind.InvalidBigInt, { ...check, received: data }, check.message)
            if (ctx.common.abortEarly) return ctx.abort()
          }

          break
        case 'range':
          if (
            (check.expected.min.inclusive ? data < check.expected.min.value : data <= check.expected.min.value) ||
            (check.expected.max.inclusive ? data > check.expected.max.value : data >= check.expected.max.value)
          ) {
            ctx.addIssue(IssueKind.InvalidBigInt, { ...check, received: data }, check.message)
            if (ctx.common.abortEarly) return ctx.abort()
          }

          break
        case 'positive':
          if (data <= BigInt(0)) {
            ctx.addIssue(IssueKind.InvalidBigInt, { ...check, received: data }, check.message)
            if (ctx.common.abortEarly) return ctx.abort()
          }

          break
        case 'nonpositive':
          if (data > BigInt(0)) {
            ctx.addIssue(IssueKind.InvalidBigInt, { ...check, received: data }, check.message)
            if (ctx.common.abortEarly) return ctx.abort()
          }

          break
        case 'negative':
          if (data >= BigInt(0)) {
            ctx.addIssue(IssueKind.InvalidBigInt, { ...check, received: data }, check.message)
            if (ctx.common.abortEarly) return ctx.abort()
          }

          break
        case 'nonnegative':
          if (data < BigInt(0)) {
            ctx.addIssue(IssueKind.InvalidBigInt, { ...check, received: data }, check.message)
            if (ctx.common.abortEarly) return ctx.abort()
          }

          break
        case 'multiple':
          if (data % check.expected !== BigInt(0)) {
            ctx.addIssue(IssueKind.InvalidBigInt, { ...check, received: data }, check.message)
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

  coerce<T extends boolean = true>(value = true as T): TBigInt<T> {
    return new TBigInt({ ...this._def, coerce: value })
  }

  /* ---------------------------------------------------- Checks ---------------------------------------------------- */

  min(value: Numeric, options?: { readonly inclusive?: boolean; readonly message?: string }): this {
    return this._checks.add(
      {
        check: 'min',
        expected: { value: BigInt(value), inclusive: options?.inclusive ?? true },
        message: options?.message,
      },
      { remove: ['range'] }
    )
  }

  gt(value: Numeric, options?: { readonly message?: string }): this {
    return this.min(value, { inclusive: false, message: options?.message })
  }

  gte(value: Numeric, options?: { readonly message?: string }): this {
    return this.min(value, { inclusive: true, message: options?.message })
  }

  get minValue(): bigint | undefined {
    const min = this._checks.get('min')?.expected
    if (min) return min.inclusive ? min.value : min.value + BigInt(1)
    const range = this._checks.get('range')?.expected
    return range && (range.min.inclusive ? range.min.value : range.min.value + BigInt(1))
  }

  max(value: Numeric, options?: { readonly inclusive?: boolean; readonly message?: string }): this {
    return this._checks.add(
      {
        check: 'max',
        expected: { value: BigInt(value), inclusive: options?.inclusive ?? true },
        message: options?.message,
      },
      { remove: ['range'] }
    )
  }

  lt(value: Numeric, options?: { readonly message?: string }): this {
    return this.max(value, { inclusive: false, message: options?.message })
  }

  lte(value: Numeric, options?: { readonly message?: string }): this {
    return this.max(value, { inclusive: true, message: options?.message })
  }

  get maxValue(): bigint | undefined {
    const max = this._checks.get('max')?.expected
    if (max) return max.inclusive ? max.value : max.value - BigInt(1)
    const range = this._checks.get('range')?.expected
    return range && (range.max.inclusive ? range.max.value : range.max.value - BigInt(1))
  }

  range(
    min: Numeric,
    max: Numeric,
    options?: { readonly minInclusive?: boolean; readonly maxInclusive?: boolean; readonly message?: string }
  ): this {
    return this._checks.add(
      {
        check: 'range',
        expected: {
          min: { value: BigInt(min), inclusive: options?.minInclusive ?? true },
          max: { value: BigInt(max), inclusive: options?.maxInclusive ?? true },
        },
        message: options?.message,
      },
      { remove: ['min', 'max'] }
    )
  }

  between(
    min: Numeric,
    max: Numeric,
    options?: { readonly minInclusive?: boolean; readonly maxInclusive?: boolean; readonly message?: string }
  ): this {
    return this.range(min, max, options)
  }

  positive(options?: { readonly message?: string }): this {
    return this._checks.add({ check: 'positive', message: options?.message })
  }

  get isPositive(): boolean {
    return this._checks.has('positive')
  }

  nonpositive(options?: { readonly message?: string }): this {
    return this._checks.add({ check: 'nonpositive', message: options?.message })
  }

  negative(options?: { readonly message?: string }): this {
    return this._checks.add({ check: 'negative', message: options?.message })
  }

  get isNegative(): boolean {
    return this._checks.has('negative')
  }

  nonnegative(options?: { readonly message?: string }): this {
    return this._checks.add({ check: 'nonnegative', message: options?.message })
  }

  multiple(value: Numeric, options?: { readonly message?: string }): this {
    return this._checks.add({ check: 'multiple', expected: BigInt(value), message: options?.message })
  }

  step(value: Numeric, options?: { readonly message?: string }): this {
    return this.multiple(value, options)
  }

  get isMultiple(): boolean {
    return this._checks.has('multiple')
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  private readonly _checks = TChecks.of(this)

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create(options?: typeUtils.SimplifyFlat<TOptions>): TBigInt<false> {
    return new TBigInt({ typeName: TTypeName.BigInt, checks: [], coerce: false, options: { ...options } })
  }
}

export type AnyTBigInt = TBigInt<boolean>

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

export interface TBooleanManifest extends TManifest<boolean> {
  readonly coerce: TBooleanCoercion
}

export interface TBooleanDef<C extends TBooleanCoercion> extends TDef {
  readonly typeName: TTypeName.Boolean
  readonly coerce: C
}

export class TBoolean<C extends TBooleanCoercion = false> extends TType<boolean, TBooleanDef<C>, TBooleanInput<C>> {
  get _manifest(): TBooleanManifest {
    const { coerce } = this._def
    return { ...TManifest.default(TParsedType.Boolean), coerce }
  }

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

    return OK(ctx.data)
  }

  /* --------------------------------------------------- Coercion --------------------------------------------------- */

  coerce<T extends TBooleanCoercion>(value: Narrow<T>): TBoolean<T> {
    return new TBoolean({ ...this._def, coerce: value as T })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  truthy<T extends readonly Primitive[]>(
    ...values: T
  ): TBoolean<
    C extends Record<string, unknown> ? typeUtils.SimplifyFlat<objectUtils.Merge<C, { truthy: T }>> : { truthy: T }
  > {
    return new TBoolean({
      ...this._def,
      coerce: { ...(typeof this._def.coerce === 'object' ? this._def.coerce : {}), truthy: values },
    }) as unknown as TBoolean<
      C extends Record<string, unknown> ? typeUtils.SimplifyFlat<objectUtils.Merge<C, { truthy: T }>> : { truthy: T }
    >
  }

  falsy<T extends readonly Primitive[]>(
    ...values: T
  ): TBoolean<
    C extends Record<string, unknown> ? typeUtils.SimplifyFlat<objectUtils.Merge<C, { falsy: T }>> : { falsy: T }
  > {
    return new TBoolean({
      ...this._def,
      coerce: { ...(typeof this._def.coerce === 'object' ? this._def.coerce : {}), falsy: values },
    }) as unknown as TBoolean<
      C extends Record<string, unknown> ? typeUtils.SimplifyFlat<objectUtils.Merge<C, { falsy: T }>> : { falsy: T }
    >
  }

  true(): TTrue {
    return new TTrue({ ...this._def, typeName: TTypeName.True })
  }

  false(): TFalse {
    return new TFalse({ ...this._def, typeName: TTypeName.False })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create(options?: typeUtils.SimplifyFlat<TOptions>): TBoolean {
    return new TBoolean({ typeName: TTypeName.Boolean, coerce: false, options: { ...options } })
  }
}

export type AnyTBoolean = TBoolean<TBooleanCoercion>

/* ------------------------------------------------------ TTrue ----------------------------------------------------- */

export interface TTrueDef extends TDef {
  readonly typeName: TTypeName.True
}

export class TTrue extends TType<true, TTrueDef> {
  get _manifest(): TLiteralManifest<true> {
    return { ...TManifest.default(TParsedType.False), literal: stringUtils.literalize(true) }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return ctx.data === true ? OK(ctx.data) : ctx.invalidType({ expected: TParsedType.True }).abort()
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  invert(): TFalse {
    return new TFalse({ ...this._def, typeName: TTypeName.False })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create(options?: typeUtils.SimplifyFlat<TOptions>): TTrue {
    return new TTrue({ typeName: TTypeName.True, options: { ...options } })
  }
}

/* ----------------------------------------------------- TFalse ----------------------------------------------------- */

export interface TFalseDef extends TDef {
  readonly typeName: TTypeName.False
}

export class TFalse extends TType<false, TFalseDef> {
  get _manifest(): TLiteralManifest<false> {
    return { ...TManifest.default(TParsedType.False), literal: stringUtils.literalize(false) }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return ctx.data === false ? OK(ctx.data) : ctx.invalidType({ expected: TParsedType.False }).abort()
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  invert(): TTrue {
    return new TTrue({ ...this._def, typeName: TTypeName.True })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create(options?: typeUtils.SimplifyFlat<TOptions>): TFalse {
    return new TFalse({ typeName: TTypeName.False, options: { ...options } })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TDate                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TDateCheckInput = Date | number | LiteralUnion<'now', string>

export type TDateInput<C extends boolean> = Date | (C extends true ? string | number : never)

export const handleTDateCheckInput = (value: Date | 'now', currentDate: Date): Date =>
  value === 'now' ? currentDate : value

export interface TDateManifest extends TManifest<Date> {
  readonly checks: ToChecks<InvalidDateIssue>
  readonly coerce: boolean
}

export interface TDateDef<C extends boolean> extends TDef {
  readonly typeName: TTypeName.Date
  readonly checks: ToChecks<InvalidDateIssue>
  readonly coerce: C
}

export class TDate<C extends boolean = false> extends TType<Date, TDateDef<C>, TDateInput<C>> {
  get _manifest(): TDateManifest {
    const { checks, coerce } = this._def
    return { ...TManifest.default(TParsedType.Date), checks, coerce }
  }

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
            ctx.addIssue(IssueKind.InvalidDate, { ...check, received: data }, check.message)
            if (ctx.common.abortEarly) return ctx.abort()
          }

          break
        case 'max':
          if (
            check.expected.inclusive
              ? data > handleTDateCheckInput(check.expected.value, currentDate)
              : data >= handleTDateCheckInput(check.expected.value, currentDate)
          ) {
            ctx.addIssue(IssueKind.InvalidDate, { ...check, received: data }, check.message)
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
            ctx.addIssue(IssueKind.InvalidDate, { ...check, received: data }, check.message)
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

  /* ---------------------------------------------------- Checks ---------------------------------------------------- */

  min(value: TDateCheckInput, options?: { readonly inclusive?: boolean; readonly message?: string }): this {
    return this._checks.add(
      {
        check: 'min',
        expected: { value: value === 'now' ? 'now' : new Date(value), inclusive: options?.inclusive ?? true },
        message: options?.message,
      },
      { remove: ['range'] }
    )
  }

  after(value: TDateCheckInput, options?: { readonly message?: string }): this {
    return this.min(value, { inclusive: false, message: options?.message })
  }

  sameOrAfter(value: TDateCheckInput, options?: { readonly message?: string }): this {
    return this.min(value, { inclusive: true, message: options?.message })
  }

  future(options?: { readonly message?: string }): this {
    return this.min('now', { inclusive: false, message: options?.message })
  }

  max(value: TDateCheckInput, options?: { readonly inclusive?: boolean; readonly message?: string }): this {
    return this._checks.add(
      {
        check: 'max',
        expected: { value: value === 'now' ? 'now' : new Date(value), inclusive: options?.inclusive ?? true },
        message: options?.message,
      },
      { remove: ['range'] }
    )
  }

  before(value: TDateCheckInput, options?: { readonly message?: string }): this {
    return this.max(value, { inclusive: false, message: options?.message })
  }

  sameOrBefore(value: TDateCheckInput, options?: { readonly message?: string }): this {
    return this.max(value, { inclusive: true, message: options?.message })
  }

  past(options?: { readonly message?: string }): this {
    return this.max('now', { inclusive: false, message: options?.message })
  }

  range(
    min: TDateCheckInput,
    max: TDateCheckInput,
    options?: { readonly minInclusive?: boolean; readonly maxInclusive?: boolean; readonly message?: string }
  ): this {
    return this._checks.add(
      {
        check: 'range',
        expected: {
          min: { value: min === 'now' ? 'now' : new Date(min), inclusive: options?.minInclusive ?? true },
          max: { value: max === 'now' ? 'now' : new Date(max), inclusive: options?.maxInclusive ?? true },
        },
        message: options?.message,
      },
      { remove: ['min', 'max'] }
    )
  }

  between(
    min: TDateCheckInput,
    max: TDateCheckInput,
    options?: { readonly minInclusive?: boolean; readonly maxInclusive?: boolean; readonly message?: string }
  ): this {
    return this.range(min, max, options)
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  private readonly _checks = TChecks.of(this)

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create(options?: typeUtils.SimplifyFlat<TOptions>): TDate {
    return new TDate({ typeName: TTypeName.Date, checks: [], coerce: false, options: { ...options } })
  }
}

export type AnyTDate = TDate<boolean>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TSymbol                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TSymbolDef extends TDef {
  readonly typeName: TTypeName.Symbol
}

export class TSymbol extends TType<symbol, TSymbolDef> {
  get _manifest(): TManifest<symbol> {
    return { ...TManifest.default(TParsedType.Symbol) }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return typeof ctx.data === 'symbol' ? OK(ctx.data) : ctx.invalidType({ expected: TParsedType.Symbol }).abort()
  }

  static create(options?: typeUtils.SimplifyFlat<TOptions>): TSymbol {
    return new TSymbol({ typeName: TTypeName.Symbol, options: { ...options } })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TBuffer                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TBufferDef extends TDef {
  readonly typeName: TTypeName.Buffer
  readonly checks: ToChecks<InvalidBufferIssue>
}

export class TBuffer extends TType<Buffer, TBufferDef> {
  get _manifest(): TManifest<Buffer> {
    return { ...TManifest.default(TParsedType.Buffer) }
  }

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
            ctx.addIssue(IssueKind.InvalidBuffer, { ...check, received: data.length }, check.message)
            if (ctx.common.abortEarly) return ctx.abort()
          }

          break
        case 'max':
          if (check.expected.inclusive ? data.length > check.expected.value : data.length >= check.expected.value) {
            ctx.addIssue(IssueKind.InvalidBuffer, { ...check, received: data.length }, check.message)
            if (ctx.common.abortEarly) return ctx.abort()
          }

          break
        case 'length':
          if (data.length !== check.expected) {
            ctx.addIssue(IssueKind.InvalidBuffer, { ...check, received: data.length }, check.message)
            if (ctx.common.abortEarly) return ctx.abort()
          }

          break

        default:
          TError.assertNever(check)
      }
    }

    return ctx.isValid() ? OK(data) : ctx.abort()
  }

  /* ---------------------------------------------------- Checks ---------------------------------------------------- */

  min<V extends number>(
    value: NonNegative<V>,
    options?: { readonly inclusive?: boolean; readonly message?: string }
  ): this {
    return this._checks.add(
      { check: 'min', expected: { value, inclusive: options?.inclusive ?? true }, message: options?.message },
      { remove: ['length'] }
    )
  }

  max<V extends number>(
    value: NonNegative<V>,
    options?: { readonly inclusive?: boolean; readonly message?: string }
  ): this {
    return this._checks.add(
      { check: 'max', expected: { value, inclusive: options?.inclusive ?? true }, message: options?.message },
      { remove: ['length'] }
    )
  }

  length<L extends number>(length: NonNegative<L>, options?: { readonly message?: string }): this {
    return this._checks.add(
      { check: 'length', expected: length, message: options?.message },
      { remove: ['min', 'max'] }
    )
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  private readonly _checks = TChecks.of(this)

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create(options?: typeUtils.SimplifyFlat<TOptions>): TBuffer {
    return new TBuffer({ typeName: TTypeName.Buffer, checks: [], options: { ...options } })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TLiteral                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TLiteralOptions = TOptions<{
  additionalIssueKind: EIssueKind['InvalidLiteral']
}>

export interface TLiteralManifest<T extends Primitive> extends TManifest<T> {
  readonly literal: stringUtils.Literalized<T>
}

export interface TLiteralDef<T extends Primitive> extends TDef {
  readonly typeName: TTypeName.Literal
  readonly options: TLiteralOptions
  readonly value: T
}

export class TLiteral<T extends Primitive> extends TType<T, TLiteralDef<T>> {
  get _manifest(): TLiteralManifest<T> {
    return {
      ...TManifest.default(TParsedType.Literal(this.value)),
      literal: stringUtils.literalize(this.value),
      required: this.value !== undefined,
      nullable: this.value === null,
    }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    const { value } = this._def
    const { data } = ctx

    const expectedParsedType = TParsedType.Literal(value)

    if (ctx.parsedType !== expectedParsedType) {
      return ctx.invalidType({ expected: expectedParsedType }).abort()
    }

    if (data !== value) {
      return ctx
        .addIssue(
          IssueKind.InvalidLiteral,
          {
            expected: { value, formatted: stringUtils.literalize(value) },
            received: { value: data as Primitive, formatted: stringUtils.literalize(data as Primitive) },
          },
          this._def.options.messages?.invalidLiteral
        )
        .abort()
    }

    return OK(data as T)
  }

  get value(): T {
    return this._def.value
  }

  static create<T extends number>(value: T, options?: typeUtils.SimplifyFlat<TLiteralOptions>): TNumericLiteral<T>
  static create<T extends string>(value: T, options?: typeUtils.SimplifyFlat<TLiteralOptions>): TStringLiteral<T>
  static create<T extends Primitive>(value: T, options?: typeUtils.SimplifyFlat<TLiteralOptions>): TLiteral<T>
  static create<T extends Primitive>(value: T, options?: typeUtils.SimplifyFlat<TLiteralOptions>): TLiteral<T> {
    if (typeof value === 'number') {
      return new TNumericLiteral({ typeName: TTypeName.Literal, value, options: { ...options } })
    }

    if (typeof value === 'string') {
      return new TStringLiteral({ typeName: TTypeName.Literal, value, options: { ...options } })
    }

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

/* ------------------------------------------------- TNumericLiteral ------------------------------------------------ */

export class TNumericLiteral<T extends number> extends TLiteral<T> {
  add<V extends number>(value: V): TNumericLiteral<Add<T, V>> {
    return this._update(this.value + value)
  }

  subtract<V extends number>(value: V): TNumericLiteral<Subtract<T, V>> {
    return this._update(this.value - value)
  }

  multiply<V extends number>(value: V): TNumericLiteral<Multiply<T, V>> {
    return this._update(this.value * value)
  }

  divide<V extends number>(value: V): TNumericLiteral<Divide<T, V>> {
    return this._update(this.value / value)
  }

  pow<V extends number>(value: V): TNumericLiteral<Pow<T, V>> {
    return this._update(this.value ** value)
  }

  mod<V extends number>(value: V): TNumericLiteral<Mod<T, V>> {
    return this._update(TNumber._internals.floatSafeRemainder(this.value, value))
  }

  negate(): TNumericLiteral<Negate<T>> {
    return this._update(-this.value)
  }

  absolute(): TNumericLiteral<Abs<T>> {
    return this._update(Math.abs(this.value))
  }

  gt<V extends number>(value: V): ToBoolean<Gt<T, V>> {
    return (this.value > value) as ToBoolean<Gt<T, V>>
  }

  gte<V extends number>(value: V): ToBoolean<GtOrEq<T, V>> {
    return (this.value >= value) as ToBoolean<GtOrEq<T, V>>
  }

  lt<V extends number>(value: V): ToBoolean<Lt<T, V>> {
    return (this.value < value) as ToBoolean<Lt<T, V>>
  }

  lte<V extends number>(value: V): ToBoolean<LtOrEq<T, V>> {
    return (this.value <= value) as ToBoolean<LtOrEq<T, V>>
  }

  eq<V extends number>(value: V): ToBoolean<Eq<T, V>> {
    // @ts-expect-error This comparison appears to be unintentional because the types 'T' and 'V' have no overlap.
    return (this.value === value) as ToBoolean<Eq<T, V>>
  }

  isPositive(): ToBoolean<IsPositive<T>> {
    return (this.value > 0) as ToBoolean<IsPositive<T>>
  }

  isNegative(): ToBoolean<IsNegative<T>> {
    return (this.value < 0) as ToBoolean<IsNegative<T>>
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  private _update<V extends number>(value: number): TNumericLiteral<V> {
    return new TNumericLiteral({ ...this._def, value: value as V })
  }
}

export type AnyTNumericLiteral = TNumericLiteral<number>

/* ------------------------------------------------- TStringLiteral ------------------------------------------------- */

export type MapStringLiteralsToTTupleItems<T extends readonly string[]> = AssertTTupleItems<{
  [K in keyof T]: TStringLiteral<T[K]>
}>

export class TStringLiteral<T extends string> extends TLiteral<T> {
  lowercase(): TStringLiteral<Lowercase<T>> {
    // @ts-expect-error Type instantiation is excessively deep and possibly infinite.
    return this._update(stringUtils.lowercase(this.value))
  }

  uppercase(): TStringLiteral<Uppercase<T>> {
    return this._update(stringUtils.uppercase(this.value))
  }

  camelCase(): TStringLiteral<stringUtils.CamelCase<T>> {
    return this._update(stringUtils.camelCase(this.value))
  }

  snakeCase(): TStringLiteral<stringUtils.SnakeCase<T>> {
    return this._update(stringUtils.snakeCase(this.value))
  }

  screamingSnakeCase(): TStringLiteral<stringUtils.ScreamingSnakeCase<T>> {
    return this._update(stringUtils.screamingSnakeCase(this.value))
  }

  kebabCase(): TStringLiteral<stringUtils.KebabCase<T>> {
    return this._update(stringUtils.kebabCase(this.value))
  }

  pascalCase(): TStringLiteral<stringUtils.PascalCase<T>> {
    return this._update(stringUtils.pascalCase(this.value))
  }

  sentenceCase(): TStringLiteral<stringUtils.SentenceCase<T>> {
    return this._update(stringUtils.sentenceCase(this.value))
  }

  titleCase(): TStringLiteral<stringUtils.TitleCase<T>> {
    return this._update(stringUtils.titleCase(this.value))
  }

  capitalize(): TStringLiteral<Capitalize<T>> {
    return this._update(stringUtils.capitalize(this.value))
  }

  uncapitalize(): TStringLiteral<Uncapitalize<T>> {
    return this._update(stringUtils.uncapitalize(this.value))
  }

  charAt<I extends stringUtils.StringIndex<T>>(index: I): TStringLiteral<stringUtils.CharAt<T, I>> {
    return this._update(stringUtils.charAt(this.value, index))
  }

  trimStart(): TStringLiteral<stringUtils.TrimLeft<T>> {
    return this._update(stringUtils.trimStart(this.value))
  }

  trimEnd(): TStringLiteral<stringUtils.TrimRight<T>> {
    return this._update(stringUtils.trimEnd(this.value))
  }

  trim(): TStringLiteral<stringUtils.Trim<T>> {
    return this._update(stringUtils.trim(this.value))
  }

  split<D extends string = ' '>(delimiter = ' ' as D): TTuple<MapStringLiteralsToTTupleItems<stringUtils.Split<T, D>>> {
    return TTuple.create(
      stringUtils
        .split(this.value, delimiter)
        .map((str) => TStringLiteral.create(str, this._def.options)) as unknown as MapStringLiteralsToTTupleItems<
        stringUtils.Split<T, D>
      >,
      this._def.options
    )
  }

  replace<S extends string, R extends string>(search: S, replace: R): TStringLiteral<stringUtils.Replace<T, S, R>> {
    return this._update(stringUtils.replace(this.value, search, replace))
  }

  replaceAll<S extends string, R extends string>(
    search: S,
    replace: R
  ): TStringLiteral<stringUtils.ReplaceAll<T, S, R>> {
    return this._update(stringUtils.replaceAll(this.value, search, replace))
  }

  slice<S extends number, E extends stringUtils.StringIndex<T> = stringUtils.LastIndex<T>>(
    start: S,
    end?: E
  ): TStringLiteral<stringUtils.Slice<T, S, E>> {
    return this._update(stringUtils.slice(this.value, start, end))
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  private _update<V extends string>(value: string): TStringLiteral<V> {
    return new TStringLiteral({ ...this._def, value: value as V })
  }
}

export type AnyTStringLiteral = TStringLiteral<string>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TEnum                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TEnumOptions = TOptions<{
  additionalIssueKind: EIssueKind['InvalidEnumValue']
}>

export interface TEnumManifest<T extends ReadonlyArray<string | number>, O = T[number]> extends TManifest<O> {
  readonly enum: T
}

export interface TEnumDef<T extends ReadonlyArray<string | number>> extends TDef {
  readonly typeName: TTypeName.Enum
  readonly options: TEnumOptions
  readonly values: T
}

export class TEnum<T extends ReadonlyArray<string | number>> extends TType<T[number], TEnumDef<T>> {
  get _manifest(): TEnumManifest<T> {
    return { ...TManifest.default(TParsedType.Enum(this.values)), enum: this.values }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    const { values } = this._def
    const { data } = ctx

    const expectedParsedTypes = [...new Set(values.map(TParsedType.Literal))]

    if (
      !((data: unknown): data is string | number =>
        (expectedParsedTypes.includes(TParsedType.String) && typeof data === 'string') ||
        (expectedParsedTypes.includes(TParsedType.Number) && typeof data === 'number'))(data)
    ) {
      return ctx.invalidType({ expected: TParsedType.Enum(this.values) }).abort()
    }

    if (!arrayUtils.includes(values, data)) {
      return ctx
        .addIssue(
          IssueKind.InvalidEnumValue,
          {
            expected: { values, formatted: values.map(stringUtils.literalize) },
            received: { value: data, formatted: stringUtils.literalize(data) },
          },
          this._def.options.messages?.invalidEnumValue
        )
        .abort()
    }

    return OK(data)
  }

  get values(): Readonly<T> {
    return this._def.values
  }

  get enum(): { readonly [K in T[number]]: K } {
    return this.values.reduce((acc, value) => ({ ...acc, [value]: value }), {} as { readonly [K in T[number]]: K })
  }

  static create<T extends string | number, U extends readonly [T, ...T[]] | readonly []>(
    values: U,
    options?: typeUtils.SimplifyFlat<TEnumOptions>
  ): TEnum<U> {
    return new TEnum({ typeName: TTypeName.Enum, values, options: { ...options } })
  }
}

export type AnyTEnum = TEnum<Array<string | number>>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                     TNativeEnum                                                    */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface EnumLike {
  readonly [x: string]: string | number
  readonly [x: number]: string
}

const _getValidEnum = <T extends EnumLike>(enum_: T): Readonly<Record<string, T[keyof T]>> =>
  objectUtils.fromEntries(
    objectUtils
      .keys(enum_)
      .filter((k) => typeof enum_[enum_[k as keyof typeof enum_]] !== 'number')
      .map((k) => [k, enum_[k as keyof typeof enum_]])
  )

export interface TNativeEnumDef<T extends EnumLike> extends TDef {
  readonly typeName: TTypeName.NativeEnum
  readonly options: TEnumOptions
  readonly enum: T
}

export class TNativeEnum<T extends EnumLike> extends TType<T[keyof T], TNativeEnumDef<T>> {
  get _manifest(): TEnumManifest<this['values'], T[keyof T]> {
    return { ...TManifest.default(TParsedType.Enum(this.values)), enum: this.values }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    const { data } = ctx

    const values = objectUtils.values(_getValidEnum(this.enum))

    const expectedParsedTypes = [...new Set(values.map(TParsedType.Literal))]

    if (
      !((data: unknown): data is string | number =>
        (expectedParsedTypes.includes(TParsedType.String) && typeof data === 'string') ||
        (expectedParsedTypes.includes(TParsedType.Number) && typeof data === 'number'))(data)
    ) {
      return ctx.invalidType({ expected: TParsedType.Enum(this.values) }).abort()
    }

    if (!arrayUtils.includes(values, data)) {
      return ctx
        .addIssue(
          IssueKind.InvalidEnumValue,
          {
            expected: { values, formatted: values.map(stringUtils.literalize) },
            received: { value: data, formatted: stringUtils.literalize(data) },
          },
          this._def.options.messages?.invalidEnumValue
        )
        .abort()
    }

    return OK(data)
  }

  get enum(): T {
    return _getValidEnum(this._def.enum) as unknown as T
  }

  get values(): typeUtils.Try<Readonly<typeUtils.UnionToTuple<T[keyof T]>>, ReadonlyArray<string | number>> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
    return objectUtils.values(_getValidEnum(this.enum)) as any
  }

  static create<T extends EnumLike>(enum_: T, options?: typeUtils.SimplifyFlat<TEnumOptions>): TNativeEnum<T> {
    return new TNativeEnum({ typeName: TTypeName.NativeEnum, enum: enum_, options: { ...options } })
  }
}

export type AnyTNativeEnum = TNativeEnum<EnumLike>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TArray                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TArrayCardinality = 'many' | 'atleastone'

export type TArrayIO<T extends AnyTType, C extends TArrayCardinality, IO extends '$I' | '$O' = '$O'> = {
  many: Array<T[IO]>
  atleastone: [T[IO], ...Array<T[IO]>]
}[C]

export type TArrayInput<T extends AnyTType, C extends TArrayCardinality, C_ extends boolean> =
  | TArrayIO<T, C, '$I'>
  | (C_ extends true ? Set<InputOf<T>> : never)

export type FlattenTArray<T extends AnyTArray> = T['element'] extends TArray<infer U, infer C, infer C_>
  ? TArray<U, C, C_>
  : T

export type FlattenTArrayDeep<T extends AnyTArray> = T['element'] extends TArray<infer U, infer C, infer C_>
  ? FlattenTArrayDeep<TArray<U, C, C_>>
  : T

export const flattenTArray = <T extends AnyTArray>(array: T): FlattenTArray<T> =>
  (array.element instanceof TArray ? array.element : array) as FlattenTArray<T>

export const flattenTArrayDeep = <T extends AnyTArray>(array: T): FlattenTArrayDeep<T> =>
  (array.element instanceof TArray ? flattenTArrayDeep(array.element) : array) as FlattenTArrayDeep<T>

export interface TArrayManifest<T extends AnyTType, C extends TArrayCardinality> extends TManifest<TArrayIO<T, C>> {
  readonly element: ManifestOf<T>
  readonly cardinality: C
  readonly minItems?: number
  readonly maxItems?: number
  readonly unique: boolean
  readonly coerce: boolean
}

export interface TArrayDef<T extends AnyTType, C extends TArrayCardinality, C_ extends boolean> extends TDef {
  readonly typeName: TTypeName.Array
  readonly element: T
  readonly cardinality: C
  readonly coerce: C_
  readonly minItems?: { readonly value: number; readonly inclusive: boolean; readonly message: string | undefined }
  readonly maxItems?: { readonly value: number; readonly inclusive: boolean; readonly message: string | undefined }
  readonly length?: { readonly value: number; readonly message: string | undefined }
  readonly unique?: { readonly message: string | undefined }
}

export class TArray<T extends AnyTType, C extends TArrayCardinality = 'many', C_ extends boolean = false> extends TType<
  TArrayIO<T, C>,
  TArrayDef<T, C, C_>,
  TArrayInput<T, C, C_>
> {
  get _manifest(): TArrayManifest<T, C> {
    const { element, cardinality, coerce, minItems, maxItems, length, unique } = this._def
    return {
      ...TManifest.default(TParsedType.Array),
      element: element.manifest(),
      cardinality,
      minItems: length?.value ?? (minItems && (minItems.inclusive ? minItems.value : minItems.value + 1)),
      maxItems: length?.value ?? (maxItems && (maxItems.inclusive ? maxItems.value : maxItems.value - 1)),
      unique: Boolean(unique),
      coerce,
    }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    const { coerce } = this._def

    if (coerce && ctx.data instanceof Set) {
      ctx.setData([...ctx.data])
    }

    if (!arrayUtils.isArray(ctx.data)) {
      return ctx.invalidType({ expected: TParsedType.Array }).abort()
    }

    const { element, minItems, maxItems, length, unique } = this._def
    const { data } = ctx

    if (length && data.length !== length.value) {
      ctx.addIssue(
        IssueKind.InvalidArray,
        { check: 'length', expected: length.value, received: data.length },
        length.message
      )
      if (ctx.common.abortEarly) return ctx.abort()
    } else {
      if (minItems && (minItems.inclusive ? data.length < minItems.value : data.length <= minItems.value)) {
        ctx.addIssue(
          IssueKind.InvalidArray,
          { check: 'min', expected: minItems, received: data.length },
          minItems.message
        )
        if (ctx.common.abortEarly) return ctx.abort()
      }

      if (maxItems && (maxItems.inclusive ? data.length > maxItems.value : data.length >= maxItems.value)) {
        ctx.addIssue(
          IssueKind.InvalidArray,
          { check: 'max', expected: maxItems, received: data.length },
          maxItems.message
        )
        if (ctx.common.abortEarly) return ctx.abort()
      }
    }

    if (unique && new Set(ctx.data).size !== ctx.data.length) {
      ctx.addIssue(IssueKind.InvalidArray, { check: 'unique' }, unique.message)
      if (ctx.common.abortEarly) return ctx.abort()
    }

    const result: Array<OutputOf<T>> = []

    if (ctx.common.async) {
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

    for (const res of [...data.entries()].map(([i, v]) => element._parseSync(ctx.child(element, v, [i])))) {
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

  /* ---------------------------------------------------------------------------------------------------------------- */

  /**
   * Retrieves the underlying schema for the array's elements.
   *
   * @example
   * ```ts
   * const myStringArraySchema = t.array(t.string()) // => TArray<TString>
   * myStringArraySchema.element // => TString
   * ```
   */
  get element(): T {
    return this._def.element
  }

  /**
   * Returns the underlying schema for the array's elements.
   *
   * @see {@link TArray.element|_`TArray.element`_}
   */
  unwrap(): T {
    return this.element
  }

  /* --------------------------------------------------- Coercion --------------------------------------------------- */

  coerce<C__ extends boolean = true>(value = true as C__): TArray<T, C, C__> {
    return new TArray({ ...this._def, coerce: value })
  }

  /* ---------------------------------------------------- Checks ---------------------------------------------------- */

  /**
   * Specifies the minimum length allowed for the array.
   *
   * > _This check is skipped if a `length` check exists._
   * >
   * > _This check is evaluated before the `max` check._
   *
   * @template V
   * @param {NonNegativeInteger<V>} value The minimum length allowed. Must be a non-negative integer.
   * @param {{ inclusive?: boolean; message?: string }} [options] Options for this check.
   * @param {boolean} [options.inclusive=true] Whether the requirement is inclusive or exclusive.
   * @param {string} [options.message] The error message to use if the check fails.
   * @returns {TArray} A new instance of `TArray` with the check added.
   */
  min<V extends number>(
    value: NonNegativeInteger<V>,
    options?: { readonly inclusive?: boolean; readonly message?: string }
  ): TArray<T, C, C_> {
    return new TArray({
      ...this._def,
      length: undefined,
      minItems: { value, inclusive: options?.inclusive ?? true, message: options?.message },
    })
  }

  get minItems(): number | undefined {
    return this._def.minItems?.value ?? this._def.length?.value
  }

  /**
   * Specifies the maximum length allowed for the array.
   *
   * > _This check is skipped if a `length` check exists._
   * >
   * > _This check is evaluated **after** the `min` check._
   *
   * @template V
   * @param {NonNegativeInteger<V>} value The maximum length allowed. Must be a non-negative integer.
   * @param {{ inclusive?: boolean; message?: string }} [options] Options for this check.
   * @param {boolean} [options.inclusive=true] Whether the requirement is inclusive or exclusive.
   * @param {string} [options.message] The error message to use if the check fails.
   * @returns {TArray} A new instance of `TArray` with the check added.
   */
  max<V extends number>(
    value: NonNegativeInteger<V>,
    options?: { readonly inclusive?: boolean; readonly message?: string }
  ): TArray<T, C, C_> {
    return new TArray({
      ...this._def,
      length: undefined,
      maxItems: { value, inclusive: options?.inclusive ?? true, message: options?.message },
    })
  }

  get maxItems(): number | undefined {
    return this._def.maxItems?.value ?? this._def.length?.value
  }

  /**
   * Specifies the exact length allowed for the array.
   *
   * > _This check removes both the `min` and `max` checks if they exist._
   *
   * @template L
   * @param {NonNegativeInteger<L>} length The required length. Must be a non-negative integer.
   * @param {{ message?: string }} [options] Options for this check.
   * @param {string} [options.message] The error message to use if the check fails.
   * @returns {TArray} A new instance of `TArray` with the check added.
   */
  length<L extends number>(length: NonNegativeInteger<L>, options?: { readonly message?: string }): TArray<T, C, C_> {
    return new TArray({
      ...this._def,
      minItems: undefined,
      maxItems: undefined,
      length: { value: length, message: options?.message },
    })
  }

  nonempty(options?: { readonly message?: string }): TArray<T, 'atleastone', C_> {
    const { length, minItems } = this._def

    if (length) {
      const updatedLen = { value: length.value >= 1 ? length.value : 1, message: options?.message ?? length.message }
      return new TArray({ ...this._def, cardinality: 'atleastone', length: updatedLen })
    }

    if (minItems) {
      const updatedMin = {
        value: minItems.value >= 1 ? minItems.value : 1,
        inclusive: true,
        message: options?.message ?? minItems.message,
      }
      return new TArray({ ...this._def, cardinality: 'atleastone', minItems: updatedMin })
    }

    return new TArray({
      ...this._def,
      cardinality: 'atleastone',
      minItems: { value: 1, inclusive: true, message: options?.message },
    })
  }

  sparse(enabled?: true): TArray<TOptional<T>, C, C_>
  sparse(enabled: false): TArray<TDefined<T>, C, C_>
  sparse(enabled = true): TArray<TOptional<T> | TDefined<T>, C, C_> {
    return new TArray({ ...this._def, element: this.element[enabled ? 'optional' : 'defined']() })
  }

  partial(): TArray<TOptional<T>, C, C_> {
    return this.sparse(true)
  }

  required(): TArray<TDefined<T>, C, C_> {
    return this.sparse(false)
  }

  unique(options?: { readonly message?: string }): TArray<T, C, C_> {
    return new TArray({ ...this._def, unique: { message: options?.message } })
  }

  get isUnique(): boolean {
    return Boolean(this._def.unique)
  }

  flatten(): FlattenTArray<this> {
    return new TArray({ ...this._def, element: flattenTArray(this) }) as FlattenTArray<this>
  }

  flattenDeep(): FlattenTArrayDeep<this> {
    return new TArray({ ...this._def, element: flattenTArrayDeep(this) }) as FlattenTArrayDeep<this>
  }

  toSet(): TSet<T, C_> {
    return new TSet({ ...this._def, typeName: TTypeName.Set, size: this._def.length })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create<T extends AnyTType>(element: T, options?: typeUtils.SimplifyFlat<TOptions>): TArray<T> {
    return new TArray({
      typeName: TTypeName.Array,
      element,
      cardinality: 'many',
      coerce: false,
      options: { ...options },
    })
  }
}

export type AnyTArray = TArray<AnyTType, TArrayCardinality, boolean>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TSet                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TSetInput<T extends AnyTType, C extends boolean> =
  | Set<InputOf<T>>
  | (C extends true ? Array<InputOf<T>> : never)

export interface TSetDef<T extends AnyTType, C extends boolean> extends TDef {
  readonly typeName: TTypeName.Set
  readonly element: T
  readonly coerce: C
  readonly minItems?: { readonly value: number; readonly inclusive: boolean; readonly message: string | undefined }
  readonly maxItems?: { readonly value: number; readonly inclusive: boolean; readonly message: string | undefined }
  readonly size?: { readonly value: number; readonly message: string | undefined }
}

export class TSet<T extends AnyTType, C extends boolean = false> extends TType<
  Set<OutputOf<T>>,
  TSetDef<T, C>,
  TSetInput<T, C>
> {
  get _manifest(): TManifest<number> {
    return { ...TManifest.default(TParsedType.NaN) }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    const { coerce } = this._def

    if (coerce && ctx.data instanceof Array) {
      ctx.setData(new Set(ctx.data))
    }

    if (!(ctx.data instanceof Set)) {
      return ctx.invalidType({ expected: TParsedType.Set }).abort()
    }

    const { element, minItems, maxItems, size } = this._def
    const { data } = ctx

    if (size && data.size !== size.value) {
      ctx.addIssue(IssueKind.InvalidSet, { check: 'size', expected: size.value, received: data.size }, size.message)
      if (ctx.common.abortEarly) return ctx.abort()
    } else {
      if (minItems && (minItems.inclusive ? data.size < minItems.value : data.size <= minItems.value)) {
        ctx.addIssue(IssueKind.InvalidSet, { check: 'min', expected: minItems, received: data.size }, minItems.message)
        if (ctx.common.abortEarly) return ctx.abort()
      }

      if (maxItems && (maxItems.inclusive ? data.size > maxItems.value : data.size >= maxItems.value)) {
        ctx.addIssue(IssueKind.InvalidSet, { check: 'max', expected: maxItems, received: data.size }, maxItems.message)
        if (ctx.common.abortEarly) return ctx.abort()
      }
    }

    const result = new Set<OutputOf<T>>()

    if (ctx.common.async) {
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

    for (const res of [...data.entries()].map(([i, v]) => element._parseSync(ctx.child(element, v, [i])))) {
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

  /* ---------------------------------------------------------------------------------------------------------------- */

  /**
   * Retrieves the underlying schema for the Set's elements.
   *
   * @example
   * ```ts
   * const myStringSetSchema = t.set(t.string()) // => TSet<TString>
   * myStringSetSchema.element // => TString
   * ```
   */
  get element(): T {
    return this._def.element
  }

  /**
   * Returns the underlying schema for the Set's elements.
   *
   * @see {@link TSet.element|_`TSet.element`_}
   */
  unwrap(): T {
    return this.element
  }

  /* --------------------------------------------------- Coercion --------------------------------------------------- */

  coerce<C_ extends boolean = true>(value = true as C_): TSet<T, C_> {
    return new TSet({ ...this._def, coerce: value })
  }

  /* ---------------------------------------------------- Checks ---------------------------------------------------- */

  /**
   * Specifies the minimum size allowed for the Set.
   *
   * > _This check is skipped if a `size` check exists._
   * >
   * > _This check is evaluated before the `max` check._
   *
   * @template V
   * @param {NonNegativeInteger<V>} value The minimum size allowed. Must be a non-negative integer.
   * @param {{ inclusive?: boolean; message?: string }} [options] Options for this check.
   * @param {boolean} [options.inclusive=true] Whether the requirement is inclusive or exclusive.
   * @param {string} [options.message] The error message to use if the check fails.
   * @returns {TSet} A new instance of `TSet` with the check added.
   */
  min<V extends number>(
    value: NonNegativeInteger<V>,
    options?: { readonly inclusive?: boolean; readonly message?: string }
  ): TSet<T, C> {
    return new TSet({
      ...this._def,
      size: undefined,
      minItems: { value, inclusive: options?.inclusive ?? true, message: options?.message },
    })
  }

  /**
   * Specifies the maximum size allowed for the Set.
   *
   * > _This check is skipped if a `size` check exists._
   * >
   * > _This check is evaluated **after** the `min` check._
   *
   * @template V
   * @param {NonNegativeInteger<V>} value The maximum size allowed. Must be a non-negative integer.
   * @param {{ inclusive?: boolean; message?: string }} [options] Options for this check.
   * @param {boolean} [options.inclusive=true] Whether the requirement is inclusive or exclusive.
   * @param {string} [options.message] The error message to use if the check fails.
   * @returns {TSet} A new instance of `TSet` with the check added.
   */
  max<V extends number>(
    value: NonNegativeInteger<V>,
    options?: { readonly inclusive?: boolean; readonly message?: string }
  ): TSet<T, C> {
    return new TSet({
      ...this._def,
      size: undefined,
      maxItems: { value, inclusive: options?.inclusive ?? true, message: options?.message },
    })
  }

  /**
   * Specifies the exact size allowed for the Set.
   *
   * > _This check removes both the `min` and `max` checks if they exist._
   *
   * @template S
   * @param {NonNegativeInteger<S>} size The required size. Must be a non-negative integer.
   * @param {{ message?: string }} [options] Options for this check.
   * @param {string} [options.message] The error message to use if the check fails.
   * @returns {TSet} A new instance of `TSet` with the check added.
   */
  size<S extends number>(size: NonNegativeInteger<S>, options?: { readonly message?: string }): TSet<T, C> {
    return new TSet({
      ...this._def,
      minItems: undefined,
      maxItems: undefined,
      size: { value: size, message: options?.message },
    })
  }

  sparse(enabled?: true): TSet<TOptional<T>, C>
  sparse(enabled: false): TSet<TDefined<T>, C>
  sparse(enabled = true): TSet<TOptional<T> | TDefined<T>, C> {
    return new TSet({ ...this._def, element: this.element[enabled ? 'optional' : 'defined']() })
  }

  partial(): TSet<TOptional<T>, C> {
    return this.sparse(true)
  }

  required(): TSet<TDefined<T>, C> {
    return this.sparse(false)
  }

  toArray(): TArray<T, 'many', C> {
    return new TArray({ ...this._def, typeName: TTypeName.Array, cardinality: 'many', length: this._def.size })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create<T extends AnyTType>(element: T, options?: typeUtils.SimplifyFlat<TOptions>): TSet<T> {
    return new TSet({ typeName: TTypeName.Set, element, coerce: false, options: { ...options } })
  }
}

export type AnyTSet = TSet<AnyTType, boolean>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TTuple                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TTupleItems = readonly [AnyTType, ...AnyTType[]] | readonly []

export type AssertTTupleItems<T> = T extends TTupleItems ? T : never

export type TTupleIO<
  T extends TTupleItems,
  R extends AnyTType | null,
  IO extends '$I' | '$O' = '$O'
> = T extends readonly []
  ? R extends AnyTType
    ? [...Array<R[IO]>]
    : []
  : T extends readonly [infer Head extends AnyTType, ...infer Rest extends TTupleItems]
  ? [Head[IO], ...TTupleIO<Rest, R, IO>]
  : never

export type TTupleHead<T extends TTupleItems> = T extends readonly [infer H, ...unknown[]] ? H : TNever
export type TTupleTail<T extends TTupleItems> = T extends readonly [unknown, ...infer R extends TTupleItems] ? R : []
export type TTupleAdd<T extends TTupleItems, U extends TTupleItems> = AssertTTupleItems<[...T, ...U]>
export type TTupleConcat<T extends AnyTTuple, U extends AnyTTuple> = TTuple<
  AssertTTupleItems<[...T['items'], ...U['items']]>,
  T['restType'] extends AnyTType
    ? U['restType'] extends AnyTType
      ? TUnion<[T['restType'], U['restType']]>
      : T['restType']
    : U['restType']
>

export type TTupleItemsManifest<T extends TTupleItems> = T extends readonly []
  ? []
  : T extends [infer H extends AnyTType, ...infer R extends TTupleItems]
  ? [ManifestOf<H>, ...TTupleItemsManifest<R>]
  : never

export type TTupleOptions = TOptions<{
  additionalIssueKind: EIssueKind['InvalidTuple']
}>

export interface TTupleManifest<T extends TTupleItems, R extends AnyTType | null = null>
  extends TManifest<TTupleIO<T, R>> {
  readonly items: TTupleItemsManifest<T>
  readonly rest: R extends AnyTType ? ManifestOf<R> : null
}

export interface TTupleDef<T extends TTupleItems, R extends AnyTType | null = null> extends TDef {
  readonly typeName: TTypeName.Tuple
  readonly options: TTupleOptions
  readonly items: T
  readonly rest: R
}

export class TTuple<T extends TTupleItems, R extends AnyTType | null = null> extends TType<
  TTupleIO<T, R>,
  TTupleDef<T, R>,
  TTupleIO<T, R, '$I'>
> {
  get _manifest(): TTupleManifest<T, R> {
    const { items, rest } = this._def
    return {
      ...TManifest.default(TParsedType.Tuple),
      items: items.map((t) => t.manifest()) as TTupleItemsManifest<T>,
      rest: (rest?.manifest() ?? null) as R extends AnyTType ? ManifestOf<R> : null,
    }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (!arrayUtils.isArray(ctx.data)) {
      return ctx.invalidType({ expected: TParsedType.Tuple }).abort()
    }

    const { items, rest } = this._def
    const { data } = ctx

    if (data.length < items.length || (!rest && data.length > items.length)) {
      ctx.addIssue(
        IssueKind.InvalidTuple,
        { check: 'length', expected: items.length, received: data.length },
        this._def.options.messages?.invalidTuple
      )
      if (ctx.common.abortEarly) return ctx.abort()
    }

    const result: unknown[] = []

    if (ctx.common.async) {
      return Promise.all(
        data.map(async (v, i) => {
          const schema = items[i] ?? rest
          return schema?._parseAsync(ctx.child(schema, v, [i]))
        })
      ).then((results) => {
        for (const res of results.filter(Boolean)) {
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

    for (const res of [...data.entries()]
      .map(([i, v]) => {
        const schema = items[i] ?? rest
        return schema?._parseSync(ctx.child(schema, v, [i]))
      })
      .filter(Boolean)) {
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
    return new TTuple({ ...this._def, rest: null })
  }

  head(): TTupleHead<T> {
    return (this._def.items[0] ?? TNever.create(this._def.options)) as TTupleHead<T>
  }

  tail(): TTuple<TTupleTail<T>, R> {
    return new TTuple({ ...this._def, items: this._def.items.slice(1) as TTupleTail<T> })
  }

  push<I extends TTupleItems>(...items: I): TTuple<TTupleAdd<T, I>, R> {
    return new TTuple({ ...this._def, items: [...this._def.items, ...items] as TTupleAdd<T, I> })
  }

  unshift<I extends TTupleItems>(...items: I): TTuple<TTupleAdd<I, T>, R> {
    return new TTuple({ ...this._def, items: [...items, ...this._def.items] as TTupleAdd<I, T> })
  }

  concat<T_ extends TTupleItems, R_ extends AnyTType | null>(
    tuple: TTuple<T_, R_>
  ): TTupleConcat<this, TTuple<T_, R_>> {
    return new TTuple({
      ...this._def,
      items: [...this._def.items, ...tuple._def.items] as AssertTTupleItems<[...T, ...T_]>,
      rest: this._def.rest ? (tuple._def.rest ? this._def.rest.or(tuple._def.rest) : this._def.rest) : tuple._def.rest,
    }) as TTupleConcat<this, TTuple<T_, R_>>
  }

  partial(): TTuple<AssertTTupleItems<{ [K in keyof T]: TOptional<T[K]> }>, R> {
    return new TTuple({
      ...this._def,
      items: this._def.items.map((i) => i.optional()) as unknown as AssertTTupleItems<{
        [K in keyof T]: TOptional<T[K]>
      }>,
    })
  }

  required(): TTuple<AssertTTupleItems<{ [K in keyof T]: TDefined<T[K]> }>, R> {
    return new TTuple({
      ...this._def,
      items: this._def.items.map((i) => i.defined()) as unknown as AssertTTupleItems<{
        [K in keyof T]: TDefined<T[K]>
      }>,
    })
  }

  static create<T extends TTupleItems>(items: T, options?: typeUtils.SimplifyFlat<TTupleOptions>): TTuple<T>
  static create<T extends TTupleItems, R extends AnyTType>(
    items: T,
    rest: R,
    options?: typeUtils.SimplifyFlat<TTupleOptions>
  ): TTuple<T, R>
  static create<T extends TTupleItems, R extends AnyTType>(
    items: T,
    restOrOptions?: R | typeUtils.SimplifyFlat<TTupleOptions>,
    maybeOptions?: typeUtils.SimplifyFlat<TTupleOptions>
  ): TTuple<T, R | null> {
    const rest = restOrOptions instanceof TType ? restOrOptions : null
    const options = restOrOptions instanceof TType ? maybeOptions : restOrOptions
    return new TTuple({ typeName: TTypeName.Tuple, items, rest, options: { ...options } })
  }
}

export type AnyTTuple = TTuple<TTupleItems, AnyTType | null>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TRecord                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TRecordInput<K extends AnyTType<PropertyKey, PropertyKey>, V extends AnyTType, C extends boolean> =
  | Record<InputOf<K>, InputOf<V>>
  | (C extends true ? Map<InputOf<K>, InputOf<V>> : never)

const handleRecordEntry = <T>([k, v]: readonly [PropertyKey, T]): readonly [PropertyKey, T] => [
  typeof k === 'symbol' ? k : Number.isNaN(Number(k)) ? k : Number(k),
  v,
]

export interface TRecordDef<K extends AnyTType<PropertyKey, PropertyKey>, V extends AnyTType, C extends boolean>
  extends TDef {
  readonly typeName: TTypeName.Record
  readonly keys: K
  readonly values: V
  readonly coerce: C
}

export class TRecord<
  K extends AnyTType<PropertyKey, PropertyKey>,
  V extends AnyTType,
  C extends boolean = false
> extends TType<Record<OutputOf<K>, OutputOf<V>>, TRecordDef<K, V, C>, TRecordInput<K, V, C>> {
  get _manifest(): TManifest<number> {
    return { ...TManifest.default(TParsedType.NaN) }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    const { coerce, keys, values } = this._def

    if (coerce && ctx.data instanceof Map) {
      ctx.setData(objectUtils.fromEntries([...ctx.data.entries()]))
    }

    if (!objectUtils.isPlainObject(ctx.data)) {
      return ctx.invalidType({ expected: TParsedType.Object }).abort()
    }

    const { data } = ctx
    const result = {} as Record<OutputOf<K>, OutputOf<V>>

    if (ctx.common.async) {
      return Promise.all(
        objectUtils
          .entries(data)
          .map(handleRecordEntry)
          .map(async ([k, v]) =>
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

    for (const [keyRes, valueRes] of objectUtils
      .entries(data)
      .map(handleRecordEntry)
      .map(
        ([k, v]) =>
          [
            keys._parseSync(ctx.child(keys, k, [k, 'key'])),
            values._parseSync(ctx.child(values, v, [k, 'value'])),
          ] as const
      )) {
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

  /* ---------------------------------------------------------------------------------------------------------------- */

  get keys(): K {
    return this._def.keys
  }

  get values(): V {
    return this._def.values
  }

  get entries(): readonly [keys: K, values: V] {
    return [this.keys, this.values]
  }

  /* --------------------------------------------------- Coercion --------------------------------------------------- */

  coerce<T extends boolean = true>(value = true as T): TRecord<K, V, T> {
    return new TRecord({ ...this._def, coerce: value })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  partial(): TRecord<K, TOptional<V>, C> {
    return new TRecord({ ...this._def, values: this.values.optional() })
  }

  required(): TRecord<K, TDefined<V>, C> {
    return new TRecord({ ...this._def, values: this.values.defined() })
  }

  toMap(): TMap<K, V> {
    return new TMap({ ...this._def, typeName: TTypeName.Map })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create<V extends AnyTType>(values: V, options?: typeUtils.SimplifyFlat<TOptions>): TRecord<TString, V>
  static create<K extends AnyTType<PropertyKey, PropertyKey>, V extends AnyTType>(
    keys: K,
    values: V,
    options?: typeUtils.SimplifyFlat<TOptions>
  ): TRecord<K, V>
  static create(
    first: AnyTType<PropertyKey, PropertyKey>,
    second?: AnyTType | typeUtils.SimplifyFlat<TOptions>,
    third?: typeUtils.SimplifyFlat<TOptions>
  ): TRecord<AnyTType<PropertyKey, PropertyKey>, AnyTType> {
    if (second instanceof TType) {
      return new TRecord({
        typeName: TTypeName.Record,
        keys: first,
        values: second,
        coerce: false,
        options: { ...third },
      })
    }

    return new TRecord({
      typeName: TTypeName.Record,
      keys: TString.create(),
      values: first,
      coerce: false,
      options: { ...second },
    })
  }
}

export type AnyTRecord = TRecord<AnyTType<PropertyKey, PropertyKey>, AnyTType, boolean>

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
  get _manifest(): TManifest<number> {
    return { ...TManifest.default(TParsedType.NaN) }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (!(ctx.data instanceof Map)) {
      return ctx.invalidType({ expected: TParsedType.Map }).abort()
    }

    const { keys, values } = this._def
    const { data } = ctx

    const result = new Map<OutputOf<K>, OutputOf<V>>()

    if (ctx.common.async) {
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

    for (const [keyRes, valueRes] of [...data.entries()].map(
      ([k, v]) =>
        [
          keys._parseSync(ctx.child(keys, k, [k, 'key'])),
          values._parseSync(ctx.child(values, v, [k, 'value'])),
        ] as const
    )) {
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

  /* ---------------------------------------------------------------------------------------------------------------- */

  get keys(): K {
    return this._def.keys
  }

  get values(): V {
    return this._def.values
  }

  get entries(): readonly [keys: K, values: V] {
    return [this.keys, this.values]
  }

  partial(): TMap<K, TOptional<V>> {
    return new TMap({ ...this._def, values: this.values.optional() })
  }

  partialKeys(): TMap<TOptional<K>, V> {
    return new TMap({ ...this._def, keys: this.keys.optional() })
  }

  required(): TMap<K, TDefined<V>> {
    return new TMap({ ...this._def, values: this.values.defined() })
  }

  requiredKeys(): TMap<TDefined<K>, V> {
    return new TMap({ ...this._def, keys: this.keys.defined() })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create<K extends AnyTType, V extends AnyTType>(
    keys: K,
    values: V,
    options?: typeUtils.SimplifyFlat<TOptions>
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
>

export type TObjectShapeArg<S extends TObjectShape> = {
  [K in keyof S]: Exclude<S[K], AnyTRef> | TRef<Exclude<ObjectShapePaths<S>, K>, undefined>
}

export type GetRefResolvedShape<S extends TObjectShape> = {
  [K in keyof S]: S[K] extends TRef<infer R, infer _Ctx> ? ReachSchema<R, S> : S[K]
}

export const resolveShapeRefs = <S extends TObjectShape>(shape: S): GetRefResolvedShape<S> => {
  const resolvedShape = {} as Record<keyof S, unknown>

  for (const k of objectUtils.keys(shape)) {
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

export type MakePartialShape<S extends TObjectShape, K extends ReadonlyArray<keyof S> = ReadonlyArray<keyof S>> = {
  [K_ in keyof S]: K_ extends K[number] ? TOptional<S[K_]> : S[K_]
}
export type MakeRequiredShape<S extends TObjectShape, K extends ReadonlyArray<keyof S> = ReadonlyArray<keyof S>> = {
  [K_ in keyof S]: K_ extends K[number] ? TDefined<S[K_]> : S[K_]
}

export type MakeDeepPartialShape<S extends TObjectShape> = {
  [K in keyof S]: TOptional<
    S[K] extends TObject<infer S_, infer UK, infer C> ? TObject<MakeDeepPartialShape<S_>, UK, C> : S[K]
  >
}
export type MakeDeepRequiredShape<S extends TObjectShape> = {
  [K in keyof S]: TDefined<
    S[K] extends TObject<infer S_, infer UK, infer C> ? TObject<MakeDeepRequiredShape<S_>, UK, C> : S[K]
  >
}

export type PickOptionalShape<S extends TObjectShape> = {
  [K in keyof S as undefined extends OutputOf<S[K]> ? K : never]: S[K]
}
export type PickRequiredShape<S extends TObjectShape> = {
  [K in keyof S as undefined extends OutputOf<S[K]> ? never : K]: S[K]
}

export type TObjectOptions = TOptions<{
  additionalIssueKind: EIssueKind['UnrecognizedKeys']
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
  UK extends TObjectUnknownKeys | undefined = 'strip',
  C extends TObjectCatchall | undefined = undefined
> extends TType<TObjectIO<S, UK, C>, TObjectDef<S, UK, C>, TObjectIO<S, UK, C, '$I'>> {
  get _manifest(): TManifest<number> {
    return { ...TManifest.default(TParsedType.NaN) }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (!objectUtils.isPlainObject(ctx.data)) {
      return ctx.invalidType({ expected: TParsedType.Object }).abort()
    }

    const { shape, unknownKeys, catchall } = this._def
    const { data } = ctx

    const extraKeys: PropertyKey[] = []
    if (!catchall || unknownKeys !== 'strip') {
      for (const k of objectUtils.keys(data)) {
        if (!(k in shape)) {
          extraKeys.push(k)
        }
      }
    }

    const resultObj: objectUtils.AnyRecord = {}

    if (ctx.common.async) {
      return Promise.all(
        objectUtils.entries(shape).map(async ([k, v]) => Promise.all([k, v._parseAsync(ctx.child(v, data[k], [k]))]))
      ).then(async (results: Array<[PropertyKey, SyncParseResultOf<S[keyof S]>]>) => {
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
            ctx.addIssue(IssueKind.UnrecognizedKeys, { keys: extraKeys }, this._def.options.messages?.unrecognizedKeys)
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
            resultObj[k] = res.data
          }
        }

        return ctx.isValid() ? OK(resultObj as OutputOf<this>) : ctx.abort()
      })
    }

    const results: Array<[PropertyKey, SyncParseResultOf<S[keyof S]>]> = []

    for (const [k, v] of objectUtils.entries(shape)) {
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
        ctx.addIssue(IssueKind.UnrecognizedKeys, { keys: extraKeys }, this._def.options.messages?.unrecognizedKeys)
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
        resultObj[k] = res.data
      }
    }

    return ctx.isValid() ? OK(resultObj as OutputOf<this>) : ctx.abort()
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

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

  removeCatchall(): TObject<S> {
    return new TObject({ ...this._def, catchall: undefined }).strip()
  }

  keyof(): TEnum<typeUtils.Try<typeUtils.UnionToTuple<keyof S>, ReadonlyArray<string | number>>> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
    return TEnum.create(objectUtils.keys(this.shape) as any, this._def.options) as any
  }

  keys(): TUnion<
    typeUtils.UnionToTuple<keyof S> extends infer X extends readonly string[]
      ? typeUtils.Try<{ [K in keyof X]: TStringLiteral<X[K]> }, readonly AnyTType[]>
      : never
  > {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
    return TUnion.create(objectUtils.keys(this.shape).map((k) => TLiteral.create(k)) as any, this._def.options)
  }

  values(): TUnion<typeUtils.Try<typeUtils.UnionToTuple<S[keyof S]>, readonly AnyTType[]>> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
    return TUnion.create(objectUtils.values(this.shape) as any, this._def.options)
  }

  pick<K extends readonly [keyof S, ...Array<keyof S>]>(keys: K): TObject<Pick<S, K[number]>, UK, C> {
    return this._setShape(objectUtils.pick(this.shape, keys))
  }

  omit<K extends readonly [keyof S, ...Array<keyof S>]>(keys: K): TObject<Omit<S, K[number]>, UK, C> {
    return this._setShape(objectUtils.omit(this.shape, keys))
  }

  augment<T extends TObjectShape>(shape: T): TObject<objectUtils.Merge<S, T>, UK, C> {
    return this._setShape({ ...this.shape, ...shape } as objectUtils.Merge<S, T>)
  }

  extend<T extends TObjectShape>(shape: T): TObject<objectUtils.Merge<S, T>, UK, C> {
    return this.augment(shape)
  }

  setKey<K extends string, T extends AnyTType>(
    key: K,
    type: T
  ): TObject<objectUtils.Merge<S, { [K_ in K]: T }>, UK, C> {
    return this.augment({ [key]: type } as { [K_ in K]: T })
  }

  merge<S_ extends TObjectShape, UK_ extends TObjectUnknownKeys | undefined, C_ extends TObjectCatchall | undefined>(
    object: TObject<S_, UK_, C_>
  ): TObject<objectUtils.Merge<S, S_>, UK_, C_> {
    return object._setShape(this.augment(object.shape).shape)
  }

  intersect<T extends TObjectShape>(shape: T): TObject<objectUtils.Intersect<S, T>, UK, C> {
    return this._setShape(objectUtils.intersect(this.shape, shape))
  }

  diff<T extends TObjectShape>(shape: T): TObject<objectUtils.Diff<S, T>, UK, C> {
    return this._setShape(objectUtils.diff(this.shape, shape))
  }

  partial(): TObject<MakePartialShape<S>, UK, C>
  partial<K extends readonly [keyof S, ...Array<keyof S>]>(keys: K): TObject<MakePartialShape<S, K>, UK, C>
  partial(keys?: readonly [keyof S, ...Array<keyof S>]): TObject<MakePartialShape<S>, UK, C> {
    return this._setShape(
      objectUtils.fromEntries(
        objectUtils
          .entries(this.shape)
          .map(([k, v]) => [k, (keys ?? objectUtils.keys(this.shape)).includes(k) ? v.optional() : v])
      ) as MakePartialShape<S>
    )
  }

  deepPartial(): TObject<MakeDeepPartialShape<S>, UK, C> {
    return this._setShape(
      objectUtils.fromEntries(
        objectUtils.entries(this.shape).map(([k, v]) => [k, (v.isT(TTypeName.Object) ? v.deepPartial() : v).optional()])
      ) as MakeDeepPartialShape<S>
    )
  }

  required(): TObject<MakeRequiredShape<S>, UK, C>
  required<K extends readonly [keyof S, ...Array<keyof S>]>(keys: K): TObject<MakeRequiredShape<S, K>, UK, C>
  required(keys?: readonly [keyof S, ...Array<keyof S>]): TObject<MakeRequiredShape<S>, UK, C> {
    return this._setShape(
      objectUtils.fromEntries(
        objectUtils
          .entries(this.shape)
          .map(([k, v]) => [k, (keys ?? objectUtils.keys(this.shape)).includes(k) ? v.defined() : v])
      ) as MakeRequiredShape<S>
    )
  }

  deepRequired(): TObject<MakeDeepRequiredShape<S>, UK, C> {
    return this._setShape(
      objectUtils.fromEntries(
        objectUtils.entries(this.shape).map(([k, v]) => [k, (v.isT(TTypeName.Object) ? v.deepRequired() : v).defined()])
      ) as MakeDeepRequiredShape<S>
    )
  }

  pickOptional(): TObject<PickOptionalShape<S>, UK, C> {
    return this._setShape(
      Object.fromEntries(Object.entries(this.shape).filter(([_, v]) => v.isOptional)) as PickOptionalShape<S>
    )
  }

  pickRequired(): TObject<PickRequiredShape<S>, UK, C> {
    return this._setShape(
      Object.fromEntries(Object.entries(this.shape).filter(([_, v]) => v.isRequired)) as PickRequiredShape<S>
    )
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  private _setShape<T extends TObjectShape>(shape: T): TObject<T, UK, C> {
    return new TObject({ ...this._def, shape })
  }

  private _setUnknownKeys<K extends TObjectUnknownKeys>(unknownKeys: K): TObject<S, K> {
    return new TObject({ ...this._def, unknownKeys, catchall: undefined })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create = Object.assign(this._makeCreate(), {
    passthrough: this._makeCreate('passthrough'),
    strict: this._makeCreate('strict'),
    strip: this._makeCreate(),
    lazy: <S extends TObjectShape>(shape: () => S, options?: typeUtils.SimplifyFlat<TOptions>) =>
      this._makeCreate()(shape(), options),
  })

  private static _makeCreate<UK extends TObjectUnknownKeys = 'strip'>(unknownKeys = 'strip' as UK) {
    return <S extends TObjectShape>(
      shape: TObjectShapeArg<S>,
      options?: typeUtils.SimplifyFlat<TOptions>
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

export type SomeTObject = TObject<Record<string, AnyTType>, TObjectUnknownKeys | undefined, TObjectCatchall | undefined>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyTObject = TObject<any, TObjectUnknownKeys | undefined, TObjectCatchall | undefined>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                     TUndefined                                                     */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TUndefinedDef extends TDef {
  readonly typeName: TTypeName.Undefined
}

export class TUndefined extends TType<undefined, TUndefinedDef> {
  get _manifest(): TLiteralManifest<undefined> {
    return { ...TManifest.default(TParsedType.Undefined), literal: stringUtils.literalize(undefined), required: false }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return ctx.data === undefined ? OK(ctx.data) : ctx.invalidType({ expected: TParsedType.Undefined }).abort()
  }

  static create(options?: typeUtils.SimplifyFlat<TOptions>): TUndefined {
    return new TUndefined({ typeName: TTypeName.Undefined, options: { ...options } })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TVoid                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TVoidDef extends TDef {
  readonly typeName: TTypeName.Void
}

export class TVoid extends TType<void, TVoidDef> {
  get _manifest(): TManifest<void> {
    return { ...TManifest.default(TParsedType.Void), required: false }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return ctx.data === undefined ? OK(ctx.data) : ctx.invalidType({ expected: TParsedType.Void }).abort()
  }

  static create(options?: typeUtils.SimplifyFlat<TOptions>): TVoid {
    return new TVoid({ typeName: TTypeName.Void, options: { ...options } })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TNull                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TNullDef extends TDef {
  readonly typeName: TTypeName.Null
}

export class TNull extends TType<null, TNullDef> {
  get _manifest(): TLiteralManifest<null> {
    return { ...TManifest.default(TParsedType.Null), literal: stringUtils.literalize(null), nullable: true }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return ctx.data === null ? OK(ctx.data) : ctx.invalidType({ expected: TParsedType.Null }).abort()
  }

  static create(options?: typeUtils.SimplifyFlat<TOptions>): TNull {
    return new TNull({ typeName: TTypeName.Null, options: { ...options } })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TNever                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TNeverOptions = TOptions<{
  additionalIssueKind: EIssueKind['Forbidden']
}>

export interface TNeverManifest extends TManifest<never> {
  readonly forbidden: true
}

export interface TNeverDef extends TDef {
  readonly typeName: TTypeName.Never
  readonly options: TNeverOptions
}

export class TNever extends TType<never, TNeverDef> {
  get _manifest(): TNeverManifest {
    return { ...TManifest.default(TParsedType.Never), forbidden: true }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return ctx.addIssue(IssueKind.Forbidden, this._def.options.messages?.forbidden).abort()
  }

  static create(options?: typeUtils.SimplifyFlat<TNeverOptions>): TNever {
    return new TNever({ typeName: TTypeName.Never, options: { ...options } })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TFunction                                                     */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TFunctionOuterIO<
  T extends AnyTType | undefined,
  A extends AnyTTuple,
  R extends AnyTType
> = T extends AnyTType ? (this: InputOf<T>, ...args: InputOf<A>) => OutputOf<R> : (...args: InputOf<A>) => OutputOf<R>

export type TFunctionInnerIO<
  T extends AnyTType | undefined,
  A extends AnyTTuple,
  R extends AnyTType
> = T extends AnyTType ? (this: OutputOf<T>, ...args: OutputOf<A>) => InputOf<R> : (...args: OutputOf<A>) => InputOf<R>

export type TFunctionOptions = TOptions<{
  additionalIssueKind: EIssueKind['InvalidThisType'] | EIssueKind['InvalidArguments'] | EIssueKind['InvalidReturnType']
}>

export interface TFunctionManifest<T extends AnyTType | undefined, A extends AnyTTuple, R extends AnyTType>
  extends TManifest<TFunctionOuterIO<T, A, R>> {
  readonly thisType: T extends AnyTType ? ManifestOf<T> : null
  readonly parameters: ManifestOf<A>
  readonly returnType: ManifestOf<R>
}

export interface TFunctionDef<T extends AnyTType | undefined, A extends AnyTTuple, R extends AnyTType> extends TDef {
  readonly typeName: TTypeName.Function
  readonly options: TFunctionOptions
  readonly thisType: T
  readonly parameters: A
  readonly returnType: R
}

export class TFunction<T extends AnyTType | undefined, A extends AnyTTuple, R extends AnyTType> extends TType<
  TFunctionOuterIO<T, A, R>,
  TFunctionDef<T, A, R>,
  TFunctionInnerIO<T, A, R>
> {
  get _manifest(): TFunctionManifest<T, A, R> {
    return {
      ...TManifest.default(TParsedType.Function),
      thisType: (this._def.thisType?.manifest() ?? null) as T extends AnyTType ? ManifestOf<T> : null,
      parameters: this._def.parameters.manifest(),
      returnType: this._def.returnType.manifest(),
    }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (typeof ctx.data !== 'function') {
      return ctx.invalidType({ expected: TParsedType.Function }).abort()
    }

    const makeInvalidThisTypeError = <T extends AnyTType>(
      ctx: ParseContextOf<T>,
      issues: readonly TIssue[]
    ): TError<InputOf<T>> =>
      ctx.addIssue(IssueKind.InvalidThisType, { issues }, this._def.options.messages?.invalidThisType).abort().error

    const makeInvalidArgumentsError = <T extends AnyTType>(
      ctx: ParseContextOf<T>,
      issues: readonly TIssue[]
    ): TError<InputOf<T>> =>
      ctx.addIssue(IssueKind.InvalidArguments, { issues }, this._def.options.messages?.invalidArguments).abort().error

    const makeInvalidReturnTypeError = <T extends AnyTType>(
      ctx: ParseContextOf<T>,
      issues: readonly TIssue[]
    ): TError<InputOf<T>> =>
      ctx.addIssue(IssueKind.InvalidReturnType, { issues }, this._def.options.messages?.invalidReturnType).abort().error

    const { thisType, parameters, returnType } = this._def
    const { data: fn } = ctx

    if (returnType.isT(TTypeName.Promise)) {
      return OK(async function (this: unknown, ...args) {
        let boundFn = fn
        if (thisType) {
          const thisCtx = ctx.clone(thisType, this)
          const parsedThis = await thisType._parseAsync(ctx.clone(thisType, this))
          if (!parsedThis.ok) {
            throw makeInvalidThisTypeError(thisCtx, parsedThis.error.issues)
          }

          boundFn = fn.bind(parsedThis.data) as typeof fn
        }

        const argsCtx = ctx.clone(parameters, args)
        const parsedArgs = await parameters._parseAsync(argsCtx)
        if (!parsedArgs.ok) {
          throw makeInvalidArgumentsError(argsCtx, parsedArgs.error.issues)
        }

        const result = (await boundFn(...parsedArgs.data)) as unknown
        const returnCtx = ctx.clone(returnType, result)
        const parsedResult = await returnType._parseAsync(returnCtx)
        if (!parsedResult.ok) {
          throw makeInvalidReturnTypeError(returnCtx, parsedResult.error.issues)
        }

        return parsedResult.data
      } as OutputOf<this>)
    }

    return OK(function (this: unknown, ...args) {
      let boundFn = fn
      if (thisType) {
        const thisCtx = ctx.clone(thisType, this)
        const parsedThis = thisType._parseSync(thisCtx)
        if (!parsedThis.ok) {
          throw makeInvalidThisTypeError(thisCtx, parsedThis.error.issues)
        }

        boundFn = fn.bind(parsedThis.data) as typeof fn
      }

      const argsCtx = ctx.clone(parameters, args)
      const parsedArgs = parameters._parseSync(argsCtx)
      if (!parsedArgs.ok) {
        throw makeInvalidArgumentsError(argsCtx, parsedArgs.error.issues)
      }

      const result = boundFn(...parsedArgs.data) as unknown
      const returnCtx = ctx.clone(returnType, result)
      const parsedResult = returnType._parseSync(returnCtx)
      if (!parsedResult.ok) {
        throw makeInvalidReturnTypeError(returnCtx, parsedResult.error.issues)
      }

      return parsedResult.data
    } as OutputOf<this>)
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  get thisParameterType(): T {
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

  omitThisParameter(): TFunction<undefined, A, R> {
    return new TFunction({ ...this._def, thisType: undefined })
  }

  args<A_ extends TTupleItems>(...args: A_): TFunction<T, TTuple<A_, A['restType']>, R> {
    return new TFunction({
      ...this._def,
      parameters: (this._def.parameters.restType
        ? TTuple.create(args, this._def.parameters.restType, this._def.options)
        : TTuple.create(args, this._def.options)) as TTuple<A_, A['restType']>,
    })
  }

  rest<R_ extends AnyTType>(rest: R_): TFunction<T, TTuple<A['items'], R_>, R> {
    return new TFunction({ ...this._def, parameters: this._def.parameters.rest(rest) })
  }

  removeRest(): TFunction<T, TTuple<A['items']>, R> {
    return new TFunction({ ...this._def, parameters: this._def.parameters.removeRest() })
  }

  returns<R_ extends AnyTType>(returnType: R_): TFunction<T, A, R_> {
    return new TFunction({ ...this._def, returnType })
  }

  implement<F extends TFunctionInnerIO<T, A, R>>(
    fn: F
  ): ReturnType<F> extends OutputOf<R>
    ? T extends AnyTType
      ? (this: InputOf<T>, ...args: InputOf<A>) => ReturnType<F>
      : (...args: InputOf<A>) => ReturnType<F>
    : TFunctionOuterIO<T, A, R> {
    const parsedFn = this.parse(fn)
    return parsedFn as ReturnType<F> extends OutputOf<R>
      ? T extends AnyTType
        ? (this: InputOf<T>, ...args: InputOf<A>) => ReturnType<F>
        : (...args: InputOf<A>) => ReturnType<F>
      : TFunctionOuterIO<T, A, R>
  }

  validate<F extends TFunctionInnerIO<T, A, R>>(
    fn: F
  ): ReturnType<F> extends OutputOf<R>
    ? T extends AnyTType
      ? (this: InputOf<T>, ...args: InputOf<A>) => ReturnType<F>
      : (...args: InputOf<A>) => ReturnType<F>
    : TFunctionOuterIO<T, A, R> {
    return this.implement(fn)
  }

  strictImplement(fn: TFunctionInnerIO<T, A, R>): TFunctionInnerIO<T, A, R> {
    const parsedFn = this.parse(fn)
    return parsedFn
  }

  promisify(): TFunction<T, A, TPromise<R>> {
    return new TFunction({ ...this._def, returnType: this._def.returnType.promise() })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create(options?: typeUtils.SimplifyFlat<TOptions>): TFunction<undefined, TTuple<[], TUnknown>, TUnknown>
  static create<A extends TTupleItems>(
    parameters: A,
    options?: typeUtils.SimplifyFlat<TOptions>
  ): TFunction<undefined, TTuple<A, TUnknown>, TUnknown>
  static create<A extends TTupleItems, R extends AnyTType>(
    parameters: A,
    returnType: R,
    options?: typeUtils.SimplifyFlat<TOptions>
  ): TFunction<undefined, TTuple<A, TUnknown>, R>
  static create<T extends AnyTType, A extends TTupleItems, R extends AnyTType>(
    thisType: T,
    parameters: A,
    returnType: R,
    options?: typeUtils.SimplifyFlat<TOptions>
  ): TFunction<T, TTuple<A, TUnknown>, R>
  static create(
    first?: typeUtils.SimplifyFlat<TOptions> | TTupleItems | AnyTType,
    second?: typeUtils.SimplifyFlat<TOptions> | AnyTType | TTupleItems,
    third?: typeUtils.SimplifyFlat<TOptions> | AnyTType,
    fourth?: typeUtils.SimplifyFlat<TOptions>
  ):
    | TFunction<AnyTType, TTuple<TTupleItems, TUnknown>, AnyTType>
    | TFunction<undefined, TTuple<TTupleItems, TUnknown>, AnyTType> {
    if (first instanceof TType && arrayUtils.isArray(second) && third instanceof TType) {
      return new TFunction({
        typeName: TTypeName.Function,
        thisType: first,
        parameters: TTuple.create(second).rest(TUnknown.create()),
        returnType: third,
        options: { ...fourth },
      })
    }

    if (arrayUtils.isArray(first) && second instanceof TType) {
      return new TFunction({
        typeName: TTypeName.Function,
        thisType: undefined,
        parameters: TTuple.create(first).rest(TUnknown.create()),
        returnType: second,
        options: { ...(third as TOptions) },
      })
    }

    if (arrayUtils.isArray(first)) {
      return new TFunction({
        typeName: TTypeName.Function,
        thisType: undefined,
        parameters: TTuple.create(first).rest(TUnknown.create()),
        returnType: TUnknown.create(),
        options: { ...(second as TOptions) },
      })
    }

    return new TFunction({
      typeName: TTypeName.Function,
      thisType: undefined,
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

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TOptional                                                     */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TOptionalDef<T extends AnyTType> extends TDef {
  readonly typeName: TTypeName.Optional
  readonly underlying: T
}

export class TOptional<T extends AnyTType> extends TType<
  OutputOf<T> | undefined,
  TOptionalDef<T>,
  InputOf<T> | undefined
> {
  get _manifest(): TManifest<OutputOf<T> | undefined> {
    return { ...this.underlying.manifest(), required: false }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return ctx.data === undefined
      ? OK(ctx.data)
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

  static create<T extends AnyTType>(underlying: T, options?: typeUtils.SimplifyFlat<TOptions>): TOptional<T> {
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

export class TNullable<T extends AnyTType> extends TType<OutputOf<T> | null, TNullableDef<T>, InputOf<T> | null> {
  get _manifest(): TManifest<OutputOf<T> | null> {
    return { ...this.underlying.manifest(), nullable: true }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return ctx.data === null ? OK(ctx.data) : this._def.underlying._parse(ctx.child(this._def.underlying, ctx.data))
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

  static create<T extends AnyTType>(underlying: T, options?: typeUtils.SimplifyFlat<TOptions>): TNullable<T> {
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

export class TDefined<T extends AnyTType> extends TType<Defined<OutputOf<T>>, TDefinedDef<T>, Defined<InputOf<T>>> {
  get _manifest(): TManifest<Defined<OutputOf<T>>> {
    const underlyingManifest = this.underlying.manifest()
    return {
      ...underlyingManifest,
      examples: underlyingManifest.examples?.filter((ex): ex is Defined<OutputOf<T>> => ex !== undefined),
      required: true,
    }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return ctx.data === undefined
      ? ctx.addIssue(IssueKind.Required, this._def.options.messages?.required).abort()
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

  static create<T extends AnyTType>(underlying: T, options?: typeUtils.SimplifyFlat<TOptions>): TDefined<T> {
    return new TDefined({ typeName: TTypeName.Defined, underlying, options: { ...options }, isOptional: false })
  }
}

export type AnyTDefined = TDefined<AnyTType>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TPromise                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TPromiseManifest<T extends AnyTType> extends TManifest<Promise<OutputOf<T>>> {
  async: true
}

export interface TPromiseDef<T extends AnyTType> extends TDef {
  readonly typeName: TTypeName.Promise
  readonly underlying: T
}

export class TPromise<T extends AnyTType> extends TType<Promise<OutputOf<T>>, TPromiseDef<T>, Promise<InputOf<T>>> {
  get _manifest(): TPromiseManifest<T> {
    const underlyingManifest = this.underlying.manifest()
    return {
      ...underlyingManifest,
      examples: underlyingManifest.examples?.map(Promise.resolve),
      async: true,
    }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (!isAsync(ctx.data) && !ctx.common.async) {
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

  get awaited(): T {
    return this.underlying
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

  static create<T extends AnyTType>(underlying: T, options?: typeUtils.SimplifyFlat<TOptions>): TPromise<T> {
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

export class TReadonly<T extends AnyTType> extends TType<
  TReadonlyIO<OutputOf<T>>,
  TReadonlyDef<T>,
  TReadonlyIO<InputOf<T>>
> {
  get _manifest(): TManifest<TReadonlyIO<OutputOf<T>>> {
    return { ...(this.underlying.manifest() as TManifest<TReadonlyIO<OutputOf<T>>>), readonly: true }
  }

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

  writable(): T {
    return this.underlying
  }

  static create<T extends AnyTType>(underlying: T, options?: typeUtils.SimplifyFlat<TOptions>): TReadonly<T> {
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

export class TBrand<T extends AnyTType, B extends PropertyKey> extends TType<
  BRANDED<OutputOf<T>, B>,
  TBrandDef<T, B>,
  InputOf<T>
> {
  get _manifest(): TManifest<number> {
    return { ...TManifest.default(TParsedType.NaN) }
  }

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
    options?: typeUtils.SimplifyFlat<TOptions>
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

export class TDefault<T extends AnyTType, D extends Defined<OutputOf<T>>> extends TType<
  Defined<OutputOf<T>>,
  TDefaultDef<T, D>,
  InputOf<T> | undefined
> {
  get _manifest(): TManifest<number> {
    return { ...TManifest.default(TParsedType.NaN) }
  }

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
    options?: typeUtils.SimplifyFlat<TOptions>
  ): TDefault<T, D>
  static create<T extends AnyTType, D extends Defined<OutputOf<T>>>(
    underlying: T,
    getDefault: () => D,
    options?: typeUtils.SimplifyFlat<TOptions>
  ): TDefault<T, D>
  static create<T extends AnyTType, D extends Defined<OutputOf<T>>>(
    underlying: T,
    defaultValueOrGetter: D | (() => D),
    options?: typeUtils.SimplifyFlat<TOptions>
  ): TDefault<T, D>
  static create<T extends AnyTType, D extends Defined<OutputOf<T>>>(
    underlying: T,
    defaultValueOrGetter: D | (() => D),
    options?: typeUtils.SimplifyFlat<TOptions>
  ): TDefault<T, D> {
    return new TDefault({
      typeName: TTypeName.Default,
      underlying,
      getDefault: isFunction(defaultValueOrGetter) ? defaultValueOrGetter : (): D => defaultValueOrGetter,
      options: { ...options },
      isOptional: true,
      isNullable: underlying._def.isNullable,
      isReadonly: underlying._def.isReadonly,
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
{
  get _manifest(): TManifest<number> {
    return { ...TManifest.default(TParsedType.NaN) }
  }

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
    options?: typeUtils.SimplifyFlat<TOptions>
  ): TCatch<T, C>
  static create<T extends AnyTType, C extends OutputOf<T>>(
    underlying: T,
    getCatch: () => C,
    options?: typeUtils.SimplifyFlat<TOptions>
  ): TCatch<T, C>
  static create<T extends AnyTType, C extends OutputOf<T>>(
    underlying: T,
    catchValueOrGetter: C | (() => C),
    options?: typeUtils.SimplifyFlat<TOptions>
  ): TCatch<T, C>
  static create<T extends AnyTType, C extends OutputOf<T>>(
    underlying: T,
    catchValueOrGetter: C | (() => C),
    options?: typeUtils.SimplifyFlat<TOptions>
  ): TCatch<T, C> {
    return new TCatch({
      typeName: TTypeName.Catch,
      underlying,
      getCatch: isFunction(catchValueOrGetter) ? catchValueOrGetter : (): C => catchValueOrGetter,
      options: { ...options },
      isOptional: true,
      isNullable: true,
      isReadonly: underlying._def.isReadonly,
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

export class TLazy<T extends AnyTType> extends TType<OutputOf<T>, TLazyDef<T>, InputOf<T>> {
  get _manifest(): TManifest<number> {
    return { ...TManifest.default(TParsedType.NaN) }
  }

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

  static create<T extends AnyTType>(factory: () => T, options?: typeUtils.SimplifyFlat<TOptions>): TLazy<T> {
    return new TLazy({
      typeName: TTypeName.Lazy,
      getType: factory,
      options: { ...options },
      get manifest(): TManifest<OutputOf<T>> {
        return factory().describe()
      },
      get isOptional(): boolean {
        return factory().isOptional
      },
      get isNullable(): boolean {
        return factory().isNullable
      },
      get isReadonly(): boolean {
        return factory().isReadonly
      },
    })
  }
}

export type AnyTLazy = TLazy<AnyTType>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TUnion                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export type FlattenMembers<
  M extends readonly AnyTType[],
  Compare extends AnyTType & { readonly members: readonly AnyTType[] }
> = M extends readonly []
  ? []
  : M extends readonly [infer H extends AnyTType, ...infer R extends readonly AnyTType[]]
  ? H extends Compare
    ? [...FlattenMembers<H['members'], Compare>, ...FlattenMembers<R, Compare>]
    : [H, ...FlattenMembers<R, Compare>]
  : AnyTType[]

export const flattenMembers = <
  M extends readonly AnyTType[],
  TN extends Extract<TTypeNameMap, { readonly members: readonly AnyTType[] }>['typeName']
>(
  members: M,
  typeName: TN
): FlattenMembers<M, TTypeNameMap<TN>> =>
  members.reduce<AnyTType[]>(
    (acc, m) => [...acc, ...(m.isT(typeName) ? flattenMembers(m.members, typeName) : [m])],
    []
  ) as FlattenMembers<M, TTypeNameMap<TN>>

export type TUnionOptions = TOptions<{
  additionalIssueKind: EIssueKind['InvalidUnion']
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
  get _manifest(): TManifest<number> {
    return { ...TManifest.default(TParsedType.NaN) }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    const { members } = this.flatten()._def

    const handleResults = (results: Array<SyncParseResultOf<T[number]>>): ParseResultOf<this> => {
      const issues = []

      for (const result of results) {
        if (result.ok) {
          return result
        }

        issues.push(...result.error.issues)
      }

      return ctx.addIssue(IssueKind.InvalidUnion, { issues }, this._def.options.messages?.invalidUnion).abort()
    }

    if (ctx.common.async) {
      return Promise.all(members.map(async (type) => type._parseAsync(ctx.clone(type, ctx.data)))).then(handleResults)
    }

    return handleResults(members.map((type) => type._parseSync(ctx.clone(type, ctx.data))))
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  get members(): T {
    return this._def.members
  }

  get alternatives(): T {
    return this.members
  }

  flatten(): TUnion<FlattenMembers<T, AnyTUnion>> {
    return new TUnion({ ...this._def, members: flattenMembers(this.members, this.typeName) })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create<T extends [AnyTType, ...AnyTType[]]>(
    alternatives: T,
    options?: typeUtils.SimplifyFlat<TUnionOptions>
  ): TUnion<T> {
    return new TUnion({
      typeName: TTypeName.Union,
      members: alternatives,
      options: { ...options },
      isOptional: alternatives.some((alt) => alt.isOptional),
      isNullable: alternatives.some((alt) => alt.isNullable),
    })
  }
}

export type AnyTUnion = TUnion<readonly AnyTType[]>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                    TIntersection                                                   */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TIntersectionOptions = TOptions<{
  additionalIssueKind: EIssueKind['InvalidIntersection']
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

  const aType = TParsedType.get(a)
  const bType = TParsedType.get(b)

  if (aType === TParsedType.Object && bType === TParsedType.Object) {
    const a_ = a as objectUtils.AnyRecord
    const b_ = b as objectUtils.AnyRecord

    const bKeys = objectUtils.keys(b_)
    const sharedKeys = objectUtils.keys(a_).filter((key) => bKeys.includes(key))

    const merged: objectUtils.AnyRecord = {}

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
  get _manifest(): TManifest<number> {
    return { ...TManifest.default(TParsedType.NaN) }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    const { members } = this.flatten()._def

    const handleResults = (results: Array<SyncParseResultOf<T[number]>>): ParseResultOf<this> => {
      if (!results[0]?.ok || !results[1]?.ok) {
        return ctx.addIssue(IssueKind.InvalidIntersection, this._def.options.messages?.invalidIntersection).abort()
      }

      const intersection = intersect(results[0].data, results[1].data)
      if (!intersection.ok) {
        return ctx.addIssue(IssueKind.InvalidIntersection, this._def.options.messages?.invalidIntersection).abort()
      }

      const next = results[2]
      if (!next) {
        return OK(intersection.data as OutputOf<this>)
      }

      if (!next.ok) {
        return ctx.addIssue(IssueKind.InvalidIntersection, this._def.options.messages?.invalidIntersection).abort()
      }

      return handleResults([intersection, ...results.slice(1)])
    }

    if (ctx.common.async) {
      return Promise.all(members.map(async (type) => type._parseAsync(ctx.clone(type, ctx.data)))).then(handleResults)
    }

    return handleResults(members.map((type) => type._parseSync(ctx.clone(type, ctx.data))))
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  get members(): T {
    return this._def.members
  }

  get intersectees(): T {
    return this.members
  }

  flatten(): TIntersection<FlattenMembers<T, AnyTIntersection>> {
    return new TIntersection({ ...this._def, members: flattenMembers(this.members, this.typeName) })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create<T extends readonly [AnyTType, ...AnyTType[]]>(
    intersectees: T,
    options?: typeUtils.SimplifyFlat<TIntersectionOptions>
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
  get _manifest(): TManifest<number> {
    return { ...TManifest.default(TParsedType.NaN) }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    const { from, to } = this._def

    if (ctx.common.async) {
      return from._parseAsync(ctx.child(from, ctx.data)).then((fromResult) => {
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

  /* ---------------------------------------------------------------------------------------------------------------- */

  get from(): A {
    return this._def.from
  }

  get to(): B {
    return this._def.to
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create<T, TU, U, A extends AnyTType<TU, T>, B extends AnyTType<U, TU>>(
    from: A,
    to: B,
    options?: typeUtils.SimplifyFlat<TOptions>
  ): TPipeline<A, B> {
    return new TPipeline({ typeName: TTypeName.Pipeline, from, to, options: { ...options } })
  }
}

export type AnyTPipeline = TPipeline<AnyTType, AnyTType>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                     TInstanceOf                                                    */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TInstanceOfOptions = TOptions<{
  additionalIssueKind: EIssueKind['InvalidInstance']
}>

export interface TInstanceOfDef<T extends Ctor> extends TDef {
  readonly typeName: TTypeName.InstanceOf
  readonly options: TInstanceOfOptions
  readonly cls: T
}

export class TInstanceOf<T extends Ctor> extends TType<InstanceType<T>, TInstanceOfDef<T>> {
  get _manifest(): TManifest<OutputOf<this>> {
    return { ...TManifest.default(TParsedType.Class) }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    const { cls } = this._def

    if (!(ctx.data instanceof cls)) {
      return ctx
        .addIssue(IssueKind.InvalidInstance, { expected: cls.name }, this._def.options.messages?.invalidInstance)
        .abort()
    }

    return OK(ctx.data as OutputOf<this>)
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  get cls(): T {
    return this._def.cls
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create<T extends Ctor>(cls: T, options?: typeUtils.SimplifyFlat<TInstanceOfOptions>): TInstanceOf<T> {
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

export class TPropertyKey extends TType<string | number | symbol, TPropertyKeyDef> {
  get _manifest(): TManifest<OutputOf<this>> {
    return { ...TManifest.default(TParsedType.PropertyKey) }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return typeof ctx.data === 'string' || typeof ctx.data === 'number' || typeof ctx.data === 'symbol'
      ? OK(ctx.data)
      : ctx.invalidType({ expected: TParsedType.PropertyKey }).abort()
  }

  static create(options?: typeUtils.SimplifyFlat<TOptions>): TPropertyKey {
    return new TPropertyKey({ typeName: TTypeName.PropertyKey, options: { ...options } })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                     TPrimitive                                                     */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TPrimitiveDef extends TDef {
  readonly typeName: TTypeName.Primitive
}

export class TPrimitive extends TType<string | number | bigint | boolean | symbol | null | undefined, TPrimitiveDef> {
  get _manifest(): TManifest<OutputOf<this>> {
    return { ...TManifest.default(TParsedType.Primitive), required: false, nullable: true }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return typeof ctx.data === 'string' ||
      typeof ctx.data === 'number' ||
      typeof ctx.data === 'bigint' ||
      typeof ctx.data === 'boolean' ||
      typeof ctx.data === 'symbol' ||
      ctx.data === null ||
      ctx.data === undefined
      ? OK(ctx.data)
      : ctx.invalidType({ expected: TParsedType.Primitive }).abort()
  }

  static create(options?: typeUtils.SimplifyFlat<TOptions>): TPrimitive {
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
  get _manifest(): TManifest<OutputOf<this>> {
    return { ...TManifest.default(TParsedType.Falsy), required: false, nullable: true }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return ctx.data === false || ctx.data === '' || ctx.data === 0 || ctx.data === null || ctx.data === undefined
      ? OK(ctx.data)
      : ctx.invalidType({ expected: TParsedType.Falsy }).abort()
  }

  static create(options?: typeUtils.SimplifyFlat<TOptions>): TFalsy {
    return new TFalsy({ typeName: TTypeName.Falsy, options: { ...options } })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TEffects                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export const EffectKind = {
  Preprocess: 'preprocess',
  Refinement: 'refinement',
  Transform: 'transform',
} as const

export type EEffectKind = typeof EffectKind

export type EffectKind = EEffectKind[keyof EEffectKind]

export interface EffectCtx<T extends AnyTType> {
  readonly addIssue: ParseContextOf<T>['_addIssue']
  readonly path: ParsePath
}

export interface EffectBase<K extends EffectKind, E extends typeUtils.AnyFunction> {
  readonly kind: K
  readonly handler: E
}

export type PreprocessEffect<T extends AnyTType> = EffectBase<EEffectKind['Preprocess'], (data: unknown) => InputOf<T>>

export type RefinementEffect<T extends AnyTType> = EffectBase<
  EEffectKind['Refinement'],
  (data: OutputOf<T>, ctx: typeUtils.SimplifyFlat<EffectCtx<T>>) => boolean | Promise<boolean>
>

export type TransformEffect<T extends AnyTType, U> = EffectBase<
  EEffectKind['Transform'],
  (data: OutputOf<T>, ctx: typeUtils.SimplifyFlat<EffectCtx<T>>) => U
>

export type TEffect<T extends AnyTType = AnyTType, U = unknown> =
  | PreprocessEffect<T>
  | RefinementEffect<T>
  | TransformEffect<T, U>

export type RefinementMessage<T extends AnyTType> = string | CustomIssue | ((data: OutputOf<T>) => string | CustomIssue)

export interface TEffectsDef<T extends AnyTType> extends TDef {
  readonly typeName: TTypeName.Effects
  readonly underlying: T
  readonly effect: TEffect
}

export class TEffects<T extends AnyTType, O = OutputOf<T>, I = InputOf<T>> extends TType<O, TEffectsDef<T>, I> {
  get _manifest(): TManifest<O> {
    return { ...(this.underlying.manifest() as TManifest<O>) }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    const { underlying, effect } = this._def
    const { data } = ctx

    if (effect.kind === EffectKind.Preprocess) {
      const preprocessed = effect.handler(data)

      if (ctx.common.async) {
        return Promise.resolve(preprocessed).then(async (data) =>
          underlying._parseAsync(ctx.child(underlying, data))
        ) as AsyncParseResultOf<this>
      }

      return underlying._parseSync(ctx.child(underlying, preprocessed)) as SyncParseResultOf<this>
    }

    const effectCtx: EffectCtx<T> = {
      addIssue(issue) {
        ctx._addIssue(issue)
      },
      get path() {
        return ctx.path
      },
    }

    if (effect.kind === EffectKind.Refinement) {
      if (ctx.common.async) {
        return underlying._parseAsync(ctx.child(underlying, data)).then(async (awaitedRes) => {
          if (!awaitedRes.ok) {
            return ctx.abort()
          }

          const refinementResult = await effect.handler(awaitedRes.data, effectCtx)

          return refinementResult && ctx.isValid() ? OK(awaitedRes.data as OutputOf<this>) : ctx.abort()
        })
      }

      const res = underlying._parseSync(ctx.child(underlying, data))
      if (!res.ok) {
        return ctx.abort()
      }

      const refinementResult = effect.handler(res.data, effectCtx)
      if (isAsync(refinementResult)) {
        throw new Error('Async refinement encountered during synchronous parse operation. Use `.parseAsync()` instead.')
      }

      return refinementResult && ctx.isValid() ? OK(res.data as OutputOf<this>) : ctx.abort()
    }

    if (ctx.common.async) {
      return underlying._parseAsync(ctx.child(underlying, data)).then(async (baseRes) => {
        if (!baseRes.ok) {
          return ctx.abort()
        }

        const transformed = await effect.handler(baseRes.data, effectCtx)

        return ctx.isValid() ? OK(transformed as OutputOf<this>) : ctx.abort()
      })
    }

    const baseRes = underlying._parseSync(ctx.child(underlying, data))
    if (!baseRes.ok) {
      return ctx.abort()
    }

    const transformed = effect.handler(baseRes.data, effectCtx)
    if (isAsync(transformed)) {
      throw new Error('Async transform encountered during synchronous parse operation. Use `.parseAsync()` instead.')
    }

    return ctx.isValid() ? OK(transformed as OutputOf<this>) : ctx.abort()
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  get underlying(): T {
    return this._def.underlying
  }

  unwrap(): T {
    return this.underlying
  }

  unwrapDeep(): UnwrapDeep<T, TTypeName.Effects> {
    return (this.underlying instanceof TEffects ? this.underlying.unwrapDeep() : this.underlying) as UnwrapDeep<
      T,
      TTypeName.Effects
    >
  }
}

export type AnyTEffects = TEffects<AnyTType, unknown, unknown>

/* --------------------------------------------------- TPreprocess -------------------------------------------------- */

export class TPreprocess<T extends AnyTType, I extends InputOf<T>> extends TEffects<T, OutputOf<T>, I> {
  static create<T extends AnyTType, I extends InputOf<T>>(
    preprocess: (data: unknown) => I,
    underlying: T,
    options?: TOptions
  ): TPreprocess<T, I> {
    return new TPreprocess({
      typeName: TTypeName.Effects,
      underlying,
      effect: { kind: EffectKind.Preprocess, handler: preprocess },
      options: { ...options },
    })
  }
}

/* --------------------------------------------------- TRefinement -------------------------------------------------- */

export class TRefinement<T extends AnyTType, O extends OutputOf<T> = OutputOf<T>> extends TEffects<T, O> {
  static create<T extends AnyTType, O extends OutputOf<T>>(
    underlying: T,
    refinement: (data: OutputOf<T>, ctx: EffectCtx<T>) => data is O,
    options?: TOptions & { readonly refinementMessage?: RefinementMessage<T> }
  ): TRefinement<T, O>
  static create<T extends AnyTType>(
    underlying: T,
    refinement:
      | ((data: OutputOf<T>, ctx: EffectCtx<T>) => boolean | Promise<boolean>)
      | ((data: OutputOf<T>, ctx: EffectCtx<T>) => unknown),
    options?: TOptions & { readonly refinementMessage?: RefinementMessage<T> }
  ): TRefinement<T>
  static create<T extends AnyTType>(
    underlying: T,
    refinement: (data: OutputOf<T>, ctx: EffectCtx<T>) => unknown,
    options?: TOptions & { readonly refinementMessage?: RefinementMessage<T> }
  ): TRefinement<T> {
    const handleStringOrCustomIssue = (strOrCustomIssue: string | CustomIssue): CustomIssue =>
      typeof strOrCustomIssue === 'string' ? { message: strOrCustomIssue } : strOrCustomIssue

    const handler: (data: OutputOf<T>, ctx: EffectCtx<T>) => boolean | Promise<boolean> = (data, ctx) => {
      const setError = (): void => {
        const issue: CustomIssue = options?.refinementMessage
          ? handleStringOrCustomIssue(
              typeof options.refinementMessage === 'function'
                ? options.refinementMessage(data)
                : options.refinementMessage
            )
          : {}

        ctx.addIssue({ kind: IssueKind.Custom, ...issue })
      }

      const result = refinement(data, ctx)

      if (isAsync(result)) {
        return result.then((innerRes) => {
          if (!innerRes) {
            setError()
            return false
          }

          return true
        })
      }

      if (!result) {
        setError()
        return false
      }

      return true
    }

    return new TRefinement({
      typeName: TTypeName.Effects,
      underlying,
      effect: { kind: EffectKind.Refinement, handler },
      options: { ...options },
    })
  }
}

/* --------------------------------------------------- TTransform --------------------------------------------------- */

export class TTransform<T extends AnyTType, O> extends TEffects<T, O> {
  static create<T extends AnyTType, O>(
    underlying: T,
    transform: (data: OutputOf<T>, ctx: EffectCtx<T>) => O | Promise<O>,
    options?: TOptions
  ): TTransform<T, O> {
    return new TTransform({
      typeName: TTypeName.Effects,
      underlying,
      effect: { kind: EffectKind.Transform, handler: transform },
      options: { ...options },
    })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TCustom                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TCustomDef<O, I> extends TDef {
  readonly typeName: TTypeName.Custom
  readonly parser: (ctx: ParseContext<O, I>) => ParseResult<O, I>
}

export class TCustom<O, I> extends TType<O, TCustomDef<O, I>, I> {
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return this._def.parser(ctx)
  }

  static create<O, I = unknown>(
    check:
      | ((data: unknown, ctx: EffectCtx<AnyTType<O, I>>) => data is O)
      | ((data: unknown, ctx: EffectCtx<AnyTType<O, I>>) => boolean | Promise<boolean>)
      | ((data: unknown, ctx: EffectCtx<AnyTType<O, I>>) => unknown),
    options?: TOptions
  ): TCustom<O, I> {
    return new TCustom<O, I>({
      typeName: TTypeName.Custom,
      parser: TAny.create().superRefine(check)._parse,
      options: { ...options },
    })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TRef                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TRefContext = TObjectShape | TTupleItems

export type TuplePaths<T extends TTupleItems> = objectUtils.ConditionalOmit<
  objectUtils.OmitIndexSignature<{ [K in keyof T as `${K & number}` extends `${number}` ? K : never]: K }>,
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

export type _ReachSchema<R extends string, Ctx extends TRefContext> = stringUtils.ReplaceAll<
  stringUtils.ReplaceAll<R, '[', '.'>,
  ']',
  '.'
> extends infer R_ extends string
  ? R_ | ToNumber<R_> extends keyof Ctx
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

export const coerce: {
  boolean<T extends Exclude<TBooleanCoercion, false> = true>(
    coercion?: Narrow<T>,
    ...args: Parameters<typeof TBoolean.create>
  ): TBoolean<T>
  date(...args: Parameters<typeof TDate.create>): TDate<true>
  string(...args: Parameters<typeof TString.create>): TString<[], true>
  // Number & BigInt
  number(...args: Parameters<typeof TNumber.create>): TNumber<true>
  bigint(...args: Parameters<typeof TBigInt.create>): TBigInt
  // Array & Set
  array<T extends AnyTType>(...args: Parameters<typeof TArray.create<T>>): TArray<T, 'many', true>
  set<T extends AnyTType>(...args: Parameters<typeof TSet.create<T>>): TSet<T, true>
  // Record
  record<V extends AnyTType>(...args: Parameters<typeof TRecord.create<V>>): TRecord<TString, V, true>
  record<K extends AnyTType<PropertyKey, PropertyKey>, V extends AnyTType>(
    ...args: Parameters<typeof TRecord.create<K, V>>
  ): TRecord<K, V, true>
} = {
  boolean<T extends Exclude<TBooleanCoercion, false> = true>(
    coercion = true as Narrow<T>,
    ...args: Parameters<typeof TBoolean.create>
  ) {
    return TBoolean.create(...args).coerce(coercion)
  },
  date(...args) {
    return TDate.create(...args).coerce(true)
  },
  string(...args) {
    return TString.create(...args).coerce(true)
  },
  number(...args) {
    return TNumber.create(...args).coerce(true)
  },
  bigint(...args) {
    return TBigInt.create(...args).coerce(true)
  },
  array(...args) {
    return TArray.create(...args).coerce(true)
  },
  set(...args) {
    return TSet.create(...args).coerce(true)
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  record(...args: any[]) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any
    return TRecord.create(args[0], args[1], args[2]).coerce(true) as any
  },
}

/* ---------------------------------------------------- External ---------------------------------------------------- */

export const anyType = TAny.create
export const arrayType = TArray.create
export const bigintType = TBigInt.create
export const booleanType = TBoolean.create
export const brandType = TBrand.create
export const bufferType = TBuffer.create
export const catchType = TCatch.create
export const customType = TCustom.create
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
export const preprocessType = TPreprocess.create
export const primitiveType = TPrimitive.create
export const promiseType = TPromise.create
export const propertykeyType = TPropertyKey.create
export const recordType = TRecord.create
export const refinementType = TRefinement.create
export const refType = TRef.create
export const requiredType = TDefined.create
export const setType = TSet.create
export const stringType = TString.create
export const symbolType = TSymbol.create
export const transformType = TTransform.create
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
  customType as custom,
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
  preprocessType as preprocess,
  primitiveType as primitive,
  promiseType as promise,
  propertykeyType as propertykey,
  recordType as record,
  refinementType as refine,
  refinementType as refinement,
  refType as ref,
  requiredType as required,
  setType as set,
  stringType as string,
  symbolType as symbol,
  transformType as transform,
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

/* ------------------------------------------------------ Utils ----------------------------------------------------- */

export type AssertTTypeArray<T> = T extends readonly AnyTType[] ? T : never

export type UnionToIntersectionFn<T> = (T extends unknown ? (x: () => T) => void : never) extends (i: infer I) => void
  ? I
  : never

export type GetUnionLast<T> = UnionToIntersectionFn<T> extends () => infer Last ? Last : never

export type UnionToTuple<T, _Acc extends readonly unknown[] = []> = [T] extends [never]
  ? _Acc
  : UnionToTuple<Exclude<T, GetUnionLast<T>>, [GetUnionLast<T>, ..._Acc]>

export type ToEnumValues<T> = T extends ReadonlyArray<string | number> ? T : never

export type UnionToEnumValues<T> = ToEnumValues<UnionToTuple<T>>
