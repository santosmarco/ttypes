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
  type AnyTDelete,
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
      u.EnforceOptional<{ [K in keyof S as S[K] extends AnyTDelete ? never : K]: S[K][IO] }> &
        (C extends TType
          ? Record<string, C[IO]>
          : UK extends 'passthrough'
          ? Record<string, unknown>
          : UK extends 'strict'
          ? Record<string, never>
          : unknown)
    >
  : never

export type TObjectShapeWithRefs = Record<string, AnyTRef | TType>

export type ResolveShapeReferences<S extends TObjectShapeWithRefs> = {
  [K in keyof S]: S[K] extends TRef<infer R> ? ReachSchema<R, S> : S[K]
} extends infer X extends TObjectShape
  ? X
  : never

const resolveShapeReferences = <S extends TObjectShapeWithRefs>(shape: S): ResolveShapeReferences<S> => {
  return u.fromEntries(
    u.entries(shape).map(([k, v]) => [k, v instanceof TRef ? v._resolve(shape) : v])
  ) as ResolveShapeReferences<S>
}

export type TObjectKeysUnion<S extends TObjectShape> = string extends keyof S
  ? TNever
  : u.UnionToTuple<{ [K in keyof S]: TLiteral<K> }[keyof S]> extends readonly [infer H]
  ? H
  : TUnion<u.Try<u.UnionToTuple<{ [K in keyof S]: TLiteral<K> }[keyof S]>, readonly TType[]>>

