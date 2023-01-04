import { deepEqual } from 'fast-equals'

import cloneDeep from 'clone-deep'
import memoize from 'micro-memoize'
import { nanoid } from 'nanoid'
import type { CamelCase, NonNegativeInteger, UnionToIntersection } from 'type-fest'
import { TIssueKind, type TErrorMap } from './error'
import { getGlobal } from './global'
import {
  AsyncParseContext,
  OK,
  SyncParseContext,
  TParsedType,
  type AsyncParseResultOf,
  type FailedParseResult,
  type ParseContextOf,
  type ParseOptions,
  type ParseResultOf,
  type SuccessfulParseResult,
  type SyncParseResultOf,
} from './parse'
import { isArray, isAsync, isFunction, omit, type Defined, type Merge, type SimplifyFlat } from './utils'

/* ---------------------------------------------------- TTypeName --------------------------------------------------- */

export enum TTypeName {
  Any = 'TAny',
  Array = 'TArray',
  BigInt = 'TBigInt',
  Boolean = 'TBoolean',
  Brand = 'TBrand',
  Buffer = 'TBuffer',
  Catch = 'TCatch',
  Date = 'TDate',
  Default = 'TDefault',
  Enum = 'TEnum',
  False = 'TFalse',
  Intersection = 'TIntersection',
  Lazy = 'TLazy',
  Literal = 'TLiteral',
  NaN = 'TNaN',
  NativeEnum = 'TNativeEnum',
  Never = 'TNever',
  Null = 'TNull',
  Nullable = 'TNullable',
  Number = 'TNumber',
  Optional = 'TOptional',
  Pipeline = 'TPipeline',
  Promise = 'TPromise',
  Required = 'TRequired',
  Set = 'TSet',
  String = 'TString',
  Symbol = 'TSymbol',
  True = 'TTrue',
  Tuple = 'TTuple',
  Undefined = 'TUndefined',
  Union = 'TUnion',
  Unknown = 'TUnknown',
  Void = 'TVoid',
}

/* ---------------------------------------------------- TManifest --------------------------------------------------- */

export interface PublicManifest<T> {
  readonly title?: string
  readonly summary?: string
  readonly description?: string
  readonly version?: string
  readonly examples?: readonly T[]
  readonly tags?: readonly string[]
  readonly notes?: readonly string[]
  readonly unit?: string
  readonly deprecated?: boolean
  readonly meta?: Readonly<Record<string, unknown>>
}

export interface PrivateManifest<T> {
  readonly type: TParsedType
  readonly required: boolean
  readonly nullable: boolean
  readonly readonly: boolean
  readonly promise: boolean
  readonly default?: T
}

export interface TManifest<T = unknown> extends PublicManifest<T>, PrivateManifest<T> {}

export const getDefaultManifest = <T>({ type }: { readonly type: TParsedType }): TManifest<T> => ({
  type,
  required: true,
  nullable: false,
  readonly: false,
  promise: false,
})

export interface TRequiredManifest<T> extends TManifest<T> {
  readonly required: true
}

export interface TOptionalManifest<T> extends TManifest<T> {
  readonly required: false
}

export interface TNullableManifest<T> extends TManifest<T> {
  readonly nullable: true
}

export interface TNullishManifest<T> extends TManifest<T> {
  readonly required: false
  readonly nullable: true
}

export interface TPromiseManifest<T> extends TManifest<T> {
  readonly promise: true
}

export interface TLiteralManifest<T extends TLiteralValue> extends TManifest<T> {
  readonly literal: T
}

export interface TEnumManifest<T extends ReadonlyArray<string | number>> extends TManifest<T[number]> {
  readonly enum: T
}

export interface TIterableManifest<T extends AnyTType, O> extends TManifest<O> {
  readonly items: T['manifest']
  readonly minItems?: number
  readonly maxItems?: number
}

export interface TTupleManifest<T extends TTupleItems, O> extends TManifest<O> {
  readonly items: ReadonlyArray<T[number]['manifest']>
  readonly minItems: number
  readonly maxItems: number
  readonly additionalItems: boolean
}

export interface TBrandManifest<T, B extends PropertyKey> extends TManifest<T> {
  readonly brand: B
}

/* ---------------------------------------------------- TOptions ---------------------------------------------------- */

export interface TOptionsOpts {
  readonly additionalIssueKind?: Exclude<TIssueKind, TIssueKind.Required | TIssueKind.InvalidType>
}

