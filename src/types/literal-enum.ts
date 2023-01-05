import {
  TIssueKind,
  TParsedType,
  TType,
  TTypeName,
  type ParseContextOf,
  type ParseResultOf,
  type Primitive,
  type Simplify,
  type TDef,
  type TOptions,
} from '../_internal'

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TLiteral                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TLiteralOptions = TOptions<{
  additionalIssueKind: TIssueKind.InvalidLiteral
}>

export interface TLiteralDef<T extends Primitive> extends TDef {
  readonly typeName: TTypeName.Literal
  readonly options: TLiteralOptions
  readonly value: T
}

export const getLiteralParsedType = (value: Primitive): TParsedType => {
  if (value === null) {
    return TParsedType.Null
  }

  switch (typeof value) {
    case 'string':
      return TParsedType.String
    case 'number':
      return TParsedType.Number
    case 'bigint':
      return TParsedType.BigInt
    case 'boolean':
      return TParsedType.Boolean
    case 'symbol':
      return TParsedType.Symbol
    case 'undefined':
      return TParsedType.Undefined

    default:
      return TParsedType.Unknown
  }
}

export class TLiteral<T extends Primitive> extends TType<T, TLiteralDef<T>> {
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    const { value } = this._def

    const expectedParsedType = getLiteralParsedType(value)

    if (ctx.parsedType !== expectedParsedType) {
      return ctx.invalidType({ expected: expectedParsedType }).abort()
    }

    if (ctx.data !== value) {
      return ctx
        .addIssue(
          { kind: TIssueKind.InvalidLiteral, payload: { expected: value, received: ctx.data as Primitive } },
          this._def.options.messages?.invalidLiteral
        )
        .abort()
    }

    return ctx.success(ctx.data as T)
  }

  get value(): T {
    return this._def.value
  }

  static create<T extends Primitive>(value: T, options?: Simplify<TLiteralOptions>): TLiteral<T> {
    return new TLiteral({
      typeName: TTypeName.Literal,
      value,
      options: { ...options },
      isOptional: value === undefined,
      isNullable: value === null,
    })
  }
}

export type AnyTLiteral = TLiteral<Primitive>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TEnum                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TEnumValues = readonly [string | number, ...Array<string | number>]

type UnionToIntersectionFn<T> = (T extends unknown ? (x: () => T) => void : never) extends (
  i: infer Intersection
) => void
  ? Intersection
  : never

type GetUnionLast<T> = UnionToIntersectionFn<T> extends () => infer Last ? Last : never

type UnionToTuple<T, _Acc extends readonly unknown[] = []> = [T] extends [never]
  ? _Acc
  : UnionToTuple<Exclude<T, GetUnionLast<T>>, [GetUnionLast<T>, ..._Acc]>

type ToEnumValues<T> = T extends TEnumValues ? T : never

export type UnionToEnumValues<T> = ToEnumValues<UnionToTuple<T>>

export type TEnumOptions = TOptions<{
  additionalIssueKind: TIssueKind.InvalidEnumValue
}>

export interface TEnumDef<T extends TEnumValues> extends TDef {
  readonly typeName: TTypeName.Enum
  readonly options: TEnumOptions
  readonly values: T
}

export class TEnum<T extends TEnumValues> extends TType<T[number], TEnumDef<T>> {
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (typeof ctx.data !== 'string') {
      return ctx.invalidType({ expected: TParsedType.String }).abort()
    }

    const { values } = this._def

    if (!values.includes(ctx.data)) {
      return ctx
        .addIssue(
          { kind: TIssueKind.InvalidEnumValue, payload: { expected: values, received: ctx.data } },
          this._def.options.messages?.invalidEnumValue
        )
        .abort()
    }

    return ctx.success(ctx.data)
  }

  get values(): Readonly<T> {
    return this._def.values
  }

  get enum(): { readonly [K in T[number]]: K } {
    return this.values.reduce((acc, value) => ({ ...acc, [value]: value }), {} as { readonly [K in T[number]]: K })
  }

  static create<T extends string | number, U extends readonly [T, ...T[]]>(
    values: U,
    options?: Simplify<TEnumOptions>
  ): TEnum<U> {
    return new TEnum({ typeName: TTypeName.Enum, values, options: { ...options } })
  }
}

export type AnyTEnum = TEnum<readonly [string | number, ...Array<string | number>]>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                     TNativeEnum                                                    */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface EnumLike {
  readonly [x: string]: string | number
  readonly [x: number]: string
}

export const getValidEnum = (enum_: EnumLike): Readonly<Record<string, string | number>> =>
  Object.fromEntries(
    Object.keys(enum_)
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      .filter((k) => typeof enum_[enum_[k]!] !== 'number')
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      .map((k) => [k, enum_[k]!])
  )

export interface TNativeEnumDef<T extends EnumLike> extends TDef {
  readonly typeName: TTypeName.NativeEnum
  readonly options: TEnumOptions
  readonly enum: T
}

export class TNativeEnum<T extends EnumLike> extends TType<T[keyof T], TNativeEnumDef<T>> {
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return ctx.abort()
  }

  get enum(): T {
    return getValidEnum(this._def.enum) as T
  }

  get values(): Readonly<UnionToEnumValues<T[keyof T]>> {
    return Object.values(this.enum) as UnionToEnumValues<T[keyof T]>
  }

  static create<T extends EnumLike>(enum_: T, options?: Simplify<TEnumOptions>): TNativeEnum<T> {
    return new TNativeEnum({ typeName: TTypeName.NativeEnum, enum: enum_, options: { ...options } })
  }
}

export type AnyTNativeEnum = TNativeEnum<EnumLike>
