import type { TDef } from '../def'
import { TManifest } from '../manifest'
import type { TOptions } from '../options'
import { type ParseContextOf, type ParseResultOf } from '../parse'
import { TTypeName } from '../type-names'
import { u } from '../utils'
import { TType, type InputOf, type ManifestOf, type OutputOf, type TUnwrappable, type UnwrapDeep } from './_internal'

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TBrand                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export const BRAND = Symbol('BRAND')
export type BRAND = typeof BRAND
export type BRANDED<T, B> = T & { readonly [BRAND]: B }

export interface TBrandDef<T extends TType, B> extends TDef {
  readonly typeName: TTypeName.Brand
  readonly underlying: T
  readonly brand: B
}

export class TBrand<T extends TType, B>
  extends TType<BRANDED<OutputOf<T>, B>, TBrandDef<T, B>, InputOf<T>>
  implements TUnwrappable<T>
{
  get _manifest() {
    const underlyingManifest = this.underlying.manifest()
    return TManifest<InputOf<T>>()({
      type: TManifest.extract(underlyingManifest, 'type'),
      underlying: underlyingManifest,
      brand: this.getBrand(),
      required: TManifest.extract(underlyingManifest, 'required'),
      nullable: TManifest.extract(underlyingManifest, 'nullable'),
      readonly: TManifest.extract(underlyingManifest, 'readonly'),
    })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return this.underlying._parse(ctx.child(this.underlying, ctx.data)) as ParseResultOf<this>
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  get underlying(): T {
    return this._def.underlying
  }

  unwrap(): T {
    return this.underlying
  }

  unwrapDeep(): UnwrapDeep<T, TTypeName.Brand> {
    type U = UnwrapDeep<T, TTypeName.Brand>
    return (this.underlying instanceof TBrand ? this.underlying.unwrapDeep() : this.underlying) as U
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  getBrand(): B {
    return this._def.brand
  }

  removeBrand(): T {
    return this.underlying
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create<T extends TType, B>(underlying: T, brand: u.Narrow<B>, options?: TOptions): TBrand<T, B> {
    return new TBrand({ typeName: TTypeName.Brand, underlying, brand: u.widen(brand), options: { ...options } })
  }
}

export type AnyTBrand = TBrand<TType, PropertyKey>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TLazy                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TLazyDef<T extends TType> extends TDef {
  readonly typeName: TTypeName.Lazy
  readonly getType: () => T
}

export class TLazy<T extends TType> extends TType<OutputOf<T>, TLazyDef<T>, InputOf<T>> implements TUnwrappable<T> {
  get _manifest(): ManifestOf<T> {
    return { ...this.underlying.manifest() }
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return this.underlying._parse(ctx.child(this.underlying, ctx.data))
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  get underlying(): T {
    return this._def.getType()
  }

  unwrap(): T {
    return this.underlying
  }

  unwrapDeep(): UnwrapDeep<T, TTypeName.Lazy> {
    type U = UnwrapDeep<T, TTypeName.Lazy>
    return (this.underlying instanceof TLazy ? this.underlying.unwrapDeep() : this.underlying) as U
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create<T extends TType>(factory: () => T, options?: TOptions): TLazy<T> {
    return new TLazy({ typeName: TTypeName.Lazy, getType: factory, options: { ...options } })
  }
}

export type AnyTLazy = TLazy<TType>
