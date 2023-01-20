import type { TDef } from '../def'
import { IssueKind } from '../issues'
import { TManifest } from '../manifest'
import type { MakeTOptions } from '../options'
import { TParsedType, type ParseContextOf, type ParseResultOf } from '../parse'
import { TTypeName } from '../type-names'
import { u } from '../utils'
import {
  TArray,
  TNever,
  TType,
  TUnion,
  type AnyTDelete,
  type OutputOf,
  type TDefined,
  type TOptional,
  unsetMarker,
} from './_internal'

/* ----------------------------------------------------------------------------------------------------------------- - */
/*                                                       TTuple                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TTupleOptions = MakeTOptions<{
  additionalIssueKind: IssueKind.InvalidTuple
}>

export interface TTupleDef<T extends readonly TType[], R extends TType | null = null> extends TDef {
  readonly typeName: TTypeName.Tuple
  readonly options: TTupleOptions
  readonly items: T
  readonly rest: R
}

export class TTuple<T extends readonly TType[], R extends TType | null = null> extends TType<
  TTupleIO<T, R>,
  TTupleDef<T, R>,
  TTupleIO<T, R, '$I'>
> {
  get _manifest() {
    return TManifest<TTupleIO<T, R, '$I'>>()({
      type: TParsedType.Tuple,
      items: TManifest.map(this.items),
      rest: this.restType?.manifest() ?? null,
    })
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (!u.isArray(ctx.data)) {
      return ctx.invalidType({ expected: TParsedType.Tuple }).abort()
    }

    const { rest } = this._def
    const items = this._def.items.filter((i) => !i.isT(TTypeName.Delete))
    const { data } = ctx

    if (data.length < items.length || (!rest && data.length > items.length)) {
      ctx.addIssue(
        IssueKind.InvalidTuple,
        { check: 'length', expected: { value: items.length, inclusive: true }, received: data.length },
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

  /* ---------------------------------------------------------------------------------------------------------------- */

  values(): R extends null ? (T extends readonly [] ? TNever : TUnion<T>) : TUnion<[...T, NonNullable<R>]> {
    return ((): TType => {
      if (!this.restType && this.items.length === 0) {
        return TNever.create(this.options())
      }

      if (this.restType) {
        return TUnion._create([...this.items, this.restType], this.options())
      }

      return TUnion._create(this.items, this.options())
    })() as R extends null ? (T extends readonly [] ? TNever : TUnion<T>) : TUnion<[...T, NonNullable<R>]>
  }

  head(): u.Head<T, TNever> {
    return u.head(this.items, TNever.create(this.options()))
  }

  last(): u.Last<T, TNever> {
    return u.last(this.items, TNever.create(this.options()))
  }

  pop(): TTuple<u.Reverse<u.Tail<u.Reverse<T>>>, R> {
    return new TTuple({ ...this._def, items: u.reverse(u.tail(u.reverse(this.items))) })
  }

  tail(): TTuple<u.Tail<T>, R> {
    return new TTuple({ ...this._def, items: u.tail(this.items) })
  }

  push<I extends TTupleItems>(...incoming: I): TTuple<[...T, ...I], R> {
    return new TTuple({ ...this._def, items: [...this.items, ...incoming] })
  }

  unshift<I extends TTupleItems>(...incoming: I): TTuple<[...I, ...T], R> {
    return new TTuple({ ...this._def, items: [...incoming, ...this.items] })
  }

  concat<T_ extends TTupleItems, R_ extends TType | null>(
    incoming: TTuple<T_, R_>
  ): TTuple<[...T, ...T_], R extends TType ? (R_ extends TType ? TUnion<[R, R_]> : R) : R_> {
    return new TTuple({
      ...this._def,
      items: [...this.items, ...incoming.items],
      rest: (this.restType
        ? incoming.restType
          ? TUnion.create([this.restType, incoming.restType])
          : this.restType
        : incoming.restType) as R extends TType ? (R_ extends TType ? TUnion<[R, R_]> : R) : R_,
    })
  }

  merge<T_ extends TTupleItems, R_ extends TType | null>(
    incoming: TTuple<T_, R_>
  ): TTuple<[...T, ...T_], R extends TType ? (R_ extends TType ? TUnion<[R, R_]> : R) : R_> {
    return this.concat(incoming)
  }

  reverse(): TTuple<u.Reverse<T>, R> {
    return new TTuple({ ...this._def, items: u.reverse(this.items) })
  }

  map<U extends TType>(fn: (t: T[number], i: number) => U): TTuple<{ [K in keyof T]: U }, R> {
    return new TTuple({ ...this._def, items: u.map(this.items, fn) })
  }

  filter<F extends readonly [T[number], ...Array<T[number]>]>(...types: F): TTuple<u.Filter<T, F[number]>, R>
  filter<F extends T[number]>(fn: (t: T[number], i: number) => t is F): TTuple<u.Filter<T, F>, R>
  filter<F extends T[number]>(...typesOrFn: [(t: T[number], i: number) => t is F] | [T[number], ...Array<T[number]>]) {
    const maybeFn = u.head(typesOrFn)
    return new TTuple({
      ...this._def,
      items: u.filter(
        this.items,
        typeof maybeFn === 'function'
          ? maybeFn
          : (i): i is F =>
              (typesOrFn as Array<T[number]>)
                .filter((t): t is TType => !u.isFunction(t))
                .map((t) => t.typeName)
                .includes(i.typeName)
      ),
    })
  }

  partial(): PartialTTuple<T, R> {
    return new TTuple({
      ...this._def,
      items: u.map(this.items, (i) => i.optional()),
      rest: (this.restType?.optional() ?? null) as R extends TType ? TOptional<R> : null,
    })
  }

  required(): RequiredTTuple<T, R> {
    return new TTuple({
      ...this._def,
      items: u.map(this.items, (i) => i.defined()),
      rest: (this.restType?.defined() ?? null) as R extends TType ? TDefined<R> : null,
    })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  toArray(): TTupleToArray<T, R> {
    let element: TType

    if (!this.restType) {
      if (this.items.length === 0) {
        element = TNever.create(this.options())
      } else if (this.items.length === 1) {
        element = u.head(this.items)
      } else {
        element = TUnion._create(this.items, this.options())
      }
    } else if (this.items.length === 0) {
      element = this.restType
    } else {
      element = TUnion._create([...this.items, this.restType], this.options())
    }

    return new TArray({
      ...this._def,
      typeName: TTypeName.Array,
      element,
      cardinality: (this.items.length === 0 ? (this.restType ? 'many' : 'none') : 'atleastone') as T['length'] extends 0
        ? R extends null
          ? 'none'
          : 'many'
        : 'atleastone',
      checks: [],
      coerce: unsetMarker,
      cast: unsetMarker,
    }) as TTupleToArray<T, R>
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create = Object.assign(this._create, {
    fill<T extends TType, N extends number>(type: T, n: N, options?: TTupleOptions): TTuple<u.BuildTuple<T, N>> {
      return new TTuple({
        typeName: TTypeName.Tuple,
        items: u.buildTuple(type, n),
        rest: null,
        options: { ...options },
      })
    },
  })

  private static _create<T extends TTupleItems>(items: T, options?: TTupleOptions): TTuple<T>
  private static _create<T extends TTupleItems, R extends TType>(
    items: T,
    rest: R,
    options?: TTupleOptions
  ): TTuple<T, R>
  private static _create<T extends TTupleItems, R extends TType>(
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

export type TTupleItems = readonly [] | readonly [TType, ...TType[]]

export type TTupleIO<T extends readonly TType[], R extends TType | null, IO extends '$I' | '$O' = '$O'> = u.Filter<
  T,
  AnyTDelete
> extends infer X extends readonly TType[]
  ? { [K in keyof X]: X[K][IO] } extends infer Y extends readonly unknown[]
    ? R extends TType
      ? [...Y, ...Array<R[IO]>]
      : Y
    : never
  : never

export type PartialTTuple<T extends readonly TType[], R extends TType | null> = TTuple<
  { [K in keyof T]: TOptional<T[K]> },
  R extends TType ? TOptional<R> : null
>

export type RequiredTTuple<T extends readonly TType[], R extends TType | null> = TTuple<
  { [K in keyof T]: TDefined<T[K]> },
  R extends TType ? TDefined<R> : null
>

export type TTupleToArray<T extends readonly TType[], R extends TType | null> = TArray<
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
  T['length'] extends 0 ? (R extends null ? 'none' : 'many') : 'atleastone'
>
