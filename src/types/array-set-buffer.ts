import _ from 'lodash'
import { TChecks } from '../checks'
import type { TDef } from '../def'
import { TError } from '../error'
import { IssueKind, type InvalidArrayIssue, type InvalidBufferIssue, type InvalidSetIssue } from '../issues'
import { TManifest } from '../manifest'
import type { TOptions } from '../options'
import { TParsedType, type ParseContext, type ParseContextOf, type ParseResult, type ParseResultOf } from '../parse'
import { TTypeName } from '../type-names'
import { type u } from '../utils'
import {
  TFalsy,
  TType,
  unsetMarker,
  type InputOf,
  type OutputOf,
  type TDefined,
  type TNever,
  type TNot,
  type TOptional,
  type TSuperDefault,
} from './_internal'

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TArray                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TArrayCardinality = 'atleastone' | 'many' | 'none'

export type TArrayCoercion = unsetMarker | 'fromSet'
export type TArrayCasting = unsetMarker | 'toSet'

export type TArrayIO<T extends TType, Card extends TArrayCardinality, IO extends '$I' | '$O' = '$O'> = {
  none: []
  atleastone: [T[IO], ...Array<T[IO]>]
  many: Array<T[IO]>
}[Card]

export type TArrayInput<T extends TType, Card extends TArrayCardinality, Coerce extends TArrayCoercion> = {
  [unsetMarker]: TArrayIO<T, Card, '$I'>
  fromSet: Set<InputOf<T>> | TArrayIO<T, Card, '$I'>
}[Coerce]

export type TArrayOutput<T extends TType, Card extends TArrayCardinality, Cast extends TArrayCasting> = {
  [unsetMarker]: TArrayIO<T, Card>
  toSet: Set<OutputOf<T>>
}[Cast]

export interface TArrayDef<T extends TType, Card extends TArrayCardinality> extends TDef {
  readonly typeName: TTypeName.Array
  readonly element: T
  readonly cardinality: Card
  readonly checks: TChecks.FromIssue<InvalidArrayIssue, [TChecks.Make<'compact'>]>
  readonly coerce: TArrayCoercion
  readonly cast: TArrayCasting
}

export class TArray<
  T extends TType,
  Card extends TArrayCardinality = 'many',
  Coerce extends TArrayCoercion = unsetMarker,
  Cast extends TArrayCasting = unsetMarker,
  Out = TArrayOutput<T, Card, Cast>,
  In = TArrayInput<T, Card, Coerce>
