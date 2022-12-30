import cloneDeep from 'clone-deep'
import memoize from 'micro-memoize'
import { nanoid } from 'nanoid'
import type { CamelCase, NonNegativeInteger } from 'type-fest'
import { TIssueKind } from './error'
import {
  OK,
  ParseContextAsync,
  ParseContextSync,
  TParsedType,
  type AsyncParseResultOf,
  type ParseContext,
  type ParseOptions,
  type ParseResultOf,
  type SyncParseResultOf,
} from './parse'
import { isArray, isAsync, omit, type Merge, type SimplifyFlat } from './utils'

/* ---------------------------------------------------- TTypeName --------------------------------------------------- */

export enum TTypeName {
  Any = 'TAny',
  Array = 'TArray',
  BigInt = 'TBigInt',
  Boolean = 'TBoolean',
  Brand = 'TBrand',
  Date = 'TDate',
  False = 'TFalse',
  Intersection = 'TIntersection',
  Lazy = 'TLazy',
  NaN = 'TNaN',
  Never = 'TNever',
  Null = 'TNull',
  Nullable = 'TNullable',
  Number = 'TNumber',
  Optional = 'TOptional',
  Pipeline = 'TPipeline',
  Promise = 'TPromise',
  Set = 'TSet',
  String = 'TString',
  Symbol = 'TSymbol',
  True = 'TTrue',
  Undefined = 'TUndefined',
  Union = 'TUnion',
  Unknown = 'TUnknown',
  Void = 'TVoid',
}

/* ---------------------------------------------------- Manifest ---------------------------------------------------- */

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
  readonly meta?: { readonly [x: string]: unknown }
}

export interface PrivateManifest<T> {
  readonly required: boolean
  readonly nullable: boolean
  readonly readonly: boolean
  readonly default?: T
}

export interface TManifest<T = unknown> extends PublicManifest<T>, PrivateManifest<T> {}

export const getDefaultManifest = <T>(): TManifest<T> => ({
  required: true,
  nullable: false,
  readonly: false,
})

/* ----------------------------------------------------- Options ---------------------------------------------------- */

export interface TOptionsOpts {
  readonly additionalIssueKind?: Exclude<TIssueKind, TIssueKind.Required | TIssueKind.InvalidType>
}

export interface TOptions<Opts extends TOptionsOpts | null = null> extends ParseOptions {
  readonly color?: string
  readonly messages?: {
    readonly [K in
      | TIssueKind.Required
      | TIssueKind.InvalidType
      | ('additionalIssueKind' extends keyof Opts
          ? Opts['additionalIssueKind'] & string
          : never) as CamelCase<K>]?: string
  }
}

/* ------------------------------------------------------- Def ------------------------------------------------------ */

export interface TDef {
  readonly typeName: TTypeName
  readonly options: TOptions
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TType                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

abstract class TType<O, D extends TDef, I = O> {
  declare readonly $O: O
  declare readonly $I: I
  declare readonly $D: D

  abstract readonly _manifest: TManifest
  abstract _parse(ctx: ParseContext<this>): ParseResultOf<this>

  readonly _def: D & { readonly manifest?: TManifest }

  protected constructor(def: D) {
    this._def = cloneDeep(def)

    this._parse = memoize(this._parse.bind(this))
    this._parseSync = this._parseSync.bind(this)
    this._parseAsync = this._parseAsync.bind(this)
    this.parse = this.parse.bind(this)
    this.safeParse = this.safeParse.bind(this)
    this.parseAsync = this.parseAsync.bind(this)
    this.safeParseAsync = this.safeParseAsync.bind(this)
    this.optional = this.optional.bind(this)
    this.nullable = this.nullable.bind(this)
    this.nullish = this.nullish.bind(this)
    this.array = this.array.bind(this)
    this.promise = this.promise.bind(this)
    this.brand = this.brand.bind(this)
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
    this.isOptional = this.isOptional.bind(this)
    this.isNullable = this.isNullable.bind(this)
    this.isNullish = this.isNullish.bind(this)
    this.isReadonly = this.isReadonly.bind(this)
    this.isDeprecated = this.isDeprecated.bind(this)
  }

  readonly id: string = nanoid()

  get typeName(): D['typeName'] {
    return this._def.typeName
  }

