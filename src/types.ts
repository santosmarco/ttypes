import { deepEqual } from 'fast-equals'
import memoize from 'micro-memoize'
import { nanoid } from 'nanoid'
import type { CamelCase, NonNegativeInteger, UnionToIntersection } from 'type-fest'
import { TIssueKind, type TErrorMap } from './error'
import { getGlobal, type GlobalOptions } from './global'
import {
  AsyncParseContext,
  OK,
  SyncParseContext,
  TParsedType,
  getParsedType,
  type AsyncParseResultOf,
  type FailedParseResult,
  type ParseContextOf,
  type ParseOptions,
  type ParseResultOf,
  type SuccessfulParseResult,
  type SyncParseResult,
  type SyncParseResultOf,
} from './parse'
import { TShow } from './show'
import {
  cloneDeep,
  isArray,
  isAsync,
  isFunction,
  type BuiltIn,
  type Defined,
  type Equals,
  type Merge,
  type Simplify,
} from './utils'

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
  Map = 'TMap',
  NaN = 'TNaN',
  NativeEnum = 'TNativeEnum',
  Never = 'TNever',
  Null = 'TNull',
  Nullable = 'TNullable',
  Number = 'TNumber',
  Object = 'TObject',
  Optional = 'TOptional',
  Pipeline = 'TPipeline',
  Promise = 'TPromise',
  Readonly = 'TReadonly',
  Record = 'TRecord',
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

export type TTypeNameMap<T extends TTypeName> = {
  [TTypeName.Any]: TAny
  [TTypeName.Array]: AnyTArray
  [TTypeName.BigInt]: TBigInt
  [TTypeName.Boolean]: TBoolean
  [TTypeName.Brand]: AnyTBrand
  [TTypeName.Buffer]: TBuffer
  [TTypeName.Catch]: AnyTCatch
  [TTypeName.Date]: TDate
  [TTypeName.Default]: AnyTDefault
  [TTypeName.Enum]: AnyTEnum
  [TTypeName.False]: TFalse
  [TTypeName.Intersection]: AnyTIntersection
  [TTypeName.Lazy]: AnyTLazy
  [TTypeName.Literal]: AnyTLiteral
  [TTypeName.Map]: AnyTMap
  [TTypeName.NaN]: TNaN
  [TTypeName.NativeEnum]: AnyTNativeEnum
  [TTypeName.Never]: TNever
  [TTypeName.Null]: TNull
  [TTypeName.Nullable]: AnyTNullable
  [TTypeName.Number]: TNumber
  [TTypeName.Object]: AnyTObject
  [TTypeName.Optional]: AnyTOptional
  [TTypeName.Pipeline]: AnyTPipeline
  [TTypeName.Promise]: AnyTPromise
  [TTypeName.Readonly]: AnyTReadonly
  [TTypeName.Record]: AnyTRecord
  [TTypeName.Required]: AnyTRequired
  [TTypeName.Set]: AnyTSet
  [TTypeName.String]: TString
  [TTypeName.Symbol]: TSymbol
  [TTypeName.True]: TTrue
  [TTypeName.Tuple]: AnyTTuple
  [TTypeName.Undefined]: TUndefined
  [TTypeName.Union]: AnyTUnion
  [TTypeName.Unknown]: TUnknown
  [TTypeName.Void]: TVoid
}[T]

/* ---------------------------------------------------- TOptions ---------------------------------------------------- */

export interface TOptionsOpts {
  readonly additionalIssueKind?: Exclude<TIssueKind, TIssueKind.Required | TIssueKind.InvalidType>
}

