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
import { isArray, isAsync, omit, type Merge, type SimplifyFlat, type StrictOmit } from './utils'

/* ---------------------------------------------------- TTypeName --------------------------------------------------- */

export enum TTypeName {
  Any = 'TAny',
  Array = 'TArray',
  BigInt = 'TBigInt',
  Boolean = 'TBoolean',
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

/* ---------------------------------------------------- Managers ---------------------------------------------------- */

export interface ParseManager<T extends AnyTType> {
  _parseSync(ctx: ParseContext<T>): SyncParseResultOf<T>
  _parseAsync(ctx: ParseContext<T>): AsyncParseResultOf<T>
  parse(data: unknown, options?: SimplifyFlat<ParseOptions>): OutputOf<T>
  safeParse(data: unknown, options?: SimplifyFlat<ParseOptions>): SyncParseResultOf<T>
  parseAsync(data: unknown, options?: SimplifyFlat<ParseOptions>): Promise<OutputOf<T>>
  safeParseAsync(data: unknown, options?: SimplifyFlat<ParseOptions>): AsyncParseResultOf<T>
}

export const ParseManager = {
  of: <T extends AnyTType>(type: T): ParseManager<T> => ({
    _parseSync(ctx) {
      const result = type._parse(ctx)
      if (isAsync(result)) {
        throw new Error('Synchronous parse encountered Promise. Use `.parseAsync()`/`.safeParseAsync()` instead.')
      }
      return result
    },
    async _parseAsync(ctx) {
      const result = type._parse(ctx)
      return Promise.resolve(result)
    },
    parse(data, options) {
      const result = type.safeParse(data, options)
      if (!result.ok) {
        throw result.error
      }
      return result.data
    },
    safeParse(data, options) {
      const ctx = ParseContextSync.of(type, data, options)
      const result = type._parseSync(ctx)
      return result
    },
    async parseAsync(data, options) {
      const result = await type.safeParseAsync(data, options)
      if (!result.ok) {
        throw result.error
      }
      return result.data
    },
    async safeParseAsync(data, options) {
      const ctx = ParseContextAsync.of(type, data, options)
      const result = type._parseAsync(ctx)
      return result
    },
  }),
}

export interface ManifestManager<T extends AnyTType> {
  title(title: string): T
  summary(summary: string): T
  description(description: string): T
  version(version: string): T
  examples(...examples: readonly [OutputOf<T>, ...OutputOf<T>[]]): T
  tags(...tags: readonly [string, ...string[]]): T
  notes(...notes: readonly [string, ...string[]]): T
  unit(unit: string): T
  deprecated(deprecated?: boolean): T
  meta(meta: { readonly [x: string]: unknown }): T
}

export const ManifestManager = {
  of: <T extends AnyTType>(type: T): ManifestManager<T> => {
    const updateManifest = <K extends keyof NonNullable<T['_def']['manifest']>>(
      key: K,
      value: NonNullable<T['_def']['manifest']>[K]
    ): T => type._reconstruct({ ...type._def, manifest: { ...type.manifest, [key]: value } })

    return {
      title(title) {
        return updateManifest('title', title)
      },
      summary(summary) {
        return updateManifest('summary', summary)
      },
      description(description) {
        return updateManifest('description', description)
      },
      version(version) {
        return updateManifest('version', version)
      },
      examples(...examples) {
        return updateManifest('examples', (type._manifest.examples ?? []).concat(examples))
      },
      tags(...tags) {
        return updateManifest('tags', (type._manifest.tags ?? []).concat(tags))
      },
      notes(...notes) {
        return updateManifest('notes', (type._manifest.notes ?? []).concat(notes))
      },
      unit(unit) {
        return updateManifest('unit', unit)
      },
      deprecated(deprecated = true) {
        return updateManifest('deprecated', deprecated)
      },
      meta(meta) {
        return updateManifest('meta', meta)
      },
    }
  },
}

export interface OptionsManager<T extends AnyTType> {
  abortEarly(abortEarly?: boolean): T
  color(color: string): T
  debug(debug?: boolean): T
}

export const OptionsManager = {
  of: <T extends AnyTType>(type: T): OptionsManager<T> => {
    const updateOptions = <K extends keyof TOptions>(key: K, value: TOptions[K]): T =>
      type._reconstruct({ ...type._def, options: { ...type.options, [key]: value } })

    return {
      abortEarly(abortEarly = true) {
        return updateOptions('abortEarly', abortEarly)
      },
      color(color) {
        return updateOptions('color', color)
      },
      debug(debug = true) {
        return updateOptions('debug', debug)
      },
    }
  },
}

export interface UtilitiesManager<T extends AnyTType> {
  optional(): TOptional<T>
  nullable(): TNullable<T>
  nullish(): TOptional<TNullable<T>>
  array(): TArray<T>
  promise(): TPromise<T>
  lazy(): TLazy<T>
}

export const UtilitiesManager = {
  of: <T extends AnyTType>(type: T): UtilitiesManager<T> => ({
    optional() {
      return TOptional.create(type, type.options)
    },
    nullable() {
      return TNullable.create(type, type.options)
    },
    nullish() {
      return TOptional.create(TNullable.create(type, type.options), type.options)
    },
    array() {
      return TArray.create(type, type.options)
    },
    promise() {
      return TPromise.create(type, type.options)
    },
    lazy() {
      return TLazy.create(() => type, type.options)
    },
  }),
}

export interface ChecksManager<T extends AnyTType> {
  isOptional(): boolean
  isNullable(): boolean
  isNullish(): boolean
  isReadonly(): boolean
  isDeprecated(): boolean
}

export const ChecksManager = {
  of: <T extends AnyTType>(type: T): ChecksManager<T> => ({
    isOptional() {
      return !type.manifest.required
    },
    isNullable() {
      return type.manifest.nullable
    },
    isNullish() {
      return !type.manifest.required && type.manifest.nullable
    },
    isReadonly() {
      return type.manifest.readonly
    },
    isDeprecated() {
      return !!type.manifest.deprecated
    },
  }),
}

export interface TManagers<T extends AnyTType>
  extends ParseManager<T>,
    ManifestManager<T>,
    OptionsManager<T>,
    UtilitiesManager<T>,
    ChecksManager<T> {}

export interface InternalManagers<T extends AnyTType> {
  readonly parse: ParseManager<T>
  readonly manifest: ManifestManager<T>
  readonly options: OptionsManager<T>
  readonly utilities: UtilitiesManager<T>
  readonly checks: ChecksManager<T>
}

export interface TType<Output, Def extends TDef, Input = Output> extends TManagers<TType<Output, Def, Input>> {
  readonly $O: Output
  readonly $I: Input
  readonly $D: Def
  readonly _manifest: TManifest
  _parse(ctx: ParseContext<this>): ParseResultOf<this>
  readonly _def: StrictOmit<Def, 'typeName'> & { readonly manifest?: TManifest }
  readonly _managers: InternalManagers<this>
  readonly id: string
  readonly typeName: Def['typeName']
  readonly manifest: { [K in keyof this['_manifest']]: this['_manifest'][K] }
  readonly options: Def['options']
  _reconstruct(def?: Partial<this['_def']>): this
}

export const ttype = <TN extends TTypeName>(typeName: TN) => {
  abstract class T<Output, Def extends Merge<TDef, { readonly typeName: TN }>, Input = Output>
    implements TType<Output, Def, Input>
  {
    declare readonly $O: Output
    declare readonly $I: Input
    declare readonly $D: Def

    abstract readonly _manifest: TManifest
    abstract _parse(ctx: ParseContext<this>): ParseResultOf<this>

    readonly _def: StrictOmit<Def, 'typeName'> & { readonly manifest?: TManifest }

    readonly _managers: InternalManagers<this> = {
      parse: ParseManager.of(this),
      manifest: ManifestManager.of(this),
      options: OptionsManager.of(this),
      utilities: UtilitiesManager.of(this),
      checks: ChecksManager.of(this),
    }

    protected constructor(def: StrictOmit<Def, 'typeName'>) {
      this._def = cloneDeep(def)
      this._parse = memoize(this._parse.bind(this))
    }

    readonly id: string = nanoid()

    get typeName(): TN {
      return typeName
    }

    get manifest(): { [K in keyof this['_manifest']]: this['_manifest'][K] } {
      return omit({ ...cloneDeep(this._manifest), ...cloneDeep(this._def.manifest) }, (val) => val === undefined) as {
        [K in keyof this['_manifest']]: this['_manifest'][K]
      }
    }

    get options(): Def['options'] {
      return this._def.options
    }

    _parseSync = this._managers.parse._parseSync.bind(this)
    _parseAsync = this._managers.parse._parseAsync.bind(this)
    parse = this._managers.parse.parse.bind(this)
    safeParse = this._managers.parse.safeParse.bind(this)
    parseAsync = this._managers.parse.parseAsync.bind(this)
    safeParseAsync = this._managers.parse.safeParseAsync.bind(this)

    title = this._managers.manifest.title.bind(this)
    summary = this._managers.manifest.summary.bind(this)
    description = this._managers.manifest.description.bind(this)
    version = this._managers.manifest.version.bind(this)
    examples = this._managers.manifest.examples.bind(this)
    tags = this._managers.manifest.tags.bind(this)
    notes = this._managers.manifest.notes.bind(this)
    unit = this._managers.manifest.unit.bind(this)
    deprecated = this._managers.manifest.deprecated.bind(this)
    meta = this._managers.manifest.meta.bind(this)

    abortEarly = this._managers.options.abortEarly.bind(this)
    color = this._managers.options.color.bind(this)
    debug = this._managers.options.debug.bind(this)

    optional = this._managers.utilities.optional.bind(this)
    nullable = this._managers.utilities.nullable.bind(this)
    nullish = this._managers.utilities.nullish.bind(this)
    array = this._managers.utilities.array.bind(this)
    promise = this._managers.utilities.promise.bind(this)
    lazy = this._managers.utilities.lazy.bind(this)

    isOptional = this._managers.checks.isOptional.bind(this)
    isNullable = this._managers.checks.isNullable.bind(this)
    isNullish = this._managers.checks.isNullish.bind(this)
    isReadonly = this._managers.checks.isReadonly.bind(this)
    isDeprecated = this._managers.checks.isDeprecated.bind(this)

    _reconstruct(def?: this['_def']): this {
      return Reflect.construct<[def: this['_def']], this>(this.constructor as new (def: this['_def']) => this, [
        { ...this._def, ...def },
      ])
    }
  }

  return T
}

export type AnyTType<O = unknown, I = unknown> = TType<O, any, I>

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

export class TAny extends ttype(TTypeName.Any)<any, TAnyDef> {
  get _manifest(): TNullishManifest<any> {
    return { ...getDefaultManifest(), required: false, nullable: true }
  }

