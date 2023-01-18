import _ from 'lodash'
import { TChecks } from '../checks'
import type { TDef } from '../def'
import {
  IssueKind,
  type InvalidArrayIssue,
  type InvalidBufferIssue,
  type InvalidSetIssue,
  type ToChecks,
} from '../issues'
import { TManifest } from '../manifest'
import type { TOptions } from '../options'
import { TParsedType, type ParseContextOf, type ParseResultOf } from '../parse'
import { TTypeName } from '../type-names'
import { u } from '../utils'
import {
  TType,
  type InputOf,
  type OutputOf,
  type TDefined,
  type TNever,
  type TOptional,
  type TSuperDefault,
} from './_internal'
import { TError } from '../error'

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TArray                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TArrayCardinality = 'none' | 'atleastone' | 'many'

export type TArrayIO<T extends TType, Card extends TArrayCardinality, IO extends '$I' | '$O' = '$O'> = {
  none: []
  atleastone: [T[IO], ...Array<T[IO]>]
  many: Array<T[IO]>
}[Card]

export type TArrayInput<T extends TType, Card extends TArrayCardinality, Coerce extends boolean> = Coerce extends true
  ? TArrayIO<T, Card, '$I'> | Set<InputOf<T>>
  : TArrayIO<T, Card, '$I'>

export type TArrayOutput<T extends TType, Card extends TArrayCardinality, Cast extends boolean> = Cast extends true
  ? Set<OutputOf<T>>
  : TArrayIO<T, Card>

export interface TArrayDef<
  T extends TType,
  Card extends TArrayCardinality,
  Coerce extends boolean,
  Cast extends boolean
> extends TDef {
  readonly typeName: TTypeName.Array
  readonly element: T
  readonly cardinality: Card
  readonly checks: ToChecks<InvalidArrayIssue>
  readonly coerce: Coerce
  readonly cast: Cast
}

export class TArray<
  T extends TType,
  Card extends TArrayCardinality = 'many',
  Coerce extends boolean = false,
  Cast extends boolean = false
> extends TType<
  Cast extends true ? Set<OutputOf<T>> : TArrayIO<T, Card>,
  TArrayDef<T, Card, Coerce, Cast>,
  TArrayIO<T, Card, '$I'> | (Coerce extends true ? Set<InputOf<T>> : never)
