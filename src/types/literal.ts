import type { TDef } from '../def'
import { IssueKind, type EIssueKind } from '../error'
import { manifest } from '../manifest'
import type { ExtendedTOptions } from '../options'
import { TParsedType, type ParseContextOf, type ParseResultOf } from '../parse'
import { TTypeName } from '../type-names'
import { u } from '../utils'
import { TType } from './_internal'

/* ----------------------------------------------------------------------------------------------------------------- - */
/*                                                      TLiteral                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TLiteralOptions = ExtendedTOptions<{
  additionalIssueKind: EIssueKind['InvalidLiteral']
}>

export interface TLiteralDef<T extends u.Primitive> extends TDef {
  readonly typeName: TTypeName.Literal
  readonly options: TLiteralOptions
  readonly value: T
}

export class TLiteral<T extends u.Primitive> extends TType<T, TLiteralDef<T>> {
  get _manifest() {
    return manifest<T>()({
      type: TParsedType.Literal(this.value),
      literal: u.literalize(this.value) as u.Narrow<u.Literalized<T>>,
      required: (this.value !== undefined) as u.Narrow<T extends undefined ? false : true>,
      nullable: (this.value === null) as u.Narrow<T extends null ? true : false>,
    })
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    const { value } = this._def
    const { data } = ctx

    const expectedParsedType = TParsedType.Literal(value)

    if (ctx.parsedType !== expectedParsedType) {
      return ctx.invalidType({ expected: expectedParsedType }).abort()
    }

    if (data !== value) {
      return ctx
        .addIssue(
          IssueKind.InvalidLiteral,
          {
            expected: { value, formatted: u.literalize(value) },
            received: { value: data as u.Primitive, formatted: u.literalize(data as u.Primitive) },
          },
          this._def.options.messages?.invalidLiteral
        )
        .abort()
    }

    return ctx.success(data as T)
  }

  get value(): T {
    return this._def.value
  }

  static create<T extends u.Primitive>(value: T, options?: TLiteralOptions): TLiteral<T>
  static create<T extends u.Primitive>(value: T, options?: TLiteralOptions): TLiteral<T> {
    // if (typeof value === 'number') {
    //   return new TNumericLiteral({ typeName: TTypeName.Literal, value, options: { ...options } })
    // }

    // if (typeof value === 'string') {
    //   return new TStringLiteral({ typeName: TTypeName.Literal, value, options: { ...options } })
    // }

    return new TLiteral({ typeName: TTypeName.Literal, value, options: { ...options } })
  }
}

export type AnyTLiteral = TLiteral<u.Primitive>
