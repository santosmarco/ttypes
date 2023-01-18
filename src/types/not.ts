import type { TDef } from '../def'
import { IssueKind } from '../issues'
import { TManifest } from '../manifest'
import type { MakeTOptions } from '../options'
import { type ParseContextOf, type ParseResultOf } from '../parse'
import { TTypeName } from '../type-names'
import { type u } from '../utils'
import { TType, type InputOf, type OutputOf, type TUnwrappable, type UnwrapDeep } from './_internal'

/* ----------------------------------------------------------------------------------------------------------------- - */
/*                                                        TNot                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TNotOptions = MakeTOptions<{
  additionalIssueKind: IssueKind.Forbidden
}>

export interface TNotDef<T extends TType, Forbidden extends readonly TType[]> extends TDef {
  readonly typeName: TTypeName.Not
  readonly options: TNotOptions
  readonly underlying: T
  readonly forbidden: Forbidden
}

export class TNot<T extends TType, Forbidden extends readonly TType[]>
  extends TType<
    u.Not<OutputOf<T>, OutputOf<Forbidden[number]>>,
    TNotDef<T, Forbidden>,
    u.Not<InputOf<T>, InputOf<Forbidden[number]>>
  >
  implements TUnwrappable<T>
{
  get _manifest() {
    return TManifest<u.Not<InputOf<T>, InputOf<Forbidden[number]>>>()({
      type: { not: TManifest.mapKey(this.forbidden, 'type') },
      forbidden: TManifest.map(this.forbidden),
    })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    const { underlying, forbidden } = this._def

    if (ctx.common.async) {
      return Promise.all(forbidden.map(async (t) => t._parseAsync(ctx.clone(t, ctx.data)))).then((results) => {
        for (const res of results) {
          if (res.ok) {
            return ctx.addIssue(IssueKind.Forbidden, this.options().messages?.forbidden).abort()
          }
        }

        return ctx.isValid() ? underlying._parse(ctx.child(underlying, ctx.data)) : ctx.abort()
      }) as ParseResultOf<this>
    }

    for (const res of forbidden.map((t) => t._parseSync(ctx.clone(t, ctx.data)))) {
      if (res.ok) {
        return ctx.addIssue(IssueKind.Forbidden, this.options().messages?.forbidden).abort()
      }
    }

    return (ctx.isValid() ? underlying._parse(ctx.child(underlying, ctx.data)) : ctx.abort()) as ParseResultOf<this>
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  get underlying(): T {
    return this._def.underlying
  }

  unwrap(): T {
    return this.underlying
  }

  unwrapDeep(): UnwrapDeep<T, TTypeName.Not> {
    type U = UnwrapDeep<T, TTypeName.Not>
    return (this.underlying instanceof TNot ? this.underlying.unwrapDeep() : this.underlying) as U
  }

  get forbidden(): Forbidden {
    return this._def.forbidden
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create<T extends TType, Forbidden extends readonly [TType, ...TType[]]>(
    underlying: T,
    forbidden: Forbidden,
    options?: TNotOptions
  ): TNot<T, Forbidden> {
    return new TNot({ typeName: TTypeName.Not, underlying, forbidden, options: { ...options } })
  }
}

export type AnyTNot = TNot<TType, readonly TType[]>
