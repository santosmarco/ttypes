import _ from 'lodash'
import type { TDef } from '../def'
import { IssueKind } from '../issues'
import { TManifest } from '../manifest'
import type { MakeTOptions } from '../options'
import { TParsedType, type ParseContextOf, type ParseResultOf, type SyncParseResultOf } from '../parse'
import { TTypeName } from '../type-names'
import { u } from '../utils'
import {
  TEnum,
  TLiteral,
  TNever,
  TRef,
  TString,
  TType,
  TUnion,
  type AnyTRef,
  type OutputOf,
  type ReachSchema,
  type TDefined,
  type TObjectShapePaths,
  type TOptional,
} from './_internal'

/* ----------------------------------------------------------------------------------------------------------------- - */
/*                                                       TObject                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TObjectShape = Record<string, TType>
export type TObjectUnknownKeys = 'passthrough' | 'strict' | 'strip'

export type TObjectIO<
  S extends TObjectShape,
  UK extends TObjectUnknownKeys | null,
  C extends TType | null,
  IO extends '$I' | '$O' = '$O'
> = S extends unknown
  ? u.SimplifyDeep<
      u.EnforceOptional<{ [K in keyof S]: S[K][IO] }> &
        (C extends TType
          ? Record<string, C[IO]>
          : UK extends 'passthrough'
          ? Record<string, unknown>
          : UK extends 'strict'
          ? Record<string, never>
          : unknown)
    >
  : never

export type TObjectShapeArg<S extends TObjectShape> = {
  [K in keyof S]: Exclude<S[K], AnyTRef> | TRef<Exclude<TObjectShapePaths<S>, K>, null>
}

export type GetRefResolvedShape<S extends TObjectShape> = {
  [K in keyof S]: S[K] extends TRef<infer R, infer _Ctx> ? ReachSchema<R, S> : S[K]
}

const resolveShapeRefs = <S extends TObjectShape>(shape: S): GetRefResolvedShape<S> => {
  const resolvedShape = {} as Record<keyof S, unknown>

  for (const k of u.keys(shape)) {
    const v = shape[k]

    if (v instanceof TRef) {
      resolvedShape[k] = v._contextualize(shape)._resolve()
    } else if (v.isT(TTypeName.Object)) {
      resolvedShape[k] = v.extend(resolveShapeRefs(v.shape))
    } else {
      resolvedShape[k] = v
    }
  }

  return resolvedShape as GetRefResolvedShape<S>
}

export type TObjectKeysUnion<S extends TObjectShape> = string extends keyof S
  ? TNever
  : u.UnionToTuple<{ [K in keyof S]: TLiteral<K> }[keyof S]> extends readonly [infer H]
  ? H
  : TUnion<u.Try<u.UnionToTuple<{ [K in keyof S]: TLiteral<K> }[keyof S]>, readonly TType[]>>

export type TObjectKeysEnum<S extends TObjectShape> = (
  string extends keyof S ? TEnum<[]> : TEnum<u.Try<u.UnionToTuple<keyof S>, ReadonlyArray<string | number>>>
) extends infer X
  ? X
  : never

export type TObjectValues<S extends TObjectShape> = u.UnionToTuple<S[keyof S]> extends readonly [infer H]
  ? H
  : u.UnionToTuple<S[keyof S]> extends readonly [TType, TType, ...TType[]]
  ? TUnion<u.Try<u.UnionToTuple<S[keyof S]>, readonly TType[]>>
  : TNever

export type ModifyShape<
  Mod extends 'partial' | 'required' | 'schema',
  Depth extends 'flat' | 'deep',
  S extends TObjectShape,
  K extends Mod extends 'schema' ? TType : Depth extends 'flat' ? ReadonlyArray<keyof S> : never = Mod extends 'schema'
    ? TType
    : Depth extends 'flat'
    ? ReadonlyArray<keyof S>
    : never
> = {
  partial: {
    flat: { [K_ in keyof S]: K_ extends (K & readonly unknown[])[number] ? TOptional<S[K_]> : S[K_] }
    deep: {
      [K in keyof S]: TOptional<
        S[K] extends TObject<infer S_, infer UK, infer C> ? TObject<ModifyShape<'partial', Depth, S_>, UK, C> : S[K]
      >
    }
  }
  required: {
    flat: { [K_ in keyof S]: K_ extends (K & readonly unknown[])[number] ? TDefined<S[K_]> : S[K_] }
    deep: {
      [K in keyof S]: TDefined<
        S[K] extends TObject<infer S_, infer UK, infer C> ? TObject<ModifyShape<'required', Depth, S_>, UK, C> : S[K]
      >
    }
  }
  schema: {
    flat: { [K_ in keyof S]: K }
    deep: {
      [K_ in keyof S]: S[K_] extends TObject<infer S_, infer UK, infer C>
        ? K extends TType
          ? TObject<ModifyShape<'schema', Depth, S_, K>, UK, C>
          : never
        : K
    }
  }
}[Mod][Depth]

export type PickOptionalShape<S extends TObjectShape> = {
  [K in keyof S as undefined extends OutputOf<S[K]> ? K : never]: S[K]
}

export type PickRequiredShape<S extends TObjectShape> = {
  [K in keyof S as undefined extends OutputOf<S[K]> ? never : K]: S[K]
}

export type TObjectCondition<T extends AnyTObject = AnyTObject> = {
  [K in TObjectShapePaths<T['shape']>]: {
    readonly key: K
  } & u.RequireExactlyOne<{
    readonly is: any
    readonly not: any
    readonly exists: boolean
  }> &
    u.RequireAtLeastOne<{
      readonly then: (obj: T) => AnyTObject
      readonly otherwise: (obj: T) => AnyTObject
    }>
}[TObjectShapePaths<T['shape']>]

export type TObjectOptions = MakeTOptions<{
  additionalIssueKind: IssueKind.UnrecognizedKeys
}>

export interface TObjectDef<S extends TObjectShape, UK extends TObjectUnknownKeys | null, C extends TType | null>
  extends TDef {
  readonly typeName: TTypeName.Object
  readonly options: TObjectOptions
  readonly shape: S
  readonly unknownKeys: UK
  readonly catchall: C
  readonly conditions: readonly TObjectCondition[]
}

export class TObject<
  S extends TObjectShape,
  UK extends TObjectUnknownKeys | null = 'strip',
  C extends TType | null = null
> extends TType<TObjectIO<S, UK, C>, TObjectDef<S, UK, C>, TObjectIO<S, UK, C, '$I'>> {
  get _manifest() {
    return TManifest<TObjectIO<S, UK, C, '$I'>>()({
      type: TParsedType.Object,
      properties: TManifest.mapShape(this.shape),
      unknownKeys: this._def.unknownKeys,
      catchall: this._def.catchall?.manifest() ?? null,
    })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (!u.isPlainObject(ctx.data)) {
      return ctx.invalidType({ expected: TParsedType.Object }).abort()
    }

    let parser: AnyTObject = this.clone()
    const { data } = ctx

    for (const condition of this._def.conditions) {
      const value = _.get(data, condition.key)
      if (condition.is) {
        parser =
          ((
            condition.is instanceof TType
              ? condition.is.guard(value)
              : u.isFunction(condition.is)
              ? condition.is(value)
              : condition.is === value
          )
            ? condition.then?.(parser)
            : condition.otherwise?.(parser)) ?? parser
      } else if (condition.not) {
        parser =
          ((
            condition.not instanceof TType
              ? condition.not.guard(value)
              : u.isFunction(condition.not)
              ? condition.not(value)
              : condition.not === value
          )
            ? condition.otherwise?.(parser)
            : condition.then?.(parser)) ?? parser
      } else if (condition.exists) {
        parser = (value === undefined ? condition.otherwise?.(parser) : condition.then?.(parser)) ?? parser
      }
    }

    const { shape, unknownKeys, catchall } = (parser as SomeTObject)._def

    const extraKeys: PropertyKey[] = []
    if (!catchall || unknownKeys !== 'strip') {
      for (const k of u.keys(data)) {
        if (!(k in shape)) {
          extraKeys.push(k)
        }
      }
    }

    const resultObj: Record<PropertyKey, unknown> = {}

    if (ctx.common.async) {
      return Promise.all(
        u.entries(shape).map(async ([k, v]) => Promise.all([k, v._parseAsync(ctx.child(v, data[k], [k]))]))
      ).then(async (results: Array<[PropertyKey, SyncParseResultOf<S[keyof S]>]>) => {
        if (catchall) {
          const extraKeysResults = await Promise.all(
            extraKeys.map(async (k) => Promise.all([k, catchall._parseAsync(ctx.child(catchall, data[k], [k]))]))
          )
          results.push(...extraKeysResults)
        } else if (unknownKeys === 'passthrough') {
          for (const k of extraKeys) {
            results.push([k, ctx.success(data[k])])
          }
        } else if (unknownKeys === 'strict') {
          if (extraKeys.length > 0) {
            ctx.addIssue(
              IssueKind.UnrecognizedKeys,
              { keys: [...extraKeys].sort((a, b) => String(a).localeCompare(String(b))) },
              this.options().messages?.unrecognizedKeys
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
            resultObj[k] = res.data
          }
        }

        return ctx.isValid() ? ctx.success(resultObj as OutputOf<this>) : ctx.abort()
      })
    }

    const results: Array<[PropertyKey, SyncParseResultOf<S[keyof S]>]> = []

    for (const [k, v] of u.entries(shape)) {
      results.push([k, v._parseSync(ctx.child(v, data[k], [k]))])
    }

    if (catchall) {
      for (const k of extraKeys) {
        results.push([k, catchall._parseSync(ctx.child(catchall, data[k], [k]))])
      }
    } else if (unknownKeys === 'passthrough') {
      for (const k of extraKeys) {
        results.push([k, ctx.success(data[k])])
      }
    } else if (unknownKeys === 'strict') {
      if (extraKeys.length > 0) {
        ctx.addIssue(
          IssueKind.UnrecognizedKeys,
          { keys: [...extraKeys].sort((a, b) => String(a).localeCompare(String(b))) },
          this.options().messages?.unrecognizedKeys
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
        resultObj[k] = res.data
      }
    }

    return ctx.isValid() ? ctx.success(resultObj as OutputOf<this>) : ctx.abort()
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

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

  catchall<T extends TType>(catchall: T): TObject<S, null, T> {
    return new TObject({ ...this._def, unknownKeys: null, catchall })
  }

  removeCatchall(): TObject<S> {
    return new TObject({ ...this._def, catchall: null }).strip()
  }

  keyof(): TObjectKeysEnum<S> {
    return TEnum._create(Object.keys(this.shape), this.options()) as TObjectKeysEnum<S>
  }

  keys(): TObjectKeysUnion<S> {
    const keys = u.keys(this.shape)
    return (
      keys.length === 1
        ? TLiteral.create(keys[0], this.shape[keys[0]].options())
        : keys.length
        ? TUnion._create(
            u.keys(this.shape).map((k) => TLiteral.create(k, this.shape[k].options())),
            this.options()
          )
        : TNever.create(this.options())
    ) as TObjectKeysUnion<S>
  }

  values(): TObjectValues<S> {
    const vals = u.values(this.shape)
    return (
      vals.length === 1
        ? vals[0]
        : vals.length
        ? TUnion._create(u.values(this.shape), this.options())
        : TNever.create(this.options())
    ) as TObjectValues<S>
  }

  pick<K extends readonly [keyof S, ...Array<keyof S>]>(keys: K): TObject<Pick<S, K[number]>, UK, C> {
    return this._setShape(u.pick(this.shape, keys))
  }

  omit<K extends readonly [keyof S, ...Array<keyof S>]>(keys: K): TObject<u.Except<S, K[number]>, UK, C> {
    return this._setShape(u.omit(this.shape, keys))
  }

  augment<T extends TObjectShape>(shape: T): TObject<u.Merge<S, T>, UK, C> {
    return this._setShape(u.merge(this.shape, shape))
  }

  extend<T extends TObjectShape>(shape: T): TObject<u.Merge<S, T>, UK, C> {
    return this.augment(shape)
  }

  setKey<K extends string, T extends TType>(key: K, type: T): TObject<u.Merge<S, { [K_ in K]: T }>, UK, C> {
    return this.augment({ [key]: type } as { [K_ in K]: T })
  }

  merge<S_ extends TObjectShape, UK_ extends TObjectUnknownKeys | null, C_ extends TType | null>(
    object: TObject<S_, UK_, C_>
  ): TObject<u.Merge<S, S_>, UK_, C_> {
    return object._setShape(this.augment(object.shape).shape)
  }

  intersect<T extends TObjectShape>(shape: T): TObject<u.Intersect<S, T>, UK, C> {
    return this._setShape(u.intersect(this.shape, shape))
  }

  diff<T extends TObjectShape>(shape: T): TObject<u.Diff<S, T>, UK, C> {
    return this._setShape(u.diff(this.shape, shape))
  }

  partial(): TObject<ModifyShape<'partial', 'flat', S>, UK, C>
  partial<K extends readonly [keyof S, ...Array<keyof S>]>(
    keys: K
  ): TObject<ModifyShape<'partial', 'flat', S, K>, UK, C>
  partial(keys?: ReadonlyArray<keyof S>): AnyTObject {
    return this._setShape(
      u.fromEntries(
        u.entries(this.shape).map(([k, v]) => [k, (keys ?? u.keys(this.shape)).includes(k) ? v.optional() : v])
      )
    )
  }

  required(): TObject<ModifyShape<'required', 'flat', S>, UK, C>
  required<K extends readonly [keyof S, ...Array<keyof S>]>(
    keys: K
  ): TObject<ModifyShape<'required', 'flat', S, K>, UK, C>
  required(keys?: ReadonlyArray<keyof S>): AnyTObject {
    return this._setShape(
      u.fromEntries(
        u.entries(this.shape).map(([k, v]) => [k, (keys ?? u.keys(this.shape)).includes(k) ? v.defined() : v])
      )
    )
  }

  deepPartial(): TObject<ModifyShape<'partial', 'deep', S>, UK, C> {
    return this._setShapeDeep({ onObject: (t) => t.deepPartial(), onAny: (t) => t.optional() })
  }

  deepRequired(): TObject<ModifyShape<'required', 'deep', S>, UK, C> {
    return this._setShapeDeep({ onObject: (t) => t.deepRequired(), onAny: (t) => t.defined() })
  }

  pickOptional(): TObject<PickOptionalShape<S>, UK, C> {
    return this._setShape(
      Object.fromEntries(Object.entries(this.shape).filter(([_, v]) => v.isOptional)) as PickOptionalShape<S>
    )
  }

  pickRequired(): TObject<PickRequiredShape<S>, UK, C> {
    return this._setShape(
      Object.fromEntries(Object.entries(this.shape).filter(([_, v]) => v.isRequired)) as PickRequiredShape<S>
    )
  }

  toSchema<T extends TType>(
    type: T,
    options?: { readonly deep?: true }
  ): TObject<ModifyShape<'schema', 'deep', S, T>, UK, C>
  toSchema<T extends TType>(
    type: T,
    options: { readonly deep: false }
  ): TObject<ModifyShape<'schema', 'flat', S, T>, UK, C>
  toSchema<T extends TType>(
    type: T,
    options?: { readonly deep?: boolean }
  ): TObject<ModifyShape<'schema', 'flat' | 'deep', S, T>, UK, C> {
    return this._setShapeDeep({
      onObject: (t) => (options?.deep === false ? type : t.toSchema(type)),
      onOthers: () => type,
    })
  }

  stringify(): TObject<ModifyShape<'schema', 'flat', S, TString>, UK, C> {
    return this.toSchema(TString.create(), { deep: false })
  }

  when<Conditions extends readonly [TObjectCondition<this>, ...Array<TObjectCondition<this>>]>(
    conditions: Conditions
  ):
    | ReturnType<Extract<Conditions[number], { readonly then: u.Fn }>['then']>
    | ReturnType<Extract<Conditions[number], { readonly otherwise: u.Fn }>['otherwise']> {
    return new TObject({
      ...this._def,
      conditions: [...this._def.conditions, ...(conditions as unknown as TObjectCondition[])],
    }) as
      | ReturnType<Extract<Conditions[number], { readonly then: u.Fn }>['then']>
      | ReturnType<Extract<Conditions[number], { readonly otherwise: u.Fn }>['otherwise']>
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  private _setShape<T extends TObjectShape>(shape: T): TObject<T, UK, C> {
    return new TObject({ ...this._def, shape })
  }

  private _setShapeDeep<T extends TObjectShape>(setters: {
    readonly onObject?: (t: AnyTObject) => TType
    readonly onOthers?: (t: Exclude<TType, AnyTObject>) => TType
    readonly onAny?: (t: TType) => TType
  }): TObject<T, UK, C> {
    const { onObject, onOthers, onAny } = setters
    return this._setShape(
      u.fromEntries(
        u
          .entries(this.shape)
          .map(([k, v]) => [k, v.isT(TTypeName.Object) ? onObject?.(v) ?? v : onOthers?.(v) ?? v] as const)
          .map(([k, v]) => [k, onAny?.(v) ?? v])
      ) as T
    )
  }

  private _setUnknownKeys<K extends TObjectUnknownKeys>(unknownKeys: K): TObject<S, K> {
    return new TObject({ ...this._def, unknownKeys, catchall: null })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create = Object.assign(this._makeCreate(), {
    passthrough: this._makeCreate('passthrough'),
    strict: this._makeCreate('strict'),
    strip: this._makeCreate(),
    lazy: <S extends TObjectShape>(shape: () => TObjectShapeArg<S>, options?: TObjectOptions) =>
      this._makeCreate()(shape(), options),
  })

  private static _makeCreate<UK extends TObjectUnknownKeys = 'strip'>(unknownKeys = 'strip' as UK) {
    return <S extends TObjectShape>(
      shape: TObjectShapeArg<S>,
      options?: TObjectOptions
    ): TObject<GetRefResolvedShape<S>, UK> =>
      new TObject({
        typeName: TTypeName.Object,
        shape: resolveShapeRefs(shape as S),
        unknownKeys,
        catchall: null,
        conditions: [],
        options: { ...options },
      })
  }
}

export type AnyTObject = TObject<any, any, any>
export type SomeTObject = TObject<Record<string, TType>, TObjectUnknownKeys | null, TType | null>
