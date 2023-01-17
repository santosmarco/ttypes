import type { TDef } from '../def'
import { IssueKind, type EIssueKind } from '../error'
import { manifest } from '../manifest'
import type { ExtendedTOptions } from '../options'
import { TParsedType, type ParseContextOf, type ParseResultOf, type SyncParseResultOf } from '../parse'
import { TTypeName } from '../type-names'
import { u } from '../utils'
import {
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
  type TUnionMembers,
  TNever,
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
> = u.SimplifyDeep<
  u.EnforceOptional<{ [K in keyof S]: S[K][IO] }> &
    (C extends TType
      ? Record<string, C[IO]>
      : UK extends 'passthrough'
      ? Record<string, unknown>
      : UK extends 'strict'
      ? Record<string, never>
      : unknown)
>

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

export type MakePartialShape<S extends TObjectShape, K extends ReadonlyArray<keyof S> = ReadonlyArray<keyof S>> = {
  [K_ in keyof S]: K_ extends K[number] ? TOptional<S[K_]> : S[K_]
}
export type MakeRequiredShape<S extends TObjectShape, K extends ReadonlyArray<keyof S> = ReadonlyArray<keyof S>> = {
  [K_ in keyof S]: K_ extends K[number] ? TDefined<S[K_]> : S[K_]
}

export type MakeDeepPartialShape<S extends TObjectShape> = {
  [K in keyof S]: TOptional<
    S[K] extends TObject<infer S_, infer UK, infer C> ? TObject<MakeDeepPartialShape<S_>, UK, C> : S[K]
  >
}
export type MakeDeepRequiredShape<S extends TObjectShape> = {
  [K in keyof S]: TDefined<
    S[K] extends TObject<infer S_, infer UK, infer C> ? TObject<MakeDeepRequiredShape<S_>, UK, C> : S[K]
  >
}

export type PickOptionalShape<S extends TObjectShape> = {
  [K in keyof S as undefined extends OutputOf<S[K]> ? K : never]: S[K]
}
export type PickRequiredShape<S extends TObjectShape> = {
  [K in keyof S as undefined extends OutputOf<S[K]> ? never : K]: S[K]
}

export type MakeSchemaShape<S extends TObjectShape, T extends TType, D extends 'flat' | 'deep'> = {
  [K in keyof S]: S[K] extends TObject<infer S_, infer UK, infer C>
    ? D extends 'deep'
      ? TObject<MakeSchemaShape<S_, T, D>, UK, C>
      : T
    : T
}

export type TObjectOptions = ExtendedTOptions<{
  additionalIssueKind: EIssueKind['UnrecognizedKeys']
}>

export interface TObjectDef<S extends TObjectShape, UK extends TObjectUnknownKeys | null, C extends TType | null>
  extends TDef {
  readonly typeName: TTypeName.Object
  readonly options: TObjectOptions
  readonly shape: S
  readonly unknownKeys: UK
  readonly catchall: C
}

export class TObject<
  S extends TObjectShape,
  UK extends TObjectUnknownKeys | null = 'strip',
  C extends TType | null = null
> extends TType<TObjectIO<S, UK, C>, TObjectDef<S, UK, C>, TObjectIO<S, UK, C, '$I'>> {
  get _manifest() {
    return manifest<TObjectIO<S, UK, C, '$I'>>()({
      type: TParsedType.Object,
      properties: manifest.mapShape(this.shape),
    })
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (!u.isPlainObject(ctx.data)) {
      return ctx.invalidType({ expected: TParsedType.Object }).abort()
    }

    const { shape, unknownKeys, catchall } = this._def
    const { data } = ctx

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

  // keyof(): TEnum<u.Try<u.UnionToTuple<keyof S>, ReadonlyArray<string | number>>> {
  //   // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  //   return TEnum.create(u.keys(this.shape) as any, this.options()) as any
  // }

  keys(): TUnion<u.Try<u.UnionToTuple<{ [K in keyof S]: TStringLiteral<K & string> }[keyof S]>, readonly TType[]>> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return TUnion.create(u.keys(this.shape).map((k) => TLiteral.create(k)) as any, this.options())
  }

  values(): u.UnionToTuple<S[keyof S]> extends readonly [infer Head]
    ? Head
    : u.UnionToTuple<S[keyof S]> extends readonly [TType, TType, ...TType[]]
    ? TUnion<u.Try<u.UnionToTuple<S[keyof S]>, readonly TType[]>>
    : TNever {
    const vals = u.values(this.shape)
    return (
      vals.length === 1
        ? vals[0]
        : vals.length
        ? TUnion._create(u.values(this.shape), this.options())
        : TNever.create(this.options())
    ) as u.UnionToTuple<S[keyof S]> extends readonly [infer Head]
      ? Head
      : u.UnionToTuple<S[keyof S]> extends readonly [TType, TType, ...TType[]]
      ? TUnion<u.Try<u.UnionToTuple<S[keyof S]>, readonly TType[]>>
      : TNever
  }

  pick<K extends readonly [keyof S, ...Array<keyof S>]>(keys: K): TObject<Pick<S, K[number]>, UK, C> {
    return this._setShape(u.pick(this.shape, keys))
  }

  omit<K extends readonly [keyof S, ...Array<keyof S>]>(keys: K): TObject<u.Except<S, K[number]>, UK, C> {
    return this._setShape(u.omit(this.shape, keys))
  }

  augment<T extends TObjectShape>(shape: T): TObject<u.Merge<S, T>, UK, C> {
    return this._setShape({ ...this.shape, ...shape } as u.Merge<S, T>)
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

  partial(): TObject<MakePartialShape<S>, UK, C>
  partial<K extends readonly [keyof S, ...Array<keyof S>]>(keys: K): TObject<MakePartialShape<S, K>, UK, C>
  partial(keys?: readonly [keyof S, ...Array<keyof S>]): TObject<MakePartialShape<S>, UK, C> {
    return this._setShape(
      u.fromEntries(
        u.entries(this.shape).map(([k, v]) => [k, (keys ?? u.keys(this.shape)).includes(k) ? v.optional() : v])
      ) as MakePartialShape<S>
    )
  }

  required(): TObject<MakeRequiredShape<S>, UK, C>
  required<K extends readonly [keyof S, ...Array<keyof S>]>(keys: K): TObject<MakeRequiredShape<S, K>, UK, C>
  required(keys?: readonly [keyof S, ...Array<keyof S>]): TObject<MakeRequiredShape<S>, UK, C> {
    return this._setShape(
      u.fromEntries(
        u.entries(this.shape).map(([k, v]) => [k, (keys ?? u.keys(this.shape)).includes(k) ? v.defined() : v])
      ) as MakeRequiredShape<S>
    )
  }

  deepPartial(): TObject<MakeDeepPartialShape<S>, UK, C> {
    return this._setShapeDeep({ onObject: (t) => t.deepPartial(), onAny: (t) => t.optional() })
  }

  deepRequired(): TObject<MakeDeepRequiredShape<S>, UK, C> {
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

  toSchema<T extends TType>(type: T, options?: { readonly deep?: true }): TObject<MakeSchemaShape<S, T, 'deep'>, UK, C>
  toSchema<T extends TType>(type: T, options: { readonly deep: false }): TObject<MakeSchemaShape<S, T, 'flat'>, UK, C>
  toSchema<T extends TType>(
    type: T,
    options?: { readonly deep?: boolean }
  ): TObject<MakeSchemaShape<S, T, 'flat' | 'deep'>, UK, C> {
    return this._setShapeDeep({
      onObject: (t) => (options?.deep === false ? type : t.toSchema(type)),
      onOthers: () => type,
    })
  }

  stringify(): TObject<MakeSchemaShape<S, TString, 'flat'>, UK, C> {
    return this.toSchema(TString.create(), { deep: false })
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
      Object.fromEntries(
        Object.entries(this.shape)
          .map(([k, v]) => [k, v.isT(TTypeName.Object) ? onObject?.(v) ?? v : onOthers?.(v) ?? v] as const)
          .map(([k, v]) => [k, onAny?.(v) ?? v] as const)
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
        options: { ...options },
      })
  }
}

export type AnyTObject = TObject<any, any, any>
export type SomeTObject = TObject<Record<string, TType>, TObjectUnknownKeys | null, TType | null>