export type TObjectKeysEnum<S extends TObjectShape> = (
  string extends keyof S ? TEnum<[]> : TEnum<u.Try<u.UnionToTuple<keyof S>, ReadonlyArray<number | string>>>
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
  Depth extends 'deep' | 'flat',
  Shape extends TObjectShape,
  KeysOrTType extends Mod extends 'schema'
    ? TType
    : Depth extends 'flat'
    ? ReadonlyArray<keyof Shape>
    : never = Mod extends 'schema' ? TType : Depth extends 'flat' ? ReadonlyArray<keyof Shape> : never
> = u._<
  {
    partial: {
      flat: {
        [P in keyof Shape]: P extends (KeysOrTType & readonly unknown[])[number] ? TOptional<Shape[P]> : Shape[P]
      }
      deep: {
        [K in keyof Shape]: TOptional<
          Shape[K] extends TObject<infer S, infer UK, infer C>
            ? TObject<ModifyShape<'partial', Depth, S>, UK, C>
            : Shape[K]
        >
      }
    }
    required: {
      flat: { [P in keyof Shape]: P extends (KeysOrTType & readonly unknown[])[number] ? TDefined<Shape[P]> : Shape[P] }
      deep: {
        [K in keyof Shape]: TDefined<
          Shape[K] extends TObject<infer S, infer UK, infer C>
            ? TObject<ModifyShape<'required', Depth, S>, UK, C>
            : Shape[K]
        >
      }
    }
    schema: {
      flat: { [P in keyof Shape]: KeysOrTType }
      deep: {
        [P in keyof Shape]: Shape[P] extends TObject<infer S, infer UK, infer C>
          ? KeysOrTType extends TType
            ? TObject<ModifyShape<'schema', Depth, S, KeysOrTType>, UK, C>
            : never
          : KeysOrTType
      }
    }
  }[Mod][Depth]
>

export type TObjectCondition<T extends AnyTObject = AnyTObject> = {
  [K in TObjectShapePaths<T['shape']>]: u.RequireAtLeastOne<{
    readonly then: (obj: T) => AnyTObject
    readonly otherwise: (obj: T) => AnyTObject
  }> &
    u.RequireExactlyOne<{
      readonly is: any
      readonly not: any
      readonly exists: boolean
    }> & {
      readonly key: K
    }
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
      catchall: TManifest.get(this._def.catchall),
    })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (!u.isObject(ctx.data)) {
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

    const { unknownKeys, catchall } = (parser as SomeTObject)._def
    const shape = u.fromEntries(u.entries(this._def.shape).filter(([_, v]) => !v.isT(TTypeName.Delete)))

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

  /* ---------------------------------------------------------------------------------------------------------------- */

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
            keys.map((k) => TLiteral.create(k, this.shape[k].options())),
            this.options()
          )
        : TNever.create(this.options())
    ) as TObjectKeysUnion<S>
  }

  values(): TObjectValues<S> {
    const values = u.values(this.shape)
    return (
      values.length === 1
        ? values[0]
        : values.length
        ? TUnion._create(values, this.options())
        : TNever.create(this.options())
    ) as TObjectValues<S>
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  pick<K extends readonly [keyof S, ...Array<keyof S>]>(keys: K): TObject<Pick<S, K[number]>, UK, C> {
    return this._setShape(u.pick(this.shape, keys))
  }

  omit<K extends readonly [keyof S, ...Array<keyof S>]>(keys: K): TObject<u.Except<S, K[number]>, UK, C> {
    return this._setShape(u.omit(this.shape, keys))
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  augment<T extends TObjectShape>(shape: T): TObject<u.Merge<S, T>, UK, C> {
    return this._setShape(u.merge(this.shape, shape))
  }

  extend<T extends TObjectShape>(shape: T): TObject<u.Merge<S, T>, UK, C> {
    return this.augment(shape)
  }

  merge<IncS extends TObjectShape, IncUK extends TObjectUnknownKeys | null, IncC extends TType | null>(
    object: TObject<IncS, IncUK, IncC>
  ): TObject<u.Merge<S, IncS>, IncUK, IncC> {
    return object._setShape(this.augment(object.shape).shape)
  }

  intersect<T extends TObjectShape>(shape: T): TObject<u.Intersect<S, T>, UK, C> {
    return this._setShape(u.intersect(this.shape, shape))
  }

  diff<T extends TObjectShape>(shape: T): TObject<u.Diff<S, T>, UK, C> {
    return this._setShape(u.diff(this.shape, shape))
  }

  patch<T extends TObjectShape, U extends TType>(
    shape: T,
    type: U
  ): TObject<{ [K in keyof S]: S[K] extends U ? (K extends keyof T ? T[K] : TNever) : S[K] }, UK, C> {
    return this._setShape(
      u.fromEntries(
        u
          .entries(this.shape)
          .map(([k, v]) => [
            k,
            v.isT(type.typeName) ? (k in shape ? shape[k as keyof T] : TNever.create(v.options())) : v,
          ])
      ) as { [K in keyof S]: S[K] extends U ? (K extends keyof T ? T[K] : TNever) : S[K] }
    )
  }

  setKey<K extends string, T extends TType>(key: K, type: T): TObject<u.Merge<S, { [P in K]: T }>, UK, C> {
    return this.augment({ [key]: type } as { [P in K]: T })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

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

  /* ---------------------------------------------------------------------------------------------------------------- */

  conditionalPick<T extends TType>(type: T) {
    type PickedShape = u._<{ [K in keyof S as S[K] extends T ? K : never]: S[K] }>
    return this._setShape(
      u.fromEntries(u.entries(this.shape).filter(([_, v]) => v.isT(type.typeName))) as unknown as PickedShape
    )
  }

  conditionalOmit<T extends TType>(type: T) {
    type OmittedShape = u._<{ [K in keyof S as S[K] extends T ? never : K]: S[K] }>
    return this._setShape(
      u.fromEntries(u.entries(this.shape).filter(([_, v]) => !v.isT(type.typeName))) as unknown as OmittedShape
    )
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

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
  ): TObject<ModifyShape<'schema', 'deep' | 'flat', S, T>, UK, C> {
    return this._setShapeDeep({
      onObject: (t) => (options?.deep === false ? type : t.toSchema(type)),
      onOthers: () => type,
    })
  }

  stringify(): TObject<ModifyShape<'schema', 'flat', S, TString>, UK, C> {
    return this.toSchema(TString.create(), { deep: false })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  when<Conditions extends readonly [TObjectCondition<this>, ...Array<TObjectCondition<this>>]>(
    conditions: Conditions
  ):
    | ReturnType<Extract<Conditions[number], { readonly otherwise: u.Fn }>['otherwise']>
    | ReturnType<Extract<Conditions[number], { readonly then: u.Fn }>['then']> {
    return new TObject({
      ...this._def,
      conditions: [...this._def.conditions, ...(conditions as unknown as TObjectCondition[])],
    }) as
      | ReturnType<Extract<Conditions[number], { readonly otherwise: u.Fn }>['otherwise']>
      | ReturnType<Extract<Conditions[number], { readonly then: u.Fn }>['then']>
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
    lazy: <S extends TObjectShapeWithRefs>(
      shape: () => { [K in keyof S]: S[K] | TRef<Exclude<TObjectShapePaths<S>, K>> },
      options?: TObjectOptions
    ) => this._makeCreate()(shape(), options),
  })

  private static _makeCreate<UK extends TObjectUnknownKeys = 'strip'>(unknownKeys = 'strip' as UK) {
    return <S extends TObjectShapeWithRefs>(
      shape: { [K in keyof S]: S[K] | TRef<Exclude<TObjectShapePaths<S>, K>> },
      options?: TObjectOptions
    ): TObject<ResolveShapeReferences<S>, UK> =>
      new TObject<ResolveShapeReferences<S>, UK>({
        typeName: TTypeName.Object,
        shape: resolveShapeReferences(shape as S),
        unknownKeys,
        catchall: null,
        conditions: [],
        options: { ...options },
      })
  }
}

export type AnyTObject = TObject<any, any, any>
export type SomeTObject = TObject<Record<string, TType>, TObjectUnknownKeys | null, TType | null>
