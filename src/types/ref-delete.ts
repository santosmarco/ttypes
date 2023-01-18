import { type TDef } from '../def'
import { type ParseContextOf, type ParseResultOf } from '../parse'
import { TTypeName } from '../type-names'
import type { u } from '../utils'
import {
  TType,
  deleteMarker,
  refMarker,
  type AnyTObject,
  type AnyTTuple,
  type AnyTUnion,
  type FlattenMembers,
  type InputOf,
  type OutputOf,
  type TObjectShapeWithRefs,
  type UnwrapUntil,
} from './_internal'

/* ----------------------------------------------------------------------------------------------------------------- - */
/*                                                        TRef                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TRefContext = Record<string, TType | AnyTRef> | readonly TType[]

export type TTuplePaths<T extends readonly TType[]> = u.ConditionalOmit<
  u.OmitIndexSignature<{ [K in keyof T as `${K & number}` extends `${number}` ? K : never]: K }>,
  never
> extends infer X
  ? {
      [K in keyof X]: K extends infer K_ extends string
        ?
            | `[${K_}]`
            | `.${K_}`
            | (K_ extends keyof T
                ? UnwrapUntil<T[K_], AnyTObject> extends AnyTObject
                  ? `${`[${K_}]` | `.${K_}`}.${TObjectShapePaths<UnwrapUntil<T[K_], AnyTObject>['shape']>}`
                  : UnwrapUntil<T[K_], AnyTTuple> extends AnyTTuple
                  ? `${`[${K_}]` | `.${K_}`}${TTuplePaths<UnwrapUntil<T[K_], AnyTTuple>['items']>}`
                  : never
                : never)
        : never
    }[keyof X]
  : never

export type TObjectShapePaths<T extends TObjectShapeWithRefs> = {
  [K in keyof T]:
    | K
    | (UnwrapUntil<T[K], AnyTObject> extends AnyTObject
        ? `${K & string}.${TObjectShapePaths<UnwrapUntil<T[K], AnyTObject>['shape']>}`
        : UnwrapUntil<T[K], AnyTTuple> extends AnyTTuple
        ? `${K & string}${TTuplePaths<UnwrapUntil<T[K], AnyTTuple>['items']>}`
        : never)
}[keyof T] &
  string

export type _ReachSchema<R extends string, Ctx extends TRefContext> = u.ReplaceAll<
  u.ReplaceAll<R, '[', '.'>,
  ']',
  '.'
> extends infer R_ extends string
  ? R_ | u.ToNum<R_> extends keyof Ctx
    ? Ctx[R_ & keyof Ctx]
    : R_ extends `${infer Left}${'.'}${infer Right}`
    ? Left extends keyof Ctx
      ? Right extends ''
        ? Ctx[Left]
        : UnwrapUntil<Ctx[Left], AnyTObject> extends AnyTObject
        ? _ReachSchema<Right, UnwrapUntil<Ctx[Left], AnyTObject>['shape']>
        : Ctx[Left] extends AnyTUnion
        ? _ReachSchema<
            Right,
            Extract<
              Extract<
                UnwrapUntil<FlattenMembers<Ctx[Left]['members'], AnyTUnion>[number], AnyTObject>,
                AnyTObject
              >['shape'],
              { readonly [K in Right]: unknown }
            >
          >
        : UnwrapUntil<Ctx[Left], AnyTTuple> extends AnyTTuple
        ? _ReachSchema<Right, UnwrapUntil<Ctx[Left], AnyTTuple>['items']>
        : Ctx[Left] extends AnyTUnion
        ? _ReachSchema<
            Right,
            Extract<
              Extract<
                UnwrapUntil<FlattenMembers<Ctx[Left]['members'], AnyTUnion>[number], AnyTTuple>,
                AnyTTuple
              >['items'],
              { readonly [K in Right]: unknown }
            >
          >
        : u.$TTypeError<'Invalid reference path'>
      : u.$TTypeError<'Invalid reference path'>
    : u.$TTypeError<'Invalid reference path'>
  : u.$TTypeError<'Invalid reference path'>

export type ReachSchema<R extends string, Ctx extends TRefContext> = u.Try<_ReachSchema<R, Ctx>, TType>

export class TRef<Ref extends string> {
  get [refMarker]() {
    return true
  }

  private constructor(private readonly ref: Ref) {}

  /* ---------------------------------------------------------------------------------------------------------------- */

  resolve(ctx: TRefContext): TType {
    if (!ctx) {
      throw new Error(`Unable to resolve path for $ref: ${this.ref}`)
    }

    return TRef._internals.resolveRef(this.ref, ctx)
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create<R extends string>(ref: R): TRef<R> {
    return new TRef(ref)
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static _internals = {
    resolveRef(ref: string, ctx: TRefContext) {
      const path = String(ref)
        .split(/[.[\]]/g)
        .filter(Boolean)

      let current = ctx[(Number.isNaN(Number(path[0])) ? path[0] : Number(path[0])) as keyof TRefContext] as TType

      for (const p of path.slice(1)) {
        while ('underlying' in current) {
          current = current.underlying as TType
        }

        const numeric = Number(p)

        if (Number.isNaN(numeric)) {
          if (current.isT(TTypeName.Object)) {
            current = current.shape[p]
          } else if (current.isT(TTypeName.Union)) {
            const next = current.members.find((m) => m.isT(TTypeName.Object) && p in m.shape)

            if (!next) {
              throw new Error(`Unable to resolve path for ref: ${ref}`)
            }

            current = next
          } else {
            throw new Error(`Unable to resolve path for ref: ${ref}`)
          }
        } else if (current.isT(TTypeName.Tuple)) {
          current = current.items[numeric]
        } else {
          throw new Error(`Unable to resolve path for ref: ${ref}`)
        }
      }

      return current.clone()
    },
  }
}

export type AnyTRef = TRef<string>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TDelete                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TDeleteDef<T extends TType> extends TDef {
  readonly typeName: TTypeName.Delete
  readonly underlying: T
}

export class TDelete<T extends TType> extends TType<OutputOf<T>, TDeleteDef<T>, InputOf<T>> {
  get [deleteMarker]() {
    return true
  }

  get _manifest() {
    return this._def.underlying.manifest()
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return this._def.underlying._parse(ctx)
  }

  static create<T extends TType>(type: T): TDelete<T> {
    return new TDelete({ typeName: TTypeName.Delete, underlying: type, options: type.options() })
  }
}

export type AnyTDelete = TDelete<TType>
