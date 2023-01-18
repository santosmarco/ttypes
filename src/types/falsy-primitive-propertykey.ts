import type { TDef } from '../def'
import { TManifest } from '../manifest'
import type { TOptions } from '../options'
import { TParsedType, type ParseContextOf, type ParseResultOf } from '../parse'
import { TTypeName } from '../type-names'
import { u } from '../utils'
import { TType } from './_internal'

/* ----------------------------------------------------------------------------------------------------------------- - */
/*                                                       TFalsy                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TFalsyDef extends TDef {
  readonly typeName: TTypeName.Falsy
}

export class TFalsy extends TType<false | '' | 0 | 0n | null | undefined, TFalsyDef> {
  get _manifest() {
    return TManifest<u.Falsy>()({
      type: {
        anyOf: [
          TParsedType.False,
          TParsedType.EmptyString,
          TParsedType.Zero,
          TParsedType.BigIntZero,
          TParsedType.Null,
          TParsedType.Undefined,
        ],
      },
      required: false,
      nullable: true,
    })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return u.isFalsy(ctx.data) ? ctx.success(ctx.data) : ctx.invalidType({ expected: TParsedType.Falsy }).abort()
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create(options?: TOptions): TFalsy {
    return new TFalsy({ typeName: TTypeName.Falsy, options: { ...options } })
  }
}

/* ----------------------------------------------------------------------------------------------------------------- - */
/*                                                     TPrimitive                                                     */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TPrimitiveDef extends TDef {
  readonly typeName: TTypeName.Primitive
}

export class TPrimitive extends TType<string | number | bigint | boolean | symbol | null | undefined, TPrimitiveDef> {
  get _manifest() {
    return TManifest<u.Primitive>()({
      type: {
        anyOf: [
          TParsedType.String,
          TParsedType.Number,
          TParsedType.BigInt,
          TParsedType.Boolean,
          TParsedType.Symbol,
          TParsedType.Null,
          TParsedType.Undefined,
        ],
      },
      required: false,
      nullable: true,
    })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return u.isPrimitive(ctx.data)
      ? ctx.success(ctx.data)
      : ctx.invalidType({ expected: TParsedType.Primitive }).abort()
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create(options?: TOptions): TPrimitive {
    return new TPrimitive({ typeName: TTypeName.Primitive, options: { ...options } })
  }
}

/* ----------------------------------------------------------------------------------------------------------------- - */
/*                                                    TPropertyKey                                                    */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TPropertyKeyDef extends TDef {
  readonly typeName: TTypeName.PropertyKey
}

export class TPropertyKey extends TType<string | number | symbol, TPropertyKeyDef> {
  get _manifest() {
    return TManifest<PropertyKey>()({
      type: { anyOf: [TParsedType.String, TParsedType.Number, TParsedType.Symbol] },
    })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return typeof ctx.data === 'string' || typeof ctx.data === 'number' || typeof ctx.data === 'symbol'
      ? ctx.success(ctx.data)
      : ctx.invalidType({ expected: TParsedType.PropertyKey }).abort()
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create(options?: TOptions): TPropertyKey {
    return new TPropertyKey({ typeName: TTypeName.PropertyKey, options: { ...options } })
  }
}
