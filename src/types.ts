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
  type Integer,
  IssueKind,
  OK,
  SyncParseContext,
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
  type InvalidRecordIssue,
  type InvalidStringIssue,
  type LiteralUnion,
  type Narrow,
  type NonNegative,
  type NonNegativeInteger,
  type Numeric,
  type NumericRange,
  type ParseContext,
  type ParseContextOf,
  type ParseOptions,
  type ParsePath,
  type ParseResult,
  type ParseResultOf,
  type Primitive,
  type SimplifyDeep,
  type SyncParseResultOf,
  type TChecks,
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

export abstract class TType<Output = unknown, Def extends TDef = TDef, Input = Output> {
  declare readonly $O: Output
  declare readonly $I: Input

  readonly _def: Def

  abstract _parse(ctx: ParseContextOf<this>): ParseResultOf<this>
  abstract get _manifest(): TManifest<Output>

  constructor(def: Def) {
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
    this.nonnullable = this.nonnullable.bind(this)
    this.readonly = this.readonly.bind(this)
    this.array = this.array.bind(this)
    this.record = this.record.bind(this)
    this.promise = this.promise.bind(this)
    this.promisable = this.promisable.bind(this)
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

    objectKeys(this).forEach((k) => Object.defineProperty(this, k, { enumerable: !/^(?:_|\$)\w*/.exec(String(k)) }))
  }

  readonly id: string = nanoid()

  get typeName(): Def['typeName'] {
    return this._def.typeName
  }

  clone(): this {
    return this._construct()
  }

  get hint(): string {
    const uncolored = TShow(this)
    const { colorsEnabled } = { ...getGlobal().getOptions(), ...this.options() }
    return colorsEnabled ? TShow.colorize(uncolored) : uncolored
  }

  /* ---------------------------------------------------- Parsing --------------------------------------------------- */

  /** @internal */
  _parseSync(ctx: ParseContextOf<this>): SyncParseResultOf<this> {
    const result = this._parse(ctx)
    if (isAsync(result)) {
      throw new Error('Synchronous parse encountered Promise. Use `.parseAsync()`/`.safeParseAsync()` instead.')
    }

    return result
  }

  /** @internal */
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

  guard(data: unknown, options?: typeUtils.SimplifyFlat<ParseOptions>): data is Output {
    return this.safeParse(data, options).ok
  }

  assert(data: unknown, options?: typeUtils.SimplifyFlat<ParseOptions>): asserts data is Output {
    this.parse(data, options)
  }

  /* ----------------------------------------------- Options/Manifest ----------------------------------------------- */

  options(): Def['options']
  options(options: Def['options']): this
  options(maybeOptions?: Def['options']): Def['options'] | this {
    if (!maybeOptions) {
      return cloneUtils.cloneDeep(this._def.options)
    }

    return this._construct({ ...this._def, options: { ...this.options(), ...maybeOptions } })
  }

