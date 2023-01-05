import { type ConditionalExcept, type OmitIndexSignature } from 'type-fest'
import {
  TEnum,
  TIssueKind,
  TParsedType,
  type TRef,
  TType,
  TTypeName,
  type AnyTRef,
  type AnyTTuple,
  type AnyTType,
  type Equals,
  type Merge,
  type OutputOf,
  type ParseContextOf,
  type ParseResultOf,
  type Simplify,
  type SyncParseResult,
  type TDef,
  type TDefined,
  type TOptional,
  type TOptions,
  type UnionToEnumValues,
} from '../_internal'

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TObject                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TObjectShape = Record<string, AnyTType>
export type TObjectUnknownKeys = 'passthrough' | 'strict' | 'strip'
export type TObjectCatchall = AnyTType

export type TObjectIO<
  S extends TObjectShape,
  UK extends TObjectUnknownKeys | undefined,
  C extends TObjectCatchall | undefined,
  IO extends '$I' | '$O' = '$O'
> = Simplify<
  EnforceOptional<{ [K in keyof S]: S[K][IO] }> &
    (C extends AnyTType
      ? Record<string, C[IO]>
      : UK extends 'passthrough'
      ? Record<string, unknown>
      : UK extends 'strict'
      ? Record<string, never>
      : unknown)
> extends infer X
  ? { 0: X; 1: Record<string, never> }[Equals<X, {}>]
  : never

export type PartialShape<S extends TObjectShape, K extends ReadonlyArray<keyof S> = ReadonlyArray<keyof S>> = {
  [K_ in keyof S]: K_ extends K[number] ? TOptional<S[K_]> : S[K_]
}
export type DepartialShape<S extends TObjectShape, K extends ReadonlyArray<keyof S> = ReadonlyArray<keyof S>> = {
  [K_ in keyof S]: K_ extends K[number] ? TDefined<S[K_]> : S[K_]
}

type TuplePaths<T extends readonly unknown[]> = ConditionalExcept<
  OmitIndexSignature<{ [K in keyof T as `${K & number}` extends `${number}` ? K : never]: K }>,
  never
> extends infer X
  ? {
      [K in keyof X]: K & string extends infer StrK extends string
        ? `[${StrK}]` | `.${StrK}` | (T[K & keyof T] extends TObject<infer S> ? `[${StrK}].${ShapePaths<S>}` : never)
        : never
    }[keyof X]
  : never

export type ShapePaths<T extends TObjectShape> = {
  [K in keyof T]:
    | K
    | (T[K] extends AnyTObject
        ? `${K & string}.${ShapePaths<T[K]['shape']> & string}`
        : T[K] extends AnyTTuple
        ? `${K & string}${TuplePaths<T[K]['items']>}`
        : never)
}[keyof T] &
  string

export type CreateTObjectShapeArg<S extends TObjectShape> = {
  [K in keyof S]: Exclude<S[K], AnyTRef> | TRef<Exclude<ShapePaths<S>, K>, undefined>
}

export const resolveObjectRefs = <S extends TObjectShape>(shape: S): S => {
  const resolvedShape = {} as S

  for (const k of Object.keys(shape)) {
    const v = shape[k]

    if (v.isT(TTypeName.Ref)) {
      resolvedShape[k as keyof S] = v.resolve(shape) as S[keyof S]
    } else if (v.isT(TTypeName.Object)) {
      resolvedShape[k as keyof S] = v.extend(resolveObjectRefs(v.shape)) as unknown as S[keyof S]
    } else {
      resolvedShape[k as keyof S] = v as S[keyof S]
    }
  }

  return resolvedShape
}

export const pick = <T extends Record<string, unknown>, K extends keyof T>(obj: T, keys: readonly K[]): Pick<T, K> =>
  Object.fromEntries(keys.map((k) => [k, obj[k]])) as Pick<T, K>

export const omit = <T extends Record<string, unknown>, K extends keyof T>(obj: T, keys: readonly K[]): Omit<T, K> =>
  Object.fromEntries(Object.entries(obj).filter(([k]) => !keys.includes(k as K))) as Omit<T, K>

export type TObjectOptions = TOptions<{
  additionalIssueKind: TIssueKind.UnrecognizedKeys
}>

export interface TObjectDef<
  S extends TObjectShape,
  UK extends TObjectUnknownKeys | undefined,
  C extends TObjectCatchall | undefined
> extends TDef {
  readonly typeName: TTypeName.Object
  readonly options: TObjectOptions
  readonly shape: S
  readonly unknownKeys: UK
  readonly catchall: C
}

export class TObject<
  S extends TObjectShape,
  UK extends TObjectUnknownKeys | undefined = TObjectUnknownKeys | undefined,
  C extends TObjectCatchall | undefined = TObjectCatchall | undefined