  _parse(ctx: ParseContext): ParseResultOf<this> {
    return OK(ctx.data)
  }

  static create(options?: SimplifyFlat<TOptions>): TAny {
    return new TAny({ options: { ...options } })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TUnknown                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TUnknownDef extends TDef {
  readonly typeName: TTypeName.Unknown
}

export class TUnknown extends ttype(TTypeName.Unknown)<unknown, TUnknownDef> {
  get _manifest(): TNullishManifest<unknown> {
    return { ...getDefaultManifest(), required: false, nullable: true }
  }

  _parse(ctx: ParseContext): ParseResultOf<this> {
    return OK(ctx.data)
  }

  static create(options?: SimplifyFlat<TOptions>): TUnknown {
    return new TUnknown({ options: { ...options } })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TString                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TStringDef extends TDef {
  readonly typeName: TTypeName.String
}

export class TString extends ttype(TTypeName.String)<string, TStringDef> {
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
    return new TString({ options: { ...options } })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TNumber                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TNumberDef extends TDef {
  readonly typeName: TTypeName.Number
}

export class TNumber extends ttype(TTypeName.Number)<number, TNumberDef> {
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
    return new TNumber({ options: { ...options } })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TNaN                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TNaNDef extends TDef {
  readonly typeName: TTypeName.NaN
}

export class TNaN extends ttype(TTypeName.NaN)<number, TNaNDef> {
  get _manifest(): TManifest<number> {
    return { ...getDefaultManifest() }
  }

  _parse(ctx: ParseContext<this>): ParseResultOf<this> {
    return typeof ctx.data !== 'number' || !Number.isNaN(ctx.data)
      ? ctx.invalidType({ expected: TParsedType.NaN }).abort()
      : OK(ctx.data)
  }

  static create(options?: SimplifyFlat<TOptions>): TNaN {
    return new TNaN({ options: { ...options } })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TBigInt                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TBigIntDef extends TDef {
  readonly typeName: TTypeName.BigInt
}

export class TBigInt extends ttype(TTypeName.BigInt)<bigint, TBigIntDef> {
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
    return new TBigInt({ options: { ...options } })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TBoolean                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TBooleanDef extends TDef {
  readonly typeName: TTypeName.Boolean
}

export class TBoolean extends ttype(TTypeName.Boolean)<boolean, TBooleanDef> {
  get _manifest(): TManifest<boolean> {
    return { ...getDefaultManifest() }
  }

  _parse(ctx: ParseContext<this>): ParseResultOf<this> {
    return typeof ctx.data !== 'boolean' ? ctx.invalidType({ expected: TParsedType.Boolean }).abort() : OK(ctx.data)
  }

  static create(options?: SimplifyFlat<TOptions>): TBoolean {
    return new TBoolean({ options: { ...options } })
  }
}

/* ------------------------------------------------------ TTrue ----------------------------------------------------- */

export interface TTrueDef extends TDef {
  readonly typeName: TTypeName.True
}

export class TTrue extends ttype(TTypeName.True)<true, TTrueDef> {
  get _manifest(): TManifest<true> {
    return { ...getDefaultManifest() }
  }

  _parse(ctx: ParseContext<this>): ParseResultOf<this> {
    return ctx.data !== true ? ctx.invalidType({ expected: TParsedType.True }).abort() : OK(ctx.data)
  }

  static create(options?: SimplifyFlat<TOptions>): TTrue {
    return new TTrue({ options: { ...options } })
  }
}

/* ----------------------------------------------------- TFalse ----------------------------------------------------- */

export interface TFalseDef extends TDef {
  readonly typeName: TTypeName.False
}

export class TFalse extends ttype(TTypeName.False)<false, TFalseDef> {
  get _manifest(): TManifest<false> {
    return { ...getDefaultManifest() }
  }

  _parse(ctx: ParseContext<this>): ParseResultOf<this> {
    return ctx.data !== false ? ctx.invalidType({ expected: TParsedType.False }).abort() : OK(ctx.data)
  }

  static create(options?: SimplifyFlat<TOptions>): TFalse {
    return new TFalse({ options: { ...options } })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TDate                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TDateDef extends TDef {
  readonly typeName: TTypeName.Date
}

export class TDate extends ttype(TTypeName.Date)<Date, TDateDef> {
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
    return new TDate({ options: { ...options } })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TSymbol                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TSymbolDef extends TDef {
  readonly typeName: TTypeName.Symbol
}

export class TSymbol extends ttype(TTypeName.Symbol)<symbol, TSymbolDef> {
  get _manifest(): TManifest<symbol> {
    return { ...getDefaultManifest() }
  }

  _parse(ctx: ParseContext<this>): ParseResultOf<this> {
    return typeof ctx.data !== 'symbol' ? ctx.invalidType({ expected: TParsedType.Symbol }).abort() : OK(ctx.data)
  }

  static create(options?: SimplifyFlat<TOptions>): TSymbol {
    return new TSymbol({ options: { ...options } })
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
  extends ttype(TTypeName.Array)<TArrayIO<T, C>, TArrayDef<T>, TArrayIO<T, C, '$I'>>
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
    return new TArray({ element, options: { ...options } })
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
  extends ttype(TTypeName.Set)<Set<OutputOf<T>>, TSetDef<T>, Set<InputOf<T>>>
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
    return new TSet({ element, options: { ...options } })
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

export class TUndefined extends ttype(TTypeName.Undefined)<undefined, TUndefinedDef> {
  get _manifest(): TNonRequiredManifest<undefined> {
    return { ...getDefaultManifest(), required: false }
  }

  _parse(ctx: ParseContext<this>): ParseResultOf<this> {
    return ctx.data === undefined ? OK(undefined) : ctx.invalidType({ expected: TParsedType.Undefined }).abort()
  }

  static create(options?: SimplifyFlat<TOptions>): TUndefined {
    return new TUndefined({ options: { ...options } })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TVoid                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TVoidDef extends TDef {
  readonly typeName: TTypeName.Void
}

export class TVoid extends ttype(TTypeName.Void)<void, TVoidDef> {
  get _manifest(): TNonRequiredManifest<void> {
    return { ...getDefaultManifest(), required: false }
  }

  _parse(ctx: ParseContext<this>): ParseResultOf<this> {
    return ctx.data === undefined ? OK(undefined) : ctx.invalidType({ expected: TParsedType.Void }).abort()
  }

  static create(options?: SimplifyFlat<TOptions>): TVoid {
    return new TVoid({ options: { ...options } })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TNull                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TNullManifest = Merge<TManifest<null>, { readonly nullable: true }>

export interface TNullDef extends TDef {
  readonly typeName: TTypeName.Null
}

export class TNull extends ttype(TTypeName.Null)<null, TNullDef> {
  get _manifest(): TNullManifest {
    return { ...getDefaultManifest(), nullable: true }
  }

  _parse(ctx: ParseContext<this>): ParseResultOf<this> {
    return ctx.data === null ? OK(null) : ctx.invalidType({ expected: TParsedType.Null }).abort()
  }

  static create(options?: SimplifyFlat<TOptions>): TNull {
    return new TNull({ options: { ...options } })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TNever                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TNeverDef extends TDef {
  readonly typeName: TTypeName.Never
  readonly options: TOptions<{ readonly additionalIssueKind: TIssueKind.Forbidden }>
}

export class TNever extends ttype(TTypeName.Never)<never, TNeverDef> {
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
    return new TNever({ options: { ...options } })
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
  extends ttype(TTypeName.Optional)<OutputOf<T> | undefined, TOptionalDef<T>, InputOf<T> | undefined>
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
    return new TOptional({ underlying, options: { ...options } })
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
  extends ttype(TTypeName.Nullable)<OutputOf<T> | null, TNullableDef<T>, InputOf<T> | null>
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
    return new TNullable({ underlying, options: { ...options } })
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

export class TPromise<T extends AnyTType> extends ttype(TTypeName.Promise)<
  Promise<OutputOf<T>>,
  TPromiseDef<T>,
  Promise<InputOf<T>>
> {
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
    return new TPromise({ underlying, options: { ...options } })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TLazy                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TLazyDef<T extends AnyTType> extends TDef {
  readonly typeName: TTypeName.Lazy
  readonly getType: () => T
}

export class TLazy<T extends AnyTType>
  extends ttype(TTypeName.Lazy)<OutputOf<T>, TLazyDef<T>, InputOf<T>>
  implements TUnwrappable<T>
{
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
    return new TLazy({ getType: factory, options: { ...options } })
  }
}

/* ---------------------------------------------------- External ---------------------------------------------------- */

export const anyType = TAny.create
export const arrayType = TArray.create
export const bigintType = TBigInt.create
export const booleanType = TBoolean.create
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
