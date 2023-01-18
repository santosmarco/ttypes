import type { TDef } from '../def'
import { TManifest } from '../manifest'
import type { TOptions } from '../options'
import type { ParseContextOf, ParseResultOf } from '../parse'
import { TTypeName } from '../type-names'
import type { u } from '../utils'
import { TType, type InputOf, type OutputOf } from './_internal'

/* ----------------------------------------------------------------------------------------------------------------- - */
/*                                                      TPipeline                                                     */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TPipelineDef<A extends TType, B extends TType> extends TDef {
  readonly typeName: TTypeName.Pipeline
  readonly from: A
  readonly to: B
}

export class TPipeline<A extends TType, B extends TType> extends TType<OutputOf<B>, TPipelineDef<A, B>, InputOf<A>> {
  get _manifest() {
    const toRequired = TManifest.extract(this.to.manifest(), 'required')
    const fromRequired = TManifest.extract(this.from.manifest(), 'required')

    type Required = [typeof toRequired, typeof fromRequired] extends [false, false] ? false : true

    const toNullable = TManifest.extract(this.to.manifest(), 'nullable')
    const fromNullable = TManifest.extract(this.from.manifest(), 'nullable')

    type Nullable = [typeof toNullable, typeof fromNullable] extends [true, true] ? true : false

    return TManifest<InputOf<A>>()({
      type: TManifest.extract(this.to.manifest(), 'type'),
      required: !(!toRequired && !fromRequired) as u.Narrow<Required>,
      nullable: Boolean(toNullable && fromNullable) as u.Narrow<Nullable>,
    })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    const { from, to } = this._def

    if (ctx.common.async) {
      return from._parseAsync(ctx.child(from, ctx.data)).then((fromResult) => {
        if (!fromResult.ok) {
          return fromResult
        }

        return to._parseAsync(ctx.child(to, fromResult.data))
      })
    }

    const fromResult = from._parseSync(ctx.child(from, ctx.data))
    if (!fromResult.ok) {
      return fromResult
    }

    return to._parseSync(ctx.child(to, fromResult.data))
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  get from(): A {
    return this._def.from
  }

  get to(): B {
    return this._def.to
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create<T, TU, U, A extends TType<TU, TDef, T>, B extends TType<U, TDef, TU>>(
    from: A,
    to: B,
    options?: TOptions
  ): TPipeline<A, B> {
    return new TPipeline({ typeName: TTypeName.Pipeline, from, to, options: { ...options } })
  }
}

export type AnyTPipeline = TPipeline<TType, TType>
