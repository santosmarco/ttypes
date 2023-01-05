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
/*                                                     TUndefined                                                     */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TUndefinedDef extends TDef {
  readonly typeName: TTypeName.Undefined
}

export class TUndefined extends TType<undefined, TUndefinedDef> {
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return ctx.data === undefined
      ? ctx.success(undefined)
      : ctx.invalidType({ expected: TParsedType.Undefined }).abort()
  }

  static create(options?: Simplify<TOptions>): TUndefined {
    return new TUndefined({ typeName: TTypeName.Undefined, options: { ...options }, isOptional: true })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TVoid                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TVoidDef extends TDef {
  readonly typeName: TTypeName.Void
}

export class TVoid extends TType<void, TVoidDef> {
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return ctx.data === undefined ? ctx.success(undefined) : ctx.invalidType({ expected: TParsedType.Void }).abort()
  }

  static create(options?: Simplify<TOptions>): TVoid {
    return new TVoid({ typeName: TTypeName.Void, options: { ...options }, isOptional: true })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TNull                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TNullDef extends TDef {
  readonly typeName: TTypeName.Null
}

export class TNull extends TType<null, TNullDef> {
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return ctx.data === null ? ctx.success(null) : ctx.invalidType({ expected: TParsedType.Null }).abort()
  }

  static create(options?: Simplify<TOptions>): TNull {
    return new TNull({ typeName: TTypeName.Null, options: { ...options }, isNullable: true })
  }
}
