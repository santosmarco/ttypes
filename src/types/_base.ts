import memoize from 'micro-memoize'
import { nanoid } from 'nanoid'
import type { TChecks } from '../checks'
import type { BrandedManifest, Manifest, PublicManifest } from '../manifest'
import type { ParseOptions, TOptions } from '../options'
import {
  AsyncParseContext,
  SyncParseContext,
  type AsyncParseResultOf,
  type ParseContextOf,
  type ParseResultOf,
  type SyncParseResultOf,
} from '../parse'
import type { TTypeName, TTypeNameMap } from '../type-names'
import { u } from '../utils'
import {
  TArray,
  TBrand,
  TCatch,
  TDefault,
  TDefined,
  TDelete,
  TIntersection,
  TLazy,
  TNonNullable,
  TNot,
  TNullable,
  TOptional,
  TPipeline,
  TPreprocess,
  TPromise,
  TRecord,
  TRefinement,
  TSuperDefault,
  TTransform,
  TUnion,
  schemaMarker,
  type EffectCtx,
  type RefinementMessage,
  type TNotOptions,
  type TString,
} from './_internal'

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TDef                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TDef {
  readonly typeName: TTypeName
  readonly options: TOptions
  readonly checks?: ReadonlyArray<{ readonly check: string }>
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TType                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export abstract class TType<
  Output = unknown,
  Def extends TDef = TDef,
  Input = Output,
  Forbidden extends readonly TType[] = []
> {
  get [schemaMarker]() {
    return true
  }

  declare readonly $O: Output
  declare readonly $D: Def
  declare readonly $I: Input

  protected readonly _def: Def & { readonly manifest: Partial<Manifest> }

  abstract get _manifest(): BrandedManifest<Input>

  abstract _parse(ctx: ParseContextOf<this>): ParseResultOf<this>

  constructor(def: Def & { readonly manifest?: Partial<Manifest> }) {
    this._def = { ...def, manifest: { ...def.manifest } }

    this._parse = this._parse.bind(this)
    this._parseSync = memoize(this._parseSync.bind(this))
    this._parseAsync = memoize(this._parseAsync.bind(this), { isPromise: true })
    this.parse = this.parse.bind(this)
    this.safeParse = this.safeParse.bind(this)
    this.parseAsync = this.parseAsync.bind(this)
    this.safeParseAsync = this.safeParseAsync.bind(this)
    this.guard = this.guard.bind(this)
    this.assert = this.assert.bind(this)
    this.options = this.options.bind(this)
    this.manifest = this.manifest.bind(this)
    this.optional = this.optional.bind(this)
    this.nullable = this.nullable.bind(this)
    this.nullish = this.nullish.bind(this)
    this.defined = this.defined.bind(this)
    this.nonnullable = this.nonnullable.bind(this)
    // this.readonly = this.readonly.bind(this)
    this.array = this.array.bind(this)
    this.record = this.record.bind(this)
    this.promise = this.promise.bind(this)
    this.promisable = this.promisable.bind(this)
    this.or = this.or.bind(this)
    this.and = this.and.bind(this)
    this.not = this.not.bind(this)
    this.brand = this.brand.bind(this)
    this.default = this.default.bind(this)
    this.superDefault = this.superDefault.bind(this)
    this.catch = this.catch.bind(this)
    this.lazy = this.lazy.bind(this)
    this.pipe = this.pipe.bind(this)
    this.preprocess = this.preprocess.bind(this)
    this.refine = this.refine.bind(this)
    this.superRefine = this.superRefine.bind(this)
    this.transform = this.transform.bind(this)
    this.delete = this.delete.bind(this)
    this.del = this.del.bind(this)
    this.clone = this.clone.bind(this)
    this.isT = this.isT.bind(this)

    Object.keys(this).forEach((k) =>
      Object.defineProperty(this, k, {
        enumerable: !/^\$\w*/.exec(String(k)),
      })
    )
  }

  readonly id: string = nanoid()

  get typeName(): Def['typeName'] {
    return this._def.typeName
  }

  /* ---------------------------------------------------- Parsing --------------------------------------------------- */

  /** @internal */
  _parseSync(ctx: ParseContextOf<this>): SyncParseResultOf<this> {
    const result = this._parse(ctx)
    if (u.isAsync(result)) {
      throw new Error('Synchronous parse encountered Promise. Use `.parseAsync()`/`.safeParseAsync()` instead.')
    }

    return result
  }

  /** @internal */
  async _parseAsync(ctx: ParseContextOf<this>): AsyncParseResultOf<this> {
    const result = this._parse(ctx)
    return Promise.resolve(result)
  }

  parse(data: unknown, options?: ParseOptions): Output {
    const result = this.safeParse(data, options)
    if (!result.ok) {
      throw result.error
    }

    return result.data
  }

  safeParse(data: unknown, options?: ParseOptions): SyncParseResultOf<this> {
    const ctx = SyncParseContext.of(this, data, options)
    return this._parseSync(ctx)
  }

  async parseAsync(data: unknown, options?: ParseOptions): Promise<Output> {
    const result = await this.safeParseAsync(data, options)
    if (!result.ok) {
      throw result.error
    }

    return result.data
  }

  async safeParseAsync(data: unknown, options?: ParseOptions): AsyncParseResultOf<this> {
    const ctx = AsyncParseContext.of(this, data, options)
    return this._parseAsync(ctx)
  }

  guard(data: unknown, options?: ParseOptions): data is Output {
    return this.safeParse(data, options).ok
  }

  assert(data: unknown, options?: ParseOptions): asserts data is Output {
    this.parse(data, options)
  }

  /* ----------------------------------------------- Options/Manifest ----------------------------------------------- */

  options(): Def['options']
  options(options: Def['options']): this
  options(maybeOptions?: Def['options']): Def['options'] | this {
    if (!maybeOptions) {
      return u.cloneDeep(this._def.options)
    }

    return this._construct({ ...this._def, options: u.merge(this.options(), maybeOptions) })
  }

  manifest(): ManifestOf<this>
  manifest(manifest: PublicManifest<Input>): this
  manifest(maybeManifest?: PublicManifest<Input>): ManifestOf<this> | this {
    if (!maybeManifest) {
      const { typeName, type, required, nullable, readonly, examples, ...main } = {
        ...this._def.manifest,
        ...this._manifest,
        typeName: this._def.typeName,
      }

      return u.cloneDeep({
        typeName,
        type,
        ...(examples && { examples }),
        ...main,
        required,
        nullable,
        readonly,
      }) as ManifestOf<this>
    }

    return this._construct({
      ...this._def,
      manifest: u.merge(
        this.manifest(),
        u.pick(maybeManifest, [
          'title',
          'summary',
          'description',
          'examples',
          'tags',
          'notes',
          'unit',
          'deprecated',
          'meta',
        ])
      ),
    })
  }

  /* ---------------------------------------------------- Helpers --------------------------------------------------- */

  optional(): TOptional<this> {
    return TOptional.create(this, this.options())
  }

  nullable(): TNullable<this> {
    return TNullable.create(this, this.options())
  }

  nullish(): TOptional<TNullable<this>> {
    return this.nullable().optional()
  }

  defined(): TDefined<this> {
    return TDefined.create(this, this.options())
  }

  nonnullable(): TNonNullable<this> {
    return TNonNullable.create(this, this.options())
  }

  // readonly(): TReadonly<this> {
  //   return TReadonly.create(this, this.options())
  // }

  array(): TArray<this> {
    return TArray.create(this, this.options())
  }

  record(): TRecord<TString, this> {
    return TRecord.create(this, this.options())
  }

  promise(): TPromise<this> {
    return TPromise.create(this, this.options())
  }

  promisable(): TUnion<[this, TPromise<this>]> {
    return this.or([this.promise()])
  }

  or<T extends readonly [TType, ...TType[]]>(alternatives: T): TUnion<[this, ...T]> {
    return TUnion._create([this, ...alternatives], this.options())
  }

  and<T extends readonly [TType, ...TType[]]>(intersectees: T): TIntersection<[this, ...T]> {
    return TIntersection._create([this, ...intersectees], this.options())
  }

  not<T extends readonly [TType, ...TType[]]>(forbidden: T, options?: TNotOptions): TNot<this, T> {
    return TNot.create(this, forbidden, u.merge(this.options(), options))
  }

  brand<B>(brand: u.Narrow<B>): TBrand<this, B> {
    return TBrand.create(this, brand, this.options())
  }

  default<D extends u.Defined<Output>>(getDefault: () => u.Narrow<D>): TDefault<this, D>
  default<D extends u.Defined<Output>>(defaultValue: u.Narrow<D>): TDefault<this, D>
  default<D extends u.Defined<Output>>(defaultValueOrGetter: u.Narrow<D> | (() => u.Narrow<D>)): TDefault<this, D> {
    return TDefault.create<this, D>(this, defaultValueOrGetter, this.options())
  }

  superDefault<D>(getDefault: () => u.Narrow<D>): TSuperDefault<this, D>
  superDefault<D>(defaultValue: u.Narrow<D>): TSuperDefault<this, D>
  superDefault<D>(defaultValueOrGetter: u.Narrow<D> | (() => u.Narrow<D>)): TSuperDefault<this, D> {
    return TSuperDefault.create<this, D>(this, defaultValueOrGetter, this.options())
  }

  catch<C extends Output>(getCatch: () => u.Narrow<C>): TCatch<this, C>
  catch<C extends Output>(catchValue: u.Narrow<C>): TCatch<this, C>
  catch<C extends Output>(catchValueOrGetter: u.Narrow<C> | (() => u.Narrow<C>)): TCatch<this, C> {
    return TCatch.create(this, catchValueOrGetter, this.options())
  }

  lazy(): TLazy<this> {
    return TLazy.create(() => this, this.options())
  }

  pipe<T extends TType<unknown, TDef, Input>>(type: T): TPipeline<this, T> {
    return TPipeline.create(this, type, this.options())
  }

  preprocess<In extends Input>(preprocess: (data: unknown) => In): TPreprocess<this, In> {
    return TPreprocess.create(preprocess, this, this.options())
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
    return TRefinement.create(this, refinement, { ...this.options(), refinementMessage: message })
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
    return TRefinement.create(this, refinement, this.options())
  }

  transform<Out>(transform: (data: Output, ctx: EffectCtx<this>) => Out | Promise<Out>): TTransform<this, Out> {
    return TTransform.create(this, transform, this.options())
  }

  delete(): TDelete<this> {
    return TDelete.create(this)
  }

  del(): TDelete<this> {
    return this.delete()
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

  clone(): this {
    return this._construct()
  }

  isT<T extends readonly [TTypeName, ...TTypeName[]]>(...types: T): this is TTypeNameMap<T[number]> {
    return types.includes(this.typeName)
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  _addCheck<C extends TChecks.Of<this>>(check: C, options?: { readonly unique?: boolean }): this {
    let current = [...(this._def.checks ?? [])]

    if (options?.unique) {
      current = current.filter((c) => c.check !== check.check)
    }

    const updated = [...current, check]

    return this._construct({ ...this._def, checks: updated })
  }

  _getChecks<K extends readonly [TChecks.KindsOf<this>, ...Array<TChecks.KindsOf<this>>]>(
    ...checks: K
  ): ReadonlyArray<TChecks.GetByKind<TChecks.Of<this>, K[number]>> {
    return [...(this._def.checks ?? [])].filter((c): c is TChecks.GetByKind<TChecks.Of<this>, K[number]> =>
      checks.includes(c.check)
    )
  }

  _hasCheck<K extends TChecks.KindsOf<this>>(kind: K): boolean {
    return this._getChecks(kind).length > 0
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  _construct(def?: Partial<Def>): this {
    return Reflect.construct<[def: Def], this>(this.constructor as new (def: Def) => this, [u.merge(this._def, def)])
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */

export type OutputOf<T extends TType> = T['$O']
export type InputOf<T extends TType> = T['$I']
export type ManifestOf<T extends TType> = u.Simplify<T['_manifest'] & { readonly typeName: T['typeName'] }>