export interface TOptions<Opts extends TOptionsOpts | undefined = undefined> extends GlobalOptions, ParseOptions {
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

/* ---------------------------------------------------- TManifest --------------------------------------------------- */

export interface TManifest<T = unknown> {
  readonly title?: string
  readonly summary?: string
  readonly description?: string
  readonly examples?: readonly T[]
  readonly tags?: readonly string[]
  readonly notes?: readonly string[]
  readonly unit?: string
  readonly meta?: Readonly<Record<string, unknown>>
}

/* ------------------------------------------------------ TDef ------------------------------------------------------ */

export interface TDef {
  readonly typeName: TTypeName
  readonly options: TOptions
  readonly manifest?: TManifest
  readonly isOptional?: boolean
  readonly isNullable?: boolean
  readonly isReadonly?: boolean
}

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

    this._parse = memoize(this._parse.bind(this), { isEqual: deepEqual })
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
    this.required = this.required.bind(this)
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
    this.isOptional = this.isOptional.bind(this)
    this.isNullable = this.isNullable.bind(this)
    this.isNullish = this.isNullish.bind(this)
    this.isRequired = this.isRequired.bind(this)
    this.isReadonly = this.isReadonly.bind(this)
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
    return TOptional.create(TNullable.create(this, this._def.options), this._def.options)
  }

  required(): TRequired<this> {
    return TRequired.create(this, this._def.options)
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

  isOptional(): boolean {
    return Boolean(this._def.isOptional)
  }

  isNullable(): boolean {
    return Boolean(this._def.isNullable)
  }

  isNullish(): boolean {
    return this.isOptional() && this.isNullable()
  }

  isRequired(): boolean {
    return !this.isOptional()
  }

  isReadonly(): boolean {
    return Boolean(this._def.isReadonly)
  }

  isT<T extends readonly [TTypeName, ...TTypeName[]]>(...types: T): this is TTypeNameMap<T[number]> {
    return types.includes(this.typeName)
  }

  private _construct(def?: D): this {
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
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return OK(ctx.data)
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
    return OK(ctx.data)
  }

  static create(options?: Simplify<TOptions>): TUnknown {
    return new TUnknown({ typeName: TTypeName.Unknown, options: { ...options }, isOptional: true, isNullable: true })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TString                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TStringDef extends TDef {
  readonly typeName: TTypeName.String
}

export class TString extends TType<string, TStringDef> {
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (typeof ctx.data !== 'string') {
      return ctx.invalidType({ expected: TParsedType.String }).abort()
    }

    return OK(ctx.data)
  }

  static create(options?: Simplify<TOptions>): TString {
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
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (typeof ctx.data !== 'number' || Number.isNaN(ctx.data)) {
      return ctx.invalidType({ expected: TParsedType.Number }).abort()
    }

    return OK(ctx.data)
  }

  static create(options?: Simplify<TOptions>): TNumber {
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
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return typeof ctx.data !== 'number' || !Number.isNaN(ctx.data)
      ? ctx.invalidType({ expected: TParsedType.NaN }).abort()
      : OK(ctx.data)
  }

  static create(options?: Simplify<TOptions>): TNaN {
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
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (typeof ctx.data !== 'bigint') {
      return ctx.invalidType({ expected: TParsedType.BigInt }).abort()
    }

    return OK(ctx.data)
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
    return typeof ctx.data === 'boolean' ? OK(ctx.data) : ctx.invalidType({ expected: TParsedType.Boolean }).abort()
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
    return ctx.data === true ? OK(ctx.data) : ctx.invalidType({ expected: TParsedType.True }).abort()
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
    return ctx.data === false ? OK(ctx.data) : ctx.invalidType({ expected: TParsedType.False }).abort()
  }

  static create(options?: Simplify<TOptions>): TFalse {
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
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (!(ctx.data instanceof Date)) {
      return ctx.invalidType({ expected: TParsedType.Date }).abort()
    }

    return OK(ctx.data)
  }

  static create(options?: Simplify<TOptions>): TDate {
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
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return typeof ctx.data === 'symbol' ? OK(ctx.data) : ctx.invalidType({ expected: TParsedType.Symbol }).abort()
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
    return Buffer.isBuffer(ctx.data) ? OK(ctx.data) : ctx.invalidType({ expected: TParsedType.Buffer }).abort()
  }

  static create(options?: Simplify<TOptions>): TBuffer {
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

export type Literalize<T extends TLiteralValue> = T extends string
  ? `"${T}"`
  : T extends bigint
  ? `${T}n`
  : T extends symbol
  ? `Symbol(${string})`
  : // eslint-disable-next-line @typescript-eslint/ban-types
  T extends number | boolean | null | undefined
  ? `${T}`
  : never

export const literalize = <T extends TLiteralValue>(value: T): Literalize<T> =>
  ((): string => {
    if (typeof value === 'string') {
      return `"${value}"`
    }

    if (typeof value === 'bigint') {
      return `${value}n`
    }

    if (typeof value === 'symbol') {
      return `Symbol(${value.description ?? ''})`
    }

    return String(value)
  })() as Literalize<T>

export const getLiteralParsedType = (value: TLiteralValue): TParsedType => {
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
          this._def.options.messages?.invalidLiteral
        )
        .abort()
    }

    return OK(ctx.data as T)
  }

  get value(): T {
    return this._def.value
  }

  static create<T extends TLiteralValue>(value: T, options?: Simplify<TLiteralOptions>): TLiteral<T> {
    return new TLiteral({
      typeName: TTypeName.Literal,
      value,
      options: { ...options },
      isOptional: value === undefined,
      isNullable: value === null,
    })
  }
}

