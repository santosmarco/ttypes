import type { TDef } from '../def'
import { IssueKind, type EIssueKind } from '../error'
import type { ExtendedTOptions } from '../options'
import { TParsedType, type ParseContextOf, type ParseResultOf } from '../parse'
import { TTypeName } from '../type-names'
import { u } from '../utils'
import { TNever, TType, TUnion, type OutputOf, type TOptional } from './_internal'

/* ----------------------------------------------------------------------------------------------------------------- - */
/*                                                       TTuple                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TTupleOptions = ExtendedTOptions<{
  additionalIssueKind: EIssueKind['InvalidTuple']
}>

export interface TTupleDef<T extends TTupleItems, R extends TType | null = null> extends TDef {
  readonly typeName: TTypeName.Tuple
  readonly options: TTupleOptions
  readonly items: T
  readonly rest: R
}

export class TTuple<T extends TTupleItems, R extends TType | null = null> extends TType<
  TTupleIO<T, R>,
  TTupleDef<T, R>,
  TTupleIO<T, R, '$I'>
> {
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (!u.isArray(ctx.data)) {
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

        return ctx.isValid() ? ctx.success(result as OutputOf<this>) : ctx.abort()
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

    return ctx.isValid() ? ctx.success(result as OutputOf<this>) : ctx.abort()
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  get items(): T {
    return this._def.items
  }

  get restType(): R {
    return this._def.rest
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  rest<R_ extends TType>(rest: R_): TTuple<T, R_> {
    return new TTuple({ ...this._def, rest })
  }

  removeRest(): TTuple<T> {
    return new TTuple({ ...this._def, rest: null })
  }

  values(): R extends null ? (T extends [] ? TNever : TUnion<T>) : TUnion<[...T, NonNullable<R>]> {
    return ((): TType => {
      if (!this.restType && this.items.length === 0) {
        return TNever.create(this.options())
      }

      const unionBaseItems = [u.head(this.items), ...u.tail(this.items)] as const

      if (this.restType) {
        return TUnion.create([...unionBaseItems, this.restType], this.options())
      }

      return TUnion.create(unionBaseItems, this.options())
    })() as R extends null ? (T extends [] ? TNever : TUnion<T>) : TUnion<[...T, NonNullable<R>]>
  }

  head(): TTupleHead<T> {
    return (this.items[0] ?? TNever.create(this._def.options)) as TTupleHead<T>
  }

  last(): TTupleLast<T> {
    return (this.items[this.items.length - 1] ?? TNever.create(this._def.options)) as TTupleLast<T>
  }

  tail(): TTuple<TTupleTail<T>, R> {
    return new TTuple({ ...this._def, items: u.tail(this.items) as TTupleTail<T> })
  }

  push<I extends TTupleItems>(...incoming: I): TTuple<TTupleAdd<T, I>, R> {
    return new TTuple({ ...this._def, items: addTTupleItems(this.items, incoming) })
  }

  unshift<I extends TTupleItems>(...incoming: I): TTuple<TTupleAdd<I, T>, R> {
    return new TTuple({ ...this._def, items: addTTupleItems(incoming, this.items) })
  }

  concat<T_ extends TTupleItems, R_ extends TType | null>(
    incoming: TTuple<T_, R_>
  ): TTupleConcat<this, TTuple<T_, R_>> {
    return new TTuple({
      ...this._def,
      items: addTTupleItems(this.items, incoming.items),
      rest: concatTTupleRestTypes(this.restType, incoming.restType),
    })
  }

  merge<T_ extends TTupleItems, R_ extends TType | null>(incoming: TTuple<T_, R_>): TTupleConcat<this, TTuple<T_, R_>> {
    return this.concat(incoming)
  }

  reverse(): TTuple<Reverse<T>, R> {
    return new TTuple({ ...this._def, items: [...this.items].reverse() as Reverse<T> })
  }

  map<Dict extends TTupleMapDict<T, R>>(fns: Dict): MapTTuple<T, R, Dict> {
    const mappedItems = this.items
      .map((item, i) => {
        const idx = i as keyof Dict
        return idx in fns
          ? typeof fns[idx] === 'function'
            ? (fns[idx] as u.Fn)(item)
            : fns[idx] instanceof TType
            ? fns[idx]
            : null
          : item
      })
      .filter((item): item is TType => Boolean(item)) as MapTTuple<T, R, Dict>['items']

    const newRest = (
      '_' in fns
        ? typeof fns._ === 'function'
          ? fns._(this.restType)
          : fns._ instanceof TType
          ? fns._
          : null
        : this.restType
    ) as MapTTuple<T, R, Dict>['restType']

    return new TTuple({ ...this._def, items: mappedItems, rest: newRest }) as MapTTuple<T, R, Dict>
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

    return (u.includes(types, restMarker) ? filtered.removeRest() : filtered) as TTuple<
      Filter<FilterIndex<T, Extract<U[number], number>>, { readonly typeName: U[number] }>,
      typeof restMarker extends U[number] ? null : R
    >
  }

  setIdx<I extends NumericRange<0, Subtract<T['length'], 1>>, T_ extends TType>(
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
    let element: TType

    if (!this.restType) {
      if (this.items.length === 0) {
        element = TNever.create(this.options())
      } else if (this.items.length === 1) {
        element = u.head(this.items)
      } else {
        element = TUnion.create([u.head(this.items), ...u.tail(this.items)], this.options())
      }
    } else if (this.items.length === 0) {
      element = this.restType
    } else {
      element = TUnion.create([u.head(this.items), ...u.tail(this.items), this.restType], this.options())
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

  static create<T extends TTupleItems>(items: T, options?: TTupleOptions): TTuple<T>
  static create<T extends TTupleItems, R extends TType>(items: T, rest: R, options?: TTupleOptions): TTuple<T, R>
  static create<T extends TTupleItems, R extends TType>(
    items: T,
    restOrOptions?: R | TTupleOptions,
    maybeOptions?: TTupleOptions
  ): TTuple<T, R | null> {
    const rest = restOrOptions instanceof TType ? restOrOptions : null
    const options = restOrOptions instanceof TType ? maybeOptions : restOrOptions
    return new TTuple({ typeName: TTypeName.Tuple, items, rest, options: { ...options } })
  }
}

export type AnyTTuple = TTuple<TTupleItems, TType | null>

/* ------------------------------------------------------------------------------------------------------------------ */