> extends TType<TObjectIO<S, UK, C>, TObjectDef<S, UK, C>, TObjectIO<S, UK, C, '$I'>> {
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (typeof ctx.data !== 'object' || ctx.data === null) {
      return ctx.invalidType({ expected: TParsedType.Object }).abort()
    }

    const { shape, unknownKeys, catchall } = this._def
    const data = ctx.data as Record<string, unknown>

    const extraKeys: string[] = []
    if (!catchall || unknownKeys !== 'strip') {
      for (const k of Object.keys(data)) {
        if (!(k in shape)) {
          extraKeys.push(k)
        }
      }
    }

    const result: Record<string, unknown> = {}

    if (ctx.isAsync()) {
      return Promise.all(
        Object.entries(shape).map(async ([k, v]) => Promise.all([k, v._parseAsync(ctx.child(v, data[k], [k]))]))
      ).then(async (results) => {
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
              { kind: TIssueKind.UnrecognizedKeys, payload: { keys: extraKeys } },
              this._def.options.messages?.unrecognizedKeys
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
            result[k] = res.data
          }
        }

        return ctx.isValid() ? ctx.success(result as OutputOf<this>) : ctx.abort()
      })
    }

    const results: Array<[string, SyncParseResult<unknown, unknown>]> = []

    for (const [k, v] of Object.entries(shape)) {
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
          { kind: TIssueKind.UnrecognizedKeys, payload: { keys: extraKeys } },
          this._def.options.messages?.unrecognizedKeys
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
        result[k] = res.data
      }
    }

    return ctx.isValid() ? ctx.success(result as OutputOf<this>) : ctx.abort()
  }

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

  catchall<T extends TObjectCatchall>(catchall: T): TObject<S, undefined, T> {
    return new TObject({ ...this._def, unknownKeys: undefined, catchall })
  }

  keyof(): TEnum<UnionToEnumValues<keyof S>> {
    return TEnum.create(Object.keys(this.shape) as UnionToEnumValues<keyof S>)
  }

  pick<K extends readonly [keyof S, ...Array<keyof S>]>(keys: K): TObject<Pick<S, K[number]>, UK, C> {
    return this._setShape(pick(this.shape, keys))
  }

  omit<K extends readonly [keyof S, ...Array<keyof S>]>(keys: K): TObject<Omit<S, K[number]>, UK, C> {
    return this._setShape(omit(this.shape, keys))
  }

  augment<T extends TObjectShape>(shape: T): TObject<Merge<S, T>, UK, C> {
    return this._setShape({ ...this.shape, ...shape } as Merge<S, T>)
  }

  extend<T extends TObjectShape>(shape: T): TObject<Merge<S, T>, UK, C> {
    return this.augment(shape)
  }

  merge<S_ extends TObjectShape, UK_ extends TObjectUnknownKeys | undefined, C_ extends TObjectCatchall | undefined>(
    object: TObject<S_, UK_, C_>
  ): TObject<Merge<S, S_>, UK_, C_> {
    return object._setShape(this.augment(object.shape).shape)
  }

  partial(): TObject<PartialShape<S>, UK, C>
  partial<K extends readonly [keyof S, ...Array<keyof S>]>(keys: K): TObject<PartialShape<S, K>, UK, C>
  partial(keys?: ReadonlyArray<keyof S>): TObject<PartialShape<S>, UK, C> {
    return this._setShape(
      Object.fromEntries(
        Object.entries(this.shape).map(([k, v]) => [
          k,
          (keys ?? Object.keys(this.shape)).includes(k) ? v.optional() : v,
        ])
      ) as PartialShape<S>
    )
  }

  departial(): TObject<DepartialShape<S>, UK, C>
  departial<K extends readonly [keyof S, ...Array<keyof S>]>(keys: K): TObject<DepartialShape<S, K>, UK, C>
  departial(keys?: ReadonlyArray<keyof S>): TObject<DepartialShape<S>, UK, C> {
    return this._setShape(
      Object.fromEntries(
        Object.entries(this.shape).map(([k, v]) => [k, (keys ?? Object.keys(this.shape)).includes(k) ? v.defined() : v])
      ) as DepartialShape<S>
    )
  }

  private _setShape<T extends TObjectShape>(shape: T): TObject<T, UK, C> {
    return new TObject({ ...this._def, shape })
  }

  private _setUnknownKeys<T extends TObjectUnknownKeys>(unknownKeys: T): TObject<S, T> {
    return new TObject({ ...this._def, unknownKeys, catchall: undefined })
  }

  static create = Object.assign(this._makeCreate(), {
    passthrough: this._makeCreate('passthrough'),
    strict: this._makeCreate('strict'),
    strip: this._makeCreate(),
    lazy: <S extends TObjectShape>(shape: () => S, options?: Simplify<TOptions>) =>
      this._makeCreate()(shape(), options),
  })

  private static _makeCreate<UK extends TObjectUnknownKeys = 'strip'>(unknownKeys = 'strip' as UK) {
    return <S extends TObjectShape>(shape: CreateTObjectShapeArg<S>, options?: Simplify<TOptions>): TObject<S, UK> =>
      new TObject({
        typeName: TTypeName.Object,
        shape: resolveObjectRefs(shape) as S,
        unknownKeys,
        catchall: undefined,
        options: { ...options },
      })
  }
}

export type SomeTObject = TObject<Record<string, AnyTType>>
export type AnyTObject = TObject<any>

/* ------------------------------------------------------ Utils ----------------------------------------------------- */

type OptionalKeys<T extends Record<string, unknown>> = { [K in keyof T]: undefined extends T[K] ? K : never }[keyof T]
type RequiredKeys<T extends Record<string, unknown>> = { [K in keyof T]: undefined extends T[K] ? never : K }[keyof T]
type EnforceOptional<T extends Record<string, unknown>> = Pick<T, RequiredKeys<T>> & Partial<Pick<T, OptionalKeys<T>>>
