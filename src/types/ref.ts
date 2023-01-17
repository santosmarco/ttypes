import type { TDef } from '../def'
import { type TManifest, manifest } from '../manifest'
import { TParsedType, type ParseContextOf, type ParseResultOf } from '../parse'
import { TTypeName } from '../type-names'
import { type u } from '../utils'
import {
  TType,
  type InputOf,
  type OutputOf,
  type TObject,
  type TObjectShape,
  type TTuple,
  type TTupleItems,
} from './_internal'

/* ----------------------------------------------------------------------------------------------------------------- - */
/*                                                        TRef                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TRefContext = TObjectShape | TTupleItems

export type TTuplePaths<T extends TTupleItems> = u.ConditionalOmit<
  u.OmitIndexSignature<{ [K in keyof T as `${K & number}` extends `${number}` ? K : never]: K }>,
  never
> extends infer X
  ? {
      [K in keyof X]: K extends infer K_ extends string
        ?
            | `[${K_}]`
            | `.${K_}`
            | (K_ extends keyof T
                ? T[K_] extends TObject<infer S>
                  ? `${`[${K_}]` | `.${K_}`}.${TObjectShapePaths<S>}`
                  : T[K_] extends TTuple<infer I>
                  ? `${`[${K_}]` | `.${K_}`}${TTuplePaths<I>}`
                  : never
                : never)
        : never
    }[keyof X]
  : never

export type TObjectShapePaths<T extends TObjectShape> = {
  [K in keyof T]:
    | K
    | (T[K] extends TObject<infer S>
        ? `${K & string}.${TObjectShapePaths<S>}`
        : T[K] extends TTuple<infer I>
        ? `${K & string}${TTuplePaths<I>}`
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
        : Ctx[Left] extends TObject<infer S>
        ? _ReachSchema<Right, S>
        : Ctx[Left] extends TTuple<infer I>
        ? _ReachSchema<Right, I>
        : Ctx[Left]
      : never
    : never
  : never

export type ReachSchema<R extends string, Ctx extends TRefContext> = u.Try<_ReachSchema<R, Ctx>, TType>

export interface TRefDef<R extends string, Ctx extends TRefContext | null> extends TDef {
  readonly typeName: TTypeName.Ref
  readonly $ref: R
  readonly $ctx: Ctx
}

export class TRef<R extends string, Ctx extends TRefContext | null> extends TType<
  OutputOf<ReachSchema<R, NonNullable<Ctx>>>,
  TRefDef<R, Ctx>,
  InputOf<ReachSchema<R, NonNullable<Ctx>>>
> {
  get _manifest() {
    return manifest<InputOf<ReachSchema<R, NonNullable<Ctx>>>>()({
      type: TParsedType.Unknown,
    })
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    const underlying = this._resolve()
    return underlying._parse(ctx.child(underlying, ctx.data))
  }

  get $ref(): R {
    return this._def.$ref
  }

  _contextualize<C extends TRefContext>(ctx: C): TRef<R, C> {
    return new TRef({ ...this._def, $ctx: ctx })
  }

  _resolve(): TType {
    const { $ref, $ctx } = this._def

    if (!$ctx) {
      throw new Error(`Unable to resolve path for $ref: ${$ref}`)
    }

    const path = String($ref)
      .split(/[.[\]]/g)
      .filter(Boolean)

    let current = $ctx[(Number.isNaN(Number(path[0])) ? path[0] : Number(path[0])) as keyof TRefContext] as TType

    for (const p of path.slice(1)) {
      const numeric = Number(p)

      if (Number.isNaN(numeric)) {
        if (current.isT(TTypeName.Object)) {
          current = current.shape[p]
        } else if (current.isT(TTypeName.Union)) {
          const next = current.members.find((m) => m.isT(TTypeName.Object) && p in m.shape)
          if (!next) {
            throw new Error(`Unable to resolve path for $ref: ${$ref}`)
          }

          current = next
        } else {
          throw new Error(`Unable to resolve path for $ref: ${$ref}`)
        }
      } else if (current.isT(TTypeName.Tuple)) {
        current = current.items[numeric]
      } else {
        throw new Error(`Unable to resolve path for $ref: ${$ref}`)
      }
    }

    return current.clone()
  }

  static create<R extends string>(ref: R): TRef<R, null> {
    return new TRef({ typeName: TTypeName.Ref, $ref: ref, $ctx: null, options: {} })
  }
}

export type AnyTRef = TRef<string, TRefContext | null>