export type TTupleItems = [] | [TType, ...TType[]] | readonly [] | readonly [TType, ...TType[]]

export type AssertTTupleItems<T> = T extends TTupleItems ? T : never

export type TTupleItemsIO<T extends TTupleItems, IO extends '$I' | '$O'> = T extends readonly []
  ? []
  : T extends readonly [infer H extends TType, ...infer R extends TTupleItems]
  ? [...(undefined extends H[IO] ? [H[IO]?] : [H[IO]]), ...TTupleItemsIO<R, IO>]
  : never

export type TTupleIO<T extends TTupleItems, R extends TType | null, IO extends '$I' | '$O' = '$O'> = R extends TType
  ? [...TTupleItemsIO<T, IO>, ...(R[IO] extends undefined ? Partial<Array<R[IO]>> : Array<R[IO]>)]
  : TTupleItemsIO<T, IO>

export type UpdateTTupleItems<T extends TTupleItems, K extends 'partial' | 'required'> = T extends readonly []
  ? []
  : T extends readonly [infer H extends TType, ...infer R extends TTupleItems]
  ? [{ partial: TOptional<H>; required: TDefined<H> }[K], ...UpdateTTupleItems<R, K>]
  : never

export type UpdateTTupleRest<R extends TType | null, K extends 'partial' | 'required'> = R extends TType
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
  : T extends readonly [infer H extends TType, ...infer R extends TTupleItems]
  ? [H, ...TTupleAdd<R, U>]
  : never

const addTTupleItems = <A extends TTupleItems, B extends TTupleItems>(a: A, b: B): TTupleAdd<A, B> =>
  (a.length === 0 ? (b.length === 0 ? [] : b) : [...a, ...b]) as TTupleAdd<A, B>

export type ConcatTTupleRest<R0 extends TType | null, R1 extends TType | null> = R0 extends TType
  ? R1 extends TType
    ? TUnion<[R0, R1]>
    : R0
  : R1

const concatTTupleRestTypes = <R0 extends TType | null, R1 extends TType | null>(
  r0: R0,
  r1: R1
): ConcatTTupleRest<R0, R1> =>
  (r0 === null ? r1 : r1 === null ? r0 : TUnion.create([r0, r1])) as ConcatTTupleRest<R0, R1>

export type TTupleConcat<T extends AnyTTuple, U extends AnyTTuple> = TTuple<
  TTupleAdd<T['items'], U['items']>,
  ConcatTTupleRest<T['restType'], U['restType']>
>

export type TTupleMapValue<T extends TType> = TType | ((type: T) => TType) | null | undefined

export type TTupleMapDict<T extends TTupleItems, R extends TType | null> = {
  [K in keyof T as K extends `${infer N extends number}` ? N : never]?: TTupleMapValue<T[K]>
} & (R extends TType ? { _?: TTupleMapValue<R> } : unknown)

export type MapTTuple<T extends TTupleItems, R extends TType | null, Dict> = {
  [K in keyof T]: K extends keyof Dict
    ? Dict[K] extends TType
      ? Dict[K]
      : Dict[K] extends (type: TType) => infer U
      ? U
      : Dict[K] extends null | undefined
      ? Dict[K]
      : T[K]
    : T[K]
} extends infer UnfilteredItems extends readonly unknown[]
  ? Filter<UnfilteredItems, null | undefined> extends infer Items extends TTupleItems
    ? TTuple<
        Items,
        '_' extends keyof Dict
          ? Dict['_'] extends TType
            ? Dict['_']
            : Dict['_'] extends ((type: TType) => infer U extends TType)
            ? U
            : R
          : R
      >
    : never
  : never

export type TTupleToArray<T extends TTupleItems, R extends TType | null> = TArray<
  R extends null
    ? T extends readonly []
      ? TNever
      : T extends readonly [infer U extends TType]
      ? U
      : TUnion<T>
    : R extends TType
    ? T extends readonly []
      ? R
      : TUnion<[...T, R]>
    : never,
  T['length'] extends 0 ? (R extends null ? 'none' : 'atleastone') : 'atleastone'
>
