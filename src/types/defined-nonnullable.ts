import type { TDef } from '../def'
import { IssueKind } from '../issues'
import { TManifest } from '../manifest'
import type { TOptions } from '../options'
import { TParsedType, type ParseContextOf, type ParseResultOf } from '../parse'
import { TTypeName } from '../type-names'
import type { u } from '../utils'
import { TType, type InputOf, type OutputOf, type TUnwrappable, type UnwrapDeep } from './_internal'

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TDefined                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TDefinedDef<T extends TType> extends TDef {
  readonly typeName: TTypeName.Defined
  readonly underlying: T
}

export class TDefined<T extends TType>
  extends TType<u.Defined<OutputOf<T>>, TDefinedDef<T>, u.Defined<InputOf<T>>>
  implements TUnwrappable<T>
{
  get _manifest() {
    const underlyingManifest = this.underlying.manifest()
    return TManifest<u.Defined<InputOf<T>>>()({
      type: { not: [TParsedType.Undefined] },
      underlying: underlyingManifest,
      required: true,
      nullable: TManifest.extract(underlyingManifest, 'nullable'),
      readonly: TManifest.extract(underlyingManifest, 'readonly'),
    })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return ctx.data === undefined
      ? ctx.addIssue(IssueKind.Required, this.options().messages?.required).abort()
      : (this.underlying._parse(ctx.child(this.underlying, ctx.data)) as ParseResultOf<this>)
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  get underlying(): T {
    return this._def.underlying
  }

  unwrap(): T {
    return this.underlying
  }

  unwrapDeep(): UnwrapDeep<T, TTypeName.Defined> {
    type U = UnwrapDeep<T, TTypeName.Defined>
    return (this.underlying instanceof TDefined ? this.underlying.unwrapDeep() : this.underlying) as U
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create<T extends TType>(underlying: T, options?: TOptions): TDefined<T> {
    return new TDefined({ typeName: TTypeName.Defined, underlying, options: { ...options } })
  }
}

export type AnyTDefined = TDefined<TType>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                    TNonNullable                                                    */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TNonNullableDef<T extends TType> extends TDef {
  readonly typeName: TTypeName.NonNullable
  readonly underlying: T
}

export class TNonNullable<T extends TType>
  extends TType<NonNullable<OutputOf<T>>, TNonNullableDef<T>, NonNullable<InputOf<T>>>
  implements TUnwrappable<T>
{
  get _manifest() {
    const underlyingManifest = this.underlying.manifest()
    return TManifest<NonNullable<InputOf<T>>>()({
      type: { not: [TParsedType.Undefined, TParsedType.Null] },
      underlying: underlyingManifest,
      required: true,
      nullable: false,
      readonly: TManifest.extract(underlyingManifest, 'readonly'),
    })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return ctx.data === undefined || ctx.data === null
      ? ctx.invalidType({ expected: this.underlying.manifest().type }).abort()
      : (this.underlying._parse(ctx.child(this.underlying, ctx.data)) as ParseResultOf<this>)
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  get underlying(): T {
    return this._def.underlying
  }

  unwrap(): T {
    return this.underlying
  }

  unwrapDeep(): UnwrapDeep<T, TTypeName.NonNullable> {
    type U = UnwrapDeep<T, TTypeName.NonNullable>
    return (this.underlying instanceof TNonNullable ? this.underlying.unwrapDeep() : this.underlying) as U
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create<T extends TType>(underlying: T, options?: TOptions): TNonNullable<T> {
    return new TNonNullable({ typeName: TTypeName.NonNullable, underlying, options: { ...options } })
  }
}

export type AnyTNonNullable = TNonNullable<TType>
