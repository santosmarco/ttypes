import type { TDef } from '../def'
import { TManifest, type TManifest } from '../manifest'
import type { TOptions } from '../options'
import { TParsedType, type ParseContextOf, type ParseResultOf } from '../parse'
import { TTypeName } from '../type-names'
import { u } from '../utils'
import { TType, type InputOf, type OutputOf, type TUnwrappable, type UnwrapDeep } from './_internal'

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TPromise                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

/**
 * This is required in order to prevent TS from wrapping `Promise`s inside `Promise`s.
 */
export type TPromiseIO<T> = T extends Promise<unknown> ? T : Promise<T>

export interface TPromiseDef<T extends TType> extends TDef {
  readonly typeName: TTypeName.Promise
  readonly underlying: T
}

export class TPromise<T extends TType>
  extends TType<TPromiseIO<OutputOf<T>>, TPromiseDef<T>, TPromiseIO<InputOf<T>>>
  implements TUnwrappable<T>
{
  get _manifest() {
    const underlyingManifest = this.underlying.manifest()
    return TManifest<TPromiseIO<InputOf<T>>>()({
      type: TParsedType.Promise,
      underlying: underlyingManifest,
      async: true,
      required: TManifest.extract(underlyingManifest, 'required'),
      nullable: TManifest.extract(underlyingManifest, 'nullable'),
      readonly: TManifest.extract(underlyingManifest, 'readonly'),
    })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (!u.isAsync(ctx.data) && !ctx.common.async) {
      return ctx.invalidType({ expected: TParsedType.Promise }).abort()
    }

    return ctx.success(
      (u.isAsync(ctx.data) ? ctx.data : Promise.resolve(ctx.data)).then(async (awaited) =>
        this.underlying.parseAsync(awaited)
      )
    ) as ParseResultOf<this>
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  get underlying(): T {
    return this._def.underlying
  }

  get awaited(): T {
    return this.underlying
  }

  unwrap(): T {
    return this.underlying
  }

  unwrapDeep(): UnwrapDeep<T, TTypeName.Promise> {
    type U = UnwrapDeep<T, TTypeName.Promise>
    return (this.underlying instanceof TPromise ? this.underlying.unwrapDeep() : this.underlying) as U
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create<T extends TType>(underlying: T, options?: TOptions): TPromise<T> {
    return new TPromise({ typeName: TTypeName.Promise, underlying, options: { ...options } })
  }
}

export type AnyTPromise = TPromise<TType>