> extends TType<Out, TArrayDef<T, Card>, In> {
  get _manifest() {
    const { element, cardinality, coerce, cast } = this._def

    return TManifest<In>()({
      type: coerce === 'fromSet' ? TParsedType.AnyOf(TParsedType.Array, TParsedType.Set) : TParsedType.Array,
      element: element.manifest(),
      cardinality,
      min: this.minItems ?? null,
      max: this.maxItems ?? null,
      unique: this.isUnique,
      sorted: this.isSorted,
      coerce,
      cast,
    })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  _parse(ctx: ParseContext<Out, In>): ParseResult<Out, In> {
    if (this._def.coerce === 'fromSet') {
      if (ctx.data instanceof Set) {
        ctx.setData([...ctx.data])
      } else if (!Array.isArray(ctx.data)) {
        return ctx.invalidType({ expected: TParsedType.AnyOf(TParsedType.Array, TParsedType.Set) }).abort()
      }
    }

    if (!Array.isArray(ctx.data)) {
      return ctx.invalidType({ expected: TParsedType.Array }).abort()
    }

    if (this._hasCheck('compact')) {
      ctx.setData(_.compact(ctx.data))
    }

    const { element } = this._def
    const { data } = ctx

    for (const check of this._getChecks('min', 'max', 'length')) {
      if (
        !{
          min: TChecks.handleMin,
          max: TChecks.handleMax,
          length: TChecks.handleExact,
        }[check.check](data.length, check.expected)
      ) {
        ctx.addIssue(
          IssueKind.InvalidArray,
          { check: check.check, expected: check.expected, received: data.length },
          check.message
        )
        if (ctx.common.abortEarly) {
          return ctx.abort()
        }
      }
    }

    const initialResult: Array<OutputOf<T>> = []

    const finalize = (): ParseResult<Out, In> => {
      let finalResult = [...initialResult]
      let isSorted = false

      for (const check of this._getChecks('unique', 'sorted')) {
        const currResult = finalResult

        if (check.check === 'sorted') {
          const { _sortFn, enforce, message } = check

          const sorted = currResult.sort(_sortFn)

          if (enforce && sorted.some((v, i) => v !== currResult[i])) {
            ctx.addIssue(IssueKind.InvalidArray, { check: 'sorted', enforce: true }, message)
            if (ctx.common.abortEarly) {
              return ctx.abort()
            }
          } else {
            finalResult = sorted
            isSorted = true
          }
        } else if (check.check === 'unique') {
          const { _compareFn, enforce, message } = check

          const unique = _compareFn
            ? _.uniqWith(currResult, _compareFn)
            : _[isSorted ? 'sortedUniq' : 'uniq'](currResult)

          if (enforce && unique.length !== currResult.length) {
            const nonUnique = unique.filter((v, i) => currResult.includes(v, i + 1))
            ctx.addIssue(IssueKind.InvalidArray, { check: 'unique', enforce: true, received: { nonUnique } }, message)
            if (ctx.common.abortEarly) {
              return ctx.abort()
            }
          } else {
            finalResult = unique
          }
        } else {
          TError.assertNever(check)
        }
      }

      return ctx.isValid()
        ? ctx.success({ [unsetMarker]: finalResult, toSet: new Set(finalResult) }[this._def.cast] as Out)
        : ctx.abort()
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

          initialResult.push(res.data)
        }

        return finalize()
      })
    }

    for (const res of data.map((v, i) => element._parseSync(ctx.child(element, v, [i])))) {
      if (!res.ok) {
        if (ctx.common.abortEarly) {
          return ctx.abort()
        }

        continue
      }

      initialResult.push(res.data)
    }

    return finalize()
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  get element(): T {
    return this._def.element
  }

  unwrap(): T {
    return this.element
  }

  /* ----------------------------------------------- Coercion/Casting ----------------------------------------------- */

  coerce<C extends boolean = true>(value = true as C): TArray<T, Card, C extends true ? 'fromSet' : unsetMarker, Cast> {
    return new TArray({ ...this._def, coerce: value === true ? 'fromSet' : unsetMarker })
  }

  cast<C extends boolean = true>(value = true as C): TArray<T, Card, Coerce, C extends true ? 'toSet' : unsetMarker> {
    return new TArray({ ...this._def, cast: value === true ? 'toSet' : unsetMarker })
  }

  /* ---------------------------------------------------- Checks ---------------------------------------------------- */

  min<V extends number>(
    value: u.NonNegativeInteger<V>,
    options?: { readonly inclusive?: boolean; readonly message?: string }
  ): this {
    return this._addCheck({
      check: 'min',
      expected: { value, inclusive: options?.inclusive ?? true },
      message: options?.message,
    })
  }

  max<V extends number>(
    value: u.NonNegativeInteger<V>,
    options?: { readonly inclusive?: boolean; readonly message?: string }
  ): this {
    return this._addCheck({
      check: 'max',
      expected: { value, inclusive: options?.inclusive ?? true },
      message: options?.message,
    })
  }

  length<V extends number>(value: u.NonNegativeInteger<V>, options?: { readonly message?: string }): this {
    return this._addCheck({
      check: 'length',
      expected: { value, inclusive: true },
      message: options?.message,
    })
  }

  nonempty(options?: { readonly message?: string }) {
    return new TArray({ ...this._def, cardinality: 'atleastone' }).min(1, {
      inclusive: true,
      message: options?.message,
    })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  compact(options?: {
    readonly enforce?: false
    readonly message?: never
  }): TArray<T, Card, Coerce, Cast, TArrayOutput<TNot<T, [TFalsy]>, Card, Cast>>
  compact(options?: {
    readonly enforce: true
    readonly message?: string
  }): TArray<TNot<T, [TFalsy]>, Card, Coerce, Cast>
  compact(options?: { readonly enforce?: boolean; readonly message?: string }) {
    if (options?.enforce) {
      return new TArray<TNot<T, [TFalsy]>, Card, Coerce, Cast>({
        ...this._def,
        element: this.element.not([TFalsy.create()], { messages: { forbidden: options?.message } }),
      })
    }

    return this._addCheck({ check: 'compact', message: undefined }) as TArray<
      T,
      Card,
      Coerce,
      Cast,
      TArrayOutput<TNot<T, [TFalsy]>, Card, Cast>
    >
  }

  unique(
    options?:
      | { readonly enforce: true; readonly message?: string }
      | { readonly enforce?: false; readonly message?: never }
  ): this
  unique(
    compareFn: (a: OutputOf<T>, b: OutputOf<T>) => boolean,
    options?:
      | { readonly enforce: true; readonly message?: string }
      | { readonly enforce?: false; readonly message?: never }
  ): this
  unique(
    compareFnOrOptions?:
      | ((a: OutputOf<T>, b: OutputOf<T>) => boolean)
      | { readonly enforce?: boolean; readonly message?: string },
    maybeOptions?: { readonly enforce?: boolean; readonly message?: string }
  ) {
    const _compareFn = typeof compareFnOrOptions === 'function' ? compareFnOrOptions : undefined
    const options = typeof compareFnOrOptions === 'function' ? maybeOptions : compareFnOrOptions

    return this._addCheck({
      check: 'unique',
      _compareFn,
      enforce: options?.enforce ?? false,
      message: options?.message,
    })
  }

  sorted(
    options?:
      | { readonly enforce: true; readonly message?: string }
      | { readonly enforce?: false; readonly message?: never }
  ): this
  sorted(
    sortFn: (a: OutputOf<T>, b: OutputOf<T>) => number,
    options?:
      | { readonly enforce: true; readonly message?: string }
      | { readonly enforce?: false; readonly message?: never }
  ): this
  sorted(
    sortFnOrOptions?:
      | ((a: OutputOf<T>, b: OutputOf<T>) => number)
      | { readonly enforce?: boolean; readonly message?: string },
    maybeOptions?: { readonly enforce?: boolean; readonly message?: string }
  ) {
    const _sortFn = typeof sortFnOrOptions === 'function' ? sortFnOrOptions : undefined
    const options = typeof sortFnOrOptions === 'function' ? maybeOptions : sortFnOrOptions

    return this._addCheck({
      check: 'sorted',
      _sortFn,
      enforce: options?.enforce ?? false,
      message: options?.message,
    })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  sparse(enabled?: true): TArray<TOptional<T>, Card, Coerce, Cast>
  sparse(enabled: false): TArray<TDefined<T>, Card, Coerce, Cast>
  sparse(enabled = true) {
    return new TArray<TDefined<T> | TOptional<T>, Card, Coerce, Cast>({
      ...this._def,
      element: this.element[enabled ? 'optional' : 'defined'](),
    })
  }

  partial(): TArray<TOptional<T>, Card, Coerce, Cast> {
    return this.sparse(true)
  }

  required(): TArray<TDefined<T>, Card, Coerce, Cast> {
    return this.sparse(false)
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  ensure(this: TArray<T, Card, Coerce, 'toSet', unknown, unknown>): TSuperDefault<this, Set<never>>
  ensure(this: TArray<T, Card, Coerce, unsetMarker, unknown, unknown>): TSuperDefault<this, []>
  ensure() {
    if (this._def.cast) {
      return this.superDefault(new Set<never>())
    }

    return this.superDefault([])
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  flatten<D extends boolean = false>(options?: {
    readonly deep?: D
  }): FlattenTArray<this, D extends true ? 'deep' : 'flat'> {
    return new TArray({
      ...this._def,
      element: flattenTArrayElement(this, options?.deep ? 'deep' : 'flat'),
    }) as FlattenTArray<this, D extends true ? 'deep' : 'flat'>
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  toSet(): TSet<
    T,
    { [unsetMarker]: unsetMarker; fromSet: 'fromArray' }[Coerce],
    { [unsetMarker]: unsetMarker; toSet: 'toArray' }[Cast]
  > {
    const checks: [...TSetDef<T>['checks']] = []

    for (const check of this._getChecks('min', 'max', 'length')) {
      if (check.check === 'length') {
        checks.push({ check: 'size', expected: check.expected, message: check.message })
      } else {
        checks.push(check)
      }
    }

    const { examples, ...manifest } = TManifest.pickPublic(this)

    return new TSet({
      typeName: TTypeName.Set,
      element: this.element,
      checks,
      coerce: this._def.coerce === unsetMarker ? unsetMarker : 'fromArray',
      cast: this._def.cast === unsetMarker ? unsetMarker : 'toArray',
      options: this.options(),
      manifest: {
        ...manifest,
        ...(examples
          ? this._def.coerce === unsetMarker
            ? { examples: examples.filter(Array.isArray).map((ex) => new Set(ex as unknown[])) }
            : { examples }
          : {}),
      },
    })
  }

  /* ---------------------------------------------------- Getters --------------------------------------------------- */

  get minItems() {
    return this._getChecks('min', 'length').reduce<number | undefined>(
      (min, check) => (min === undefined || check.expected.value > min ? check.expected.value : min),
      undefined
    )
  }

  get maxItems() {
    return this._getChecks('max', 'length').reduce<number | undefined>(
      (max, check) => (max === undefined || check.expected.value < max ? check.expected.value : max),
      undefined
    )
  }

  get isUnique() {
    return this._hasCheck('unique')
  }

  get isSorted() {
    return this._hasCheck('sorted')
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create(element: TNever, options?: TOptions): TArray<TNever, 'none'>
  static create<T extends TType>(element: T, options?: TOptions): TArray<T>
  static create(element: TType, options?: TOptions) {
    return new TArray({
      typeName: TTypeName.Array,
      element,
      cardinality: element.isT(TTypeName.Never) ? 'none' : 'many',
      checks: [],
      coerce: unsetMarker,
      cast: unsetMarker,
      options: { ...options },
    })
  }
}

export type AnyTArray = TArray<TType, TArrayCardinality, TArrayCoercion, TArrayCasting, unknown, unknown>

/* ------------------------------------------------------------------------------------------------------------------ */

export type FlattenTArray<T extends AnyTArray, D extends 'deep' | 'flat' = 'flat'> = T['element'] extends TArray<
  infer El,
  infer Card,
  infer Coerce,
  infer Cast,
  infer Out,
  infer In
>
  ? D extends 'deep'
    ? FlattenTArray<TArray<El, Card, Coerce, Cast, Out, In>, 'deep'>
    : TArray<El, Card, Coerce, Cast, Out, In>
  : T

const flattenTArrayElement = <T extends AnyTArray, D extends 'deep' | 'flat' = 'flat'>(
  array: T,
  depth?: D
): FlattenTArray<T, D> =>
  (array.element instanceof TArray
    ? depth === 'deep'
      ? flattenTArrayElement(array.element, depth)
      : array.element
    : array) as FlattenTArray<T, D>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TSet                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TSetCoercion = unsetMarker | 'fromArray'
export type TSetCasting = unsetMarker | 'toArray'

export type TSetInput<T extends TType, Coerce extends TSetCoercion> = {
  [unsetMarker]: Set<InputOf<T>>
  fromArray: Set<InputOf<T>> | TArrayIO<T, 'many', '$I'>
}[Coerce]

export type TSetOutput<T extends TType, Cast extends TSetCasting> = {
  [unsetMarker]: Set<OutputOf<T>>
  toArray: TArrayIO<T, 'many'>
}[Cast]

export interface TSetDef<T extends TType> extends TDef {
  readonly typeName: TTypeName.Set
  readonly element: T
  readonly checks: TChecks.FromIssue<InvalidSetIssue>
  readonly coerce: TSetCoercion
  readonly cast: TSetCasting
}

export class TSet<
  T extends TType,
  Coerce extends TSetCoercion = unsetMarker,
  Cast extends TSetCasting = unsetMarker
> extends TType<TSetOutput<T, Cast>, TSetDef<T>, TSetInput<T, Coerce>> {
  get _manifest() {
    const { coerce, cast } = this._def

    return TManifest<TSetInput<T, Coerce>>()({
      type: coerce === 'fromArray' ? TParsedType.AnyOf(TParsedType.Set, TParsedType.Array) : TParsedType.Set,
      element: this.element.manifest(),
      min: this.minItems ?? null,
      max: this.maxItems ?? null,
      coerce,
      cast,
    })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (this._def.coerce === 'fromArray') {
      if (Array.isArray(ctx.data)) {
        ctx.setData(new Set(ctx.data))
      } else if (!(ctx.data instanceof Set)) {
        return ctx.invalidType({ expected: TParsedType.AnyOf(TParsedType.Set, TParsedType.Array) }).abort()
      }
    }

    if (!(ctx.data instanceof Set)) {
      return ctx.invalidType({ expected: TParsedType.Set }).abort()
    }

    const { element } = this._def
    const { data } = ctx

    for (const check of this._def.checks) {
      if (
        !{
          min: TChecks.handleMin,
          max: TChecks.handleMax,
          size: TChecks.handleExact,
        }[check.check](data.size, check.expected)
      ) {
        ctx.addIssue(
          IssueKind.InvalidSet,
          { check: check.check, expected: check.expected, received: data.size },
          check.message
        )
        if (ctx.common.abortEarly) {
          return ctx.abort()
        }
      }
    }

    const result = new Set<OutputOf<T>>()

    if (ctx.common.async) {
      return Promise.all([...data.values()].map(async (v, i) => element._parseAsync(ctx.child(element, v, [i])))).then(
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

          return ctx.isValid()
            ? ctx.success({ [unsetMarker]: result, toArray: [...result] }[this._def.cast] as OutputOf<this>)
            : ctx.abort()
        }
      )
    }

    for (const res of [...data.values()].map((v, i) => element._parseSync(ctx.child(element, v, [i])))) {
      if (!res.ok) {
        if (ctx.common.abortEarly) {
          return ctx.abort()
        }

        continue
      }

      result.add(res.data)
    }

    return ctx.isValid()
      ? ctx.success({ [unsetMarker]: result, toArray: [...result] }[this._def.cast] as OutputOf<this>)
      : ctx.abort()
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  get element(): T {
    return this._def.element
  }

  unwrap(): T {
    return this.element
  }

  /* ----------------------------------------------- Coercion/Casting ----------------------------------------------- */

  coerce<C extends boolean = true>(value = true as C): TSet<T, C extends true ? 'fromArray' : unsetMarker, Cast> {
    return new TSet({ ...this._def, coerce: value === true ? 'fromArray' : unsetMarker })
  }

  cast<C extends boolean = true>(value = true as C): TSet<T, Coerce, C extends true ? 'toArray' : unsetMarker> {
    return new TSet({ ...this._def, cast: value === true ? 'toArray' : unsetMarker })
  }

  /* ---------------------------------------------------- Checks ---------------------------------------------------- */

  min<V extends number>(
    value: u.NonNegativeInteger<V>,
    options?: { readonly inclusive?: boolean; readonly message?: string }
  ): this {
    return this._addCheck({
      check: 'min',
      expected: { value, inclusive: options?.inclusive ?? true },
      message: options?.message,
    })
  }

  max<V extends number>(
    value: u.NonNegativeInteger<V>,
    options?: { readonly inclusive?: boolean; readonly message?: string }
  ): this {
    return this._addCheck({
      check: 'max',
      expected: { value, inclusive: options?.inclusive ?? true },
      message: options?.message,
    })
  }

  size<V extends number>(value: u.NonNegativeInteger<V>, options?: { readonly message?: string }): this {
    return this._addCheck({
      check: 'size',
      expected: { value, inclusive: true },
      message: options?.message,
    })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  sparse(enabled?: true): TSet<TOptional<T>, Coerce, Cast>
  sparse(enabled: false): TSet<TDefined<T>, Coerce, Cast>
  sparse(enabled = true) {
    return new TSet<TDefined<T> | TOptional<T>, Coerce, Cast>({
      ...this._def,
      element: this.element[enabled ? 'optional' : 'defined'](),
    })
  }

  partial(): TSet<TOptional<T>, Coerce, Cast> {
    return this.sparse(true)
  }

  required(): TSet<TDefined<T>, Coerce, Cast> {
    return this.sparse(false)
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  toArray(): TArray<
    T,
    'many',
    { [unsetMarker]: unsetMarker; fromArray: 'fromSet' }[Coerce],
    { [unsetMarker]: unsetMarker; toArray: 'toSet' }[Cast]
  > {
    const checks: [...TArrayDef<T, 'many'>['checks']] = []

    for (const check of this._getChecks('min', 'max', 'size')) {
      if (check.check === 'size') {
        checks.push({ check: 'length', expected: check.expected, message: check.message })
      } else {
        checks.push(check)
      }
    }

    const { examples, ...manifest } = TManifest.pickPublic(this)

    return new TArray({
      typeName: TTypeName.Array,
      element: this.element,
      cardinality: 'many',
      checks,
      coerce: this._def.coerce === unsetMarker ? unsetMarker : 'fromSet',
      cast: this._def.cast === unsetMarker ? unsetMarker : 'toSet',
      options: this.options(),
      manifest: {
        ...manifest,
        ...(examples
          ? this._def.coerce === unsetMarker
            ? { examples: examples.filter((ex) => ex instanceof Set).map((ex) => [...ex] as unknown[]) }
            : { examples }
          : {}),
      },
    })
  }

  /* ---------------------------------------------------- Getters --------------------------------------------------- */

  get minItems(): number | undefined {
    return this._getChecks('min', 'size').reduce<number | undefined>(
      (min, check) => (min === undefined || check.expected.value > min ? check.expected.value : min),
      undefined
    )
  }

  get maxItems(): number | undefined {
    return this._getChecks('max', 'size').reduce<number | undefined>(
      (max, check) => (max === undefined || check.expected.value < max ? check.expected.value : max),
      undefined
    )
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create<T extends TType>(element: T, options?: TOptions): TSet<T> {
    return new TSet({
      typeName: TTypeName.Set,
      element,
      checks: [],
      coerce: unsetMarker,
      cast: unsetMarker,
      options: { ...options },
    })
  }
}

export type AnyTSet = TSet<TType, TSetCoercion, TSetCasting>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TBuffer                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TBufferInput<Coerce extends unsetMarker | 'fromString'> = {
  [unsetMarker]: Buffer
  fromString: Buffer | string
}[Coerce]

export type TBufferOutput<Cast extends unsetMarker | 'toString'> = {
  [unsetMarker]: Buffer
  toString: string
}[Cast]

export interface TBufferDef<Coerce extends unsetMarker | 'fromString', Cast extends unsetMarker | 'toString'>
  extends TDef {
  readonly typeName: TTypeName.Buffer
  readonly checks: TChecks.FromIssue<InvalidBufferIssue>
  readonly coerce: Coerce
  readonly cast: Cast
}

export class TBuffer<
  Coerce extends unsetMarker | 'fromString' = unsetMarker,
  Cast extends unsetMarker | 'toString' = unsetMarker
> extends TType<TBufferOutput<Cast>, TBufferDef<Coerce, Cast>, TBufferInput<Coerce>> {
  get _manifest() {
    return TManifest<TBufferInput<Coerce>>()({
      type:
        this._def.coerce === 'fromString' ? { anyOf: [TParsedType.Buffer, TParsedType.String] } : TParsedType.Buffer,
      min: this.minBytes ?? null,
      max: this.maxBytes ?? null,
      coerce: this._def.coerce,
      cast: this._def.cast,
    })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (this._def.coerce === 'fromString') {
      if (typeof ctx.data === 'string') {
        ctx.setData(Buffer.from(ctx.data))
      } else if (!Buffer.isBuffer(ctx.data)) {
        return ctx.invalidType({ expected: { anyOf: [TParsedType.Buffer, TParsedType.String] } }).abort()
      }
    }

    if (!Buffer.isBuffer(ctx.data)) {
      return ctx.invalidType({ expected: TParsedType.Buffer }).abort()
    }

    const { data } = ctx

    for (const check of this._def.checks) {
      if (
        !{
          min: TChecks.handleMin,
          max: TChecks.handleMax,
          length: TChecks.handleExact,
        }[check.check](data.length, check.expected)
      ) {
        ctx.addIssue(
          IssueKind.InvalidBuffer,
          { check: check.check, expected: check.expected, received: data.length },
          check.message
        )
        if (ctx.common.abortEarly) {
          return ctx.abort()
        }
      }
    }

    return ctx.isValid()
      ? ctx.success({ [unsetMarker]: data, toString: data.toString() }[this._def.cast] as OutputOf<this>)
      : ctx.abort()
  }

  /* ----------------------------------------------- Coercion/Casting ----------------------------------------------- */

  coerce<C extends boolean = true>(value = true as C): TBuffer<C extends true ? 'fromString' : unsetMarker, Cast> {
    return new TBuffer({
      ...this._def,
      coerce: (value === true ? 'fromString' : unsetMarker) as C extends true ? 'fromString' : unsetMarker,
    })
  }

  cast<C extends boolean = true>(value = true as C): TBuffer<Coerce, C extends true ? 'toString' : unsetMarker> {
    return new TBuffer({
      ...this._def,
      cast: (value === true ? 'toString' : unsetMarker) as C extends true ? 'toString' : unsetMarker,
    })
  }

  /* ---------------------------------------------------- Checks ---------------------------------------------------- */

  min<V extends number>(
    value: u.NonNegative<V>,
    options?: { readonly inclusive?: boolean; readonly message?: string }
  ): this {
    return this._addCheck({
      check: 'min',
      expected: { value, inclusive: options?.inclusive ?? true },
      message: options?.message,
    })
  }

  max<V extends number>(
    value: u.NonNegative<V>,
    options?: { readonly inclusive?: boolean; readonly message?: string }
  ): this {
    return this._addCheck({
      check: 'max',
      expected: { value, inclusive: options?.inclusive ?? true },
      message: options?.message,
    })
  }

  length<V extends number>(value: u.NonNegative<V>, options?: { readonly message?: string }): this {
    return this._addCheck({ check: 'length', expected: { value, inclusive: true }, message: options?.message })
  }

  /* ---------------------------------------------------- Getters --------------------------------------------------- */

  get minBytes(): number | undefined {
    return this._getChecks('min', 'length').reduce<number | undefined>(
      (min, check) => (min === undefined || check.expected.value > min ? check.expected.value : min),
      undefined
    )
  }

  get maxBytes(): number | undefined {
    return this._getChecks('max', 'length').reduce<number | undefined>(
      (max, check) => (max === undefined || check.expected.value < max ? check.expected.value : max),
      undefined
    )
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create(options?: TOptions): TBuffer {
    return new TBuffer({
      typeName: TTypeName.Buffer,
      checks: [],
      coerce: unsetMarker,
      cast: unsetMarker,
      options: { ...options },
    })
  }
}

export type AnyTBuffer = TBuffer<unsetMarker | 'fromString', unsetMarker | 'toString'>
