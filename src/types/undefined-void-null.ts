import type { TDef } from '../def'
import { TManifest } from '../manifest'
import type { TOptions } from '../options'
import { TParsedType, type ParseContextOf, type ParseResultOf } from '../parse'
import { TTypeName } from '../type-names'
import { u } from '../utils'
import { TType } from './_internal'

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                     TUndefined                                                     */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TUndefinedDef extends TDef {
  readonly typeName: TTypeName.Undefined
}

export class TUndefined extends TType<undefined, TUndefinedDef> {
  get _manifest(): TManifest.Literal<undefined> {
    return TManifest.type<undefined>(TParsedType.Undefined).literal(u.literalize(undefined)).required(false).value
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return ctx.data === undefined ? ctx.success(ctx.data) : ctx.invalidType({ expected: TParsedType.Undefined }).abort()
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create(options?: TOptions): TUndefined {
    return new TUndefined({ typeName: TTypeName.Undefined, options: { ...options } })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TVoid                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TVoidDef extends TDef {
  readonly typeName: TTypeName.Void
}

export class TVoid extends TType<void, TVoidDef> {
  get _manifest(): TManifest.Optional<void> {
    return TManifest.type<void>(TParsedType.Void).required(false).value
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return ctx.data === undefined ? ctx.success(ctx.data) : ctx.invalidType({ expected: TParsedType.Void }).abort()
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create(options?: TOptions): TVoid {
    return new TVoid({ typeName: TTypeName.Void, options: { ...options } })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TNull                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TNullDef extends TDef {
  readonly typeName: TTypeName.Null
}

export class TNull extends TType<null, TNullDef> {
  get _manifest(): TManifest.Literal<null> {
    return TManifest.type<null>(TParsedType.Null).literal(u.literalize(null)).nullable().value
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return ctx.data === null ? ctx.success(ctx.data) : ctx.invalidType({ expected: TParsedType.Null }).abort()
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create(options?: TOptions): TNull {
    return new TNull({ typeName: TTypeName.Null, options: { ...options } })
  }
}