export type AnyTLiteral = TLiteral<TLiteralValue>

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

// eslint-disable-next-line @typescript-eslint/ban-types
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
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {}

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
  sparse(enabled: false): TIterable<TRequired<T>>
  partial(): TIterable<TOptional<T>>
}

export const handleTIterableResults = <T extends AnyTType, U extends AnyTType>(
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

  static create<T extends AnyTType>(element: T, options?: Simplify<TOptions>): TArray<T> {
    return new TArray({ typeName: TTypeName.Array, element, cardinality: 'many', options: { ...options } })
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

  static create<T extends AnyTType>(element: T, options?: Simplify<TOptions>): TSet<T> {
    return new TSet({ typeName: TTypeName.Set, element, options: { ...options } })
  }
}

export type AnyTSet = TSet<AnyTType>

/* --------------------------------------------------- TDictionary -------------------------------------------------- */

export const handleTDictionaryResults = <T extends AnyTType, K extends AnyTType, V extends AnyTType>(
  ctx: ParseContextOf<T>,
  resultGetters: Array<() => { key: SyncParseResultOf<K>; value: SyncParseResultOf<V> }>
): FailedParseResult<InputOf<T>> | SuccessfulParseResult<Map<OutputOf<K>, OutputOf<V>>> => {
  const result = new Map<OutputOf<K>, OutputOf<V>>()

  for (const getResult of resultGetters) {
    const { key: keyRes, value: valueRes } = getResult()

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

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
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

  toMap(): TMap<K, V> {
    return new TMap({ ...this._def, typeName: TTypeName.Map })
  }

  static create<V extends AnyTType>(values: V, options?: Simplify<TOptions>): TRecord<TString, V>
  static create<K extends AnyTType<PropertyKey, PropertyKey>, V extends AnyTType>(
    keys: K,
    values: V,
    options?: Simplify<TOptions>
  ): TRecord<K, V>
  static create(
    valuesOrKeys: AnyTType<PropertyKey, PropertyKey>,
    valuesOrOptions?: AnyTType | Simplify<TOptions>,
    maybeOptions?: Simplify<TOptions>
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

  static create<K extends AnyTType, V extends AnyTType>(keys: K, values: V, options?: Simplify<TOptions>): TMap<K, V> {
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

export type TObjectOptions = TOptions<{
  additionalIssueKind: TIssueKind.UnrecognizedKeys
}>

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
  ? // eslint-disable-next-line @typescript-eslint/ban-types
    { 0: X; 1: Record<string, never> }[Equals<X, {}>]
  : never

export type PartialShape<S extends TObjectShape, K extends ReadonlyArray<keyof S> = ReadonlyArray<keyof S>> = {
  [K_ in keyof S]: K_ extends K[number] ? TOptional<S[K_]> : S[K_]
}
export type DepartialShape<S extends TObjectShape, K extends ReadonlyArray<keyof S> = ReadonlyArray<keyof S>> = {
  [K_ in keyof S]: K_ extends K[number] ? TRequired<S[K_]> : S[K_]
}

export const pick = <T extends Record<string, unknown>, K extends keyof T>(obj: T, keys: readonly K[]): Pick<T, K> =>
  Object.fromEntries(keys.map((k) => [k, obj[k]])) as Pick<T, K>

export const omit = <T extends Record<string, unknown>, K extends keyof T>(obj: T, keys: readonly K[]): Omit<T, K> =>
  Object.fromEntries(Object.entries(obj).filter(([k]) => !keys.includes(k as K))) as Omit<T, K>

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
        Object.entries(this.shape).map(([k, v]) => [
          k,
          (keys ?? Object.keys(this.shape)).includes(k) ? v.required() : v,
        ])
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

  private static _makeCreate<UK extends TObjectUnknownKeys = 'strip'>(
    unknownKeys = 'strip' as UK
  ): <S extends TObjectShape>(shape: S, options?: Simplify<TOptions>) => TObject<S, UK> {
    return (shape, options) =>
      new TObject({ typeName: TTypeName.Object, shape, unknownKeys, catchall: undefined, options: { ...options } })
  }
}

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

  static create(options?: Simplify<TOptions>): TUndefined {
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

  static create(options?: Simplify<TOptions>): TVoid {
    return new TVoid({ typeName: TTypeName.Void, options: { ...options }, isOptional: true })
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
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return ctx.data === null ? OK(null) : ctx.invalidType({ expected: TParsedType.Null }).abort()
  }

  static create(options?: Simplify<TOptions>): TNull {
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

  static create(options?: Simplify<TNeverOptions>): TNever {
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

  static create<T extends AnyTType>(underlying: T, options?: Simplify<TOptions>): TOptional<T> {
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
  // eslint-disable-next-line @typescript-eslint/ban-types
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

  static create<T extends AnyTType>(underlying: T, options?: Simplify<TOptions>): TNullable<T> {
    return new TNullable({ typeName: TTypeName.Nullable, underlying, options: { ...options }, isNullable: true })
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

  unwrapDeep(): UnwrapDeep<T, TTypeName.Required> {
    return (this.underlying instanceof TRequired ? this.underlying.unwrapDeep() : this.underlying) as UnwrapDeep<
      T,
      TTypeName.Required
    >
  }

  static create<T extends AnyTType>(underlying: T, options?: Simplify<TOptions>): TRequired<T> {
    return new TRequired({ typeName: TTypeName.Required, underlying, options: { ...options }, isOptional: false })
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

  static create<T extends AnyTType>(underlying: T, options?: Simplify<TOptions>): TPromise<T> {
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

  static create<T extends AnyTType>(underlying: T, options?: Simplify<TOptions>): TReadonly<T> {
    return new TReadonly({ typeName: TTypeName.Readonly, underlying, options: { ...options }, isReadonly: true })
  }
}

export type AnyTReadonly = TReadonly<AnyTType>

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

  static create<T extends AnyTType>(factory: () => T, options?: Simplify<TOptions>): TLazy<T> {
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
    options?: Simplify<TOptions>
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
    options?: Simplify<TOptions>
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
    options?: Simplify<TOptions>
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
export const promiseType = TPromise.create
export const recordType = TRecord.create
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
  promiseType as promise,
  recordType as record,
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

export type output<T extends AnyTType> = Simplify<OutputOf<T>>
export type input<T extends AnyTType> = Simplify<InputOf<T>>
export type infer<T extends AnyTType> = output<T>
