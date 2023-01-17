import type { TDef } from '../def'
import { IssueKind, type EIssueKind } from '../error'
import { manifest } from '../manifest'
import type { ExtendedTOptions } from '../options'
import { type ParseContextOf, type ParseResultOf } from '../parse'
import { TTypeName } from '../type-names'
import { type u } from '../utils'
import { TType, type InputOf, type OutputOf, type TUnwrappable, type UnwrapDeep } from './_internal'

/* ----------------------------------------------------------------------------------------------------------------- - */
/*                                                        TNot                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TNotOptions = ExtendedTOptions<{
  additionalIssueKind: EIssueKind['Forbidden']
}>

export interface TNotDef<T extends TType, Blacklist extends readonly TType[]> extends TDef {
  readonly typeName: TTypeName.Not
  readonly options: TNotOptions
  readonly underlying: T
  readonly blacklist: Blacklist
}

export class TNot<T extends TType, Blacklist extends readonly TType[]>
  extends TType<
    u.Not<OutputOf<T>, OutputOf<Blacklist[number]>>,
    TNotDef<T, Blacklist>,
    u.Not<InputOf<T>, InputOf<Blacklist[number]>>
  >
  implements TUnwrappable<T>
{
  get _manifest() {
    return manifest<u.Not<InputOf<T>, InputOf<Blacklist[number]>>>()({
      type: { not: manifest.mapKey(this.blacklist, 'type') },
      blacklist: manifest.map(this.blacklist),
    })
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    const { underlying, blacklist } = this._def

    if (ctx.common.async) {
      return Promise.all(blacklist.map(async (t) => t._parseAsync(ctx.clone(t, ctx.data)))).then((results) => {
        for (const res of results) {
          if (res.ok) {
            return ctx.addIssue(IssueKind.Forbidden, this.options().messages?.forbidden).abort()
          }
        }

        return ctx.isValid() ? underlying._parse(ctx.child(underlying, ctx.data)) : ctx.abort()
      }) as ParseResultOf<this>
    }

    for (const res of blacklist.map((t) => t._parseSync(ctx.clone(t, ctx.data)))) {
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

  get blacklist(): Blacklist {
    return this._def.blacklist
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create<T extends TType, Blacklist extends readonly [TType, ...TType[]]>(
    underlying: T,
    blacklist: Blacklist,
    options?: TNotOptions
  ): TNot<T, Blacklist> {
    return new TNot({ typeName: TTypeName.Not, underlying, blacklist, options: { ...options } })
  }
}

export type AnyTNot = TNot<TType, readonly TType[]>