export interface TOptions<Opts extends TOptionsOpts | undefined = undefined> extends ParseOptions {
  readonly color?: string
  readonly errorMap?: TErrorMap
  readonly messages?: {
    readonly [K in
      | TIssueKind.Required
      | TIssueKind.InvalidType
      | ('additionalIssueKind' extends keyof Opts
          ? Opts['additionalIssueKind'] & string
          : never) as CamelCase<K>]?: string
  }
}

/* ------------------------------------------------------ TDef ------------------------------------------------------ */

export interface TDef {
  readonly typeName: TTypeName
  readonly options: TOptions
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TType                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export abstract class TType<O, D extends TDef, I = O> {
  declare readonly $O: O
  declare readonly $I: I

  abstract readonly _manifest: TManifest
  abstract _parse(ctx: ParseContextOf<this>): ParseResultOf<this>

  readonly _def: D & { readonly manifest?: TManifest }

  protected constructor(def: D) {
    this._def = cloneDeep(def)

    this._parse = memoize(this._parse.bind(this), { isEqual: deepEqual })
    this._parseSync = this._parseSync.bind(this)
    this._parseAsync = this._parseAsync.bind(this)
    this.parse = this.parse.bind(this)
    this.safeParse = this.safeParse.bind(this)
    this.parseAsync = this.parseAsync.bind(this)
    this.safeParseAsync = this.safeParseAsync.bind(this)
    this.guard = this.guard.bind(this)
    this.optional = this.optional.bind(this)
    this.nullable = this.nullable.bind(this)
    this.nullish = this.nullish.bind(this)
    this.required = this.required.bind(this)
    this.array = this.array.bind(this)
    this.promise = this.promise.bind(this)
    this.or = this.or.bind(this)
    this.and = this.and.bind(this)
    this.brand = this.brand.bind(this)
    this.default = this.default.bind(this)
    this.catch = this.catch.bind(this)
    this.lazy = this.lazy.bind(this)
    this.pipe = this.pipe.bind(this)
    this.title = this.title.bind(this)
    this.summary = this.summary.bind(this)
    this.description = this.description.bind(this)
    this.version = this.version.bind(this)
    this.examples = this.examples.bind(this)
    this.tags = this.tags.bind(this)
    this.notes = this.notes.bind(this)
    this.unit = this.unit.bind(this)
    this.deprecated = this.deprecated.bind(this)
    this.meta = this.meta.bind(this)
    this.abortEarly = this.abortEarly.bind(this)
    this.color = this.color.bind(this)
    this.debug = this.debug.bind(this)
    this.errorMap = this.errorMap.bind(this)
    this.clone = this.clone.bind(this)
    this.isOptional = this.isOptional.bind(this)
    this.isNullable = this.isNullable.bind(this)
    this.isNullish = this.isNullish.bind(this)
    this.isRequired = this.isRequired.bind(this)
    this.isReadonly = this.isReadonly.bind(this)
    this.isDeprecated = this.isDeprecated.bind(this)

    Object.keys(this).forEach((k) => Object.defineProperty(this, k, { enumerable: !/^(?:_|\$)\w*/.exec(k) }))
  }

  readonly id: string = nanoid()

  get typeName(): D['typeName'] {
    return this._def.typeName
  }

  get manifest(): { [K in keyof this['_manifest']]: this['_manifest'][K] } {
    return omit(
      { ...cloneDeep(this._manifest), ...cloneDeep(this._def.manifest) },
      (val) => val === undefined
    ) as SimplifyFlat<this['_manifest']>
  }

  get options(): D['options'] {
    return this._def.options
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

  optional(): TOptional<this> {
    return TOptional.create(this, this.options)
  }

  nullable(): TNullable<this> {
    return TNullable.create(this, this.options)
  }

  nullish(): TOptional<TNullable<this>> {
    return TOptional.create(TNullable.create(this, this.options), this.options)
  }

  required(): TRequired<this> {
    return TRequired.create(this, this.options)
  }

  array(): TArray<this> {
    return TArray.create(this, this.options)
  }

  promise(): TPromise<this> {
    return TPromise.create(this, this.options)
  }

  or<T extends readonly [AnyTType, ...AnyTType[]]>(...alternatives: T): TUnion<[this, ...T]> {
    return new TUnion({ typeName: TTypeName.Union, members: [this, ...alternatives], options: this.options })
  }

  and<T extends readonly [AnyTType, ...AnyTType[]]>(...intersectees: T): TIntersection<[this, ...T]> {
    return new TIntersection({
      typeName: TTypeName.Intersection,
      members: [this, ...intersectees],
      options: this.options,
    })
  }

  brand<T extends PropertyKey>(brand: T): TBrand<this, T> {
    return TBrand.create(this, brand, this.options)
  }

  default<T extends Defined<O>>(defaultValue: T): TDefault<this, T>
  default<T extends Defined<O>>(getDefault: () => T): TDefault<this, T>
  default<T extends Defined<O>>(defaultValueOrGetter: T | (() => T)): TDefault<this, T> {
    return TDefault.create(this, defaultValueOrGetter, this.options)
  }

  catch<T extends O>(catchValue: T): TCatch<this, T>
  catch<T extends O>(getCatch: () => T): TCatch<this, T>
  catch<T extends O>(catchValueOrGetter: T | (() => T)): TCatch<this, T> {
    return TCatch.create(this, catchValueOrGetter, this.options)
  }

  lazy(): TLazy<this> {
    return TLazy.create(() => this, this.options)
  }

  pipe<T extends AnyTType<unknown, I>>(type: T): TPipeline<this, T> {
    return TPipeline.create(this, type, this.options)
  }

  title(title: string): this {
    return this._updateManifest('title', title)
  }

  summary(summary: string): this {
    return this._updateManifest('summary', summary)
  }

  description(description: string): this {
    return this._updateManifest('description', description)
  }

  version(version: string): this {
    return this._updateManifest('version', version)
  }

  examples(...examples: readonly [O, ...O[]]): this {
    return this._updateManifest('examples', (this._manifest.examples ?? []).concat(examples))
  }

  tags(...tags: readonly [string, ...string[]]): this {
    return this._updateManifest('tags', (this._manifest.tags ?? []).concat(tags))
  }

  notes(...notes: readonly [string, ...string[]]): this {
    return this._updateManifest('notes', (this._manifest.notes ?? []).concat(notes))
  }

  unit(unit: string): this {
    return this._updateManifest('unit', unit)
  }

  deprecated(deprecated?: boolean): this {
    return this._updateManifest('deprecated', deprecated)
  }

  meta(meta: Readonly<Record<string, unknown>>): this {
    return this._updateManifest('meta', meta)
  }

  abortEarly(abortEarly = true): this {
    return this._updateOptions('abortEarly', abortEarly)
  }

  color(color: string): this {
    return this._updateOptions('color', color)
  }

  debug(debug = true): this {
    return this._updateOptions('debug', debug)
  }

  errorMap(map: TErrorMap): this {
    return this._updateOptions('errorMap', map)
  }

  clone(): this {
    return this._reconstruct()
  }

  isOptional(): boolean {
    return !this.manifest.required
  }

  isNullable(): boolean {
    return this.manifest.nullable
  }

  isNullish(): boolean {
    return !this.manifest.required && this.manifest.nullable
  }

  isRequired(): boolean {
    return this.manifest.required
  }

  isReadonly(): boolean {
    return this.manifest.readonly
  }

  isDeprecated(): boolean {
    return Boolean(this.manifest.deprecated)
  }

  private _updateManifest<K extends keyof TManifest>(key: K, value: TManifest[K]): this {
    return this._reconstruct({ ...this._def, manifest: { ...this.manifest, [key]: value } })
  }

  private _updateOptions<K extends keyof TOptions>(key: K, value: TOptions[K]): this {
    return this._reconstruct({ ...this._def, options: { ...this.options, [key]: value } })
  }

  private _reconstruct(def?: D): this {
    return Reflect.construct<[def: D], this>(this.constructor as new (def: D) => this, [{ ...this._def, ...def }])
  }
}

export type AnyTType<O = unknown, I = unknown> = TType<O, TDef, I>

export type OutputOf<T extends AnyTType> = T['$O']
export type InputOf<T extends AnyTType> = T['$I']

/* ------------------------------------------------------------------------------------------------------------------ */

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TAny                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TAnyDef extends TDef {
  readonly typeName: TTypeName.Any
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class TAny extends TType<any, TAnyDef> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get _manifest(): TNullishManifest<any> {
    return { ...getDefaultManifest({ type: TParsedType.Any }), required: false, nullable: true }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return OK(ctx.data)
  }

  static create(options?: SimplifyFlat<TOptions>): TAny {
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
  get _manifest(): TNullishManifest<unknown> {
    return { ...getDefaultManifest({ type: TParsedType.Unknown }), required: false, nullable: true }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return OK(ctx.data)
  }

  static create(options?: SimplifyFlat<TOptions>): TUnknown {
    return new TUnknown({ typeName: TTypeName.Unknown, options: { ...options } })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TString                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TStringDef extends TDef {
  readonly typeName: TTypeName.String
}

export class TString extends TType<string, TStringDef> {
  get _manifest(): TManifest<string> {
    return { ...getDefaultManifest({ type: TParsedType.String }) }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (typeof ctx.data !== 'string') {
      return ctx.invalidType({ expected: TParsedType.String }).abort()
    }

    return OK(ctx.data)
  }

  static create(options?: SimplifyFlat<TOptions>): TString {
    return new TString({ typeName: TTypeName.String, options: { ...options } })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TNumber                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TNumberDef extends TDef {
  readonly typeName: TTypeName.Number
}

export class TNumber extends TType<number, TNumberDef> {
  get _manifest(): TManifest<number> {
    return { ...getDefaultManifest({ type: TParsedType.Number }) }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (typeof ctx.data !== 'number' || Number.isNaN(ctx.data)) {
      return ctx.invalidType({ expected: TParsedType.Number }).abort()
    }

    return OK(ctx.data)
  }

  static create(options?: SimplifyFlat<TOptions>): TNumber {
    return new TNumber({ typeName: TTypeName.Number, options: { ...options } })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TNaN                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TNaNDef extends TDef {
  readonly typeName: TTypeName.NaN
}

export class TNaN extends TType<number, TNaNDef> {
  get _manifest(): TManifest<number> {
    return { ...getDefaultManifest({ type: TParsedType.NaN }) }
  }

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

export interface TBigIntDef extends TDef {
  readonly typeName: TTypeName.BigInt
}

export class TBigInt extends TType<bigint, TBigIntDef> {
  get _manifest(): TManifest<bigint> {
    return { ...getDefaultManifest({ type: TParsedType.BigInt }) }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (typeof ctx.data !== 'bigint') {
      return ctx.invalidType({ expected: TParsedType.BigInt }).abort()
    }

    return OK(ctx.data)
  }

  static create(options?: SimplifyFlat<TOptions>): TBigInt {
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
  get _manifest(): TManifest<boolean> {
    return { ...getDefaultManifest({ type: TParsedType.Boolean }) }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return typeof ctx.data === 'boolean' ? OK(ctx.data) : ctx.invalidType({ expected: TParsedType.Boolean }).abort()
  }

  static create(options?: SimplifyFlat<TOptions>): TBoolean {
    return new TBoolean({ typeName: TTypeName.Boolean, options: { ...options } })
  }
}

/* ------------------------------------------------------ TTrue ----------------------------------------------------- */

export interface TTrueDef extends TDef {
  readonly typeName: TTypeName.True
}

export class TTrue extends TType<true, TTrueDef> {
  get _manifest(): TLiteralManifest<true> {
    return { ...getDefaultManifest({ type: TParsedType.True }), literal: true }
  }

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
  get _manifest(): TLiteralManifest<false> {
    return { ...getDefaultManifest({ type: TParsedType.False }), literal: false }
  }

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

export interface TDateDef extends TDef {
  readonly typeName: TTypeName.Date
}

export class TDate extends TType<Date, TDateDef> {
  get _manifest(): TManifest<Date> {
    return { ...getDefaultManifest({ type: TParsedType.Date }) }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (!(ctx.data instanceof Date)) {
      return ctx.invalidType({ expected: TParsedType.Date }).abort()
    }

    return OK(ctx.data)
  }

  static create(options?: SimplifyFlat<TOptions>): TDate {
    return new TDate({ typeName: TTypeName.Date, options: { ...options } })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TSymbol                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TSymbolDef extends TDef {
  readonly typeName: TTypeName.Symbol
}

export class TSymbol extends TType<symbol, TSymbolDef> {
  get _manifest(): TManifest<symbol> {
    return { ...getDefaultManifest({ type: TParsedType.Symbol }) }
  }

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
}

export class TBuffer extends TType<Buffer, TBufferDef> {
  get _manifest(): TManifest<Buffer> {
    return { ...getDefaultManifest({ type: TParsedType.Buffer }) }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return Buffer.isBuffer(ctx.data) ? OK(ctx.data) : ctx.invalidType({ expected: TParsedType.Buffer }).abort()
  }

  static create(options?: SimplifyFlat<TOptions>): TBuffer {
    return new TBuffer({ typeName: TTypeName.Buffer, options: { ...options } })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TLiteral                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

// eslint-disable-next-line @typescript-eslint/ban-types
export type TLiteralValue = string | number | bigint | boolean | symbol | null | undefined

export type TLiteralOptions = TOptions<{
  additionalIssueKind: TIssueKind.InvalidLiteral
}>

export interface TLiteralDef<T extends TLiteralValue> extends TDef {
  readonly typeName: TTypeName.Literal
  readonly options: TLiteralOptions
  readonly value: T
}

const getLiteralParsedType = (value: TLiteralValue): TParsedType => {
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

export class TLiteral<T extends TLiteralValue> extends TType<T, TLiteralDef<T>> {
  get _manifest(): TLiteralManifest<T> {
    return {
      ...getDefaultManifest({ type: getLiteralParsedType(this.value) }),
      literal: this.value,
      required: this.value !== undefined,
      nullable: this.value === null,
    }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    const { value } = this._def

    const expectedParsedType = getLiteralParsedType(value)

    if (ctx.parsedType !== expectedParsedType) {
      return ctx.invalidType({ expected: expectedParsedType }).abort()
    }

    if (ctx.data !== value) {
      return ctx
        .addIssue(
          { kind: TIssueKind.InvalidLiteral, payload: { expected: value, received: ctx.data as TLiteralValue } },
          this.options.messages?.invalidLiteral
        )
        .abort()
    }

    return OK(ctx.data as T)
  }

  get value(): T {
    return this._def.value
  }

  static create<T extends TLiteralValue>(value: T, options?: SimplifyFlat<TLiteralOptions>): TLiteral<T> {
    return new TLiteral({ typeName: TTypeName.Literal, options: { ...options }, value })
  }
}

export type AnyTLiteral = TLiteral<TLiteralValue>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TEnum                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TEnumValues = readonly [string | number, ...Array<string | number>]

export type TEnumOptions = TOptions<{
  additionalIssueKind: TIssueKind.InvalidEnumValue
}>

export interface TEnumDef<T extends readonly [string, ...string[]]> extends TDef {
  readonly typeName: TTypeName.Enum
  readonly options: TEnumOptions
  readonly values: T
}

export class TEnum<T extends readonly [string, ...string[]]> extends TType<T[number], TEnumDef<T>> {
  get _manifest(): TEnumManifest<T> {
    return { ...getDefaultManifest({ type: TParsedType.String }), enum: this.values }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (typeof ctx.data !== 'string') {
      return ctx.invalidType({ expected: TParsedType.String }).abort()
    }

    const { values } = this._def

    if (!values.includes(ctx.data)) {
      return ctx
        .addIssue(
          { kind: TIssueKind.InvalidEnumValue, payload: { expected: values, received: ctx.data } },
          this.options.messages?.invalidEnumValue
        )
        .abort()
    }

    return OK(ctx.data)
  }

  get values(): T {
    return this._def.values
  }

  get enum(): { readonly [K in T[number]]: K } {
    return this.values.reduce((acc, value) => ({ ...acc, [value]: value }), {} as { readonly [K in T[number]]: K })
  }

  static create<T extends string, U extends readonly [T, ...T[]]>(
    values: U,
    options?: SimplifyFlat<TEnumOptions>
  ): TEnum<U> {
    return new TEnum({ typeName: TTypeName.Enum, values, options: { ...options } })
  }
}

export type AnyTEnum = TEnum<readonly [string, ...string[]]>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                     TNativeEnum                                                    */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface EnumLike {
  readonly [x: string]: string | number
  readonly [x: number]: string
}

export interface TNativeEnumDef<T extends EnumLike> extends TDef {
  readonly typeName: TTypeName.NativeEnum
  readonly options: TEnumOptions
  readonly enum: T
}

export class TNativeEnum<T extends EnumLike> extends TType<T[keyof T], TNativeEnumDef<T>> {
  get _manifest(): TEnumManifest<ReadonlyArray<T[keyof T]>> {
    return { ...getDefaultManifest({ type: TParsedType.String }), enum: this.values }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {}

  get enum(): T {
    return this._def.enum
  }

  get values(): ReadonlyArray<T[keyof T]> {
    return Object.values(this.enum) as Array<T[keyof T]>
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

export interface TArrayDef<T extends AnyTType> extends TIterableDef<T> {
  readonly typeName: TTypeName.Array
  readonly length?: { readonly value: number; readonly message: string | undefined }
  readonly unique?: { readonly message: string | undefined }
}

export interface TSetDef<T extends AnyTType> extends TIterableDef<T> {
  readonly typeName: TTypeName.Set
  readonly size?: { readonly value: number; readonly message: string | undefined }
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
  sparse(enabled: false): TIterable<TRequired<T>>
  partial(): TIterable<TOptional<T>>
}

export const handleArrayResults = <T extends AnyTType, U extends AnyTType>(
  ctx: ParseContextOf<T>,
  resultGetters: Array<() => SyncParseResultOf<U>>
): SuccessfulParseResult<Array<OutputOf<U>>> | FailedParseResult<InputOf<T>> => {
  const result = []

  for (const getResult of resultGetters) {
    const res = getResult()

    if (!res.ok) {
      if (ctx.common.abortEarly) {
        return ctx.abort()
      }

      continue
    }

    result.push(res.data)
  }

  return ctx.isValid() ? OK(result) : ctx.abort()
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

export class TArray<T extends AnyTType, C extends TArrayCardinality = 'many'>
  extends TType<TArrayIO<T, C>, TArrayDef<T>, TArrayIO<T, C, '$I'>>
  implements TIterable<T>
{
  get _manifest(): TIterableManifest<T, TArrayIO<T, C>> {
    return {
      ...getDefaultManifest({ type: TParsedType.Array }),
      items: this.element.manifest,
      minItems: this._def.minItems?.value,
      maxItems: this._def.maxItems?.value,
    }
  }

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

    if (ctx.isAsync()) {
      return Promise.all(data.map(async (value, i) => element._parseAsync(ctx.child(element, value, [i])))).then(
        (childResults) =>
          handleArrayResults(
            ctx,
            childResults.map((res) => () => res)
          ) as ParseResultOf<this>
      )
    }

    return handleArrayResults(
      ctx,
      data.map((value, i) => () => element._parseSync(ctx.child(element, value, [i])))
    ) as ParseResultOf<this>
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
    if (!minItems) {
      return this.min(1, { inclusive: true, message: options?.message }) as TArray<T, 'atleastone'>
    }

    const updatedMin = minItems.value >= 1 ? minItems.value : 1

    return new TArray({
      ...this._def,
      length: undefined,
      minItems: {
        value: updatedMin,
        inclusive: updatedMin > 1 ? minItems.inclusive : true,
        message: options?.message ?? minItems.message,
      },
    })
  }

  sparse(enabled?: true): TArray<TOptional<T>, C>
  sparse(enabled: false): TArray<TRequired<T>, C>
  sparse(enabled = true): TArray<TOptional<T> | TRequired<T>, C> {
    return new TArray({ ...this._def, element: this.element[enabled ? 'optional' : 'required']() })
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

  static create<T extends AnyTType>(element: T, options?: SimplifyFlat<TOptions>): TArray<T> {
    return new TArray({ typeName: TTypeName.Array, element, options: { ...options } })
  }
}

export type AnyTArray = TArray<AnyTType, TArrayCardinality>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TTuple                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

// eslint-disable-next-line @typescript-eslint/ban-types
export type TTupleItems = readonly [AnyTType, ...AnyTType[]] | readonly []

export type TTupleIO<
  T extends TTupleItems,
  R extends AnyTType | undefined,
  IO extends '$I' | '$O' = '$O'
  // eslint-disable-next-line @typescript-eslint/ban-types
> = T extends readonly []
  ? R extends AnyTType
    ? [...Array<R[IO]>]
    : // eslint-disable-next-line @typescript-eslint/ban-types
      []
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
  get _manifest(): TTupleManifest<T, TTupleIO<T, R>> {
    return {
      ...getDefaultManifest({ type: TParsedType.Tuple }),
      items: this.items.map((i) => i.manifest as T[number]['manifest']),
      minItems: this.items.length,
      maxItems: this.items.length,
      additionalItems: Boolean(this.restType),
    }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (!isArray(ctx.data)) {
      return ctx.invalidType({ expected: TParsedType.Tuple }).abort()
    }

    const { items, rest } = this._def
    const { data } = ctx

    if (data.length < items.length || (!rest && data.length > items.length)) {
      ctx.addIssue(
        { kind: TIssueKind.InvalidTuple, payload: { check: 'length', expected: items.length, received: data.length } },
        this.options.messages?.invalidTuple
      )
      if (ctx.common.abortEarly) {
        return ctx.abort()
      }
    }

    if (ctx.isAsync()) {
      return Promise.all(
        data
          .map((value, i) => ({ value, schema: items[i] ?? rest }))
          .filter((data): data is { value: typeof data.value; schema: NonNullable<typeof data.schema> } =>
            Boolean(data.schema)
          )
          .map(async ({ value, schema }, i) => schema._parseAsync(ctx.child(schema, value, [i])))
      ).then(
        (childResults) =>
          handleArrayResults(
            ctx,
            childResults.map((res) => () => res)
          ) as ParseResultOf<this>
      )
    }

    return handleArrayResults(
      ctx,
      data
        .map((value, i) => ({ value, schema: items[i] ?? rest }))
        .filter((data): data is { value: typeof data.value; schema: NonNullable<typeof data.schema> } =>
          Boolean(data.schema)
        )
        .map(
          ({ value, schema }, i) =>
            () =>
              schema._parseSync(ctx.child(schema, value, [i]))
        )
    ) as ParseResultOf<this>
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

export interface TSetManifest<T extends AnyTType> extends TIterableManifest<T, Set<OutputOf<T>>> {
  readonly type: TParsedType.Set
}

export class TSet<T extends AnyTType>
  extends TType<Set<OutputOf<T>>, TSetDef<T>, Set<InputOf<T>>>
  implements TIterable<T>
{
  get _manifest(): TIterableManifest<T, Set<OutputOf<T>>> {
    return {
      ...getDefaultManifest({ type: TParsedType.Set }),
      items: this.element.manifest,
      minItems: this._def.minItems?.value,
      maxItems: this._def.maxItems?.value,
    }
  }

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

    if (ctx.isAsync()) {
      return Promise.all([...data].map(async (value, i) => element._parseAsync(ctx.child(element, value, [i])))).then(
        (childResults) => {
          const result = handleArrayResults(
            ctx,
            childResults.map((res) => () => res)
          )
          return result.ok ? OK(new Set(result.data)) : result
        }
      )
    }

    const result = handleArrayResults(
      ctx,
      [...data].map((value, i) => () => element._parseSync(ctx.child(element, value, [i])))
    )

    return result.ok ? OK(new Set(result.data)) : result
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
  sparse(enabled: false): TSet<TRequired<T>>
  sparse(enabled = true): TSet<TOptional<T> | TRequired<T>> {
    return new TSet({ ...this._def, element: this.element[enabled ? 'optional' : 'required']() })
  }

  partial(): TSet<TOptional<T>> {
    return this.sparse(true)
  }

  toArray(): TArray<T> {
    return new TArray({ ...this._def, typeName: TTypeName.Array, length: this._def.size })
  }

  static create<T extends AnyTType>(element: T, options?: SimplifyFlat<TOptions>): TSet<T> {
    return new TSet({ typeName: TTypeName.Set, element, options: { ...options } })
  }
}

export type AnyTSet = TSet<AnyTType>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                     TUndefined                                                     */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TUndefinedDef extends TDef {
  readonly typeName: TTypeName.Undefined
}

export class TUndefined extends TType<undefined, TUndefinedDef> {
  get _manifest(): TOptionalManifest<undefined> {
    return { ...getDefaultManifest({ type: TParsedType.Undefined }), required: false }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return ctx.data === undefined ? OK(undefined) : ctx.invalidType({ expected: TParsedType.Undefined }).abort()
  }

  static create(options?: SimplifyFlat<TOptions>): TUndefined {
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
  get _manifest(): TOptionalManifest<void> {
    return { ...getDefaultManifest({ type: TParsedType.Void }), required: false }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return ctx.data === undefined ? OK(undefined) : ctx.invalidType({ expected: TParsedType.Void }).abort()
  }

  static create(options?: SimplifyFlat<TOptions>): TVoid {
    return new TVoid({ typeName: TTypeName.Void, options: { ...options } })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TNull                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TNullDef extends TDef {
  readonly typeName: TTypeName.Null
}

// eslint-disable-next-line @typescript-eslint/ban-types
export class TNull extends TType<null, TNullDef> {
  // eslint-disable-next-line @typescript-eslint/ban-types
  get _manifest(): TNullableManifest<null> {
    return { ...getDefaultManifest({ type: TParsedType.Null }), nullable: true }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return ctx.data === null ? OK(null) : ctx.invalidType({ expected: TParsedType.Null }).abort()
  }

  static create(options?: SimplifyFlat<TOptions>): TNull {
    return new TNull({ typeName: TTypeName.Null, options: { ...options } })
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
  get _manifest(): TManifest<never> {
    return { ...getDefaultManifest({ type: TParsedType.Never }) }
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return ctx.addIssue({ kind: TIssueKind.Forbidden }, this.options.messages?.forbidden).abort()
  }

  static create(options?: SimplifyFlat<TNeverOptions>): TNever {
    return new TNever({ typeName: TTypeName.Never, options: { ...options } })
  }
}

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
  get _manifest(): TOptionalManifest<OutputOf<T> | undefined> {
    return { ...this.underlying.manifest, required: false }
  }

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

export class TNullable<T extends AnyTType>
  // eslint-disable-next-line @typescript-eslint/ban-types
  extends TType<OutputOf<T> | null, TNullableDef<T>, InputOf<T> | null>
  implements TUnwrappable<T>
{
  // eslint-disable-next-line @typescript-eslint/ban-types
  get _manifest(): TNullableManifest<OutputOf<T> | null> {
    return { ...this.underlying.manifest, nullable: true }
  }

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
    return new TNullable({ typeName: TTypeName.Nullable, underlying, options: { ...options } })
  }
}

export type AnyTNullable = TNullable<AnyTType>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TRequired                                                     */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TRequiredDef<T extends AnyTType> extends TDef {
  readonly typeName: TTypeName.Required
  readonly underlying: T
}

export class TRequired<T extends AnyTType>
  extends TType<Defined<OutputOf<T>>, TRequiredDef<T>, Defined<InputOf<T>>>
  implements TUnwrappable<T>
{
  get _manifest(): TRequiredManifest<Defined<OutputOf<T>>> {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return { ...this.underlying.manifest, required: true } as TRequiredManifest<Defined<OutputOf<T>>>
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return ctx.data === undefined
      ? ctx.addIssue({ kind: TIssueKind.Required }, this.options.messages?.required).abort()
      : (this._def.underlying._parse(ctx.child(this._def.underlying, ctx.data)) as ParseResultOf<this>)
  }

  get underlying(): T {
    return this._def.underlying
  }

  unwrap(): T {
    return this.underlying
  }

  unwrapDeep(): UnwrapDeep<T, TTypeName.Required> {
    return (this.underlying instanceof TRequired ? this.underlying.unwrapDeep() : this.underlying) as UnwrapDeep<
      T,
      TTypeName.Required
    >
  }

  static create<T extends AnyTType>(underlying: T, options?: SimplifyFlat<TOptions>): TRequired<T> {
    return new TRequired({ typeName: TTypeName.Required, underlying, options: { ...options } })
  }
}

export type AnyTRequired = TRequired<AnyTType>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TPromise                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TPromiseDef<T extends AnyTType> extends TDef {
  readonly typeName: TTypeName.Promise
  readonly underlying: T
}

export class TPromise<T extends AnyTType> extends TType<Promise<OutputOf<T>>, TPromiseDef<T>, Promise<InputOf<T>>> {
  get _manifest(): TPromiseManifest<OutputOf<T>> {
    return { ...this.underlying.manifest, promise: true }
  }

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
/*                                                       TBrand                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export const BRAND = Symbol('BRAND')
// eslint-disable-next-line @typescript-eslint/no-redeclare
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
  get _manifest(): TBrandManifest<OutputOf<T>, B> {
    return { ...this.underlying.manifest, brand: this.getBrand() }
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
  get _manifest(): T['manifest'] {
    return { ...this.underlying.manifest, default: this.getDefault() }
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
  get _manifest(): T['manifest'] {
    return { ...this.underlying.manifest }
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
  get _manifest(): T['manifest'] {
    return { ...this.underlying.manifest }
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
  get _manifest(): TManifest {
    return this.members.reduce<any>((acc, type) => ({ ...acc, ...type.manifest }), {})
  }

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
        .addIssue({ kind: TIssueKind.InvalidUnion, payload: { issues } }, this.options.messages?.invalidUnion)
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

export class TIntersection<T extends readonly AnyTType[]> extends TType<
  UnionToIntersection<OutputOf<T[number]>>,
  TIntersectionDef<T>,
  UnionToIntersection<InputOf<T[number]>>
> {
  get _manifest(): TManifest {
    return this.members.reduce<any>((acc, type) => ({ ...acc, ...type.manifest }), {})
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    const { members } = this._def
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
  get _manifest(): Merge<A['manifest'], B['manifest']> {
    return { ...this.from.manifest, ...this.to.manifest }
  }

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
export const intersectionType = TIntersection.create
export const lazyType = TLazy.create
export const literalType = TLiteral.create
export const nanType = TNaN.create
export const nativeEnumType = TNativeEnum.create
export const neverType = TNever.create
export const nullableType = TNullable.create
export const nullType = TNull.create
export const numberType = TNumber.create
export const optionalType = TOptional.create
export const pipelineType = TPipeline.create
export const promiseType = TPromise.create
export const requiredType = TRequired.create
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
  bufferType as buffer,
  catchType as catch,
  dateType as date,
  enumType as enum,
  falseType as false,
  intersectionType as intersection,
  lazyType as lazy,
  literalType as literal,
  nanType as nan,
  nativeEnumType as nativeEnum,
  neverType as never,
  nullableType as nullable,
  nullType as null,
  numberType as number,
  optionalType as optional,
  pipelineType as pipe,
  pipelineType as pipeline,
  promiseType as promise,
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

export type output<T extends AnyTType> = OutputOf<T>
export type input<T extends AnyTType> = InputOf<T>
export type infer<T extends AnyTType> = OutputOf<T>
