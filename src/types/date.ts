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
/*                                                        TDate                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TDateDef extends TDef {
  readonly typeName: TTypeName.Date
}

export class TDate extends TType<Date, TDateDef> {
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (!(ctx.data instanceof Date)) {
      return ctx.invalidType({ expected: TParsedType.Date }).abort()
    }

    return ctx.success(ctx.data)
  }

  static create(options?: Simplify<TOptions>): TDate {
    return new TDate({ typeName: TTypeName.Date, options: { ...options } })
  }
}
