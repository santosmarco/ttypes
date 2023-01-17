import type { TDef } from '../def'
import { TManifest } from '../manifest'
import type { TOptions } from '../options'
import { TParsedType, type ParseContextOf, type ParseResultOf } from '../parse'
import { TTypeName } from '../type-names'
import { type InputOf, TType } from './_internal'

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TSymbol                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TSymbolDef extends TDef {
  readonly typeName: TTypeName.Symbol
}

export class TSymbol extends TType<symbol, TSymbolDef> {
  get _manifest(): TManifest.Base<symbol> {
    return TManifest.type<InputOf<this>>(TParsedType.Symbol).value
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return typeof ctx.data === 'symbol'
      ? ctx.success(ctx.data)
      : ctx.invalidType({ expected: TParsedType.Symbol }).abort()
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create(options?: TOptions): TSymbol {
    return new TSymbol({ typeName: TTypeName.Symbol, options: { ...options } })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TNaN                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TNaNDef extends TDef {
  readonly typeName: TTypeName.NaN
}

export class TNaN extends TType<number, TNaNDef> {
  get _manifest(): TManifest.Base<number> {
    return TManifest.type<InputOf<this>>(TParsedType.NaN).value
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return typeof ctx.data === 'number' && Number.isNaN(ctx.data)
      ? ctx.success(ctx.data)
      : ctx.invalidType({ expected: TParsedType.NaN }).abort()
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create(options?: TOptions): TNaN {
    return new TNaN({ typeName: TTypeName.NaN, options: { ...options } })
  }
}
