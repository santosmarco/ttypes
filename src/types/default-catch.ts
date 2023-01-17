import type { TDef } from '../def'
import { TManifest } from '../manifest'
import type { TOptions } from '../options'
import { type ParseContextOf, type ParseResultOf } from '../parse'
import { TTypeName } from '../type-names'
import { u } from '../utils'
import { TType, type InputOf, type OutputOf, type TUnwrappable, type UnwrapDeep } from './_internal'

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TDefault                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TDefaultManifest<T extends TType, D>
  extends TManifest.Wrap<T, InputOf<T> | undefined, { readonly required: false }> {
  readonly default: { readonly _value: D }
}

export interface TDefaultDef<T extends TType, D extends u.Defined<OutputOf<T>>> extends TDef {
  readonly typeName: TTypeName.Default
  readonly underlying: T
  readonly getDefault: () => D
}

export class TDefault<T extends TType, D extends u.Defined<OutputOf<T>>>
  extends TType<u.Defined<OutputOf<T>> | D, TDefaultDef<T, D>, InputOf<T> | undefined>
  implements TUnwrappable<T>
{
  get _manifest(): TDefaultManifest<T, D> {
    const underlyingManifest = this.underlying.manifest()

    return TManifest.type<InputOf<T> | undefined>(underlyingManifest.type)
      .wrap(underlyingManifest)
      .required(false)
      .setProp('default', { _value: this.defaultValue }).value
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return this.underlying._parse(
      ctx.child(this.underlying, ctx.data === undefined ? this.defaultValue : ctx.data)
    ) as ParseResultOf<this>
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  get underlying(): T {
    return this._def.underlying
  }

  get defaultValue(): D {
    return this._def.getDefault()
  }

  unwrap(): T {
    return this.underlying
  }

  unwrapDeep(): UnwrapDeep<T, TTypeName.Default> {
    type U = UnwrapDeep<T, TTypeName.Default>
    return (this.underlying instanceof TDefault ? this.underlying.unwrapDeep() : this.underlying) as U
  }

  removeDefault(): T {
    return this.underlying
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create<T extends TType, D extends u.Defined<OutputOf<T>>>(
    underlying: T,
    getDefault: () => u.Narrow<D>,
    options?: TOptions
  ): TDefault<T, D>
  static create<T extends TType, D extends u.Defined<OutputOf<T>>>(
    underlying: T,
    defaultValue: u.Narrow<D>,
    options?: TOptions
  ): TDefault<T, D>
  static create<T extends TType, D extends u.Defined<OutputOf<T>>>(
    underlying: T,
    defaultValueOrGetter: u.Narrow<D> | (() => u.Narrow<D>),
    options?: TOptions
  ): TDefault<T, D>
  static create<T extends TType, D extends u.Defined<OutputOf<T>>>(
    underlying: T,
    defaultValueOrGetter: u.Narrow<D> | (() => u.Narrow<D>),
    options?: TOptions
  ): TDefault<T, D> {
    return new TDefault({
      typeName: TTypeName.Default,
      underlying,
      getDefault: (u.isFunction(defaultValueOrGetter)
        ? defaultValueOrGetter
        : (): u.Narrow<D> => defaultValueOrGetter) as () => D,
      options: { ...options },
    })
  }
}

export type AnyTDefault = TDefault<TType, unknown>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                    TSuperDefault                                                   */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TSuperDefaultManifest<T extends TType, D>
  extends TManifest.Wrap<T, InputOf<T> | null | undefined, { readonly required: false; readonly nullable: true }> {
  readonly default: { readonly _value: D }
}

export interface TSuperDefaultDef<T extends TType, D> extends TDef {
  readonly typeName: TTypeName.SuperDefault
  readonly underlying: T
  readonly getDefault: () => D
}

export class TSuperDefault<T extends TType, D>
  extends TType<u.Not<OutputOf<T>, null | undefined> | D, TSuperDefaultDef<T, D>, InputOf<T> | null | undefined>
  implements TUnwrappable<T>
{
  get _manifest(): TSuperDefaultManifest<T, D> {
    const underlyingManifest = this.underlying.manifest()

    return TManifest.type<InputOf<T> | null | undefined>(underlyingManifest.type)
      .wrap(underlyingManifest)
      .required(false)
      .nullable()
      .setProp('default', { _value: this.defaultValue }).value
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (ctx.data === undefined || ctx.data === null) {
      return ctx.success(this.defaultValue)
    }

    return this.underlying._parse(ctx.child(this.underlying, ctx.data)) as ParseResultOf<this>
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  get underlying(): T {
    return this._def.underlying
  }

  get defaultValue(): D {
    return this._def.getDefault()
  }

  unwrap(): T {
    return this.underlying
  }

  unwrapDeep(): UnwrapDeep<T, TTypeName.SuperDefault> {
    type U = UnwrapDeep<T, TTypeName.SuperDefault>
    return (this.underlying instanceof TSuperDefault ? this.underlying.unwrapDeep() : this.underlying) as U
  }

  removeDefault(): T {
    return this.underlying
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create<T extends TType, D>(
    underlying: T,
    getDefault: () => u.Narrow<D>,
    options?: TOptions
  ): TSuperDefault<T, D>
  static create<T extends TType, D>(underlying: T, defaultValue: u.Narrow<D>, options?: TOptions): TSuperDefault<T, D>
  static create<T extends TType, D>(
    underlying: T,
    defaultValueOrGetter: u.Narrow<D> | (() => u.Narrow<D>),
    options?: TOptions
  ): TSuperDefault<T, D>
  static create<T extends TType, D>(
    underlying: T,
    defaultValueOrGetter: u.Narrow<D> | (() => u.Narrow<D>),
    options?: TOptions
  ): TSuperDefault<T, D> {
    return new TSuperDefault({
      typeName: TTypeName.SuperDefault,
      underlying,
      getDefault: (u.isFunction(defaultValueOrGetter)
        ? defaultValueOrGetter
        : (): u.Narrow<D> => defaultValueOrGetter) as () => D,
      options: { ...options },
    })
  }
}

export type AnyTSuperDefault = TSuperDefault<TType, unknown>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TCatch                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TCatchManifest<T extends TType> = TManifest.Wrap<
  T,
  any,
  { readonly required: false; readonly nullable: true }
>

export interface TCatchDef<T extends TType, C extends OutputOf<T>> extends TDef {
  readonly typeName: TTypeName.Catch
  readonly underlying: T
  readonly getCatch: () => C
}

export class TCatch<T extends TType, C extends OutputOf<T>>
  extends TType<OutputOf<T> | C, TCatchDef<T, C>, any>
  implements TUnwrappable<T>
{
  get _manifest(): TCatchManifest<T> {
    const underlyingManifest = this.underlying.manifest()
    return TManifest.type<any>(underlyingManifest.type).wrap(underlyingManifest).required(false).nullable().value
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    const underlyingResult = this.underlying._parse(ctx.child(this.underlying, ctx.data))

    return u.isAsync(underlyingResult)
      ? underlyingResult.then((res) => ctx.success(res.ok ? res.data : this.catchValue))
      : ctx.success(underlyingResult.ok ? underlyingResult.data : this.catchValue)
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  get underlying(): T {
    return this._def.underlying
  }

  get catchValue(): C {
    return this._def.getCatch()
  }

  unwrap(): T {
    return this.underlying
  }

  unwrapDeep(): UnwrapDeep<T, TTypeName.Catch> {
    type U = UnwrapDeep<T, TTypeName.Catch>
    return (this.underlying instanceof TCatch ? this.underlying.unwrapDeep() : this.underlying) as U
  }

  removeCatch(): T {
    return this.underlying
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create<T extends TType, C extends OutputOf<T>>(
    underlying: T,
    getCatch: () => u.Narrow<C>,
    options?: TOptions
  ): TCatch<T, C>
  static create<T extends TType, C extends OutputOf<T>>(
    underlying: T,
    catchValue: u.Narrow<C>,
    options?: TOptions
  ): TCatch<T, C>
  static create<T extends TType, C extends OutputOf<T>>(
    underlying: T,
    catchValueOrGetter: u.Narrow<C> | (() => u.Narrow<C>),
    options?: TOptions
  ): TCatch<T, C>
  static create<T extends TType, C extends OutputOf<T>>(
    underlying: T,
    catchValueOrGetter: u.Narrow<C> | (() => u.Narrow<C>),
    options?: TOptions
  ): TCatch<T, C> {
    return new TCatch({
      typeName: TTypeName.Catch,
      underlying,
      getCatch: (u.isFunction(catchValueOrGetter)
        ? catchValueOrGetter
        : (): u.Narrow<C> => catchValueOrGetter) as () => C,
      options: { ...options },
    })
  }
}

export type AnyTCatch = TCatch<TType, unknown>
