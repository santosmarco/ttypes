import {
  TParsedType,
  TType,
  TTypeName,
  type ParseContextOf,
  type ParseResultOf,
  type Simplify,
  type TDef,
  type TOptions,
} from '../_internal'

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TBoolean                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TBooleanDef extends TDef {
  readonly typeName: TTypeName.Boolean
}

export class TBoolean extends TType<boolean, TBooleanDef> {
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return typeof ctx.data === 'boolean'
      ? ctx.success(ctx.data)
      : ctx.invalidType({ expected: TParsedType.Boolean }).abort()
  }

  static create(options?: Simplify<TOptions>): TBoolean {
    return new TBoolean({ typeName: TTypeName.Boolean, options: { ...options } })
  }
}

/* ------------------------------------------------------ TTrue ----------------------------------------------------- */

export interface TTrueDef extends TDef {
  readonly typeName: TTypeName.True
}

export class TTrue extends TType<true, TTrueDef> {
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return ctx.data === true ? ctx.success(ctx.data) : ctx.invalidType({ expected: TParsedType.True }).abort()
  }

  static create(options?: Simplify<TOptions>): TTrue {
    return new TTrue({ typeName: TTypeName.True, options: { ...options } })
  }
}

/* ----------------------------------------------------- TFalse ----------------------------------------------------- */

export interface TFalseDef extends TDef {
  readonly typeName: TTypeName.False
}

export class TFalse extends TType<false, TFalseDef> {
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return ctx.data === false ? ctx.success(ctx.data) : ctx.invalidType({ expected: TParsedType.False }).abort()
  }

  static create(options?: Simplify<TOptions>): TFalse {
    return new TFalse({ typeName: TTypeName.False, options: { ...options } })
  }
}
