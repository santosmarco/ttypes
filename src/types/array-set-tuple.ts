import {
  TIssueKind,
  TParsedType,
  TType,
  TTypeName,
  TDefined,
  TOptional,
  isArray,
  type AnyTType,
  type InputOf,
  type NonNegativeInteger,
  type OutputOf,
  type ParseContextOf,
  type ParseResultOf,
  type Simplify,
  type TDef,
  type TIterable,
  type TIterableDef,
  type TOptions,
} from '../_internal'

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TArray                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

console.log(TDefined)

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
  extends (await import('./_base')).TType<TArrayIO<T, C>, TArrayDef<T, C>, TArrayIO<T, C, '$I'>>
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

        return ctx.isValid() ? ctx.success(result as OutputOf<this>) : ctx.abort()
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

    return ctx.isValid() ? ctx.success(result as OutputOf<this>) : ctx.abort()
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

        return ctx.isValid() ? ctx.success(result as OutputOf<this>) : ctx.abort()
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

    return ctx.isValid() ? ctx.success(result as OutputOf<this>) : ctx.abort()
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

          return ctx.isValid() ? ctx.success(result) : ctx.abort()
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

    return ctx.isValid() ? ctx.success(result) : ctx.abort()
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

  toArray(): TArray<T> {
    return new TArray({ ...this._def, typeName: TTypeName.Array, cardinality: 'many', length: this._def.size })
  }

  static create<T extends AnyTType>(element: T, options?: Simplify<TOptions>): TSet<T> {
    return new TSet({ typeName: TTypeName.Set, element, options: { ...options } })
  }
}

export type AnyTSet = TSet<AnyTType>