  get manifest(): { [K in keyof this['_manifest']]: this['_manifest'][K] } {
    return omit({ ...cloneDeep(this._manifest), ...cloneDeep(this._def.manifest) }, (val) => val === undefined) as {
      [K in keyof this['_manifest']]: this['_manifest'][K]
    }
  }

  get options(): D['options'] {
    return this._def.options
  }

  _parseSync(ctx: ParseContext<this>): SyncParseResultOf<this> {
    const result = this._parse(ctx)
    if (isAsync(result)) {
      throw new Error('Synchronous parse encountered Promise. Use `.parseAsync()`/`.safeParseAsync()` instead.')
    }
    return result
  }

  async _parseAsync(ctx: ParseContext<this>): AsyncParseResultOf<this> {
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
    const ctx = ParseContextSync.of(this, data, options)
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

  safeParseAsync(data: unknown, options?: SimplifyFlat<ParseOptions>): AsyncParseResultOf<this> {
    const ctx = ParseContextAsync.of(this, data, options)
    const result = this._parseAsync(ctx)
    return result
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

  array(): TArray<this> {
    return TArray.create(this, this.options)
  }

  promise(): TPromise<this> {
    return TPromise.create(this, this.options)
  }

  brand<B extends PropertyKey>(brand: B): TBrand<this, B> {
    return TBrand.create(this, brand, this.options)
  }

  lazy(): TLazy<this> {
    return TLazy.create(() => this, this.options)
  }

  pipe<U extends AnyTType<unknown, I>>(toType: U): TPipeline<this, U> {
    return TPipeline.create(this, toType, this.options)
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

  examples(...examples: readonly [OutputOf<this>, ...OutputOf<this>[]]): this {
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

  meta(meta: { readonly [x: string]: unknown }): this {
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

  isOptional(): boolean {
    return !this.manifest.required
  }

  isNullable(): boolean {
    return this.manifest.nullable
  }

  isNullish(): boolean {
    return !this.manifest.required && this.manifest.nullable
  }

  isReadonly(): boolean {
    return this.manifest.readonly
  }

  isDeprecated(): boolean {
    return !!this.manifest.deprecated
  }

  protected _updateManifest<K extends keyof TManifest>(key: K, value: TManifest[K]): this {
    return this._reconstruct({ ...this._def, manifest: { ...this.manifest, [key]: value } })
  }

  protected _updateOptions<K extends keyof TOptions>(key: K, value: TOptions[K]): this {
    return this._reconstruct({ ...this._def, options: { ...this.options, [key]: value } })
  }

  protected _reconstruct(def?: this['_def']): this {
    return Reflect.construct<[def: this['_def']], this>(this.constructor as new (def: this['_def']) => this, [
      { ...this._def, ...def },
    ])
  }
}

export type AnyTType<O = unknown, I = unknown> = TType<O, TDef, I>

export type OutputOf<T extends AnyTType> = T['$O']
export type InputOf<T extends AnyTType> = T['$I']

/* ------------------------------------------------------------------------------------------------------------------ */

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TAny                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TNullishManifest<T> = Merge<TManifest<T>, { readonly required: false; readonly nullable: true }>

export interface TAnyDef extends TDef {
  readonly typeName: TTypeName.Any
}

export class TAny extends TType<any, TAnyDef> {
  get _manifest(): TNullishManifest<any> {
    return { ...getDefaultManifest(), required: false, nullable: true }
  }

  _parse(ctx: ParseContext): ParseResultOf<this> {
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
    return { ...getDefaultManifest(), required: false, nullable: true }
  }

  _parse(ctx: ParseContext): ParseResultOf<this> {
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
    return { ...getDefaultManifest() }
  }

  _parse(ctx: ParseContext<this>): ParseResultOf<this> {
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
    return { ...getDefaultManifest() }
  }

  _parse(ctx: ParseContext<this>): ParseResultOf<this> {
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
    return { ...getDefaultManifest() }
  }

  _parse(ctx: ParseContext<this>): ParseResultOf<this> {
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
    return { ...getDefaultManifest() }
  }

  _parse(ctx: ParseContext<this>): ParseResultOf<this> {
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
    return { ...getDefaultManifest() }
  }

  _parse(ctx: ParseContext<this>): ParseResultOf<this> {
    return typeof ctx.data !== 'boolean' ? ctx.invalidType({ expected: TParsedType.Boolean }).abort() : OK(ctx.data)
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
  get _manifest(): TManifest<true> {
    return { ...getDefaultManifest() }
  }

  _parse(ctx: ParseContext<this>): ParseResultOf<this> {
    return ctx.data !== true ? ctx.invalidType({ expected: TParsedType.True }).abort() : OK(ctx.data)
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
  get _manifest(): TManifest<false> {
    return { ...getDefaultManifest() }
  }

  _parse(ctx: ParseContext<this>): ParseResultOf<this> {
    return ctx.data !== false ? ctx.invalidType({ expected: TParsedType.False }).abort() : OK(ctx.data)
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
    return { ...getDefaultManifest() }
  }

  _parse(ctx: ParseContext<this>): ParseResultOf<this> {
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
    return { ...getDefaultManifest() }
  }

  _parse(ctx: ParseContext<this>): ParseResultOf<this> {
    return typeof ctx.data !== 'symbol' ? ctx.invalidType({ expected: TParsedType.Symbol }).abort() : OK(ctx.data)
  }

  static create(options?: SimplifyFlat<TOptions>): TSymbol {
    return new TSymbol({ typeName: TTypeName.Symbol, options: { ...options } })
  }
}

/* ---------------------------------------------------- TIterable --------------------------------------------------- */

export interface TIterableManifest<T extends AnyTType, O> extends TManifest<O> {
  readonly type: TParsedType.Array | TParsedType.Set
  readonly items: T['manifest']
  readonly minItems?: number
  readonly maxItems?: number
}

export interface TIterableDef<T extends AnyTType> extends TDef {
  readonly typeName: TTypeName.Array | TTypeName.Set
  readonly element: T
  readonly minItems?: { readonly value: number; readonly inclusive: boolean; readonly message: string | undefined }
  readonly maxItems?: { readonly value: number; readonly inclusive: boolean; readonly message: string | undefined }
  readonly length?: this['typeName'] extends TTypeName.Set
    ? never
    : { readonly value: number; readonly message: string | undefined }
  readonly size?: this['typeName'] extends TTypeName.Array
    ? never
    : { readonly value: number; readonly message: string | undefined }
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
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TArray                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TArrayCardinality = 'atleastone' | 'many'

export type TArrayIO<T extends AnyTType, C extends TArrayCardinality, IO extends '$I' | '$O' = '$O'> = {
  atleastone: [T[IO], ...T[IO][]]
  many: T[IO][]
}[C]

export interface TArrayManifest<T extends AnyTType, C extends TArrayCardinality = 'many'>
  extends TIterableManifest<T, TArrayIO<T, C>> {
  readonly type: TParsedType.Array
}

export interface TArrayDef<T extends AnyTType> extends TIterableDef<T> {
  readonly typeName: TTypeName.Array
}

export class TArray<T extends AnyTType, C extends TArrayCardinality = 'many'>
  extends TType<TArrayIO<T, C>, TArrayDef<T>, TArrayIO<T, C, '$I'>>
  implements TIterable<T>
{
  get _manifest(): TArrayManifest<T, C> {
    return {
      ...getDefaultManifest(),
      type: TParsedType.Array,
      items: this.element.manifest,
      minItems: this._def.minItems?.value,
      maxItems: this._def.maxItems?.value,
    }
  }

  _parse(ctx: ParseContext<this>): ParseResultOf<this> {
    if (!isArray(ctx.data)) {
      return ctx.invalidType({ expected: TParsedType.Array }).abort()
    }

    const { element, minItems, maxItems, length } = this._def
    const data = ctx.data

    const result: OutputOf<T>[] = []

    if (length && data.length !== length.value) {
      ctx.addIssue(
        { kind: TIssueKind.InvalidArray, payload: { check: 'length', expected: length.value, received: data.length } },
        length.message
      )
      if (ctx.common.abortEarly) {
        return ctx.abort()
      }
    } else if (minItems && (minItems.inclusive ? data.length < minItems.value : data.length <= minItems.value)) {
      ctx.addIssue(
        {
          kind: TIssueKind.InvalidArray,
          payload: {
            check: 'min',
            expected: { value: minItems.value, inclusive: minItems.inclusive },
            received: data.length,
          },
        },
        minItems.message
      )
      if (ctx.common.abortEarly) {
        return ctx.abort()
      }
    } else if (maxItems && (maxItems.inclusive ? data.length > maxItems.value : data.length >= maxItems.value)) {
      ctx.addIssue(
        {
          kind: TIssueKind.InvalidArray,
          payload: {
            check: 'max',
            expected: { value: maxItems.value, inclusive: maxItems.inclusive },
            received: data.length,
          },
        },
        maxItems.message
      )
      if (ctx.common.abortEarly) {
        return ctx.abort()
      }
    }

    if (ctx.isAsync()) {
      return Promise.all(data.map((value, i) => element._parseAsync(ctx.child(element, value, [i])))).then(
        (childResults) => {
          for (const childResult of childResults) {
            if (!childResult.ok) {
              if (ctx.common.abortEarly) {
                return ctx.abort()
              }
              continue
            }
            result.push(childResult.data)
          }
          return ctx.isValid() ? OK(result as OutputOf<this>) : ctx.abort()
        }
      )
    } else {
      for (const [i, value] of data.entries()) {
        const childCtx = ctx.child(element, value, [i])
        const childResult = element._parseSync(childCtx)
        if (!childResult.ok) {
          if (ctx.common.abortEarly) {
            return ctx.abort()
          }
          continue
        }
        result.push(childResult.data)
      }
      return ctx.isValid() ? OK(result as OutputOf<this>) : ctx.abort()
    }
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

  length<L extends number>(value: NonNegativeInteger<L>, options?: { readonly message?: string }): TArray<T, C> {
    return new TArray({
      ...this._def,
      minItems: undefined,
      maxItems: undefined,
      length: { value, message: options?.message },
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

  static create<T extends AnyTType>(element: T, options?: SimplifyFlat<TOptions>): TArray<T> {
    return new TArray({ typeName: TTypeName.Array, element, options: { ...options } })
  }
}

export type AnyTArray = TArray<AnyTType, TArrayCardinality>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TSet                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TSetManifest<T extends AnyTType> extends TIterableManifest<T, Set<OutputOf<T>>> {
  readonly type: TParsedType.Set
}

export interface TSetDef<T extends AnyTType> extends TIterableDef<T> {
  readonly typeName: TTypeName.Set
}

export class TSet<T extends AnyTType>
  extends TType<Set<OutputOf<T>>, TSetDef<T>, Set<InputOf<T>>>
  implements TIterable<T>
{
  get _manifest(): TSetManifest<T> {
    return {
      ...getDefaultManifest(),
      type: TParsedType.Set,
      items: this.element.manifest,
      minItems: this._def.minItems?.value,
      maxItems: this._def.maxItems?.value,
    }
  }

  _parse(ctx: ParseContext<this>): ParseResultOf<this> {
    if (!(ctx.data instanceof Set)) {
      return ctx.invalidType({ expected: TParsedType.Set }).abort()
    }

    const { element, minItems, maxItems, size } = this._def
    const data = ctx.data

    const result: Set<OutputOf<T>> = new Set()

    if (size && data.size !== size.value) {
      ctx.addIssue(
        { kind: TIssueKind.InvalidSet, payload: { check: 'size', expected: size.value, received: data.size } },
        size.message
      )
      if (ctx.common.abortEarly) {
        return ctx.abort()
      }
    } else if (minItems && (minItems.inclusive ? data.size < minItems.value : data.size <= minItems.value)) {
      ctx.addIssue(
        {
          kind: TIssueKind.InvalidSet,
          payload: {
            check: 'min',
            expected: { value: minItems.value, inclusive: minItems.inclusive },
            received: data.size,
          },
        },
        minItems.message
      )
      if (ctx.common.abortEarly) {
        return ctx.abort()
      }
    } else if (maxItems && (maxItems.inclusive ? data.size > maxItems.value : data.size >= maxItems.value)) {
      ctx.addIssue(
        {
          kind: TIssueKind.InvalidSet,
          payload: {
            check: 'max',
            expected: { value: maxItems.value, inclusive: maxItems.inclusive },
            received: data.size,
          },
        },
        maxItems.message
      )
      if (ctx.common.abortEarly) {
        return ctx.abort()
      }
    }

    if (ctx.isAsync()) {
      return Promise.all(Array.from(data).map((value, i) => element._parseAsync(ctx.child(element, value, [i])))).then(
        (childResults) => {
          for (const childResult of childResults) {
            if (!childResult.ok) {
              if (ctx.common.abortEarly) {
                return ctx.abort()
              }
              continue
            }
            result.add(childResult.data)
          }
          return ctx.isValid() ? OK(result) : ctx.abort()
        }
      )
    } else {
      for (const [i, value] of data.entries()) {
        const childCtx = ctx.child(element, value, [i])
        const childResult = element._parseSync(childCtx)
        if (!childResult.ok) {
          if (ctx.common.abortEarly) {
            return ctx.abort()
          }
          continue
        }
        result.add(childResult.data)
      }
      return ctx.isValid() ? OK(result) : ctx.abort()
    }
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

  size<S extends number>(value: NonNegativeInteger<S>, options?: { readonly message?: string }): TSet<T> {
    return new TSet({
      ...this._def,
      minItems: undefined,
      maxItems: undefined,
      size: { value, message: options?.message },
    })
  }

  static create<T extends AnyTType>(element: T, options?: SimplifyFlat<TOptions>): TSet<T> {
    return new TSet({ typeName: TTypeName.Set, element, options: { ...options } })
  }
}

export type AnyTSet = TSet<AnyTType>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                     TUndefined                                                     */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TNonRequiredManifest<T extends undefined | void> = Merge<TManifest<T>, { readonly required: false }>

export interface TUndefinedDef extends TDef {
  readonly typeName: TTypeName.Undefined
}

export class TUndefined extends TType<undefined, TUndefinedDef> {
  get _manifest(): TNonRequiredManifest<undefined> {
    return { ...getDefaultManifest(), required: false }
  }

  _parse(ctx: ParseContext<this>): ParseResultOf<this> {
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
  get _manifest(): TNonRequiredManifest<void> {
    return { ...getDefaultManifest(), required: false }
  }

  _parse(ctx: ParseContext<this>): ParseResultOf<this> {
    return ctx.data === undefined ? OK(undefined) : ctx.invalidType({ expected: TParsedType.Void }).abort()
  }

  static create(options?: SimplifyFlat<TOptions>): TVoid {
    return new TVoid({ typeName: TTypeName.Void, options: { ...options } })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TNull                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TNullManifest = Merge<TManifest<null>, { readonly nullable: true }>

export interface TNullDef extends TDef {
  readonly typeName: TTypeName.Null
}

export class TNull extends TType<null, TNullDef> {
  get _manifest(): TNullManifest {
    return { ...getDefaultManifest(), nullable: true }
  }

  _parse(ctx: ParseContext<this>): ParseResultOf<this> {
    return ctx.data === null ? OK(null) : ctx.invalidType({ expected: TParsedType.Null }).abort()
  }

  static create(options?: SimplifyFlat<TOptions>): TNull {
    return new TNull({ typeName: TTypeName.Null, options: { ...options } })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TNever                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TNeverDef extends TDef {
  readonly typeName: TTypeName.Never
  readonly options: TOptions<{ readonly additionalIssueKind: TIssueKind.Forbidden }>
}

export class TNever extends TType<never, TNeverDef> {
  get _manifest(): TManifest<never> {
    return getDefaultManifest()
  }

  _parse(ctx: ParseContext<this>): ParseResultOf<this> {
    return ctx.addIssue({ kind: TIssueKind.Forbidden }, this.options.messages?.forbidden).abort()
  }

  static create(
    options?: SimplifyFlat<
      TOptions<{
        readonly additionalIssueKind: TIssueKind.Forbidden
      }>
    >
  ): TNever {
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

export type TOptionalManifest<T extends AnyTType> = Merge<T['manifest'], { readonly required: false }>

export interface TOptionalDef<T extends AnyTType> extends TDef {
  readonly typeName: TTypeName.Optional
  readonly underlying: T
}

export class TOptional<T extends AnyTType>
  extends TType<OutputOf<T> | undefined, TOptionalDef<T>, InputOf<T> | undefined>
  implements TUnwrappable<T>
{
  get _manifest(): TOptionalManifest<T> {
    return { ...this.underlying.manifest, required: false }
  }

  _parse(ctx: ParseContext): ParseResultOf<this> {
    if (ctx.data === undefined) {
      return OK(undefined)
    }
    return this._def.underlying._parse(ctx.clone(this._def.underlying, ctx.data))
  }

  get underlying(): T {
    return this._def.underlying
  }

  unwrap(): T {
    return this.underlying
  }

  unwrapDeep(): UnwrapDeep<T, TTypeName.Optional> {
    return this.underlying instanceof TOptional ? this.underlying.unwrapDeep() : this.underlying
  }

  unwrapNullishDeep(): UnwrapDeep<T, TTypeName.Optional | TTypeName.Nullable> {
    return this.underlying instanceof TOptional || this.underlying instanceof TNullable
      ? this.underlying.unwrapNullishDeep()
      : this.underlying
  }

  static create<T extends AnyTType>(underlying: T, options?: SimplifyFlat<TOptions>): TOptional<T> {
    return new TOptional({ typeName: TTypeName.Optional, underlying, options: { ...options } })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TNullable                                                     */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TNullableManifest<T extends AnyTType> = Merge<T['manifest'], { readonly nullable: true }>

export interface TNullableDef<T extends AnyTType> extends TDef {
  readonly typeName: TTypeName.Nullable
  readonly underlying: T
}

export class TNullable<T extends AnyTType>
  extends TType<OutputOf<T> | null, TNullableDef<T>, InputOf<T> | null>
  implements TUnwrappable<T>
{
  get _manifest(): TNullableManifest<T> {
    return { ...this.underlying.manifest, nullable: true }
  }

  _parse(ctx: ParseContext): ParseResultOf<this> {
    if (ctx.data === null) {
      return OK(null)
    }
    return this._def.underlying._parse(ctx.clone(this._def.underlying, ctx.data))
  }

  get underlying(): T {
    return this._def.underlying
  }

  unwrap(): T {
    return this.underlying
  }

  unwrapDeep(): UnwrapDeep<T, TTypeName.Nullable> {
    return this.underlying instanceof TNullable ? this.underlying.unwrapDeep() : this.underlying
  }

  unwrapNullishDeep(): UnwrapDeep<T, TTypeName.Optional | TTypeName.Nullable> {
    return this.underlying instanceof TOptional || this.underlying instanceof TNullable
      ? this.underlying.unwrapNullishDeep()
      : this.underlying
  }

  static create<T extends AnyTType>(underlying: T, options?: SimplifyFlat<TOptions>): TNullable<T> {
    return new TNullable({ typeName: TTypeName.Nullable, underlying, options: { ...options } })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TPromise                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TPromiseManifest<T extends AnyTType> = Merge<T['manifest'], { readonly promise: true }>

export interface TPromiseDef<T extends AnyTType> extends TDef {
  readonly typeName: TTypeName.Promise
  readonly underlying: T
}

export class TPromise<T extends AnyTType> extends TType<Promise<OutputOf<T>>, TPromiseDef<T>, Promise<InputOf<T>>> {
  get _manifest(): TPromiseManifest<T> {
    return { ...this.underlying.manifest, promise: true }
  }

  _parse(ctx: ParseContext<this>): ParseResultOf<this> {
    if (!isAsync(ctx.data) && !ctx.isAsync()) {
      return ctx.invalidType({ expected: TParsedType.Promise }).abort()
    }
    return OK(
      (isAsync(ctx.data) ? ctx.data : Promise.resolve(ctx.data)).then((awaited) => this.underlying.parseAsync(awaited))
    )
  }

  get underlying(): T {
    return this._def.underlying
  }

  unwrap(): T {
    return this.underlying
  }

  unwrapDeep(): UnwrapDeep<T, TTypeName.Promise> {
    return this.underlying instanceof TPromise ? this.underlying.unwrapDeep() : this.underlying
  }

  static create<T extends AnyTType>(underlying: T, options?: SimplifyFlat<TOptions>): TPromise<T> {
    return new TPromise({ typeName: TTypeName.Promise, underlying, options: { ...options } })
  }
}

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

  _parse(ctx: ParseContext<this>): ParseResultOf<this> {
    const type = this.underlying
    return type._parse(ctx.clone(type, ctx.data))
  }

  get underlying(): T {
    return this._def.getType()
  }

  unwrap(): T {
    return this.underlying
  }

  unwrapDeep(): UnwrapDeep<T, TTypeName.Lazy> {
    return this.underlying instanceof TLazy ? this.underlying.unwrapDeep() : this.underlying
  }

  static create<T extends AnyTType>(factory: () => T, options?: SimplifyFlat<TOptions>): TLazy<T> {
    return new TLazy({ typeName: TTypeName.Lazy, getType: factory, options: { ...options } })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TBrand                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export const BRAND = Symbol('BRAND')
export type BRAND = typeof BRAND
export type BRANDED<T, B extends PropertyKey> = T & { readonly [BRAND]: { readonly [K in B]: true } }

export type TBrandManifest<T extends AnyTType, B extends PropertyKey> = Merge<T['manifest'], { readonly brand: B }>

export interface TBrandDef<T extends AnyTType, B extends PropertyKey> extends TDef {
  readonly typeName: TTypeName.Brand
  readonly underlying: T
  readonly brand: B
}

export class TBrand<T extends AnyTType, B extends PropertyKey>
  extends TType<BRANDED<OutputOf<T>, B>, TBrandDef<T, B>, InputOf<T>>
  implements TUnwrappable<T>
{
  get _manifest(): TBrandManifest<T, B> {
    return { ...this.underlying.manifest, brand: this.getBrand() }
  }

  _parse(ctx: ParseContext<this>): ParseResultOf<this> {
    return this.underlying._parse(ctx.clone(this.underlying, ctx.data)) as ParseResultOf<this>
  }

  get underlying(): T {
    return this._def.underlying
  }

  getBrand(): B {
    return this._def.brand
  }

  unwrap(): T {
    return this.underlying
  }

  unwrapDeep(): UnwrapDeep<T, TTypeName.Brand> {
    return this.underlying instanceof TBrand ? this.underlying.unwrapDeep() : this.underlying
  }

  static create<T extends AnyTType, B extends PropertyKey>(
    underlying: T,
    brand: B,
    options?: SimplifyFlat<TOptions>
  ): TBrand<T, B> {
    return new TBrand({ typeName: TTypeName.Brand, underlying, brand, options: { ...options } })
  }
}

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

  _parse(ctx: ParseContext<this>): ParseResultOf<this> {
    const { from, to } = this._def

    if (ctx.common.async) {
      return Promise.resolve().then(async () => {
        const fromResult = await from._parseAsync(ctx.clone(from, ctx.data))
        if (!fromResult.ok) {
          return fromResult
        } else {
          return to._parseAsync(ctx.clone(to, fromResult.data))
        }
      })
    } else {
      const fromResult = from._parseSync(ctx.clone(from, ctx.data))
      if (!fromResult.ok) {
        return fromResult
      } else {
        return to._parse(ctx.clone(to, fromResult.data))
      }
    }
  }

  get from(): A {
    return this._def.from
  }

  get to(): B {
    return this._def.to
  }

  static create<T, TU, U, A extends AnyTType<T, TU>, B extends AnyTType<TU, U>>(
    from: A,
    to: B,
    options?: SimplifyFlat<TOptions>
  ): TPipeline<A, B> {
    return new TPipeline({ typeName: TTypeName.Pipeline, from, to, options: { ...options } })
  }
}

/* ---------------------------------------------------- External ---------------------------------------------------- */

export const anyType = TAny.create
export const arrayType = TArray.create
export const bigintType = TBigInt.create
export const booleanType = TBoolean.create
export const brandType = TBrand.create
export const dateType = TDate.create
export const falseType = TFalse.create
export const lazyType = TLazy.create
export const nanType = TNaN.create
export const neverType = TNever.create
export const nullableType = TNullable.create
export const nullType = TNull.create
export const numberType = TNumber.create
export const optionalType = TOptional.create
export const promiseType = TPromise.create
export const setType = TSet.create
export const stringType = TString.create
export const symbolType = TSymbol.create
export const trueType = TTrue.create
export const undefinedType = TUndefined.create
export const unknownType = TUnknown.create
export const voidType = TVoid.create

export {
  anyType as any,
  arrayType as array,
  bigintType as bigint,
  booleanType as boolean,
  brandType as brand,
  dateType as date,
  falseType as false,
  lazyType as lazy,
  nanType as nan,
  neverType as never,
  nullableType as nullable,
  nullType as null,
  numberType as number,
  optionalType as optional,
  promiseType as promise,
  setType as set,
  stringType as string,
  symbolType as symbol,
  trueType as true,
  undefinedType as undefined,
  unknownType as unknown,
  voidType as void,
}

export type output<T extends AnyTType> = OutputOf<T>
export type input<T extends AnyTType> = InputOf<T>
export type infer<T extends AnyTType> = OutputOf<T>
