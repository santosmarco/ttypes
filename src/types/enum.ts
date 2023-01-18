import type { TDef } from '../def'
import { IssueKind } from '../issues'
import { TManifest } from '../manifest'
import type { MakeTOptions } from '../options'
import { TParsedType, type ParseContextOf, type ParseResultOf } from '../parse'
import { TTypeName } from '../type-names'
import { u } from '../utils'
import { TType } from './_internal'

/* ----------------------------------------------------------------------------------------------------------------- - */
/*                                                        TEnum                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TEnumOptions = MakeTOptions<{
  additionalIssueKind: IssueKind.InvalidEnumValue
}>

export interface TEnumDef<T extends ReadonlyArray<string | number>> extends TDef {
  readonly typeName: TTypeName.Enum
  readonly options: TEnumOptions
  readonly values: T
}

export class TEnum<T extends ReadonlyArray<string | number>> extends TType<T[number], TEnumDef<T>> {
  get _manifest() {
    return TManifest<T[number]>()({
      type: TParsedType.Enum(this.values),
      enum: this.values,
    })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    const { values } = this._def
    const { data } = ctx

    const expectedParsedTypes = [...new Set(values.map(TParsedType.Literal))]

    if (
      !((data: unknown): data is string | number =>
        (expectedParsedTypes.includes(TParsedType.String) && typeof data === 'string') ||
        (expectedParsedTypes.includes(TParsedType.Number) && typeof data === 'number'))(data)
    ) {
      return ctx.invalidType({ expected: TParsedType.Enum(this.values) }).abort()
    }

    if (!u.includes(values, data)) {
      return ctx
        .addIssue(
          IssueKind.InvalidEnumValue,
          {
            expected: { values, formatted: values.map(u.literalize) },
            received: { value: data, formatted: u.literalize(data) },
          },
          this._def.options.messages?.invalidEnumValue
        )
        .abort()
    }

    return ctx.success(data)
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  get values(): Readonly<T> {
    return this._def.values
  }

  get enum(): { readonly [K in T[number]]: K } {
    return this.values.reduce((acc, value) => ({ ...acc, [value]: value }), {} as { readonly [K in T[number]]: K })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  extract<K extends readonly [T[number], ...Array<T[number]>]>(
    keys: K
  ): TEnum<u.Filter<T, Exclude<T[number], K[number]>>> {
    return new TEnum({
      ...this._def,
      values: this.values.filter((value): value is K[number] => u.includes(keys, value)) as u.Filter<
        T,
        Exclude<T[number], K[number]>
      >,
    })
  }

  exclude<K extends readonly [T[number], ...Array<T[number]>]>(keys: K): TEnum<u.Filter<T, K[number]>> {
    return new TEnum({
      ...this._def,
      values: this.values.filter(
        (value): value is Exclude<T[number], K[number]> => !u.includes(keys, value)
      ) as u.Filter<T, K[number]>,
    })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create<T extends string | number, U extends readonly [T, ...T[]]>(
    values: U,
    options?: TEnumOptions
  ): TEnum<U> {
    return this._create(values, options)
  }

  static _create<T extends string | number, U extends readonly T[]>(values: U, options?: TEnumOptions): TEnum<U> {
    return new TEnum({ typeName: TTypeName.Enum, values, options: { ...options } })
  }
}

export type AnyTEnum = TEnum<Array<string | number>>
