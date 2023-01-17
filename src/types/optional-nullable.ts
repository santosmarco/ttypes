import type { TDef } from '../def'
import { manifest, type TManifest } from '../manifest'
import type { TOptions } from '../options'
import { TParsedType, type ParseContextOf, type ParseResultOf } from '../parse'
import { TTypeName } from '../type-names'
import { TType, type InputOf, type OutputOf, type TUnwrappable, type UnwrapDeep } from './_internal'

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TOptional                                                     */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TOptionalManifest<T extends TType> = TManifest.Wrap<T, InputOf<T> | undefined, { readonly required: false }>

export interface TOptionalDef<T extends TType> extends TDef {
  readonly typeName: TTypeName.Optional
  readonly underlying: T
}

export class TOptional<T extends TType>
  extends TType<OutputOf<T> | undefined, TOptionalDef<T>, InputOf<T> | undefined>
  implements TUnwrappable<T>
{
  get _manifest() {
    const underlyingManifest = this.underlying.manifest()
    return manifest<InputOf<T> | undefined>()({
      type: { anyOf: [manifest.extract(underlyingManifest, 'type'), TParsedType.Undefined] },
      underlying: underlyingManifest,
      required: false,
      nullable: manifest.extract(underlyingManifest, 'nullable'),
      readonly: manifest.extract(underlyingManifest, 'readonly'),
    })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return ctx.data === undefined ? ctx.success(ctx.data) : this.underlying._parse(ctx.child(this.underlying, ctx.data))
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  get underlying(): T {
    return this._def.underlying
  }

  unwrap(): T {
    return this.underlying
  }

  unwrapDeep(): UnwrapDeep<T, TTypeName.Optional> {
    type U = UnwrapDeep<T, TTypeName.Optional>
    return (this.underlying instanceof TOptional ? this.underlying.unwrapDeep() : this.underlying) as U
  }

  unwrapNullishDeep(): UnwrapNullishDeep<T> {
    return handleUnwrapNullishDeep(this.underlying)
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create<T extends TType>(underlying: T, options?: TOptions): TOptional<T> {
    return new TOptional({ typeName: TTypeName.Optional, underlying, options: { ...options } })
  }
}

export type AnyTOptional = TOptional<TType>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TNullable                                                     */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TNullableManifest<T extends TType> = TManifest.Wrap<T, InputOf<T> | null, { readonly nullable: true }>

export interface TNullableDef<T extends TType> extends TDef {
  readonly typeName: TTypeName.Nullable
  readonly underlying: T
}

export class TNullable<T extends TType>
  extends TType<OutputOf<T> | null, TNullableDef<T>, InputOf<T> | null>
  implements TUnwrappable<T>
{
  get _manifest() {
    const underlyingManifest = this.underlying.manifest()
    return manifest<InputOf<T> | null>()({
      type: { anyOf: [manifest.extract(underlyingManifest, 'type'), TParsedType.Null] },
      underlying: underlyingManifest,
      nullable: true,
      required: manifest.extract(underlyingManifest, 'required'),
      readonly: manifest.extract(underlyingManifest, 'readonly'),
    })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return ctx.data === null ? ctx.success(ctx.data) : this.underlying._parse(ctx.child(this.underlying, ctx.data))
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  get underlying(): T {
    return this._def.underlying
  }

  unwrap(): T {
    return this.underlying
  }

  unwrapDeep(): UnwrapDeep<T, TTypeName.Nullable> {
    type U = UnwrapDeep<T, TTypeName.Nullable>
    return (this.underlying instanceof TNullable ? this.underlying.unwrapDeep() : this.underlying) as U
  }

  unwrapNullishDeep(): UnwrapNullishDeep<T> {
    return handleUnwrapNullishDeep(this.underlying)
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create<T extends TType>(underlying: T, options?: TOptions): TNullable<T> {
    return new TNullable({ typeName: TTypeName.Nullable, underlying, options: { ...options } })
  }
}

export type AnyTNullable = TNullable<TType>

/* ------------------------------------------------------------------------------------------------------------------ */

export type UnwrapNullishDeep<T extends TType> = UnwrapDeep<T, TTypeName.Optional | TTypeName.Nullable>

const handleUnwrapNullishDeep = <T extends TType>(underlying: T): UnwrapNullishDeep<T> => {
  type U = UnwrapNullishDeep<T>
  return (underlying.isT(TTypeName.Optional, TTypeName.Nullable) ? underlying.unwrapNullishDeep() : underlying) as U
}