> {
  get _hint(): string {
    if (this._def.cardinality === 'none') {
      return '[]'
    }

    const { element } = this._def

    if (this._def.cardinality === 'atleastone') {
      return `[${element._hint}, ...(${element._hint})[]]`
    }

    return `(${element._hint})[]`
  }

  get _manifest() {
    return TManifest<TArrayInput<T, Card, Coerce>>()({
      type: TParsedType.Array,
      element: this.element.manifest(),
      cardinality: this._def.cardinality,
      minItems: this.minItems ?? null,
      maxItems: this.maxItems ?? null,
      unique: this.isUnique,
      sorted: this.isSorted,
      coerce: this._def.coerce,
      cast: this._def.cast,
    })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (this._def.coerce && ctx.data instanceof Set) {
      ctx.setData([...ctx.data])
    }

    if (!u.isArray(ctx.data)) {
      return ctx.invalidType({ expected: TParsedType.Array }).abort()
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

    const resultArr: Array<OutputOf<T>> = []

    const finalizeArray = (): ParseResultOf<this> => {
      let finalResult = [...resultArr]
      let isSorted = false

      for (const check of this._getChecks('unique', 'sorted')) {
        if (check.check === 'sorted') {
          const { sortFn, convert, message } = check

          const sortedRes = [...resultArr].sort(sortFn)

          if (convert) {
            finalResult = sortedRes
            isSorted = true
          } else {
            for (const [i, v] of sortedRes.entries()) {
              if (v !== resultArr[i]) {
                ctx
                  .child(element, v, [i])
                  .addIssue(IssueKind.InvalidArray, { check: 'sorted', sortFn, convert }, message)
                if (ctx.common.abortEarly) {
                  return ctx.abort()
                }
              }
            }
          }
        } else if (check.check === 'unique') {
          const { compareFn, convert, message } = check

          const uniqueRes = compareFn
            ? _.uniqWith(finalResult, compareFn)
            : _[isSorted ? 'sortedUniq' : 'uniq'](finalResult)

          if (convert) {
            finalResult = uniqueRes
          } else if (uniqueRes.length !== resultArr.length) {
            ctx.addIssue(IssueKind.InvalidArray, { check: 'unique', compareFn, convert }, message)
            if (ctx.common.abortEarly) {
              return ctx.abort()
            }
          }
        } else {
          TError.assertNever(check)
        }
      }

      return ctx.isValid()
        ? ctx.success((this._def.cast ? new Set(finalResult) : finalResult) as OutputOf<this>)
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

          resultArr.push(res.data)
        }

        return finalizeArray()
      })
    }

    for (const res of data.map((v, i) => element._parseSync(ctx.child(element, v, [i])))) {
      if (!res.ok) {
        if (ctx.common.abortEarly) {
          return ctx.abort()
        }

        continue
      }

      resultArr.push(res.data)
    }

    return finalizeArray()
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  get element(): T {
    return this._def.element
  }

  unwrap(): T {
    return this.element
  }

  /* ----------------------------------------------- Coercion/Casting ----------------------------------------------- */

  coerce<C extends boolean = true>(value = true as C): TArray<T, Card, C, Cast> {
    return new TArray(u.merge(this._def, { coerce: value }))
  }

  cast<C extends boolean = true>(value = true as C): TArray<T, Card, Coerce, C> {
    return new TArray(u.merge(this._def, { cast: value }))
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

  nonempty(options?: { readonly message?: string }): TArray<T, 'atleastone', Coerce, Cast> {
    return new TArray({ ...this._def, cardinality: 'atleastone' }).min(1, {
      inclusive: true,
      message: options?.message,
    })
  }

  unique(options?: { readonly convert?: boolean; readonly message?: string }): this
  unique(
    compareFn: (a: OutputOf<T>, b: OutputOf<T>) => boolean,
    options?: { readonly convert?: boolean; readonly message?: string }
  ): this
  unique(
    compareFnOrOptions?:
      | ((a: OutputOf<T>, b: OutputOf<T>) => boolean)
      | { readonly convert?: boolean; readonly message?: string },
    maybeOptions?: { readonly convert?: boolean; readonly message?: string }
  ): this {
    const compareFn = typeof compareFnOrOptions === 'function' ? compareFnOrOptions : undefined
    const options = typeof compareFnOrOptions === 'function' ? maybeOptions : compareFnOrOptions

    return this._addCheck({
      check: 'unique',
      compareFn,
      convert: options?.convert ?? false,
      message: options?.message,
    })
  }

  sorted(options?: { readonly convert?: boolean; readonly message?: string }): this
  sorted(
    sortFn: (a: OutputOf<T>, b: OutputOf<T>) => number,
    options?: { readonly convert?: boolean; readonly message?: string }
  ): this
  sorted(
    sortFnOrOptions?:
      | ((a: OutputOf<T>, b: OutputOf<T>) => number)
      | { readonly convert?: boolean; readonly message?: string },
    maybeOptions?: { readonly convert?: boolean; readonly message?: string }
  ): this {
    const sortFn = typeof sortFnOrOptions === 'function' ? sortFnOrOptions : undefined
    const options = typeof sortFnOrOptions === 'function' ? maybeOptions : sortFnOrOptions

    return this._addCheck({
      check: 'sorted',
      sortFn,
      convert: options?.convert ?? false,
      message: options?.message,
    })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  sparse(enabled?: true): TArray<TOptional<T>, Card, Coerce, Cast>
  sparse(enabled: false): TArray<TDefined<T>, Card, Coerce, Cast>
  sparse(enabled = true): TArray<TOptional<T> | TDefined<T>, Card, Coerce, Cast> {
    return new TArray(u.merge(this._def, { element: this.element[enabled ? 'optional' : 'defined']() }))
  }

  partial(): TArray<TOptional<T>, Card, Coerce, Cast> {
    return this.sparse(true)
  }

  required(): TArray<TDefined<T>, Card, Coerce, Cast> {
    return this.sparse(false)
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  ensure(this: TArray<T, Card, Coerce, true>): TSuperDefault<this, Set<never>>
  ensure(this: TArray<T, Card, Coerce>): TSuperDefault<this, []>
  ensure(): TSuperDefault<this, Set<never> | []> {
    if (this._def.cast) {
      return this.superDefault(new Set<never>())
    }

    return this.superDefault<[]>([])
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  flatten<D extends boolean = false>(options?: {
    readonly deep?: D
  }): FlattenTArray<this, D extends true ? 'deep' : 'flat'> {
    return new TArray(
      u.merge(this._def, { element: flattenTArrayElement(this, options?.deep ? 'deep' : 'flat') })
    ) as FlattenTArray<this, D extends true ? 'deep' : 'flat'>
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  toSet(): TSet<T, Coerce, Cast> {
    let set = TSet.create(this.element, this.options())

    for (const check of this._getChecks('min', 'max', 'length')) {
      if (check.check === 'length') {
        set = set._addCheck({ check: 'size', expected: check.expected, message: check.message })
      } else {
        set = set._addCheck(check)
      }
    }

    const { examples, ...manifest } = this.manifest()

    return set
      .coerce(this._def.coerce)
      .cast(this._def.cast)
      .manifest({
        ...manifest,
        ...(examples && { examples: examples.map((ex) => new Set(ex)) }),
      })
  }

  /* ---------------------------------------------------- Getters --------------------------------------------------- */

  get minItems(): number | undefined {
    return this._getChecks('min', 'length').reduce<number | undefined>(
      (min, check) => (min === undefined || check.expected.value > min ? check.expected.value : min),
      undefined
    )
  }

  get maxItems(): number | undefined {
    return this._getChecks('max', 'length').reduce<number | undefined>(
      (max, check) => (max === undefined || check.expected.value < max ? check.expected.value : max),
      undefined
    )
  }

  get isUnique(): boolean {
    return this._hasCheck('unique')
  }

  get isSorted(): boolean {
    return this._hasCheck('sorted')
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create(element: TNever, options?: TOptions): TArray<TNever, 'none'>
  static create<T extends TType>(element: T, options?: TOptions): TArray<T>
  static create<T extends TType>(element: T, options?: TOptions): TArray<T, 'none' | 'many'> {
    return new TArray({
      typeName: TTypeName.Array,
      element,
      cardinality: element.isT(TTypeName.Never) ? 'none' : 'many',
      checks: [],
      coerce: false,
      cast: false,
      options: { ...options },
    })
  }
}

export type AnyTArray = TArray<TType, TArrayCardinality, boolean, boolean>

/* ------------------------------------------------------------------------------------------------------------------ */

export type FlattenTArray<T extends AnyTArray, D extends 'flat' | 'deep' = 'flat'> = T['element'] extends TArray<
  infer El,
  infer Card,
  infer Coerce,
  infer Cast
>
  ? D extends 'deep'
    ? FlattenTArray<TArray<El, Card, Coerce, Cast>, 'deep'>
    : TArray<El, Card, Coerce, Cast>
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

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TSet                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TSetInput<T extends TType, Coerce extends boolean> = Coerce extends true
  ? Set<InputOf<T>> | TArrayIO<T, 'many', '$I'>
  : Set<InputOf<T>>

export type TSetOutput<T extends TType, Cast extends boolean> = Cast extends true
  ? TArrayIO<T, 'many'>
  : Set<OutputOf<T>>

export interface TSetDef<T extends TType, Coerce extends boolean, Cast extends boolean> extends TDef {
  readonly typeName: TTypeName.Set
  readonly element: T
  readonly checks: ToChecks<InvalidSetIssue>
  readonly coerce: Coerce
  readonly cast: Cast
}

export class TSet<T extends TType, Coerce extends boolean = false, Cast extends boolean = false> extends TType<
  TSetOutput<T, Cast>,
  TSetDef<T, Coerce, Cast>,
  TSetInput<T, Coerce>
> {
  get _manifest() {
    return TManifest<TSetInput<T, Coerce>>()({
      type: TParsedType.Set,
      element: this.element.manifest(),
      minItems: this.minItems ?? null,
      maxItems: this.maxItems ?? null,
      coerce: this._def.coerce,
      cast: this._def.cast,
    })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (this._def.coerce && u.isArray(ctx.data)) {
      ctx.setData(new Set(ctx.data))
    }

    if (!u.isSet(ctx.data)) {
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

          return ctx.isValid() ? ctx.success((this._def.cast ? [...result] : result) as OutputOf<this>) : ctx.abort()
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

    return ctx.isValid() ? ctx.success((this._def.cast ? [...result] : result) as OutputOf<this>) : ctx.abort()
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  get element(): T {
    return this._def.element
  }

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
  sparse(enabled = true): TSet<TOptional<T> | TDefined<T>, Coerce, Cast> {
    return new TSet(u.merge(this._def, { element: this.element[enabled ? 'optional' : 'defined']() }))
  }

  partial(): TSet<TOptional<T>, Coerce, Cast> {
    return this.sparse(true)
  }

  required(): TSet<TDefined<T>, Coerce, Cast> {
    return this.sparse(false)
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  toArray(): TArray<T, 'many', Coerce, Cast> {
    let arr = TArray.create(this.element, this.options())

    for (const check of this._def.checks) {
      if (check.check === 'size') {
        arr = arr._addCheck({ ...check, check: 'length' })
      } else {
        arr = arr._addCheck(check)
      }
    }

    const { examples, ...manifest } = this.manifest()

    return arr
      .coerce(this._def.coerce)
      .cast(this._def.cast)
      .manifest({
        ...manifest,
        ...(examples && { examples: examples.map((ex) => [...ex]) }),
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
      coerce: false,
      cast: false,
      options: { ...options },
    })
  }
}

export type AnyTSet = TSet<TType, boolean>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TBuffer                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TBufferInput<Coerce extends boolean> = Buffer | (Coerce extends true ? string : never)

export type TBufferOutput<Cast extends boolean> = Cast extends true ? string : Buffer

export interface TBufferDef<Coerce extends boolean, Cast extends boolean> extends TDef {
  readonly typeName: TTypeName.Buffer
  readonly checks: ToChecks<InvalidBufferIssue>
  readonly coerce: Coerce
  readonly cast: Cast
}

export class TBuffer<Coerce extends boolean = false, Cast extends boolean = false> extends TType<
  TBufferOutput<Cast>,
  TBufferDef<Coerce, Cast>,
  TBufferInput<Coerce>
> {
  get _manifest() {
    return TManifest<TBufferInput<Coerce>>()({
      type: TParsedType.Buffer,
      minBytes: this.minBytes ?? null,
      maxBytes: this.maxBytes ?? null,
      coerce: this._def.coerce,
      cast: this._def.cast,
    })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (this._def.coerce && typeof ctx.data === 'string') {
      ctx.setData(Buffer.from(ctx.data))
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

    return ctx.isValid() ? ctx.success((this._def.cast ? data.toString() : data) as OutputOf<this>) : ctx.abort()
  }

  /* ----------------------------------------------- Coercion/Casting ----------------------------------------------- */

  coerce<C extends boolean = true>(value = true as C): TBuffer<C, Cast> {
    return new TBuffer({ ...this._def, coerce: value })
  }

  cast<C extends boolean = true>(value = true as C): TBuffer<Coerce, C> {
    return new TBuffer({ ...this._def, cast: value })
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
      coerce: false,
      cast: false,
      options: { ...options },
    })
  }
}
