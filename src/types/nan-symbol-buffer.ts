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
/*                                                        TNaN                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TNaNDef extends TDef {
  readonly typeName: TTypeName.NaN
}

export class TNaN extends TType<number, TNaNDef> {
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return typeof ctx.data !== 'number' || !Number.isNaN(ctx.data)
      ? ctx.invalidType({ expected: TParsedType.NaN }).abort()
      : ctx.success(ctx.data)
  }

  static create(options?: Simplify<TOptions>): TNaN {
    return new TNaN({ typeName: TTypeName.NaN, options: { ...options } })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TSymbol                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TSymbolDef extends TDef {
  readonly typeName: TTypeName.Symbol
}

export class TSymbol extends TType<symbol, TSymbolDef> {
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return typeof ctx.data === 'symbol'
      ? ctx.success(ctx.data)
      : ctx.invalidType({ expected: TParsedType.Symbol }).abort()
  }

  static create(options?: Simplify<TOptions>): TSymbol {
    return new TSymbol({ typeName: TTypeName.Symbol, options: { ...options } })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TBuffer                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TBufferDef extends TDef {
  readonly typeName: TTypeName.Buffer
}

export class TBuffer extends TType<Buffer, TBufferDef> {
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return Buffer.isBuffer(ctx.data) ? ctx.success(ctx.data) : ctx.invalidType({ expected: TParsedType.Buffer }).abort()
  }

  static create(options?: Simplify<TOptions>): TBuffer {
    return new TBuffer({ typeName: TTypeName.Buffer, options: { ...options } })
  }
}