  manifest(): this['_manifest'] & { readonly typeName: Def['typeName'] }
  manifest(manifest: TManifest.Public<this>): this
  manifest(
    maybeManifest?: TManifest.Public<this>
  ): (this['_manifest'] & { readonly typeName: Def['typeName'] }) | this {
    if (!maybeManifest) {
      const { type, required, nullable, readonly, ...main } = { ...this._def.manifest, ...this._manifest }

      return cloneUtils.cloneDeep({
        typeName: this.typeName,
        type,
        ...main,
        required,
        nullable,
        readonly,
      }) as this['_manifest'] & { readonly typeName: Def['typeName'] }
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

  nonnullable(): TNonNullable<this> {
    return TNonNullable.create(this, this._def.options)
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

  promisable(): TUnion<[TPromise<this>, this]> {
    return this.promise().or(this)
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

  default<D extends Defined<Output>>(defaultValue: D): TDefault<this, D>
  default<D extends Defined<Output>>(getDefault: () => D): TDefault<this, D>
  default<D extends Defined<Output>>(defaultValueOrGetter: D | (() => D)): TDefault<this, D> {
    return TDefault.create(this, defaultValueOrGetter, this._def.options)
  }

  catch<C extends Output>(catchValue: C): TCatch<this, C>
  catch<C extends Output>(getCatch: () => C): TCatch<this, C>
  catch<C extends Output>(catchValueOrGetter: C | (() => C)): TCatch<this, C> {
    return TCatch.create(this, catchValueOrGetter, this._def.options)
  }

  lazy(): TLazy<this> {
    return TLazy.create(() => this, this._def.options)
  }

  pipe<T extends AnyTType<unknown, Input>>(type: T): TPipeline<this, T> {
    return TPipeline.create(this, type, this._def.options)
  }

  preprocess<In extends Input>(preprocess: (data: unknown) => In): TPreprocess<this, In> {
    return TPreprocess.create(preprocess, this, this._def.options)
  }

  refine<Out extends Output>(
    refinement: (data: Output) => data is Out,
    message?: RefinementMessage<this>
  ): TRefinement<this, Out>
  refine(
    refinement: ((data: Output) => boolean | Promise<boolean>) | ((data: Output) => unknown),
    message?: RefinementMessage<this>
  ): TRefinement<this>
  refine(refinement: (data: Output) => unknown, message?: RefinementMessage<this>): TRefinement<this> {
    return TRefinement.create(this, refinement, { ...this._def.options, refinementMessage: message })
  }

  superRefine<Out extends Output>(
    refinement: (data: Output, ctx: EffectCtx<this>) => data is Out
  ): TRefinement<this, Out>
  superRefine(
    refinement:
      | ((data: Output, ctx: EffectCtx<this>) => boolean | Promise<boolean>)
      | ((data: Output, ctx: EffectCtx<this>) => unknown)
  ): TRefinement<this>
  superRefine(refinement: (data: Output, ctx: EffectCtx<this>) => unknown): TRefinement<this> {
    return TRefinement.create(this, refinement, this._def.options)
  }

  transform<Out>(transform: (data: Output, ctx: EffectCtx<this>) => Out | Promise<Out>): TTransform<this, Out> {
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

  isT<T extends readonly [TTypeName, ...TTypeName[]]>(...types: T): this is TTypeNameMap<T[number]>
  isT<T extends readonly TTypeName[]>(...types: T): this is TTypeNameMap<T[number]>
  isT<T extends readonly TTypeName[]>(...types: T): this is TTypeNameMap<T[number]> {
    return types.includes(this.typeName)
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  addCheck<C extends Defined<Def['checks']>[number]>(
    check: C,
    options?: {
      readonly keepDuplicates?: boolean
      readonly remove?: ReadonlyArray<Defined<Def['checks']>[number]['check']>
    }
  ): this {
    let updated = [...(this._def.checks ?? []), check]

    if (!options?.keepDuplicates) {
      updated = updated.filter((c0, i, arr) => arr.findIndex((c1) => c1.check === c0.check) === i)
    }

    if (options?.remove) {
      updated = updated.filter((c) => !options.remove?.includes(c.check))
    }

    return this._construct({ ...this._def, checks: updated })
  }

  removeCheck<K extends Defined<Def['checks']>[number]['check']>(check: K): this {
    return this._construct({ ...this._def, checks: this._def.checks?.filter((c) => c.check !== check) })
  }

  hasCheck<K extends Defined<Def['checks']>[number]['check']>(check: K): boolean {
    return Boolean(this._def.checks?.some((c) => c.check === check))
  }

  getCheck<K extends Defined<Def['checks']>[number]['check']>(
    check: K
  ): Extract<Defined<Def['checks']>[number], { readonly check: K }> | undefined {
    return this._def.checks?.find(
      (c): c is Extract<Defined<Def['checks']>[number], { readonly check: K }> => c.check === check
    )
  }

  getChecks<
    K extends readonly [Defined<Def['checks']>[number]['check'], ...Array<Defined<Def['checks']>[number]['check']>]
  >(...checks: K): { [K_ in keyof K]: Extract<Defined<Def['checks']>[number], { readonly check: K[K_] }> | undefined } {
    return checks.map((c) => this.getCheck(c)) as {
      [K_ in keyof K]: Extract<Defined<Def['checks']>[number], { readonly check: K[K_] }> | undefined
    }
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  _construct(def?: Def): this {
    return Reflect.construct<[def: Def], this>(this.constructor as new (def: Def) => this, [{ ...this._def, ...def }])
  }
}

export type AnyTType<O = unknown, I = unknown> = TType<O, TDef, I>

/* ------------------------------------------------------------------------------------------------------------------ */

export type OutputOf<T extends { readonly $O: unknown }> = T['$O']
export type InputOf<T extends { readonly $I: unknown }> = T['$I']
export type ManifestOf<T extends AnyTType> = T['_manifest'] & { readonly typeName: T['typeName'] }

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TAny                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TAnyDef extends TDef {
  readonly typeName: TTypeName.Any
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class TAny extends TType<any, TAnyDef> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get _manifest(): TManifest.Nullish<any> {
    return TManifest.nullish(TParsedType.Unknown)
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return OK(ctx.data)
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

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
  get _manifest(): TManifest.Nullish<unknown> {
    return TManifest.nullish(TParsedType.Unknown)
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return OK(ctx.data)
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create(options?: typeUtils.SimplifyFlat<TOptions>): TUnknown {
    return new TUnknown({ typeName: TTypeName.Unknown, options: { ...options } })
  }
}

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

export type TStringTransformKind = TStringTransform['kind']

export type TStringOutput<
  Transforms extends readonly TStringTransformKind[],
  Format extends string
> = Transforms extends readonly []
  ? Format
  : Transforms extends readonly [
      infer H extends TStringTransformKind,
      ...infer R extends readonly TStringTransformKind[]
    ]
  ? {
      lowercase: Lowercase<TStringOutput<R, Format>>
      uppercase: Uppercase<TStringOutput<R, Format>>
      capitalize: Capitalize<TStringOutput<R, Format>>
      uncapitalize: Uncapitalize<TStringOutput<R, Format>>
      trim: TStringOutput<R, Format>
      replace: TStringOutput<R, Format>
    }[H]
  : never

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TStringInput<Coerce extends boolean> = Coerce extends true ? any : string

export interface TStringDef extends TDef {
  readonly typeName: TTypeName.String
  readonly transforms: readonly TStringTransform[]
  readonly checks: ToChecks<InvalidStringIssue>
  readonly coerce: boolean
}

export class TString<
  Transforms extends readonly TStringTransformKind[] = [],
  OutputFormat extends string = string,
  Coerce extends boolean = false
> extends TType<TStringOutput<Transforms, OutputFormat>, TStringDef, TStringInput<Coerce>> {
  get _manifest(): TManifest.String<OutputOf<this>> {
    const { transforms, checks, coerce } = this._def

    const [minCheck, maxCheck, lengthCheck, prefixCheck, suffixCheck, substringCheck] = this.getChecks(
      'min',
      'max',
      'length',
      'starts_with',
      'ends_with',
      'contains'
    )

    const patternChecks = checks.filter(
      (c): c is Extract<TStringDef['checks'][number], { readonly check: 'pattern' }> => c.check === 'pattern'
    )

    const formats = checks
      .filter((c): c is Extract<TStringDef['checks'][number], { readonly check: TManifest.StringFormat }> =>
        ['email', 'url', 'cuid', 'uuid', 'iso_date', 'iso_duration', 'base64', 'numeric'].includes(c.check)
      )
      .map((c) => c.check)

    return {
      ...TManifest.base(TParsedType.String),
      ...TManifest.length(minCheck?.expected, maxCheck?.expected, lengthCheck?.expected),
      ...(formats.length > 0 ? { formats } : {}),
      ...(transforms.length > 0 ? { transforms: transforms.map((t) => t.kind) } : {}),
      ...(patternChecks.length > 0
        ? {
            patterns: patternChecks.map((p) =>
              p.options.name === String(p.pattern) ? p.pattern : { regex: p.pattern, name: p.options.name }
            ),
          }
        : {}),
      ...(prefixCheck ? { prefix: prefixCheck.prefix } : {}),
      ...(suffixCheck ? { suffix: suffixCheck.suffix } : {}),
      ...(substringCheck ? { substring: substringCheck.substring } : {}),
      coerce,
    }
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

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
            if (ctx.common.abortEarly) {
              return ctx.abort()
            }
          }

          break
        case 'max':
          if (check.expected.inclusive ? data.length > check.expected.value : data.length >= check.expected.value) {
            ctx.addIssue(
              IssueKind.InvalidString,
              { check: check.check, expected: check.expected, received: data.length },
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
              IssueKind.InvalidString,
              { check: check.check, expected: check.expected, received: data.length },
              check.message
            )
            if (ctx.common.abortEarly) {
              return ctx.abort()
            }
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
            if (ctx.common.abortEarly) {
              return ctx.abort()
            }
          }

          break
        case 'alphanum':
        case 'cuid':
        case 'uuid':
        case 'iso_duration':
          if (!TString._internals.rx[check.check].test(data)) {
            ctx.addIssue(IssueKind.InvalidString, { check: check.check, received: data }, check.message)
            if (ctx.common.abortEarly) {
              return ctx.abort()
            }
          }

          break
        case 'iso_date':
          const validated = TString._internals.isIsoDate(ctx.data)
          if (validated) {
            ctx.setData(validated)
          } else {
            ctx.addIssue(IssueKind.InvalidString, { check: check.check }, check.message)
            if (ctx.common.abortEarly) {
              return ctx.abort()
            }
          }

          break
        case 'email':
          if (!validator.isEmail(data, objectUtils.snakeCaseProperties(check.options))) {
            ctx.addIssue(IssueKind.InvalidString, { check: check.check, options: check.options }, check.message)
            if (ctx.common.abortEarly) {
              return ctx.abort()
            }
          }

          break
        case 'numeric':
          if (!validator.isNumeric(data, objectUtils.snakeCaseProperties(check.options))) {
            ctx.addIssue(IssueKind.InvalidString, { check: check.check, options: check.options }, check.message)
            if (ctx.common.abortEarly) {
              return ctx.abort()
            }
          }

          break
        case 'base64':
          if (
            !TString._internals.rx[check.check][
              check.options.paddingRequired ? 'paddingRequired' : 'paddingNotRequired'
            ][check.options.urlSafe ? 'urlSafe' : 'urlUnsafe'].test(data)
          ) {
            ctx.addIssue(IssueKind.InvalidString, { check: check.check, options: check.options }, check.message)
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
            ctx.addIssue(IssueKind.InvalidString, { check: check.check }, check.message)
            if (ctx.common.abortEarly) {
              return ctx.abort()
            }
          }

          break
        case 'starts_with':
          if (!data.startsWith(check.prefix)) {
            ctx.addIssue(IssueKind.InvalidString, { check: check.check, prefix: check.prefix }, check.message)
            if (ctx.common.abortEarly) {
              return ctx.abort()
            }
          }

          break
        case 'ends_with':
          if (!data.endsWith(check.suffix)) {
            ctx.addIssue(IssueKind.InvalidString, { check: check.check, suffix: check.suffix }, check.message)
            if (ctx.common.abortEarly) {
              return ctx.abort()
            }
          }

          break
        case 'contains':
          if (!data.includes(check.substring)) {
            ctx.addIssue(IssueKind.InvalidString, { check: check.check, substring: check.substring }, check.message)
            if (ctx.common.abortEarly) {
              return ctx.abort()
            }
          }

          break

        default:
          TError.assertNever(check)
      }
    }

    return ctx.isValid() ? OK(data as OutputOf<this>) : ctx.abort()
  }

  /* --------------------------------------------------- Coercion --------------------------------------------------- */

  coerce<C extends boolean = true>(value = true as C): TString<Transforms, OutputFormat, C> {
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
    return this.addCheck(
      { check: 'min', expected: { value, inclusive: options?.inclusive ?? true }, message: options?.message },
      { remove: ['length'] }
    )
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
    return this.addCheck(
      { check: 'max', expected: { value, inclusive: options?.inclusive ?? true }, message: options?.message },
      { remove: ['length'] }
    )
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
    return this.addCheck({ check: 'length', expected: length, message: options?.message }, { remove: ['min', 'max'] })
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
    return this.addCheck(
      {
        check: 'pattern',
        pattern,
        options: { type: options?.type ?? 'enforce', name: options?.name ?? String(pattern) },
        message: options?.message,
      },
      { keepDuplicates: true }
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
    return this.addCheck({
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

  url(options?: { readonly message?: string }): this {
    return this.addCheck({ check: 'url', message: options?.message })
  }

  cuid(options?: { readonly message?: string }): this {
    return this.addCheck({ check: 'cuid', message: options?.message })
  }

  uuid(options?: { readonly message?: string }): this {
    return this.addCheck({ check: 'uuid', message: options?.message })
  }

  isoDate(options?: { readonly message?: string }): this {
    return this.addCheck({ check: 'iso_date', message: options?.message })
  }

  isoDuration(options?: { readonly message?: string }): this {
    return this.addCheck({ check: 'iso_duration', message: options?.message })
  }

  base64(options?: {
    readonly paddingRequired?: boolean
    readonly urlSafe?: boolean
    readonly message?: string
  }): this {
    return this.addCheck({
      check: 'base64',
      options: { paddingRequired: options?.paddingRequired ?? true, urlSafe: options?.urlSafe ?? true },
      message: options?.message,
    })
  }

  numeric(options?: {
    readonly noSymbols?: boolean
    readonly message?: string
  }): TString<Transforms, `${number}`, Coerce> {
    return this.addCheck({
      check: 'numeric',
      options: { noSymbols: options?.noSymbols ?? false },
      message: options?.message,
    }) as TString<Transforms, `${number}`, Coerce>
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  startsWith<T extends string>(
    prefix: T,
    options?: { readonly message?: string }
  ): TString<Transforms, `${T}${OutputFormat}`, Coerce> {
    return this.addCheck({ check: 'starts_with', prefix, message: options?.message }) as TString<
      Transforms,
      `${T}${OutputFormat}`,
      Coerce
    >
  }

  endsWith<T extends string>(
    suffix: T,
    options?: { readonly message?: string }
  ): TString<Transforms, `${OutputFormat}${T}`, Coerce> {
    return this.addCheck({ check: 'ends_with', suffix, message: options?.message }) as TString<
      Transforms,
      `${OutputFormat}${T}`,
      Coerce
    >
  }

  contains(substring: string, options?: { readonly message?: string }): this {
    return this.addCheck({ check: 'contains', substring, message: options?.message })
  }

  /* -------------------------------------------------- Transforms -------------------------------------------------- */

  /**
   * Removes leading and trailing whitespace from the string.
   *
   * @returns {TString} A new instance of `TString` with the transform added.
   */
  trim(): TString<[...Transforms, 'trim'], OutputFormat, Coerce> {
    return this._addTransform({ kind: 'trim' })
  }

  /**
   * Converts the string to lowercase.
   *
   * @returns {TString} A new instance of `TString` with the transform added.
   */
  lowercase(): TString<[...Transforms, 'lowercase'], OutputFormat, Coerce> {
    return this._addTransform({ kind: 'lowercase' })
  }

  /**
   * Converts the string to uppercase.
   *
   * @returns {TString} A new instance of `TString` with the transform added.
   */
  uppercase(): TString<[...Transforms, 'uppercase'], OutputFormat, Coerce> {
    return this._addTransform({ kind: 'uppercase' })
  }

  /**
   * Converts the string to capitalized.
   *
   * @returns {TString} A new instance of `TString` with the transform added.
   */
  capitalize(): TString<[...Transforms, 'capitalize'], OutputFormat, Coerce> {
    return this._addTransform({ kind: 'capitalize' })
  }

  /**
   * Converts the string to uncapitalized.
   *
   * @returns {TString} A new instance of `TString` with the transform added.
   */
  uncapitalize(): TString<[...Transforms, 'uncapitalize'], OutputFormat, Coerce> {
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
  ): TString<[...Transforms, 'replace'], OutputFormat, Coerce> {
    return this._addTransform({ kind: 'replace', search, replace, all: options?.all ?? true })
  }

  /* ------------------------------------------------------------------------------------------------------------------ */

  get minLength(): number | undefined {
    const min = this.getCheck('min')?.expected
    if (min) return min.inclusive ? min.value : min.value + 1
    return this.getCheck('length')?.expected
  }

  get maxLength(): number | undefined {
    const max = this.getCheck('max')?.expected
    if (max) return max.inclusive ? max.value : max.value - 1
    return this.getCheck('length')?.expected
  }

  get isEmail(): boolean {
    return this.hasCheck('email')
  }

  get isUrl(): boolean {
    return this.hasCheck('url')
  }

  get isCuid(): boolean {
    return this.hasCheck('cuid')
  }

  get isUuid(): boolean {
    return this.hasCheck('uuid')
  }

  get isIsoDate(): boolean {
    return this.hasCheck('iso_date')
  }

  get isIsoDuration(): boolean {
    return this.hasCheck('iso_duration')
  }

  get isBase64(): boolean {
    return this.hasCheck('base64')
  }

  get isNumeric(): boolean {
    return this.hasCheck('numeric')
  }

  get prefix(): string | undefined {
    return this.getCheck('starts_with')?.prefix
  }

  get suffix(): string | undefined {
    return this.getCheck('ends_with')?.suffix
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  private _addTransform<K extends TStringTransformKind>(
    transform: Extract<TStringTransform, { readonly kind: K }>
  ): TString<[...Transforms, K], OutputFormat, Coerce> {
    return new TString({ ...this._def, transforms: [...this._def.transforms, transform] })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create(options?: typeUtils.SimplifyFlat<TOptions>): TString {
    return new TString({
      typeName: TTypeName.String,
      transforms: [],
      checks: [],
      coerce: false,
      options: { ...options },
    })
  }

  static readonly _internals: {
    readonly rx: Readonly<Record<'alphanum' | 'cuid' | 'uuid' | 'iso_date' | 'iso_duration', RegExp>> & {
      readonly base64: {
        readonly paddingRequired: { readonly urlSafe: RegExp; readonly urlUnsafe: RegExp }
        readonly paddingNotRequired: { readonly urlSafe: RegExp; readonly urlUnsafe: RegExp }
      }
    }
    isIsoDate(data: string): string | null
  } = {
    rx: {
      alphanum: /^[a-zA-Z0-9]+$/,
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

    isIsoDate(value) {
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
  }
}

export type AnyTString = TString<TStringTransformKind[], string, boolean>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TNumber                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TNumberOutput<Cast extends boolean> = Cast extends true ? `${number}` : number

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TNumberInput<Coerce extends boolean> = Coerce extends true ? any : number

export interface TNumberManifest extends TManifest<number> {
  readonly checks: ToChecks<InvalidNumberIssue>
  readonly coerce: boolean
}

export interface TNumberDef extends TDef {
  readonly typeName: TTypeName.Number
  readonly checks: ToChecks<InvalidNumberIssue>
  readonly coerce: boolean
  readonly cast: boolean
}

export class TNumber<Coerce extends boolean = false, Cast extends boolean = false> extends TType<
  TNumberOutput<Cast>,
  TNumberDef,
  TNumberInput<Coerce>
> {
  get _manifest(): TManifest.Number<OutputOf<this>> {
    const { coerce, cast } = this._def

    const [minCheck, maxCheck, rangeCheck, multipleCheck] = this.getChecks('min', 'max', 'range', 'multiple')

    return {
      ...TManifest.base(this.isInteger ? TParsedType.Integer : TParsedType.Number),
      ...TManifest.minMax(minCheck?.expected, maxCheck?.expected, rangeCheck?.expected),
      ...(multipleCheck ? { multipleOf: multipleCheck.expected } : {}),
      coerce,
      cast,
    }
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    const { checks, coerce, cast } = this._def

    if (coerce) {
      ctx.setData(Number(ctx.data))
    }

    if (typeof ctx.data !== 'number' || Number.isNaN(ctx.data)) {
      return ctx.invalidType({ expected: TParsedType.Number }).abort()
    }

    const { data } = ctx

    const [safeCheck, finiteCheck] = this.getChecks('safe', 'finite') ?? {}

    if (safeCheck?.enabled && (data < Number.MIN_SAFE_INTEGER || data > Number.MAX_SAFE_INTEGER)) {
      ctx.addIssue(IssueKind.InvalidNumber, { check: 'safe', enabled: true }, safeCheck.message)
      if (ctx.common.abortEarly) {
        return ctx.abort()
      }
    }

    if (finiteCheck?.enabled && !Number.isFinite(data)) {
      ctx.addIssue(IssueKind.InvalidNumber, { check: 'finite', enabled: true }, finiteCheck.message)
      if (ctx.common.abortEarly) {
        return ctx.abort()
      }
    }

    for (const check of checks.filter(
      (c): c is Exclude<typeof c, { readonly check: 'safe' | 'finite' }> => !['safe', 'finite'].includes(c.check)
    )) {
      switch (check.check) {
        case 'integer':
          if (!Number.isInteger(data)) {
            ctx.addIssue(IssueKind.InvalidNumber, { check: check.check }, check.message)
            if (ctx.common.abortEarly) {
              return ctx.abort()
            }
          }

          break
        case 'precision':
          const precision = 10 ** check.expected.value // This is conceptually equivalent to using `.toFixed()` but much faster
          if (check.convert) {
            ctx.setData(Math.round(data * precision))
          } else {
            const { valid, decimals } = TNumber._internals.validatePrecision(data, check.expected)
            if (!valid) {
              ctx.addIssue(
                IssueKind.InvalidNumber,
                { check: check.check, expected: check.expected, convert: check.convert, received: decimals },
                check.message
              )
              if (ctx.common.abortEarly) {
                return ctx.abort()
              }
            }
          }

          break
        case 'min':
          if (check.expected.inclusive ? data < check.expected.value : data <= check.expected.value) {
            ctx.addIssue(
              IssueKind.InvalidNumber,
              { check: check.check, expected: check.expected, received: data },
              check.message
            )
            if (ctx.common.abortEarly) {
              return ctx.abort()
            }
          }

          break
        case 'max':
          if (check.expected.inclusive ? data > check.expected.value : data >= check.expected.value) {
            ctx.addIssue(
              IssueKind.InvalidNumber,
              { check: check.check, expected: check.expected, received: data },
              check.message
            )
            if (ctx.common.abortEarly) {
              return ctx.abort()
            }
          }

          break
        case 'range':
          if (
            (check.expected.min.inclusive ? data < check.expected.min.value : data <= check.expected.min.value) ||
            (check.expected.max.inclusive ? data > check.expected.max.value : data >= check.expected.max.value)
          ) {
            ctx.addIssue(
              IssueKind.InvalidNumber,
              { check: check.check, expected: check.expected, received: data },
              check.message
            )
            if (ctx.common.abortEarly) {
              return ctx.abort()
            }
          }

          break
        case 'port':
          if (data < 0 || data > 65535) {
            ctx.addIssue(IssueKind.InvalidNumber, { check: check.check }, check.message)
            if (ctx.common.abortEarly) {
              return ctx.abort()
            }
          }

          break
        case 'multiple':
          if (TNumber._internals.floatSafeRemainder(data, check.expected) !== 0) {
            ctx.addIssue(IssueKind.InvalidNumber, { check: check.check, expected: check.expected }, check.message)
            if (ctx.common.abortEarly) {
              return ctx.abort()
            }
          }

          break

        default:
          TError.assertNever(check)
      }
    }

    return ctx.isValid() ? OK((cast ? data.toString() : data) as OutputOf<this>) : ctx.abort()
  }

  /* --------------------------------------------------- Coercion --------------------------------------------------- */

  coerce<C extends boolean = true>(value = true as C): TNumber<C, Cast> {
    return new TNumber({ ...this._def, coerce: value })
  }

  cast<C extends boolean = true>(value = true as C): TNumber<Coerce, C> {
    return new TNumber({ ...this._def, cast: value })
  }

  /* ---------------------------------------------------- Checks ---------------------------------------------------- */

  /**
   * Requires the number to be an integer (no floating point).
   *
   * > _This check removes the `precision` check if it exists._
   *
   * @param {{ message?: string }} [options] Options for this check.
   * @param {string} [options.message] The error message to use if the check fails.
   * @returns {TNumber} A new instance of `TNumber` with the check added.
   */
  integer(options?: { readonly message?: string }): this {
    return this.addCheck({ check: 'integer', message: options?.message }, { remove: ['precision'] })
  }

  /**
   * Requires the number to be an integer (no floating point).
   *
   * > _Alias for {@link TNumber.integer|`TNumber.integer`}._
   *
   * @param {{ message?: string }} [options] Options for this check.
   * @param {string} [options.message] The error message to use if the check fails.
   * @returns {TNumber} A new instance of `TNumber` with the check added.
   */
  int(options?: { readonly message?: string }): this {
    return this.integer(options)
  }

  /**
   * Specifies the maximum number of decimal places allowed.
   *
   * > _This check removes the `integer` check if it exists._
   *
   * @template V
   * @param {NonNegativeInteger<V>} limit The maximum number of decimal places.
   * @param {{ inclusive?: boolean; convert?: boolean; message?: string }} [options] Options for this check.
   * @param {boolean} [options.inclusive=true] Whether the requirement is inclusive or exclusive. _Default: `true`._
   * @param {boolean} [options.convert=false] Whether to convert the validation data to
   * a number with the specified precision. _Default: `false`._
   * @param {string} [options.message] The error message to use if the check fails.
   * @returns {TNumber} A new instance of `TNumber` with the check added.
   */
  precision<V extends number>(
    limit: NonNegativeInteger<V>,
    options?: { readonly inclusive?: boolean; readonly convert?: boolean; readonly message?: string }
  ): this {
    return this.addCheck(
      {
        check: 'precision',
        expected: { value: limit, inclusive: options?.inclusive ?? true },
        convert: options?.convert ?? false,
        message: options?.message,
      },
      { remove: ['integer'] }
    )
  }

  min(value: number, options?: { readonly inclusive?: boolean; readonly message?: string }): this {
    return this.addCheck(
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

  max(value: number, options?: { readonly inclusive?: boolean; readonly message?: string }): this {
    return this.addCheck(
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

  positive(options?: { readonly message?: string }): this {
    return this.min(0, { inclusive: false, message: options?.message })
  }

  nonnegative(options?: { readonly message?: string }): this {
    return this.min(0, { inclusive: true, message: options?.message })
  }

  negative(options?: { readonly message?: string }): this {
    return this.max(0, { inclusive: false, message: options?.message })
  }

  nonpositive(options?: { readonly message?: string }): this {
    return this.max(0, { inclusive: true, message: options?.message })
  }

  range(
    min: number,
    max: number,
    options?: { readonly minInclusive?: boolean; readonly maxInclusive?: boolean; readonly message?: string }
  ): this {
    return this.addCheck(
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

  port(options?: { readonly message?: string }): this {
    return this.addCheck({ check: 'port', message: options?.message })
  }

  multiple(base: number, options?: { readonly message?: string }): this {
    return this.addCheck({ check: 'multiple', expected: base, message: options?.message })
  }

  step(value: number, options?: { readonly message?: string }): this {
    return this.multiple(value, options)
  }

  safe(enabled = true, options?: { readonly message?: string }): this {
    return this.addCheck({ check: 'safe', enabled, message: options?.message })
  }

  unsafe(options?: { readonly message?: string }): this {
    return this.safe(false, options)
  }

  finite(enabled = true, options?: { readonly message?: string }): this {
    return this.addCheck({ check: 'finite', enabled, message: options?.message })
  }

  infinite(options?: { readonly message?: string }): this {
    return this.finite(false, options)
  }

  get isInteger(): boolean {
    return this.hasCheck('integer')
  }

  get isPositive(): boolean | undefined {
    return TNumber._internals.checkPositive(this.getCheck('min'), this.getCheck('range'))
  }

  get isNegative(): boolean | undefined {
    return TNumber._internals.checkNegative(this.getCheck('max'), this.getCheck('range'))
  }

  get isFinite(): boolean {
    return this.hasCheck('finite')
  }

  get isPort(): boolean {
    return this.hasCheck('port')
  }

  get isMultiple(): boolean {
    return this.hasCheck('multiple')
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create(options?: typeUtils.SimplifyFlat<TOptions>): TNumber {
    return new TNumber({ typeName: TTypeName.Number, checks: [], coerce: false, cast: false, options: { ...options } })
      .safe()
      .finite()
  }

  static readonly _internals: {
    readonly rx: {
      readonly precision: RegExp
    }
    floatSafeRemainder(value: number, step: number): number
    checkPositive<T extends number | bigint>(
      minCheck: StrictOmit<TChecks.Min<T>, 'received'> | undefined,
      rangeCheck: StrictOmit<TChecks.Range<T>, 'received'> | undefined
    ): boolean | undefined
    checkNegative<T extends number | bigint>(
      maxCheck: StrictOmit<TChecks.Max<T>, 'received'> | undefined,
      rangeCheck: StrictOmit<TChecks.Range<T>, 'received'> | undefined
    ): boolean | undefined
    validatePrecision(
      data: number,
      expected: { readonly value: number; readonly inclusive: boolean }
    ): { readonly valid: boolean; readonly decimals: number }
  } = {
    rx: {
      precision: /(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/,
    },

    floatSafeRemainder(value, step) {
      const valDecCount = (value.toString().split('.')[1] || '').length
      const stepDecCount = (step.toString().split('.')[1] || '').length
      const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount
      const valInt = parseInt(value.toFixed(decCount).replace('.', ''), 10)
      const stepInt = parseInt(step.toFixed(decCount).replace('.', ''), 10)
      return (valInt % stepInt) / 10 ** decCount
    },

    checkPositive(minCheck, rangeCheck) {
      return (
        (minCheck &&
          (minCheck.expected.value > 0 || (!minCheck.expected.inclusive && minCheck.expected.value === 0))) ??
        (rangeCheck &&
          (rangeCheck.expected.min.value > 0 ||
            (!rangeCheck.expected.min.inclusive && rangeCheck.expected.min.value === 0)))
      )
    },

    checkNegative(maxCheck, rangeCheck) {
      return (
        (maxCheck &&
          (maxCheck.expected.value < 0 || (!maxCheck.expected.inclusive && maxCheck.expected.value === 0))) ??
        (rangeCheck &&
          (rangeCheck.expected.max.value < 0 ||
            (!rangeCheck.expected.max.inclusive && rangeCheck.expected.max.value === 0)))
      )
    },

    validatePrecision(data, expected) {
      const places = [...(this.rx.precision.exec(data.toString()) ?? [])]
      const decimals = Math.max((places[1] ? places[1].length : 0) - (places[2] ? parseInt(places[2], 10) : 0), 0)
      return { valid: expected.inclusive ? decimals <= expected.value : decimals < expected.value, decimals }
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
    return { ...TManifest.base(TParsedType.NaN) }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return typeof ctx.data === 'number' && Number.isNaN(ctx.data)
      ? OK(ctx.data)
      : ctx.invalidType({ expected: TParsedType.NaN }).abort()
  }

  static create(options?: typeUtils.SimplifyFlat<TOptions>): TNaN {
    return new TNaN({ typeName: TTypeName.NaN, options: { ...options } })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TBigInt                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TBigIntInput<Coerce extends boolean> = bigint | (Coerce extends true ? string | number | boolean : never)

export interface TBigIntManifest extends TManifest<bigint> {
  readonly checks: ToChecks<InvalidBigIntIssue>
  readonly coerce: boolean
}

export interface TBigIntDef<Coerce extends boolean> extends TDef {
  readonly typeName: TTypeName.BigInt
  readonly checks: ToChecks<InvalidBigIntIssue>
  readonly coerce: Coerce
}

export class TBigInt<Coerce extends boolean = false> extends TType<bigint, TBigIntDef<Coerce>, TBigIntInput<Coerce>> {
  get _manifest(): TBigIntManifest {
    const { checks, coerce } = this._def
    return { ...TManifest.base(TParsedType.BigInt), checks, coerce }
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
            ctx.addIssue(
              IssueKind.InvalidBigInt,
              { check: check.check, expected: check.expected, received: data },
              check.message
            )
            if (ctx.common.abortEarly) {
              return ctx.abort()
            }
          }

          break
        case 'max':
          if (check.expected.inclusive ? data > check.expected.value : data >= check.expected.value) {
            ctx.addIssue(
              IssueKind.InvalidBigInt,
              { check: check.check, expected: check.expected, received: data },
              check.message
            )
            if (ctx.common.abortEarly) {
              return ctx.abort()
            }
          }

          break
        case 'range':
          if (
            (check.expected.min.inclusive ? data < check.expected.min.value : data <= check.expected.min.value) ||
            (check.expected.max.inclusive ? data > check.expected.max.value : data >= check.expected.max.value)
          ) {
            ctx.addIssue(
              IssueKind.InvalidBigInt,
              { check: check.check, expected: check.expected, received: data },
              check.message
            )
            if (ctx.common.abortEarly) {
              return ctx.abort()
            }
          }

          break
        case 'multiple':
          if (data % check.expected !== BigInt(0)) {
            ctx.addIssue(
              IssueKind.InvalidBigInt,
              { check: check.check, expected: check.expected, received: data },
              check.message
            )
            if (ctx.common.abortEarly) {
              return ctx.abort()
            }
          }

          break

        default:
          TError.assertNever(check)
      }
    }

    return ctx.isValid() ? OK(data) : ctx.abort()
  }

  /* --------------------------------------------------- Coercion --------------------------------------------------- */

  coerce<C extends boolean = true>(value = true as C): TBigInt<C> {
    return new TBigInt({ ...this._def, coerce: value })
  }

  /* ---------------------------------------------------- Checks ---------------------------------------------------- */

  min<V extends Numeric>(
    value: Integer<V>,
    options?: { readonly inclusive?: boolean; readonly message?: string }
  ): this {
    return this.addCheck(
      {
        check: 'min',
        expected: { value: BigInt(value), inclusive: options?.inclusive ?? true },
        message: options?.message,
      },
      { remove: ['range'] }
    )
  }

  gt<V extends Numeric>(value: Integer<V>, options?: { readonly message?: string }): this {
    return this.min(value, { inclusive: false, message: options?.message })
  }

  gte<V extends Numeric>(value: Integer<V>, options?: { readonly message?: string }): this {
    return this.min(value, { inclusive: true, message: options?.message })
  }

  max<V extends Numeric>(
    value: Integer<V>,
    options?: { readonly inclusive?: boolean; readonly message?: string }
  ): this {
    return this.addCheck(
      {
        check: 'max',
        expected: { value: BigInt(value), inclusive: options?.inclusive ?? true },
        message: options?.message,
      },
      { remove: ['range'] }
    )
  }

  lt<V extends Numeric>(value: Integer<V>, options?: { readonly message?: string }): this {
    return this.max(value, { inclusive: false, message: options?.message })
  }

  lte<V extends Numeric>(value: Integer<V>, options?: { readonly message?: string }): this {
    return this.max(value, { inclusive: true, message: options?.message })
  }

  positive(options?: { readonly message?: string }): this {
    return this.min(0, { inclusive: false, message: options?.message })
  }

  nonnegative(options?: { readonly message?: string }): this {
    return this.min(0, { inclusive: true, message: options?.message })
  }

  negative(options?: { readonly message?: string }): this {
    return this.max(0, { inclusive: false, message: options?.message })
  }

  nonpositive(options?: { readonly message?: string }): this {
    return this.max(0, { inclusive: true, message: options?.message })
  }

  range<Min extends Numeric, Max extends Numeric>(
    min: Integer<Min>,
    max: Integer<Max>,
    options?: { readonly minInclusive?: boolean; readonly maxInclusive?: boolean; readonly message?: string }
  ): this {
    return this.addCheck(
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

  between<Min extends Numeric, Max extends Numeric>(
    min: Integer<Min>,
    max: Integer<Max>,
    options?: { readonly minInclusive?: boolean; readonly maxInclusive?: boolean; readonly message?: string }
  ): this {
    return this.range(min, max, options)
  }

  multiple<V extends Numeric>(base: Integer<V>, options?: { readonly message?: string }): this {
    return this.addCheck({ check: 'multiple', expected: BigInt(value), message: options?.message })
  }

  step<V extends Numeric>(value: Integer<V>, options?: { readonly message?: string }): this {
    return this.multiple(value, options)
  }

  get isPositive(): boolean | undefined {
    return TNumber._internals.checkPositive(this.getCheck('min'), this.getCheck('range'))
  }

  get isNegative(): boolean | undefined {
    return TNumber._internals.checkNegative(this.getCheck('max'), this.getCheck('range'))
  }

  get isMultiple(): boolean {
    return this.hasCheck('multiple')
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create(options?: typeUtils.SimplifyFlat<TOptions>): TBigInt {
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

export type TBooleanInput<Coerce extends TBooleanCoercion> = Coerce extends true
  ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any
  : Coerce extends Record<string, unknown>
  ? Coerce['falsy'] extends ReadonlyArray<infer F>
    ? F | (Coerce['truthy'] extends ReadonlyArray<infer T> ? T : never)
    : Coerce['truthy'] extends ReadonlyArray<infer T>
    ? T
    : never
  : boolean

export interface TBooleanManifest extends TManifest<boolean> {
  readonly coerce: TBooleanCoercion
}

export interface TBooleanDef extends TDef {
  readonly typeName: TTypeName.Boolean
  readonly coerce: TBooleanCoercion
}

export class TBoolean<Coerce extends TBooleanCoercion = false> extends TType<
  boolean,
  TBooleanDef,
  TBooleanInput<Coerce>
> {
  get _manifest(): TBooleanManifest {
    const { coerce } = this._def
    return { ...TManifest.base(TParsedType.Boolean), coerce }
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

  coerce<C extends TBooleanCoercion>(value: Narrow<C>): TBoolean<C> {
    return new TBoolean({ ...this._def, coerce: value as C })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  truthy<T extends readonly Primitive[]>(
    ...values: T
  ): TBoolean<
    Coerce extends Record<string, unknown> ? typeUtils.SimplifyFlat<Merge<Coerce, { truthy: T }>> : { truthy: T }
  > {
    return new TBoolean({
      ...this._def,
      coerce: { ...(typeof this._def.coerce === 'object' ? this._def.coerce : {}), truthy: values },
    })
  }

  falsy<T extends readonly Primitive[]>(
    ...values: T
  ): TBoolean<
    Coerce extends Record<string, unknown> ? typeUtils.SimplifyFlat<Merge<Coerce, { falsy: T }>> : { falsy: T }
  > {
    return new TBoolean({
      ...this._def,
      coerce: { ...(typeof this._def.coerce === 'object' ? this._def.coerce : {}), falsy: values },
    })
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
  get _manifest(): TManifest.Literal<true> {
    return {
      ...TManifest.base(TParsedType.True),
      literal: stringUtils.literalize(true),
      required: true,
      nullable: false,
    }
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
  get _manifest(): TManifest.Literal<false> {
    return {
      ...TManifest.base(TParsedType.False),
      literal: stringUtils.literalize(false),
      required: true,
      nullable: false,
    }
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

export type TDateInput<Coerce extends boolean> = Date | (Coerce extends true ? string | number : never)

export const handleTDateCheckInput = (value: Date | 'now', currentDate: Date): Date =>
  value === 'now' ? currentDate : value

export interface TDateManifest extends TManifest<Date> {
  readonly checks: ToChecks<InvalidDateIssue>
  readonly coerce: boolean
}

export interface TDateDef<Coerce extends boolean> extends TDef {
  readonly typeName: TTypeName.Date
  readonly checks: ToChecks<InvalidDateIssue>
  readonly coerce: Coerce
}

export class TDate<Coerce extends boolean = false> extends TType<Date, TDateDef<Coerce>, TDateInput<Coerce>> {
  get _manifest(): TDateManifest {
    const { checks, coerce } = this._def
    return { ...TManifest.base(TParsedType.Date), checks, coerce }
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

  coerce<C extends boolean = true>(value = true as C): TDate<C> {
    return new TDate({ ...this._def, coerce: value })
  }

  /* ---------------------------------------------------- Checks ---------------------------------------------------- */

  min(value: TDateCheckInput, options?: { readonly inclusive?: boolean; readonly message?: string }): this {
    return this.addCheck(
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
    return this.addCheck(
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
    return this.addCheck(
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
    return { ...TManifest.base(TParsedType.Symbol) }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return typeof ctx.data === 'symbol' ? OK(ctx.data) : ctx.invalidType({ expected: TParsedType.Symbol }).abort()
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create(options?: typeUtils.SimplifyFlat<TOptions>): TSymbol {
    return new TSymbol({ typeName: TTypeName.Symbol, options: { ...options } })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TBuffer                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TBufferInput<Coerce extends boolean> = Buffer | (Coerce extends true ? string : never)

export interface TBufferDef extends TDef {
  readonly typeName: TTypeName.Buffer
  readonly checks: ToChecks<InvalidBufferIssue>
  readonly coerce: boolean
}

export class TBuffer<Coerce extends boolean = false> extends TType<Buffer, TBufferDef, TBufferInput<Coerce>> {
  get _manifest(): TManifest.Buffer<OutputOf<this>> {
    const { coerce } = this._def

    const [minCheck, maxCheck, lengthCheck] = this.getChecks('min', 'max', 'length')

    return {
      ...TManifest.base(TParsedType.Buffer),
      ...TManifest.length(minCheck?.expected, maxCheck?.expected, lengthCheck?.expected),
      coerce,
    }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    const { checks, coerce } = this._def

    if (coerce && typeof ctx.data === 'string') {
      ctx.setData(Buffer.from(ctx.data))
    }

    if (!Buffer.isBuffer(ctx.data)) {
      return ctx.invalidType({ expected: TParsedType.Buffer }).abort()
    }

    const { data } = ctx

    for (const check of checks) {
      switch (check.check) {
        case 'min':
          if (check.expected.inclusive ? data.length < check.expected.value : data.length <= check.expected.value) {
            ctx.addIssue(IssueKind.InvalidBuffer, { ...check, received: data.length }, check.message)
            if (ctx.common.abortEarly) {
              return ctx.abort()
            }
          }

          break
        case 'max':
          if (check.expected.inclusive ? data.length > check.expected.value : data.length >= check.expected.value) {
            ctx.addIssue(IssueKind.InvalidBuffer, { ...check, received: data.length }, check.message)
            if (ctx.common.abortEarly) {
              return ctx.abort()
            }
          }

          break
        case 'length':
          if (data.length !== check.expected) {
            ctx.addIssue(IssueKind.InvalidBuffer, { ...check, received: data.length }, check.message)
            if (ctx.common.abortEarly) {
              return ctx.abort()
            }
          }

          break

        default:
          TError.assertNever(check)
      }
    }

    return ctx.isValid() ? OK(data) : ctx.abort()
  }

  /* ---------------------------------------------------- Coerce ---------------------------------------------------- */

  coerce<C extends boolean = true>(value = true as C): TBuffer<C> {
    return new TBuffer({ ...this._def, coerce: value })
  }

  /* ---------------------------------------------------- Checks ---------------------------------------------------- */

  min<V extends number>(
    value: NonNegative<V>,
    options?: { readonly inclusive?: boolean; readonly message?: string }
  ): this {
    return this.addCheck(
      { check: 'min', expected: { value, inclusive: options?.inclusive ?? true }, message: options?.message },
      { remove: ['length'] }
    )
  }

  max<V extends number>(
    value: NonNegative<V>,
    options?: { readonly inclusive?: boolean; readonly message?: string }
  ): this {
    return this.addCheck(
      { check: 'max', expected: { value, inclusive: options?.inclusive ?? true }, message: options?.message },
      { remove: ['length'] }
    )
  }

  length<L extends number>(length: NonNegative<L>, options?: { readonly message?: string }): this {
    return this.addCheck({ check: 'length', expected: length, message: options?.message }, { remove: ['min', 'max'] })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create(options?: typeUtils.SimplifyFlat<TOptions>): TBuffer {
    return new TBuffer({ typeName: TTypeName.Buffer, checks: [], coerce: false, options: { ...options } })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TLiteral                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TLiteralOptions = TOptions<{
  additionalIssueKind: EIssueKind['InvalidLiteral']
}>

export interface TLiteralDef<T extends Primitive> extends TDef {
  readonly typeName: TTypeName.Literal
  readonly options: TLiteralOptions
  readonly value: T
}

export class TLiteral<T extends Primitive> extends TType<T, TLiteralDef<T>> {
  get _manifest(): TManifest.Literal<T> {
    return {
      ...TManifest.base(TParsedType.Literal(this.value)),
      literal: stringUtils.literalize(this.value),
      required: (this.value !== undefined) as T extends undefined ? false : true,
      nullable: (this.value === null) as T extends null ? true : false,
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

export interface TEnumDef<T extends ReadonlyArray<string | number>> extends TDef {
  readonly typeName: TTypeName.Enum
  readonly options: TEnumOptions
  readonly values: T
}

export class TEnum<T extends ReadonlyArray<string | number>> extends TType<T[number], TEnumDef<T>> {
  get _manifest(): TManifest.Enum<T> {
    return { ...TManifest.base(TParsedType.Enum(this.values)), enum: this.values }
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

  /* ---------------------------------------------------------------------------------------------------------------- */

  get values(): Readonly<T> {
    return this._def.values
  }

  get enum(): { readonly [K in T[number]]: K } {
    return this.values.reduce((acc, value) => ({ ...acc, [value]: value }), {} as { readonly [K in T[number]]: K })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  extract<K extends readonly [T[number], ...Array<T[number]>]>(
    keys: K
  ): TEnum<Filter<T, Exclude<T[number], K[number]>>> {
    return new TEnum({
      ...this._def,
      values: this.values.filter((value): value is K[number] => arrayUtils.includes(keys, value)) as Filter<
        T,
        Exclude<T[number], K[number]>
      >,
    })
  }

  exclude<K extends readonly [T[number], ...Array<T[number]>]>(keys: K): TEnum<Filter<T, K[number]>> {
    return new TEnum({
      ...this._def,
      values: this.values.filter(
        (value): value is Exclude<T[number], K[number]> => !arrayUtils.includes(keys, value)
      ) as Filter<T, K[number]>,
    })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create<T extends string | number, U extends readonly [T, ...T[]]>(
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
  objectFromEntries(
    objectKeys(enum_)
      .filter((k) => typeof enum_[enum_[k]] !== 'number')
      .map((k) => [k, enum_[k]])
  )

export interface TNativeEnumDef<T extends EnumLike> extends TDef {
  readonly typeName: TTypeName.NativeEnum
  readonly options: TEnumOptions
  readonly enum: T
}

export class TNativeEnum<T extends EnumLike> extends TType<T[keyof T], TNativeEnumDef<T>> {
  get _manifest(): TManifest.Enum<this['values'], T[keyof T]> {
    return { ...TManifest.base(TParsedType.Enum(this.values)), enum: this.values }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    const { data } = ctx

    const values = objectValues(_getValidEnum(this.enum))

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

  /* ---------------------------------------------------------------------------------------------------------------- */

  get enum(): T {
    return _getValidEnum(this._def.enum) as unknown as T
  }

  get values(): typeUtils.Try<Readonly<typeUtils.UnionToTuple<T[keyof T]>>, ReadonlyArray<string | number>> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
    return objectValues(_getValidEnum(this.enum)) as any
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  // extract<K extends readonly [T[keyof T], ...Array<T[keyof T]>]>(
  //   keys: K
  // ): TEnum<Filter<T, Exclude<T[keyof T], K[number]>>> {
  //   return new TEnum({
  //     ...this._def,
  //     values: this.values.filter((value): value is K[number] => arrayUtils.includes(keys, value)) as Filter<
  //       T,
  //       Exclude<T[keyof T], K[number]>
  //     >,
  //   })
  // }

  // exclude<K extends readonly [T[number], ...Array<T[number]>]>(keys: K): TEnum<Filter<T, K[number]>> {
  //   return new TEnum({
  //     ...this._def,
  //     values: this.values.filter(
  //       (value): value is Exclude<T[number], K[number]> => !arrayUtils.includes(keys, value)
  //     ) as Filter<T, K[number]>,
  //   })
  // }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create<T extends EnumLike>(enum_: T, options?: typeUtils.SimplifyFlat<TEnumOptions>): TNativeEnum<T> {
    return new TNativeEnum({ typeName: TTypeName.NativeEnum, enum: enum_, options: { ...options } })
  }
}

export type AnyTNativeEnum = TNativeEnum<EnumLike>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TArray                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TArrayCardinality = 'none' | 'atleastone' | 'many'

export type TArrayIO<T extends AnyTType, Card extends TArrayCardinality, IO extends '$I' | '$O' = '$O'> = {
  none: []
  atleastone: [T[IO], ...Array<T[IO]>]
  many: Array<T[IO]>
}[Card]

export type TArrayOutput<T extends AnyTType, Card extends TArrayCardinality, Cast extends boolean> = Cast extends true
  ? Set<OutputOf<T>>
  : TArrayIO<T, Card>

export type TArrayInput<T extends AnyTType, Card extends TArrayCardinality, Coerce extends boolean> =
  | TArrayIO<T, Card, '$I'>
  | (Coerce extends true ? Set<InputOf<T>> : never)

export type FlattenTArray<T extends AnyTArray, D extends 'flat' | 'deep' = 'flat'> = T['element'] extends TArray<
  infer U,
  infer C,
  infer Coerce,
  infer Cast
>
  ? D extends 'deep'
    ? FlattenTArray<TArray<U, C, Coerce, Cast>, 'deep'>
    : TArray<U, C, Coerce, Cast>
  : T

const flattenTArrayElement = <T extends AnyTArray, D extends 'flat' | 'deep' = 'flat'>(
  array: T,
  depth?: D
): FlattenTArray<T, D> =>
  (array.element instanceof TArray
    ? depth === 'deep'
      ? flattenTArrayElement(array.element, depth)
      : array.element
    : array) as FlattenTArray<T, D>

export interface TArrayManifest<T extends AnyTType, Card extends TArrayCardinality>
  extends TManifest<TArrayIO<T, Card>> {
  readonly element: ManifestOf<T>
  readonly cardinality: TArrayCardinality
  readonly minItems?: number
  readonly maxItems?: number
  readonly unique: boolean
  readonly coerce: boolean
  readonly cast: boolean
}

export interface TArrayDef<T extends AnyTType> extends TDef {
  readonly typeName: TTypeName.Array
  readonly element: T
  readonly cardinality: TArrayCardinality
  readonly minItems?: { readonly value: number; readonly inclusive: boolean; readonly message: string | undefined }
  readonly maxItems?: { readonly value: number; readonly inclusive: boolean; readonly message: string | undefined }
  readonly length?: { readonly value: number; readonly message: string | undefined }
  readonly unique?: {
    readonly comparatorFn: ((a: unknown, b: unknown, ia: number, ib: number) => boolean) | undefined
    readonly convert: boolean | undefined
    readonly message: string | undefined
  }
  readonly sorted?: {
    readonly sortFn: ((a: unknown, b: unknown) => number) | undefined
    readonly convert: boolean
    readonly message: string | undefined
  }
  readonly coerce: boolean
  readonly cast: boolean
}

export class TArray<
  T extends AnyTType,
  Card extends TArrayCardinality = 'many',
  Coerce extends boolean = false,
  Cast extends boolean = false
> extends TType<TArrayOutput<T, Card, Cast>, TArrayDef<T>, TArrayInput<T, Card, Coerce>> {
  get _manifest(): TArrayManifest<T, Card> {
    const { element, cardinality, minItems, maxItems, length, unique, coerce, cast } = this._def

    return {
      ...TManifest.base(TParsedType.Array),
      element: element.manifest(),
      cardinality,
      minItems: length?.value ?? (minItems && (minItems.inclusive ? minItems.value : minItems.value + 1)),
      maxItems: length?.value ?? (maxItems && (maxItems.inclusive ? maxItems.value : maxItems.value - 1)),
      unique: Boolean(unique),
      coerce,
      cast,
    }
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    const { coerce, cast } = this._def

    if (coerce && ctx.data instanceof Set) {
      ctx.setData([...ctx.data])
    }

    if (!arrayUtils.isArray(ctx.data)) {
      return ctx.invalidType({ expected: TParsedType.Array }).abort()
    }

    const { element, minItems, maxItems, length, unique, sorted } = this._def
    const { data } = ctx

    if (length && data.length !== length.value) {
      ctx.addIssue(
        IssueKind.InvalidArray,
        { check: 'length', expected: length.value, received: data.length },
        length.message
      )
      if (ctx.common.abortEarly) {
        return ctx.abort()
      }
    } else {
      if (minItems && (minItems.inclusive ? data.length < minItems.value : data.length <= minItems.value)) {
        ctx.addIssue(
          IssueKind.InvalidArray,
          { check: 'min', expected: minItems, received: data.length },
          minItems.message
        )
        if (ctx.common.abortEarly) {
          return ctx.abort()
        }
      }

      if (maxItems && (maxItems.inclusive ? data.length > maxItems.value : data.length >= maxItems.value)) {
        ctx.addIssue(
          IssueKind.InvalidArray,
          { check: 'max', expected: maxItems, received: data.length },
          maxItems.message
        )
        if (ctx.common.abortEarly) {
          return ctx.abort()
        }
      }
    }

    const result: Array<OutputOf<T>> = []

    const finalizeArray = (): ParseResultOf<this> => {
      let finalResult = [...result]

      if (unique) {
        const { comparatorFn, convert, message } = unique

        const uniqueRes = comparatorFn ? filterUniqueBy(result, comparatorFn) : [...new Set(result)]

        if (convert) {
          finalResult = uniqueRes
        } else if (uniqueRes.length !== result.length) {
          ctx.addIssue(IssueKind.InvalidArray, { check: 'unique' }, message)
          if (ctx.common.abortEarly) {
            return ctx.abort()
          }
        }
      }

      if (sorted) {
        const { sortFn, convert, message } = sorted

        const sortedRes = [...result].sort(sortFn)

        if (convert) {
          finalResult = sortedRes
        } else {
          for (const [i, v] of sortedRes.entries()) {
            if (v !== result[i]) {
              ctx.child(element, v, [i]).addIssue(IssueKind.InvalidArray, { check: 'sorted' }, message)
              if (ctx.common.abortEarly) {
                return ctx.abort()
              }
            }
          }
        }
      }

      return ctx.isValid() ? OK((cast ? new Set(finalResult) : finalResult) as OutputOf<this>) : ctx.abort()
    }

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

        return finalizeArray()
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

    return finalizeArray()
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

  /* ----------------------------------------------- Coercion/Casting ----------------------------------------------- */

  coerce<C extends boolean = true>(value = true as C): TArray<T, Card, C, Cast> {
    return new TArray({ ...this._def, coerce: value })
  }

  cast<C extends boolean = true>(value = true as C): TArray<T, Card, Coerce, C> {
    return new TArray({ ...this._def, cast: value })
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
  ): TArray<T, Card, Coerce, Cast> {
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
  ): TArray<T, Card, Coerce, Cast> {
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
  length<L extends number>(
    length: NonNegativeInteger<L>,
    options?: { readonly message?: string }
  ): TArray<T, Card, Coerce, Cast> {
    return new TArray({
      ...this._def,
      minItems: undefined,
      maxItems: undefined,
      length: { value: length, message: options?.message },
    })
  }

  nonempty(options?: { readonly message?: string }): TArray<T, 'atleastone', Coerce, Cast> {
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

  unique(options?: { readonly convert?: boolean; readonly message?: string }): TArray<T, Card, Coerce, Cast>
  unique(
    comparatorFn: (a: OutputOf<T>, b: OutputOf<T>, ia: number, ib: number) => boolean,
    options?: { readonly convert?: boolean; readonly message?: string }
  ): TArray<T, Card, Coerce, Cast>
  unique(
    comparatorFnOrOptions?:
      | ((a: OutputOf<T>, b: OutputOf<T>, ia: number, ib: number) => boolean)
      | { readonly convert?: boolean; readonly message?: string },
    maybeOptions?: { readonly convert?: boolean; readonly message?: string }
  ): TArray<T, Card, Coerce, Cast> {
    const comparatorFn = typeof comparatorFnOrOptions === 'function' ? comparatorFnOrOptions : undefined
    const options = typeof comparatorFnOrOptions === 'function' ? maybeOptions : comparatorFnOrOptions

    return new TArray({
      ...this._def,
      unique: { comparatorFn, convert: options?.convert, message: options?.message },
    })
  }

  get isUnique(): boolean {
    return Boolean(this._def.unique)
  }

  sorted(options?: { readonly convert?: boolean; readonly message?: string }): TArray<T, Card, Coerce, Cast>
  sorted(
    sortFn: (a: OutputOf<T>, b: OutputOf<T>) => number,
    options?: { readonly convert?: boolean; readonly message?: string }
  ): TArray<T, Card, Coerce, Cast>
  sorted(
    sortFnOrOptions?:
      | ((a: OutputOf<T>, b: OutputOf<T>) => number)
      | { readonly convert?: boolean; readonly message?: string },
    maybeOptions?: { readonly convert?: boolean; readonly message?: string }
  ): TArray<T, Card, Coerce, Cast> {
    const sortFn = typeof sortFnOrOptions === 'function' ? sortFnOrOptions : undefined
    const options = typeof sortFnOrOptions === 'function' ? maybeOptions : sortFnOrOptions

    return new TArray({
      ...this._def,
      sorted: { sortFn, convert: options?.convert ?? false, message: options?.message },
    })
  }

  sparse(enabled?: true): TArray<TOptional<T>, Card, Coerce, Cast>
  sparse(enabled: false): TArray<TDefined<T>, Card, Coerce, Cast>
  sparse(enabled = true): TArray<TOptional<T> | TDefined<T>, Card, Coerce, Cast> {
    return new TArray({ ...this._def, element: this.element[enabled ? 'optional' : 'defined']() })
  }

  partial(): TArray<TOptional<T>, Card, Coerce, Cast> {
    return this.sparse(true)
  }

  required(): TArray<TDefined<T>, Card, Coerce, Cast> {
    return this.sparse(false)
  }

  flatten<D extends boolean = false>(options?: {
    readonly deep?: D
  }): FlattenTArray<this, D extends true ? 'deep' : 'flat'> {
    return new TArray({
      ...this._def,
      element: flattenTArrayElement(this, options?.deep ? 'deep' : 'flat'),
    }) as FlattenTArray<this, D extends true ? 'deep' : 'flat'>
  }

  toSet(): TSet<T, Coerce, Cast> {
    return new TSet({ ...this._def, typeName: TTypeName.Set, size: this._def.length })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create<T extends AnyTType>(
    element: T,
    options?: typeUtils.SimplifyFlat<TOptions>
  ): TArray<T, T extends TNever ? 'none' : 'many'> {
    return new TArray({
      typeName: TTypeName.Array,
      element,
      cardinality: element.isT(TTypeName.Never) ? 'none' : 'many',
      coerce: false,
      cast: false,
      options: { ...options },
    })
  }
}

export type AnyTArray = TArray<AnyTType, TArrayCardinality, boolean, boolean>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TSet                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TSetOutput<T extends AnyTType, Cast extends boolean> = Cast extends true
  ? Array<OutputOf<T>>
  : Set<OutputOf<T>>

export type TSetInput<T extends AnyTType, Coerce extends boolean> =
  | Set<InputOf<T>>
  | (Coerce extends true ? Array<InputOf<T>> : never)

export interface TSetManifest<T extends AnyTType> extends TManifest<Set<OutputOf<T>>> {
  readonly element: ManifestOf<T>
  readonly minItems?: number
  readonly maxItems?: number
  readonly coerce: boolean
  readonly cast: boolean
}

export interface TSetDef<T extends AnyTType> extends TDef {
  readonly typeName: TTypeName.Set
  readonly element: T
  readonly minItems?: { readonly value: number; readonly inclusive: boolean; readonly message: string | undefined }
  readonly maxItems?: { readonly value: number; readonly inclusive: boolean; readonly message: string | undefined }
  readonly size?: { readonly value: number; readonly message: string | undefined }
  readonly coerce: boolean
  readonly cast: boolean
}

export class TSet<T extends AnyTType, Coerce extends boolean = false, Cast extends boolean = false> extends TType<
  TSetOutput<T, Cast>,
  TSetDef<T>,
  TSetInput<T, Coerce>
> {
  get _manifest(): TSetManifest<T> {
    const { element, minItems, maxItems, size, coerce, cast } = this._def

    return {
      ...TManifest.base(TParsedType.Set),
      element: element.manifest(),
      minItems: size?.value ?? (minItems && (minItems.inclusive ? minItems.value : minItems.value + 1)),
      maxItems: size?.value ?? (maxItems && (maxItems.inclusive ? maxItems.value : maxItems.value - 1)),
      coerce,
      cast,
    }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    const { coerce, cast } = this._def

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
      if (ctx.common.abortEarly) {
        return ctx.abort()
      }
    } else {
      if (minItems && (minItems.inclusive ? data.size < minItems.value : data.size <= minItems.value)) {
        ctx.addIssue(IssueKind.InvalidSet, { check: 'min', expected: minItems, received: data.size }, minItems.message)
        if (ctx.common.abortEarly) {
          return ctx.abort()
        }
      }

      if (maxItems && (maxItems.inclusive ? data.size > maxItems.value : data.size >= maxItems.value)) {
        ctx.addIssue(IssueKind.InvalidSet, { check: 'max', expected: maxItems, received: data.size }, maxItems.message)
        if (ctx.common.abortEarly) {
          return ctx.abort()
        }
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

          return ctx.isValid() ? OK((cast ? [...result] : result) as OutputOf<this>) : ctx.abort()
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

    return ctx.isValid() ? OK((cast ? [...result] : result) as OutputOf<this>) : ctx.abort()
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

  /* ----------------------------------------------- Coercion/Casting ----------------------------------------------- */

  coerce<C extends boolean = true>(value = true as C): TSet<T, C, Cast> {
    return new TSet({ ...this._def, coerce: value })
  }

  cast<C extends boolean = true>(value = true as C): TSet<T, Coerce, C> {
    return new TSet({ ...this._def, cast: value })
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
  ): TSet<T, Coerce, Cast> {
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
  ): TSet<T, Coerce, Cast> {
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
  size<S extends number>(size: NonNegativeInteger<S>, options?: { readonly message?: string }): TSet<T, Coerce, Cast> {
    return new TSet({
      ...this._def,
      minItems: undefined,
      maxItems: undefined,
      size: { value: size, message: options?.message },
    })
  }

  sparse(enabled?: true): TSet<TOptional<T>, Coerce, Cast>
  sparse(enabled: false): TSet<TDefined<T>, Coerce, Cast>
  sparse(enabled = true): TSet<TOptional<T> | TDefined<T>, Coerce, Cast> {
    return new TSet({ ...this._def, element: this.element[enabled ? 'optional' : 'defined']() })
  }

  partial(): TSet<TOptional<T>, Coerce, Cast> {
    return this.sparse(true)
  }

  required(): TSet<TDefined<T>, Coerce, Cast> {
    return this.sparse(false)
  }

  toArray(): TArray<T, 'many', Coerce, Cast> {
    return new TArray({ ...this._def, typeName: TTypeName.Array, cardinality: 'many', length: this._def.size })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create<T extends AnyTType>(element: T, options?: typeUtils.SimplifyFlat<TOptions>): TSet<T> {
    return new TSet({ typeName: TTypeName.Set, element, coerce: false, cast: false, options: { ...options } })
  }
}

export type AnyTSet = TSet<AnyTType, boolean>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TTuple                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TTupleItems = [] | [AnyTType, ...AnyTType[]] | readonly [] | readonly [AnyTType, ...AnyTType[]]

export type AssertTTupleItems<T> = T extends TTupleItems ? T : never

export type TTupleItemsIO<T extends TTupleItems, IO extends '$I' | '$O'> = T extends readonly []
  ? []
  : T extends readonly [infer H extends AnyTType, ...infer R extends TTupleItems]
  ? [...(undefined extends H[IO] ? [H[IO]?] : [H[IO]]), ...TTupleItemsIO<R, IO>]
  : never

export type TTupleIO<
  T extends TTupleItems,
  R extends AnyTType | null,
  IO extends '$I' | '$O' = '$O'
> = R extends AnyTType
  ? [...TTupleItemsIO<T, IO>, ...(R[IO] extends undefined ? Partial<Array<R[IO]>> : Array<R[IO]>)]
  : TTupleItemsIO<T, IO>

export type UpdateTTupleItems<T extends TTupleItems, K extends 'partial' | 'required'> = T extends readonly []
  ? []
  : T extends readonly [infer H extends AnyTType, ...infer R extends TTupleItems]
  ? [{ partial: TOptional<H>; required: TDefined<H> }[K], ...UpdateTTupleItems<R, K>]
  : never

export type UpdateTTupleRest<R extends AnyTType | null, K extends 'partial' | 'required'> = R extends AnyTType
  ? { partial: TOptional<R>; required: TDefined<R> }[K]
  : null

export type UpdateTuple<T extends AnyTTuple, K extends 'partial' | 'required'> = TTuple<
  UpdateTTupleItems<T['items'], K>,
  UpdateTTupleRest<T['restType'], K>
>

export type TTupleHead<T extends TTupleItems> = T extends readonly [infer H, ...unknown[]] ? H : TNever
export type TTupleLast<T extends TTupleItems> = T extends readonly [...unknown[], infer L] ? L : TNever
export type TTupleTail<T extends TTupleItems> = T extends readonly [unknown, ...infer R extends TTupleItems] ? R : []

export type TTupleAdd<T extends TTupleItems, U extends TTupleItems> = T extends readonly []
  ? U extends readonly []
    ? []
    : U
  : T extends readonly [infer H extends AnyTType, ...infer R extends TTupleItems]
  ? [H, ...TTupleAdd<R, U>]
  : never

const addTTupleItems = <A extends TTupleItems, B extends TTupleItems>(a: A, b: B): TTupleAdd<A, B> =>
  (a.length === 0 ? (b.length === 0 ? [] : b) : [...a, ...b]) as TTupleAdd<A, B>

export type ConcatTTupleRest<R0 extends AnyTType | null, R1 extends AnyTType | null> = R0 extends AnyTType
  ? R1 extends AnyTType
    ? TUnion<[R0, R1]>
    : R0
  : R1

const concatTTupleRestTypes = <R0 extends AnyTType | null, R1 extends AnyTType | null>(
  r0: R0,
  r1: R1
): ConcatTTupleRest<R0, R1> =>
  (r0 === null ? r1 : r1 === null ? r0 : TUnion.create([r0, r1])) as ConcatTTupleRest<R0, R1>

export type TTupleConcat<T extends AnyTTuple, U extends AnyTTuple> = TTuple<
  TTupleAdd<T['items'], U['items']>,
  ConcatTTupleRest<T['restType'], U['restType']>
>

export type TTupleItemsMapFns<T extends TTupleItems> = T extends readonly []
  ? []
  : T extends readonly [infer H extends AnyTType, ...infer Rest extends TTupleItems]
  ? [(((type: H) => AnyTType) | null | undefined)?, ...TTupleItemsMapFns<Rest>]
  : never

export type TTupleMapFns<
  T extends TTupleItems = TTupleItems,
  R extends AnyTType | null = AnyTType | null
> = R extends AnyTType ? [...TTupleItemsMapFns<T>, (((rest: R) => AnyTType) | null | undefined)?] : TTupleItemsMapFns<T>

export type MapTTupleItems<T extends TTupleItems, Fns> = Fns extends readonly []
  ? []
  : T extends readonly [infer TH extends AnyTType, ...infer TRest]
  ? Fns extends readonly [infer H, ...infer Rest]
    ? [
        H extends (type: TH) => infer Result ? Result : TH,
        ...(TRest extends readonly [AnyTType, ...AnyTType[]] ? MapTTupleItems<TRest, Rest> : [])
      ]
    : never
  : never

export type MapTTupleRest<
  T extends TTupleItems,
  R extends AnyTType | null,
  Fns extends readonly unknown[]
> = Fns['length'] extends [...T, unknown]['length']
  ? Fns[T['length']] extends ((rest: R) => infer Result extends AnyTType)
    ? Result
    : null
  : null

export type TTupleToArray<T extends TTupleItems, R extends AnyTType | null> = TArray<
  R extends null
    ? T extends readonly []
      ? TNever
      : T extends readonly [infer U extends AnyTType]
      ? U
      : TUnion<T>
    : R extends AnyTType
    ? T extends readonly []
      ? R
      : TUnion<[...T, R]>
    : never,
  T['length'] extends 0 ? (R extends null ? 'none' : 'atleastone') : 'atleastone'
>

export type TTupleItemsManifest<T extends TTupleItems> = T extends readonly []
  ? []
  : T extends [infer H extends AnyTType, ...infer R extends TTupleItems]
  ? [ManifestOf<H>, ...TTupleItemsManifest<R>]
  : never

export type TTupleOptions = TOptions<{
  additionalIssueKind: EIssueKind['InvalidTuple']
}>

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
  get _manifest(): TManifest.Tuple<OutputOf<this>> {
    return {
      ...TManifest.base(TParsedType.Tuple),
      items: this.items.map((item) => item.manifest()),
      rest: this.restType?.manifest() ?? null,
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
      if (ctx.common.abortEarly) {
        return ctx.abort()
      }
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

  /* ---------------------------------------------------------------------------------------------------------------- */

  get items(): T {
    return this._def.items
  }

  get restType(): R {
    return this._def.rest
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  rest<R_ extends AnyTType>(rest: R_): TTuple<T, R_> {
    return new TTuple({ ...this._def, rest })
  }

  removeRest(): TTuple<T> {
    return new TTuple({ ...this._def, rest: null })
  }

  values(): R extends null ? (T extends [] ? TNever : TUnion<T>) : TUnion<[...T, NonNullable<R>]> {
    return (
      !this.restType && this.items.length === 0
        ? TNever.create()
        : TUnion.create(
            this.restType
              ? [head(this.items), ...tail(this.items), this.restType]
              : [head(this.items), ...tail(this.items)],
            this.options()
          )
    ) as R extends null ? (T extends [] ? TNever : TUnion<T>) : TUnion<[...T, NonNullable<R>]>
  }

  head(): TTupleHead<T> {
    return (this.items[0] ?? TNever.create(this._def.options)) as TTupleHead<T>
  }

  last(): TTupleLast<T> {
    return (this.items[this.items.length - 1] ?? TNever.create(this._def.options)) as TTupleLast<T>
  }

  tail(): TTuple<TTupleTail<T>, R> {
    return new TTuple({ ...this._def, items: tail(this.items) as TTupleTail<T> })
  }

  push<I extends TTupleItems>(...incoming: I): TTuple<TTupleAdd<T, I>, R> {
    return new TTuple({ ...this._def, items: addTTupleItems(this.items, incoming) })
  }

  unshift<I extends TTupleItems>(...incoming: I): TTuple<TTupleAdd<I, T>, R> {
    return new TTuple({ ...this._def, items: addTTupleItems(incoming, this.items) })
  }

  concat<T_ extends TTupleItems, R_ extends AnyTType | null>(
    incoming: TTuple<T_, R_>
  ): TTupleConcat<this, TTuple<T_, R_>> {
    return new TTuple({
      ...this._def,
      items: addTTupleItems(this.items, incoming.items),
      rest: concatTTupleRestTypes(this.restType, incoming.restType),
    })
  }

  merge<T_ extends TTupleItems, R_ extends AnyTType | null>(
    incoming: TTuple<T_, R_>
  ): TTupleConcat<this, TTuple<T_, R_>> {
    return this.concat(incoming)
  }

  reverse(): TTuple<Reverse<T>, R> {
    return new TTuple({ ...this._def, items: [...this.items].reverse() as Reverse<T> })
  }

  map<Fns extends TTupleMapFns<T, R>>(fns: Fns): TTuple<MapTTupleItems<T, Fns>, MapTTupleRest<T, R, Fns>> {
    const [newRest, ...newItems] = fns
      .map((fn, i) => fn?.(this.items[i] ?? this.restType))
      .map((t, i) => (t instanceof TType ? t : this.items[i] ?? this.restType))
      .reverse()

    return new TTuple({
      ...this._def,
      items: [...newItems].reverse() as MapTTupleItems<T, Fns>,
      rest: newRest as MapTTupleRest<T, R, Fns>,
    })
  }

  filter<
    T_ extends T[number]['typeName'] | ToNum<{ [K in keyof T]: K }[number]> | typeof restMarker,
    U extends readonly [T_, ...T_[]]
  >(
    ...types: U
  ): TTuple<
    Filter<FilterIndex<T, Extract<U[number], number>>, { readonly typeName: U[number] }>,
    typeof restMarker extends U[number] ? null : R
  > {
    const filtered = new TTuple({
      ...this._def,
      items: this.items
        .filter((_, i) =>
          types.filter((tt): tt is Extract<typeof tt, number> => typeof tt === 'number').some((tt) => i !== tt)
        )
        .filter(
          (t) => !t.isT(...types.filter((tt): tt is Extract<typeof tt, string> => typeof tt === 'string'))
        ) as Filter<FilterIndex<T, Extract<U[number], number>>, { readonly typeName: U[number] }>,
    })

    return (arrayUtils.includes(types, restMarker) ? filtered.removeRest() : filtered) as TTuple<
      Filter<FilterIndex<T, Extract<U[number], number>>, { readonly typeName: U[number] }>,
      typeof restMarker extends U[number] ? null : R
    >
  }

  setIdx<I extends NumericRange<0, Subtract<T['length'], 1>>, T_ extends AnyTType>(
    idx: I,
    type: T_
  ): TTuple<SetIndex<T, I, T_>, R> {
    return new TTuple({
      ...this._def,
      items: this.items.slice(0, idx).concat(type, this.items.slice(Number(idx) + 1)) as SetIndex<T, I, T_>,
    })
  }

  partial(): UpdateTuple<this, 'partial'> {
    return new TTuple({
      ...this._def,
      items: this.items.map((i) => i.optional()) as UpdateTTupleItems<T, 'partial'>,
      rest: (this.restType?.optional() ?? null) as UpdateTTupleRest<R, 'partial'>,
    })
  }

  required(): UpdateTuple<this, 'required'> {
    return new TTuple({
      ...this._def,
      items: this.items.map((i) => i.defined()) as UpdateTTupleItems<T, 'required'>,
      rest: (this.restType?.defined() ?? null) as UpdateTTupleRest<R, 'required'>,
    })
  }

  toArray(): TTupleToArray<T, R> {
    let element: AnyTType

    if (!this.restType) {
      if (this.items.length === 0) {
        element = TNever.create()
      } else if (this.items.length === 1) {
        element = head(this.items)
      } else {
        element = TUnion.create([head(this.items), ...tail(this.items)])
      }
    } else if (this.items.length === 0) {
      element = this.restType
    } else {
      element = TUnion.create([head(this.items), ...tail(this.items), this.restType])
    }

    return new TArray({
      ...this._def,
      element,
      typeName: TTypeName.Array,
      cardinality: (this.items.length === 0 && !this.restType ? 'none' : 'atleastone') as T['length'] extends 0
        ? R extends null
          ? 'none'
          : 'atleastone'
        : 'atleastone',
      coerce: false,
      cast: false,
    }) as TTupleToArray<T, R>
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

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

export type TRecordInput<K extends AnyTType<PropertyKey, PropertyKey>, V extends AnyTType, Coerce extends boolean> =
  | Record<InputOf<K>, InputOf<V>>
  | (Coerce extends true ? Map<InputOf<K>, InputOf<V>> : never)

const handleRecordEntry = <T>([k, v]: readonly [PropertyKey, T]): readonly [PropertyKey, T] => [
  typeof k === 'symbol' ? k : Number.isNaN(Number(k)) ? k : Number(k),
  v,
]

export interface TRecordDef<K extends AnyTType<PropertyKey, PropertyKey>, V extends AnyTType, Coerce extends boolean>
  extends TDef {
  readonly typeName: TTypeName.Record
  readonly keys: K
  readonly values: V
  readonly checks: ToChecks<InvalidRecordIssue>
  readonly coerce: Coerce
}

export class TRecord<
  K extends AnyTType<PropertyKey, PropertyKey>,
  V extends AnyTType,
  Coerce extends boolean = false
> extends TType<Record<OutputOf<K>, OutputOf<V>>, TRecordDef<K, V, Coerce>, TRecordInput<K, V, Coerce>> {
  get _manifest(): TManifest.Record<K, V, OutputOf<this>> {
    return {
      ...TManifest.base(TParsedType.Object),
      keys: this.keys.manifest(),
      values: this.values.manifest(),
      coerce: this._def.coerce,
    }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    const { coerce, keys, values, checks } = this._def

    if (coerce && ctx.data instanceof Map) {
      ctx.setData(objectFromEntries([...ctx.data.entries()]))
    }

    if (!isObject(ctx.data)) {
      return ctx.invalidType({ expected: TParsedType.Object }).abort()
    }

    const { data } = ctx
    const result = {} as Record<OutputOf<K>, OutputOf<V>>

    const entries = objectEntries(data)

    for (const check of checks) {
      if (
        check.check === 'min_keys' &&
        (check.expected.inclusive ? entries.length < check.expected.value : entries.length <= check.expected.value)
      ) {
        ctx.addIssue(
          IssueKind.InvalidRecord,
          {
            check: check.check,
            expected: check.expected,
            received: entries.length,
          },
          check.message
        )
        if (ctx.common.abortEarly) {
          return ctx.abort()
        }
      }

      if (
        check.check === 'max_keys' &&
        (check.expected.inclusive ? entries.length > check.expected.value : entries.length >= check.expected.value)
      ) {
        ctx.addIssue(
          IssueKind.InvalidRecord,
          {
            check: check.check,
            expected: check.expected,
            received: entries.length,
          },
          check.message
        )
        if (ctx.common.abortEarly) {
          return ctx.abort()
        }
      }
    }

    if (ctx.common.async) {
      return Promise.all(
        entries
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

    for (const [keyRes, valueRes] of entries
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

  minKeys<V extends number>(
    value: NonNegativeInteger<V>,
    options?: { readonly inclusive?: boolean; readonly message?: string }
  ): this {
    return this.addCheck({
      check: 'min_keys',
      expected: { value, inclusive: options?.inclusive ?? true },
      message: options?.message,
    })
  }

  maxKeys<V extends number>(
    value: NonNegativeInteger<V>,
    options?: { readonly inclusive?: boolean; readonly message?: string }
  ): this {
    return this.addCheck({
      check: 'max_keys',
      expected: { value, inclusive: options?.inclusive ?? true },
      message: options?.message,
    })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  partial(): TRecord<K, TOptional<V>, Coerce> {
    return new TRecord({ ...this._def, values: this.values.optional() })
  }

  required(): TRecord<K, TDefined<V>, Coerce> {
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
        checks: [],
        coerce: false,
        options: { ...third },
      })
    }

    return new TRecord({
      typeName: TTypeName.Record,
      keys: TString.create(),
      values: first,
      checks: [],
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
  get _manifest(): TManifest.Map<K, V, OutputOf<this>> {
    return {
      ...TManifest.base(TParsedType.Map),
      keys: this.keys.manifest(),
      values: this.values.manifest(),
    }
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

  /* ---------------------------------------------------------------------------------------------------------------- */

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

  for (const k of objectKeys(shape)) {
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

export type MakeSchemaShape<S extends TObjectShape, T extends AnyTType, D extends 'flat' | 'deep'> = {
  [K in keyof S]: S[K] extends TObject<infer S_, infer UK, infer C>
    ? D extends 'deep'
      ? TObject<MakeSchemaShape<S_, T, D>, UK, C>
      : T
    : T
}

export type TObjectOptions = TOptions<{
  additionalIssueKind: EIssueKind['MissingKeys'] | EIssueKind['UnrecognizedKeys']
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
  get _manifest(): TManifest<TObjectIO<S, UK, C>> {
    return { ...TManifest.base(TParsedType.Object) }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (!isObject(ctx.data)) {
      return ctx.invalidType({ expected: TParsedType.Object }).abort()
    }

    const { shape, unknownKeys, catchall } = this._def
    const { data } = ctx

    const extraKeys: PropertyKey[] = []
    if (!catchall || unknownKeys !== 'strip') {
      for (const k of objectKeys(data)) {
        if (!(k in shape)) {
          extraKeys.push(k)
        }
      }
    }

    const resultObj: objectUtils.AnyRecord = {}

    if (ctx.common.async) {
      return Promise.all(
        objectEntries(shape).map(async ([k, v]) => Promise.all([k, v._parseAsync(ctx.child(v, data[k], [k]))]))
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
            ctx.addIssue(
              IssueKind.UnrecognizedKeys,
              { keys: [...extraKeys].sort((a, b) => String(a).localeCompare(String(b))) },
              this.options().messages?.unrecognizedKeys
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
            resultObj[k] = res.data
          }
        }

        return ctx.isValid() ? OK(resultObj as OutputOf<this>) : ctx.abort()
      })
    }

    const results: Array<[PropertyKey, SyncParseResultOf<S[keyof S]>]> = []

    for (const [k, v] of objectEntries(shape)) {
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
          IssueKind.UnrecognizedKeys,
          { keys: [...extraKeys].sort((a, b) => String(a).localeCompare(String(b))) },
          this.options().messages?.unrecognizedKeys
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
    return TEnum.create(objectKeys(this.shape) as any, this.options()) as any
  }

  keys(): TUnion<
    typeUtils.Try<typeUtils.UnionToTuple<{ [K in keyof S]: TStringLiteral<K & string> }[keyof S]>, readonly AnyTType[]>
  > {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
    return TUnion.create(objectKeys(this.shape).map((k) => TLiteral.create(k)) as any, this.options())
  }

  values(): TUnion<typeUtils.Try<typeUtils.UnionToTuple<S[keyof S]>, readonly AnyTType[]>> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
    return TUnion.create(objectValues(this.shape) as any, this.options())
  }

  pick<K extends readonly [keyof S, ...Array<keyof S>]>(keys: K): TObject<Pick<S, K[number]>, UK, C> {
    return this._setShape(objectUtils.pick(this.shape, keys))
  }

  omit<K extends readonly [keyof S, ...Array<keyof S>]>(keys: K): TObject<Omit<S, K[number]>, UK, C> {
    return this._setShape(objectUtils.omit(this.shape, keys))
  }

  augment<T extends TObjectShape>(shape: T): TObject<Merge<S, T>, UK, C> {
    return this._setShape({ ...this.shape, ...shape } as Merge<S, T>)
  }

  extend<T extends TObjectShape>(shape: T): TObject<Merge<S, T>, UK, C> {
    return this.augment(shape)
  }

  setKey<K extends string, T extends AnyTType>(key: K, type: T): TObject<Merge<S, { [K_ in K]: T }>, UK, C> {
    return this.augment({ [key]: type } as { [K_ in K]: T })
  }

  merge<S_ extends TObjectShape, UK_ extends TObjectUnknownKeys | undefined, C_ extends TObjectCatchall | undefined>(
    object: TObject<S_, UK_, C_>
  ): TObject<Merge<S, S_>, UK_, C_> {
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
      objectFromEntries(
        objectUtils
          .entries(this.shape)
          .map(([k, v]) => [k, (keys ?? objectKeys(this.shape)).includes(k) ? v.optional() : v])
      ) as MakePartialShape<S>
    )
  }

  required(): TObject<MakeRequiredShape<S>, UK, C>
  required<K extends readonly [keyof S, ...Array<keyof S>]>(keys: K): TObject<MakeRequiredShape<S, K>, UK, C>
  required(keys?: readonly [keyof S, ...Array<keyof S>]): TObject<MakeRequiredShape<S>, UK, C> {
    return this._setShape(
      objectFromEntries(
        objectUtils
          .entries(this.shape)
          .map(([k, v]) => [k, (keys ?? objectKeys(this.shape)).includes(k) ? v.defined() : v])
      ) as MakeRequiredShape<S>
    )
  }

  deepPartial(): TObject<MakeDeepPartialShape<S>, UK, C> {
    return this._setShapeDeep({ onObject: (t) => t.deepPartial(), onAny: (t) => t.optional() })
  }

  deepRequired(): TObject<MakeDeepRequiredShape<S>, UK, C> {
    return this._setShapeDeep({ onObject: (t) => t.deepRequired(), onAny: (t) => t.defined() })
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

  /**
   * Create a deep (or flat) version of this `TObject` where all values are (by default) recursively replaced by a given schema.
   *
   * @param {AnyTType} type The schema to use to replace the values.
   * @param {{ deep?: boolean }} [options] The options object.
   * @param {boolean} [options.deep=true] When `true`, recursively replace all values.
   * When `false`, only replace the values at the top-level. _Default: `true`_
   * @returns {TObject} A new instance of `TObject` with the shape updated.
   */
  toSchema<T extends AnyTType>(
    type: T,
    options?: { readonly deep?: true }
  ): TObject<MakeSchemaShape<S, T, 'deep'>, UK, C>
  toSchema<T extends AnyTType>(
    type: T,
    options: { readonly deep: false }
  ): TObject<MakeSchemaShape<S, T, 'flat'>, UK, C>
  toSchema<T extends AnyTType>(
    type: T,
    options?: { readonly deep?: boolean }
  ): TObject<MakeSchemaShape<S, T, 'flat' | 'deep'>, UK, C> {
    return this._setShapeDeep({
      onObject: (t) => (options?.deep === false ? type : t.toSchema(type)),
      onOthers: () => type,
    })
  }

  /**
   * Updates the shape of the `TObject` so that all values will be parsed as strings.
   *
   * @returns {TObject} A new instance of `TObject` with the shape updated.
   */
  stringify(): TObject<MakeSchemaShape<S, TString, 'flat'>, UK, C> {
    return this.toSchema(TString.create(), { deep: false })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  private _setShape<T extends TObjectShape>(shape: T): TObject<T, UK, C> {
    return new TObject({ ...this._def, shape })
  }

  private _setShapeDeep<T extends TObjectShape>(setters: {
    readonly onObject?: (t: AnyTObject) => AnyTType
    readonly onOthers?: (t: Exclude<AnyTType, AnyTObject>) => AnyTType
    readonly onAny?: (t: AnyTType) => AnyTType
  }): TObject<T, UK, C> {
    const { onObject, onOthers, onAny } = setters
    return this._setShape(
      Object.fromEntries(
        Object.entries(this.shape)
          .map(([k, v]) => [k, v.isT(TTypeName.Object) ? onObject?.(v) ?? v : onOthers?.(v) ?? v] as const)
          .map(([k, v]) => [k, onAny?.(v) ?? v] as const)
      ) as T
    )
  }

  private _setUnknownKeys<K extends TObjectUnknownKeys>(unknownKeys: K): TObject<S, K> {
    return new TObject({ ...this._def, unknownKeys, catchall: undefined })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create = Object.assign(this._makeCreate(), {
    passthrough: this._makeCreate('passthrough'),
    strict: this._makeCreate('strict'),
    strip: this._makeCreate(),
    lazy: <S extends TObjectShape>(shape: () => TObjectShapeArg<S>, options?: typeUtils.SimplifyFlat<TOptions>) =>
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyTObject = TObject<any, TObjectUnknownKeys | undefined, TObjectCatchall | undefined>
export type SomeTObject = TObject<Record<string, AnyTType>, TObjectUnknownKeys | undefined, TObjectCatchall | undefined>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                     TUndefined                                                     */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TUndefinedDef extends TDef {
  readonly typeName: TTypeName.Undefined
}

export class TUndefined extends TType<undefined, TUndefinedDef> {
  get _manifest(): TManifest.Literal<undefined> {
    return {
      ...TManifest.base(TParsedType.Undefined),
      literal: stringUtils.literalize(undefined),
      required: false,
      nullable: false,
    }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return ctx.data !== undefined || ctx.data === emptyMarker
      ? ctx.invalidType({ expected: TParsedType.Undefined }).abort()
      : OK(ctx.data)
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
  get _manifest(): TManifest.Optional<void> {
    return { ...TManifest.base(TParsedType.Void), required: false }
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
  get _manifest(): TManifest.Literal<null> {
    return {
      ...TManifest.base(TParsedType.Null),
      literal: stringUtils.literalize(null),
      required: true,
      nullable: true,
    }
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

export interface TNeverDef extends TDef {
  readonly typeName: TTypeName.Never
  readonly options: TNeverOptions
}

export class TNever extends TType<never, TNeverDef> {
  get _manifest(): TManifest.Never {
    return { ...TManifest.base(TParsedType.Never), forbidden: true }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return ctx.addIssue(IssueKind.Forbidden, this.options().messages?.forbidden).abort()
  }

  static create(options?: typeUtils.SimplifyFlat<TNeverOptions>): TNever {
    return new TNever({ typeName: TTypeName.Never, options: { ...options } })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TFunction                                                     */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TFunctionOuterIO<T extends AnyTType | null, A extends AnyTTuple, R extends AnyTType> = T extends AnyTType
  ? (this: InputOf<T>, ...args: InputOf<A>) => OutputOf<R>
  : (...args: InputOf<A>) => OutputOf<R>

export type TFunctionInnerIO<T extends AnyTType | null, A extends AnyTTuple, R extends AnyTType> = T extends AnyTType
  ? (this: OutputOf<T>, ...args: OutputOf<A>) => InputOf<R>
  : (...args: OutputOf<A>) => InputOf<R>

export type TFunctionOptions = TOptions<{
  additionalIssueKind: EIssueKind['InvalidThisType'] | EIssueKind['InvalidArguments'] | EIssueKind['InvalidReturnType']
}>

export interface TFunctionManifest<T extends AnyTType | null, A extends AnyTTuple, R extends AnyTType>
  extends TManifest<TFunctionOuterIO<T, A, R>> {
  readonly thisParameterType: T extends AnyTType ? ManifestOf<T> : null
  readonly parameters: ManifestOf<A>
  readonly returnType: ManifestOf<R>
}

export interface TFunctionDef<T extends AnyTType | null, A extends AnyTTuple, R extends AnyTType> extends TDef {
  readonly typeName: TTypeName.Function
  readonly options: TFunctionOptions
  readonly thisParameterType: T
  readonly parameters: A
  readonly returnType: R
}

export class TFunction<T extends AnyTType | null, A extends AnyTTuple, R extends AnyTType> extends TType<
  TFunctionOuterIO<T, A, R>,
  TFunctionDef<T, A, R>,
  TFunctionInnerIO<T, A, R>
> {
  get _manifest(): TFunctionManifest<T, A, R> {
    return {
      ...TManifest.base(TParsedType.Function),
      thisParameterType: (this.thisParameterType?.manifest() ?? null) as T extends AnyTType ? ManifestOf<T> : null,
      parameters: this.parameters.manifest(),
      returnType: this.returnType.manifest(),
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
      ctx.addIssue(IssueKind.InvalidThisType, { issues }, this.options().messages?.invalidThisType).abort().error

    const makeInvalidArgumentsError = <T extends AnyTType>(
      ctx: ParseContextOf<T>,
      issues: readonly TIssue[]
    ): TError<InputOf<T>> =>
      ctx.addIssue(IssueKind.InvalidArguments, { issues }, this.options().messages?.invalidArguments).abort().error

    const makeInvalidReturnTypeError = <T extends AnyTType>(
      ctx: ParseContextOf<T>,
      issues: readonly TIssue[]
    ): TError<InputOf<T>> =>
      ctx.addIssue(IssueKind.InvalidReturnType, { issues }, this.options().messages?.invalidReturnType).abort().error

    const { thisParameterType: thisType, parameters, returnType } = this._def
    const { data: fn } = ctx

    if (returnType.isT(TTypeName.Promise)) {
      return OK(async function (this: unknown, ...args) {
        let boundFn = fn
        if (thisType) {
          const thisCtx = ctx.clone(thisType, this)
          const parsedThis = await thisType._parseAsync(thisCtx)
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
    return this._def.thisParameterType
  }

  get parameters(): A {
    return this._def.parameters
  }

  get returnType(): R {
    return this._def.returnType
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  thisType<T_ extends AnyTType>(thisType: T_): TFunction<T_, A, R> {
    return new TFunction({ ...this._def, thisParameterType: thisType })
  }

  omitThisParameterType(): TFunction<null, A, R> {
    return new TFunction({ ...this._def, thisParameterType: null })
  }

  args<A_ extends TTupleItems>(...args: A_): TFunction<T, TTuple<A_, A['restType']>, R> {
    return new TFunction({
      ...this._def,
      parameters: (this._def.parameters.restType
        ? TTuple.create(args, this._def.parameters.restType, this.options())
        : TTuple.create(args, this.options())) as TTuple<A_, A['restType']>,
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

  static create(options?: typeUtils.SimplifyFlat<TFunctionOptions>): TFunction<null, TTuple<[], TUnknown>, TUnknown>
  static create<A extends TTupleItems>(
    parameters: A,
    options?: typeUtils.SimplifyFlat<TFunctionOptions>
  ): TFunction<null, TTuple<A, TUnknown>, TUnknown>
  static create<A extends TTupleItems, R extends AnyTType>(
    parameters: A,
    returnType: R,
    options?: typeUtils.SimplifyFlat<TFunctionOptions>
  ): TFunction<null, TTuple<A, TUnknown>, R>
  static create<T extends AnyTType, A extends TTupleItems, R extends AnyTType>(
    thisType: T,
    parameters: A,
    returnType: R,
    options?: typeUtils.SimplifyFlat<TFunctionOptions>
  ): TFunction<T, TTuple<A, TUnknown>, R>
  static create(
    first?: typeUtils.SimplifyFlat<TFunctionOptions> | TTupleItems | AnyTType,
    second?: typeUtils.SimplifyFlat<TFunctionOptions> | AnyTType | TTupleItems,
    third?: typeUtils.SimplifyFlat<TFunctionOptions> | AnyTType,
    fourth?: typeUtils.SimplifyFlat<TFunctionOptions>
  ):
    | TFunction<AnyTType, TTuple<TTupleItems, TUnknown>, AnyTType>
    | TFunction<null, TTuple<TTupleItems, TUnknown>, AnyTType> {
    if (first instanceof TType && arrayUtils.isArray(second) && third instanceof TType) {
      return new TFunction({
        typeName: TTypeName.Function,
        thisParameterType: first,
        parameters: TTuple.create(second).rest(TUnknown.create()),
        returnType: third,
        options: { ...fourth },
      })
    }

    if (arrayUtils.isArray(first) && second instanceof TType) {
      return new TFunction({
        typeName: TTypeName.Function,
        thisParameterType: null,
        parameters: TTuple.create(first).rest(TUnknown.create()),
        returnType: second,
        options: { ...(third as TOptions) },
      })
    }

    if (arrayUtils.isArray(first)) {
      return new TFunction({
        typeName: TTypeName.Function,
        thisParameterType: null,
        parameters: TTuple.create(first).rest(TUnknown.create()),
        returnType: TUnknown.create(),
        options: { ...(second as TOptions) },
      })
    }

    return new TFunction({
      typeName: TTypeName.Function,
      thisParameterType: null,
      parameters: TTuple.create([]).rest(TUnknown.create()),
      returnType: TUnknown.create(),
      options: { ...(first as TOptions) },
    })
  }
}

export type AnyTFunction = TFunction<AnyTType | null, AnyTTuple, AnyTType>

/* ------------------------------------------------------------------------------------------------------------------ */

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
  get _manifest(): TManifest<OutputOf<this>> {
    return { ...this.underlying.manifest(), required: false }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return ctx.data === undefined
      ? OK(ctx.data)
      : this._def.underlying._parse(ctx.child(this._def.underlying, ctx.data))
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

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

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create<T extends AnyTType>(underlying: T, options?: typeUtils.SimplifyFlat<TOptions>): TOptional<T> {
    return new TOptional({ typeName: TTypeName.Optional, underlying, options: { ...options } })
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
  get _manifest(): TManifest<OutputOf<this>> {
    return { ...this.underlying.manifest(), nullable: true }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return ctx.data === null ? OK(ctx.data) : this._def.underlying._parse(ctx.child(this._def.underlying, ctx.data))
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

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

  /* ---------------------------------------------------------------------------------------------------------------- */

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
      ? ctx.addIssue(IssueKind.Required, this.options().messages?.required).abort()
      : (this._def.underlying._parse(ctx.child(this._def.underlying, ctx.data)) as ParseResultOf<this>)
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

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

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create<T extends AnyTType>(underlying: T, options?: typeUtils.SimplifyFlat<TOptions>): TDefined<T> {
    return new TDefined({ typeName: TTypeName.Defined, underlying, options: { ...options } })
  }
}

export type AnyTDefined = TDefined<AnyTType>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                    TNonNullable                                                    */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TNonNullableDef<T extends AnyTType> extends TDef {
  readonly typeName: TTypeName.NonNullable
  readonly underlying: T
}

export class TNonNullable<T extends AnyTType> extends TType<
  NonNullable<OutputOf<T>>,
  TNonNullableDef<T>,
  NonNullable<InputOf<T>>
> {
  get _manifest(): TManifest<NonNullable<OutputOf<T>>> {
    const underlyingManifest = this.underlying.manifest()
    return {
      ...underlyingManifest,
      examples: underlyingManifest.examples?.filter(
        (ex): ex is NonNullable<OutputOf<T>> => ex !== undefined && ex !== null
      ),
      required: true,
      nullable: false,
    }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return ctx.data === undefined || ctx.data === null
      ? ctx.invalidType({ expected: this.underlying.manifest().type }).abort()
      : (this.underlying._parse(ctx.child(this.underlying, ctx.data)) as ParseResultOf<this>)
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  get underlying(): T {
    return this._def.underlying
  }

  unwrap(): T {
    return this.underlying
  }

  unwrapDeep(): UnwrapDeep<T, TTypeName.NonNullable> {
    return (this.underlying instanceof TNonNullable ? this.underlying.unwrapDeep() : this.underlying) as UnwrapDeep<
      T,
      TTypeName.NonNullable
    >
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create<T extends AnyTType>(underlying: T, options?: typeUtils.SimplifyFlat<TOptions>): TNonNullable<T> {
    return new TNonNullable({ typeName: TTypeName.NonNullable, underlying, options: { ...options } })
  }
}

export type AnyTNonNullable = TNonNullable<AnyTType>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TPromise                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

/**
 * This is necessary to prevent TS from wrapping `Promise`s in `Promise`s.
 */
export type TPromiseIO<T> = T extends Promise<unknown> ? T : Promise<T>

export interface TPromiseManifest<T extends AnyTType> extends TManifest<TPromiseIO<OutputOf<T>>> {
  readonly async: true
}

export interface TPromiseDef<T extends AnyTType> extends TDef {
  readonly typeName: TTypeName.Promise
  readonly underlying: T
}

export class TPromise<T extends AnyTType> extends TType<
  TPromiseIO<OutputOf<T>>,
  TPromiseDef<T>,
  TPromiseIO<InputOf<T>>
> {
  get _manifest(): TPromiseManifest<T> {
    const underlyingManifest = this.underlying.manifest()
    return {
      ...underlyingManifest,
      examples: underlyingManifest.examples?.map(Promise.resolve) as TPromiseManifest<T>['examples'],
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
    ) as ParseResultOf<this>
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

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

  /* ---------------------------------------------------------------------------------------------------------------- */

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
  get _manifest(): TManifest<BRANDED<OutputOf<T>, B>> {
    return { ...(this.underlying.manifest() as TManifest<BRANDED<OutputOf<T>, B>>) }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return this.underlying._parse(ctx.child(this.underlying, ctx.data)) as ParseResultOf<this>
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

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

  /* ---------------------------------------------------------------------------------------------------------------- */

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
  get _manifest(): TManifest<Defined<OutputOf<T>>> {
    const underlyingManifest = this.underlying.manifest()
    return {
      ...underlyingManifest,
      examples: underlyingManifest.examples?.filter((ex): ex is Defined<OutputOf<T>> => ex !== undefined),
    }
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
  get _manifest(): TManifest<OutputOf<T> | C> {
    return { ...this.underlying.manifest() }
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
  get _manifest(): ManifestOf<T> {
    return { ...this.underlying.manifest() }
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
    return new TLazy({ typeName: TTypeName.Lazy, getType: factory, options: { ...options } })
  }
}

export type AnyTLazy = TLazy<AnyTType>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TUnion                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TUnionMembers = AnyTType[] | readonly AnyTType[]

export type FlattenMembers<
  M extends TUnionMembers,
  Compare extends AnyTType & { readonly members: readonly AnyTType[] }
> = M extends readonly []
  ? []
  : M extends readonly [infer H extends AnyTType, ...infer R extends readonly AnyTType[]]
  ? H extends Compare
    ? [...FlattenMembers<H['members'], Compare>, ...FlattenMembers<R, Compare>]
    : [H, ...FlattenMembers<R, Compare>]
  : AnyTType[]

export const flattenMembers = <
  M extends TUnionMembers,
  TN extends Extract<TTypeNameMap, { readonly members: AnyTType[] | readonly AnyTType[] }>['typeName']
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

export interface TUnionDef<T extends TUnionMembers> extends TDef {
  readonly typeName: TTypeName.Union
  readonly options: TUnionOptions
  readonly members: T
}

export class TUnion<T extends TUnionMembers> extends TType<OutputOf<T[number]>, TUnionDef<T>, InputOf<T[number]>> {
  get _manifest(): TManifest.Union<OutputOf<this>> {
    const { members } = this.flatten()
    return {
      ...TManifest.base(TParsedType.Union),
      anyOf: members.map((m) => m.manifest()),
      required: members.every((m) => m.isRequired),
      nullable: members.some((m) => m.isNullable),
    }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    const { members } = this.flatten()

    const handleResults = (results: Array<SyncParseResultOf<T[number]>>): ParseResultOf<this> => {
      const issues = []

      for (const result of results) {
        if (result.ok) {
          return result
        }

        issues.push(...result.error.issues)
      }

      return ctx.addIssue(IssueKind.InvalidUnion, { issues }, this.options().messages?.invalidUnion).abort()
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

  // match<
  //   C extends MapToMatchCases<T>,
  //   _M extends TMatcher<T, ReturnType<C[number]>> = TMatcher<T, ReturnType<C[number]>>
  // >(...cases: C): _M {
  //   return TMatch.create(...cases.map((c, i) => [this.members[i], c] as const)) as any
  // }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create<T extends [AnyTType, ...AnyTType[]]>(
    alternatives: T,
    options?: typeUtils.SimplifyFlat<TUnionOptions>
  ): TUnion<T> {
    return new TUnion({ typeName: TTypeName.Union, members: alternatives, options: { ...options } })
  }
}

export type AnyTUnion = TUnion<TUnionMembers>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                 TDiscriminatedUnion                                                */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TDiscriminatedUnionShape<Discriminator extends string> = { [K in Discriminator]: AnyTLiteral }

export type TDiscriminatedUnionShapes<Discriminator extends string> = readonly [
  TDiscriminatedUnionShape<Discriminator>,
  TDiscriminatedUnionShape<Discriminator>,
  ...Array<TDiscriminatedUnionShape<Discriminator>>
]

export type TDiscriminatedUnionAlternatives<
  Discriminator extends string,
  Shapes extends TDiscriminatedUnionShapes<Discriminator>
> = Readonly<{
  [K in keyof Shapes]: TObject<Shapes[K], TObjectUnknownKeys | undefined, TObjectCatchall | undefined>
}>

export type GetDiscriminatorValues<
  Discriminator extends string,
  Shapes extends TDiscriminatedUnionShapes<Discriminator>
> = readonly [
  ...{
    [K in keyof Shapes]: TObject<Shapes[K]> extends TObject<infer S>
      ? S[Discriminator] extends TLiteral<infer V>
        ? V
        : never
      : never
  }
]

const getDiscriminator = <T extends AnyTType>(type: T): readonly Primitive[] | null => {
  if (type.isT(TTypeName.Lazy, TTypeName.Effects, TTypeName.Default)) {
    return getDiscriminator(type.underlying)
  }

  if (type.isT(TTypeName.Literal)) {
    return [type.value]
  }

  if (type.isT(TTypeName.Enum, TTypeName.NativeEnum)) {
    return type.values
  }

  if (type.isT(TTypeName.Undefined)) {
    return [undefined]
  }

  if (type.isT(TTypeName.Null)) {
    return [null]
  }

  return null
}

export type TDiscriminatedUnionOptions = TOptions<{
  additionalIssueKind: EIssueKind['InvalidDiscriminator']
}>

export interface TDiscriminatedUnionDef<
  Discriminator extends string,
  ValidDiscriminatorValues extends readonly Primitive[],
  Alternatives extends TDiscriminatedUnionAlternatives<Discriminator, TDiscriminatedUnionShapes<Discriminator>>
> extends TDef {
  readonly typeName: TTypeName.DiscriminatedUnion
  readonly options: TDiscriminatedUnionOptions
  readonly discriminator: Discriminator
  readonly validDiscriminatorValues: ValidDiscriminatorValues
  readonly alternatives: Alternatives
  readonly discriminationMap: Map<ValidDiscriminatorValues[number], Alternatives[number]>
}

export class TDiscriminatedUnion<
  Discriminator extends string,
  ValidDiscriminatorValues extends readonly Primitive[],
  Alternatives extends TDiscriminatedUnionAlternatives<Discriminator, TDiscriminatedUnionShapes<Discriminator>>
> extends TType<
  OutputOf<Alternatives[number]>,
  TDiscriminatedUnionDef<Discriminator, ValidDiscriminatorValues, Alternatives>,
  InputOf<Alternatives[number]>
> {
  get _manifest(): TManifest.Union<OutputOf<this>> {
    return {
      ...TManifest.base(TParsedType.Object),
      anyOf: this.alternatives.map((alt) => alt.manifest()),
    }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (!isObject(ctx.data)) {
      return ctx.invalidType({ expected: TParsedType.Object }).abort()
    }

    const { discriminator, validDiscriminatorValues, discriminationMap } = this._def
    const discriminatorValue = ctx.data[discriminator] as Primitive
    const option = discriminationMap.get(discriminatorValue)

    if (!option) {
      return ctx
        .addIssue(
          IssueKind.InvalidDiscriminator,
          {
            expected: {
              values: validDiscriminatorValues,
              formatted: validDiscriminatorValues.map(stringUtils.literalize),
            },
            received: { value: discriminatorValue, formatted: stringUtils.literalize(discriminatorValue) },
          },
          this.options().messages?.invalidDiscriminator
        )
        .abort()
    }

    return option._parse(ctx.child(option, ctx.data))
  }

  get discriminator(): Discriminator {
    return this._def.discriminator
  }

  get alternatives(): Alternatives {
    return this._def.alternatives
  }

  get discriminationMap(): Map<ValidDiscriminatorValues[number], Alternatives[number]> {
    return this._def.discriminationMap
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create<Discriminator extends string, Shapes extends TDiscriminatedUnionShapes<Discriminator>>(
    discriminator: Discriminator,
    alternatives: TDiscriminatedUnionAlternatives<Discriminator, Shapes>,
    options?: typeUtils.SimplifyFlat<TDiscriminatedUnionOptions>
  ): TDiscriminatedUnion<
    Discriminator,
    GetDiscriminatorValues<Discriminator, Shapes>,
    TDiscriminatedUnionAlternatives<Discriminator, Shapes>
  > {
    const discriminationMap = new Map()

    for (const alt of alternatives) {
      const discriminatorValues = getDiscriminator(alt.shape[discriminator])
      if (!discriminatorValues) {
        throw new Error(`Unable to extract a valid discriminator value for key \`${discriminator}\`.`)
      }

      for (const value of discriminatorValues) {
        if (discriminationMap.has(value)) {
          throw new Error(`Discriminator value \`${stringUtils.literalize(value)}\` is not unique.`)
        }

        discriminationMap.set(value, alt)
      }
    }

    return new TDiscriminatedUnion({
      typeName: TTypeName.DiscriminatedUnion,
      discriminator,
      validDiscriminatorValues: [...discriminationMap.keys()] as GetDiscriminatorValues<Discriminator, Shapes>,
      alternatives,
      discriminationMap,
      options: { ...options },
    })
  }
}

export type AnyTDiscriminatedUnion = TDiscriminatedUnion<
  string,
  readonly Primitive[],
  TDiscriminatedUnionAlternatives<string, TDiscriminatedUnionShapes<string>>
>

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

    const bKeys = objectKeys(b_)
    const sharedKeys = objectKeys(a_).filter((key) => bKeys.includes(key))

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
  get _manifest(): TManifest.Intersection<OutputOf<this>> {
    const { members } = this.flatten()
    return {
      ...TManifest.base(TParsedType.Intersection),
      allOf: members.map((m) => m.manifest()),
    }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    const { members } = this.flatten()._def

    const handleResults = (results: Array<SyncParseResultOf<T[number]>>): ParseResultOf<this> => {
      if (!results[0]?.ok || !results[1]?.ok) {
        return ctx.addIssue(IssueKind.InvalidIntersection, this.options().messages?.invalidIntersection).abort()
      }

      const intersection = intersect(results[0].data, results[1].data)
      if (!intersection.ok) {
        return ctx.addIssue(IssueKind.InvalidIntersection, this.options().messages?.invalidIntersection).abort()
      }

      const next = results[2]
      if (!next) {
        return OK(intersection.data as OutputOf<this>)
      }

      if (!next.ok) {
        return ctx.addIssue(IssueKind.InvalidIntersection, this.options().messages?.invalidIntersection).abort()
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
  get _manifest(): TManifest<OutputOf<this>> {
    return { ...TManifest.base(TParsedType.Unknown) }
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
    return { ...TManifest.base(TParsedType.Class) }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    const { cls } = this._def

    if (!(ctx.data instanceof cls)) {
      return ctx
        .addIssue(IssueKind.InvalidInstance, { expected: cls.name }, this.options().messages?.invalidInstance)
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
    return { ...TManifest.base(TParsedType.PropertyKey) }
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
    return { ...TManifest.base(TParsedType.Primitive), required: false, nullable: true }
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
    return { ...TManifest.base(TParsedType.Falsy), required: false, nullable: true }
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

const handleStringOrCustomIssue = (strOrCustomIssue: string | CustomIssue): CustomIssue =>
  typeof strOrCustomIssue === 'string' ? { message: strOrCustomIssue } : strOrCustomIssue

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
  get _manifest(): TManifest<OutputOf<this>> {
    return { ...TManifest.base(TParsedType.Unknown) }
  }

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
/*                                                     TExtension                                                     */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface ExtendableTTypeInstance extends AnyTType {
  readonly _parse: AnyTType['_parse']
  readonly _manifest: AnyTType['_manifest']
}

export interface TExtendable {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  new (...args: readonly any[]): ExtendableTTypeInstance
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  create(...args: readonly any[]): ExtendableTTypeInstance
}

export type ExtendTTypeStatic<T extends TExtendable, E extends Record<string, unknown>> = (new (
  ...args: ConstructorParameters<T>
) => ExtendTTypeInstance<InstanceType<T>, E>) & {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? (...args: A) => R extends InstanceType<T> | E ? ExtendTTypeInstance<InstanceType<T>, E> : R
    : T[K]
}

export type ExtendTTypeInstance<T extends AnyTType, E extends Record<string, unknown>> = T & E extends infer X
  ? {
      [K in keyof X]: X[K] extends (...args: infer A) => infer R
        ? ((...args: A) => R extends T | E ? ExtendTTypeInstance<T, E> & E : R) & ThisType<T & E>
        : X[K]
    } & ThisType<T & E>
  : never

export interface TExtensionDef<
  T extends TExtendable,
  D extends Record<string, unknown> = Record<string, never>,
  M extends Record<
    string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this: InstanceType<T> & D & M, ...args: readonly any[]) => any
  > = Record<string, never>
> {
  readonly data?: (this: void) => D
  readonly methods?: M & ThisType<InstanceType<T> & D & M>
}

export interface TExtension<T extends TExtendable> {
  with<
    D extends Record<string, unknown>,
    M extends Record<
      string,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this: InstanceType<T_> & D & M, ...args: readonly any[]) => any
    >,
    T_ extends T = T
  >(extension: {
    readonly data: (this: void) => D
    readonly methods: M & ThisType<InstanceType<T> & D & M>
  }): ExtendTTypeStatic<T_, D & M>
}

export const TExtension = {
  create<T extends TExtendable>(type: T): TExtension<T> {
    const innerExtend = <
      D extends Record<string, unknown> = Record<string, never>,
      M extends Record<
        string,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this: InstanceType<T> & D & M, ...args: readonly any[]) => any
      > = Record<string, never>
    >(
      def: TExtensionDef<T, D, M> = {}
    ): TExtension<T> & { readonly def: TExtensionDef<T, D, M> } => {
      const extended: TExtension<T> & { readonly def: TExtensionDef<T, D, M> } = {
        get def() {
          return def
        },

        with(ext) {
          const { data, methods } = innerExtend({ ...extended.def, ...ext }).def
          const extension = { ...data?.(), ...methods }

          class Extended extends type {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            constructor(...args: readonly any[]) {
              super(...args)

              // eslint-disable-next-line no-constructor-return, @typescript-eslint/no-unsafe-return
              return Object.assign(Object.getPrototypeOf(this), extension)
            }

            static override create: T['create'] = (...args: readonly unknown[]) => {
              const instance = type.create(...args)
              const extended = new Extended(instance._def)

              // eslint-disable-next-line @typescript-eslint/no-unsafe-return
              return Object.assign(Object.getPrototypeOf(extended), extension)
            }
          }

          // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any
          return Extended as any
        },
      }

      return extended
    }

    return innerExtend()
  },
}

export type AnyTExtension = TExtension<TExtendable>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                         TIf                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TIfDef<C extends AnyTType, T extends AnyTType<unknown, OutputOf<C>>, E extends AnyTType | null>
  extends TDef {
  readonly typeName: TTypeName.If
  readonly condition: C
  readonly then: T
  readonly else: E
}

export class TIf<C extends AnyTType, T extends AnyTType<unknown, OutputOf<C>>, E extends AnyTType | null> extends TType<
  OutputOf<T> | (E extends AnyTType ? OutputOf<E> : never),
  TIfDef<C, T, E>,
  InputOf<T> | (E extends AnyTType ? InputOf<E> : never)
> {
  get _manifest(): TManifest<OutputOf<this>> {
    return { ...TManifest.base(TParsedType.Unknown) }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    const { condition, then: thenSchema, else: elseSchema } = this._def

    if (ctx.common.async) {
      return condition._parseAsync(ctx.child(condition, ctx.data)).then(async (conditionRes) => {
        if (conditionRes.ok) {
          return thenSchema._parseAsync(ctx.child(thenSchema, conditionRes.data))
        }

        return elseSchema ? elseSchema._parseAsync(ctx.child(elseSchema, ctx.data)) : ctx.abort()
      })
    }

    const conditionRes = condition._parseSync(ctx.child(condition, ctx.data))
    if (conditionRes.ok) {
      return thenSchema._parseSync(ctx.child(thenSchema, conditionRes.data))
    }

    return elseSchema ? elseSchema._parseSync(ctx.child(elseSchema, ctx.data)) : ctx.abort()
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  get condition(): C {
    return this._def.condition
  }

  get then(): T {
    return this._def.then
  }

  get else(): E {
    return this._def.else
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create<C extends AnyTType, T extends AnyTType<unknown, OutputOf<C>>>(
    condition: C,
    then_: T,
    options?: TOptions
  ): TIf<C, T, null>
  static create<C extends AnyTType, T extends AnyTType<unknown, OutputOf<C>>, E extends AnyTType>(
    condition: C,
    then_: T,
    else_: E extends AnyTType<unknown, OutputOf<C>> ? never : E,
    options?: TOptions
  ): TIf<C, T, E>
  static create<C extends AnyTType, T extends AnyTType<unknown, OutputOf<C>>, E extends AnyTType | null>(
    condition: C,
    then_: T,
    else_: E,
    options?: TOptions
  ): TIf<C, T, E> {
    return new TIf<C, T, E>({ typeName: TTypeName.If, condition, then: then_, else: else_, options: { ...options } })
  }
}

export type AnyTIf = TIf<AnyTType, AnyTType, AnyTType | null>

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
  get _manifest(): TManifest<OutputOf<this>> {
    return { ...TManifest.base(TParsedType.Unknown) }
  }

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
/*                                                       TMatch                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TMatchCase<T extends AnyTType, R = unknown> = (value: OutputOf<T>) => R

export type MapToMatchCases<T extends TUnionMembers> = T extends readonly []
  ? [TMatchCase<TUnknown>?]
  : T extends readonly [infer H extends AnyTType, ...infer R extends TUnionMembers]
  ? [TMatchCase<H>, ...MapToMatchCases<R>]
  : never

export type TPairCase<T extends AnyTType, R> = [T, TMatchCase<T, R>]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyTPairCase = TPairCase<any, any>

export type MapPairsToSchemas<T extends readonly AnyTPairCase[]> = T extends readonly []
  ? []
  : T extends readonly [TPairCase<infer U, any>, ...infer R extends AnyTPairCase[]]
  ? [U, ...MapPairsToSchemas<R>]
  : never

export type MapPairsToCases<T extends readonly AnyTPairCase[]> = T extends readonly []
  ? []
  : T extends readonly [TPairCase<any, infer U>, ...infer R extends AnyTPairCase[]]
  ? [U, ...MapPairsToCases<R>]
  : never

// export type TMatchFn<T extends readonly [AnyTType, ...AnyTType[]]> = <U>(
//   ...cases: { [K in keyof T]: T[K] extends AnyTType ? TMatchCase<T[K], U> : never }
// ) => TMatcher<T, U>

export type TMatcher<T extends TUnionMembers, R> = (x: OutputOf<T[number]>) => R

export interface TMatch {
  create<T extends readonly [AnyTPairCase, ...AnyTPairCase[]]>(
    ...cases: T
  ): TMatcher<MapPairsToSchemas<T>, MapPairsToCases<T>[number]>
  when<T extends AnyTType, R>(schema: T, fn: TMatchCase<T, R>): TPairCase<T, R>
}

export const TMatch: TMatch = {
  create(...cases) {
    return (x) => {
      for (const [schema, fn] of cases) {
        if ((schema as AnyTType).guard(x)) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return fn(x)
        }
      }

      throw new Error('No alternatives were matched')
    }
  },

  when(schema, fn) {
    return [schema, fn]
  },
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TCoerce                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export const coerce: {
  boolean<T extends Exclude<TBooleanCoercion, false> = true>(
    coercion?: Narrow<T>,
    ...args: Parameters<typeof TBoolean.create>
  ): TBoolean<T>
  buffer(...args: Parameters<typeof TBuffer.create>): TBuffer<true>
  date(...args: Parameters<typeof TDate.create>): TDate<true>
  string(...args: Parameters<typeof TString.create>): TString<[], string, true>
  // Number  & BigInt
  number(...args: Parameters<typeof TNumber.create>): TNumber<true>
  bigint(...args: Parameters<typeof TBigInt.create>): TBigInt<true>
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
  buffer(...args) {
    return TBuffer.create(...args).coerce(true)
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

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TCast                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export const cast: {
  number(...args: Parameters<typeof TNumber.create>): TNumber<false, true>
  // Array & Set
  array<T extends AnyTType>(...args: Parameters<typeof TArray.create<T>>): TArray<T, 'many', false, true>
  set<T extends AnyTType>(...args: Parameters<typeof TSet.create<T>>): TSet<T, false, true>
} = {
  number(...args) {
    return TNumber.create(...args).cast(true)
  },
  array(...args) {
    return TArray.create(...args).cast(true)
  },
  set(...args) {
    return TSet.create(...args).cast(true)
  },
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TMarkers                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export const emptyMarker = Symbol('t.emptyMarker')
export const restMarker = Symbol('t.restMarker')

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
export const discriminatedUnionType = TDiscriminatedUnion.create
export const enumType = TEnum.create
export const extendType = TExtension.create
export const falseType = TFalse.create
export const falsyType = TFalsy.create
export const functionType = TFunction.create
export const ifType = TIf.create
export const instanceofType = TInstanceOf.create
export const intersectionType = TIntersection.create
export const lazyType = TLazy.create
export const literalType = TLiteral.create
export const mapType = TMap.create
export const nanType = TNaN.create
export const nativeEnumType = TNativeEnum.create
export const neverType = TNever.create
export const nonnullableType = TNonNullable.create
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

export const match = TMatch.create
export const { when } = TMatch

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
  discriminatedUnionType as discriminatedUnion,
  discriminatedUnionType as taggedUnion,
  enumType as enum,
  extendType as extend,
  falseType as false,
  falsyType as falsy,
  functionType as fn,
  functionType as function,
  ifType as conditional,
  ifType as if,
  instanceofType as instanceof,
  intersectionType as intersection,
  lazyType as lazy,
  literalType as literal,
  mapType as map,
  nanType as nan,
  nativeEnumType as nativeEnum,
  neverType as never,
  nonnullableType as nonnullable,
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: readonly any[]) => any

type Equals<T, U> = (<X>() => X extends T ? 1 : 0) extends <Y>() => Y extends U ? 1 : 0 ? 1 : 0

type ToNum<T> = T extends `${infer N extends number}` ? N : never

type Head<T extends readonly unknown[]> = T extends readonly [infer H, ...unknown[]] ? H : never

const head = <T extends readonly unknown[]>(arr: T): Head<T> => arr[0] as Head<T>

type Tail<T extends readonly unknown[]> = T extends readonly [unknown, ...infer R] ? R : []

const tail = <T extends readonly unknown[]>(arr: T): Tail<T> => arr.slice(1) as Tail<T>

type Reverse<T> = T extends readonly [] ? [] : T extends readonly [infer H, ...infer R] ? [...Reverse<R>, H] : never

type Filter<T extends readonly unknown[], U> = T extends readonly []
  ? []
  : T extends readonly [infer H, ...infer R]
  ? H extends U
    ? Filter<R, U>
    : [H, ...Filter<R, U>]
  : never

type FilterIndex<
  T extends readonly unknown[],
  U extends number,
  _Acc extends readonly unknown[] = []
> = T extends readonly []
  ? []
  : T extends [infer H, ...infer R]
  ? _Acc['length'] extends U
    ? FilterIndex<R, U, [..._Acc, unknown]>
    : [H, ...FilterIndex<R, U, [..._Acc, unknown]>]
  : never

type SetIndex<
  T extends readonly unknown[],
  U extends number,
  V,
  _Acc extends readonly unknown[] = []
> = T extends readonly []
  ? _Acc['length'] extends 0 | U
    ? [V]
    : []
  : T extends readonly [infer H, ...infer R]
  ? _Acc['length'] extends U
    ? [V, H, ...SetIndex<R, U, V, [..._Acc, unknown, unknown]>]
    : [H, ...SetIndex<R, U, V, [..._Acc, unknown]>]
  : never

type StrictOmit<T extends object, K extends keyof T> = Pick<T, Exclude<keyof T, K>>

type OptionalKeys<T extends object> = { [K in keyof T]: undefined extends T[K] ? K : never }[keyof T]
type RequiredKeys<T extends object> = { [K in keyof T]: undefined extends T[K] ? never : K }[keyof T]
type EnforceOptional<T extends object> = Pick<T, RequiredKeys<T>> & Partial<Pick<T, OptionalKeys<T>>>

type Merge<A, B> = Omit<A, keyof B> & B
type Intersect<A, B> = Pick<A, Extract<keyof A, keyof B>>
type Diff<A, B> = Pick<A, Exclude<keyof A, keyof B>>

const isObject = (x: unknown): x is object =>
  typeof x === 'object' && x !== null && TParsedType.get(x) === TParsedType.Object

const objectKeys = <T extends object>(obj: T): Array<keyof T> =>
  Reflect.ownKeys(obj).map((k) => (Number.isNaN(Number(k)) ? k : Number(k))) as Array<keyof T>

const objectValues = <T extends object>(obj: T): Array<T[keyof T]> => objectKeys(obj).map((k) => obj[k])

const objectEntries = <T extends object>(obj: T): Array<[keyof T, T[keyof T]]> =>
  objectKeys(obj).map((k) => [k, obj[k]])

type FromEntries<T extends ReadonlyArray<[key: PropertyKey, value: unknown]>> = T extends readonly []
  ? unknown
  : T extends readonly [[infer K extends PropertyKey, infer V], ...infer R]
  ? { [P in K]: V } & (R extends ReadonlyArray<[key: PropertyKey, value: unknown]> ? FromEntries<R> : unknown)
  : Record<T[number][0], T[number][1]>

const objectFromEntries = <T extends ReadonlyArray<[key: PropertyKey, value: unknown]>>(entries: T): FromEntries<T> =>
  entries.reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {}) as FromEntries<T>

const filterUniqueBy = <T>(arr: readonly T[], fn: (a: T, b: T, ia: number, ib: number) => boolean): T[] =>
  arr.filter((v, i) => arr.some((x, j) => (i !== j) === fn(v, x, i, j)))

const filterNonUniqueBy = <T>(arr: readonly T[], fn: (a: T, b: T, ia: number, ib: number) => boolean): T[] =>
  arr.filter((v, i) => arr.every((x, j) => (i === j) === fn(v, x, i, j)))

const uniqueBy = <T>(arr: readonly T[], fn: (a: T, b: T, ia: number, ib: number) => boolean): T[] => {
  const allCombinations = arr
    .flatMap((a, ia) => arr.map((b, ib) => [a, b, ia, ib] as const))
    .filter(([_0, _1, ia, ib]) => ia === ib)
}

type Integer<T extends Numeric> = `${T}` extends `${bigint}` ? T : never
