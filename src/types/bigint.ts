import { TChecks } from '../checks'
import type { TDef } from '../def'
import { TError } from '../error'
import { IssueKind, type InvalidBigIntIssue, type ToChecks } from '../issues'
import { TManifest } from '../manifest'
import type { TOptions } from '../options'
import { TParsedType, type ParseContextOf, type ParseResultOf } from '../parse'
import { TTypeName } from '../type-names'
import type { u } from '../utils'
import { TNumber, TType, type TSuperDefault } from './_internal'

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TBigInt                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TBigIntCasting = 'bigint' | 'string' | 'number'

export type TBigIntInput<Coerce extends boolean> = Coerce extends true ? bigint | string | number | boolean : bigint

export type TBigIntOutput<Cast extends TBigIntCasting> = Cast extends 'bigint'
  ? bigint
  : Cast extends 'string'
  ? `${bigint}`
  : number

export interface TBigIntDef<Coerce extends boolean, Cast extends TBigIntCasting> extends TDef {
  readonly typeName: TTypeName.BigInt
  readonly checks: ToChecks<InvalidBigIntIssue>
  readonly coerce: Coerce
  readonly cast: Cast
}

export class TBigInt<Coerce extends boolean = false, Cast extends TBigIntCasting = 'bigint'> extends TType<
  TBigIntOutput<Cast>,
  TBigIntDef<Coerce, Cast>,
  TBigIntInput<Coerce>
> {
  get _manifest() {
    return TManifest<TBigIntInput<Coerce>>()({
      type: TParsedType.BigInt,
      min: this.minValue ?? null,
      max: this.maxValue ?? null,
      multipleOf: this.multipleOf ?? null,
      coerce: this._def.coerce,
      cast: this._def.cast,
    })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (
      this._def.coerce &&
      (typeof ctx.data === 'string' || typeof ctx.data === 'number' || typeof ctx.data === 'boolean')
    ) {
      ctx.setData(BigInt(ctx.data))
    }

    if (typeof ctx.data !== 'bigint') {
      return ctx.invalidType({ expected: TParsedType.BigInt }).abort()
    }

    const { data } = ctx

    for (const check of this._def.checks) {
      if (check.check === 'min' || check.check === 'max') {
        if (!{ min: TChecks.handleMin, max: TChecks.handleMax }[check.check](data, check.expected)) {
          ctx.addIssue(
            IssueKind.InvalidBigInt,
            { check: check.check, expected: check.expected, received: data },
            check.message
          )
          if (ctx.common.abortEarly) {
            return ctx.abort()
          }
        }
      } else if (check.check === 'range') {
        if (!TChecks.handleRange(data, check.expected)) {
          ctx.addIssue(
            IssueKind.InvalidBigInt,
            { check: check.check, expected: check.expected, received: data },
            check.message
          )
          if (ctx.common.abortEarly) {
            return ctx.abort()
          }
        }
      } else if (check.check === 'multiple') {
        if (data % check.expected !== BigInt(0)) {
          ctx.addIssue(IssueKind.InvalidBigInt, { check: check.check, expected: check.expected }, check.message)
          if (ctx.common.abortEarly) {
            return ctx.abort()
          }
        }
      } else {
        TError.assertNever(check)
      }
    }

    return (
      ctx.isValid()
        ? ctx.success(
            {
              bigint: data,
              string: data.toString(),
              number: Number(data),
            }[this._def.cast]
          )
        : ctx.abort()
    ) as ParseResultOf<this>
  }

  /* ----------------------------------------------- Coercion/Casting ----------------------------------------------- */

  coerce<C extends boolean = true>(value = true as C): TBigInt<C, Cast> {
    return new TBigInt({ ...this._def, coerce: value })
  }

  cast<C extends TBigIntCasting = 'number'>(value = 'number' as C): TBigInt<Coerce, C> {
    return new TBigInt({ ...this._def, cast: value })
  }

  /* ---------------------------------------------------- Checks ---------------------------------------------------- */

  min<V extends u.Numeric>(
    value: u.Integer<V>,
    options?: { readonly inclusive?: boolean; readonly message?: string }
  ): this {
    return this._addCheck({
      check: 'min',
      expected: { value: BigInt(value), inclusive: options?.inclusive ?? true },
      message: options?.message,
    })
  }

  gt<V extends u.Numeric>(value: u.Integer<V>, options?: { readonly message?: string }): this {
    return this.min(value, { inclusive: false, message: options?.message })
  }

  gte<V extends u.Numeric>(value: u.Integer<V>, options?: { readonly message?: string }): this {
    return this.min(value, { inclusive: true, message: options?.message })
  }

  max<V extends u.Numeric>(
    value: u.Integer<V>,
    options?: { readonly inclusive?: boolean; readonly message?: string }
  ): this {
    return this._addCheck({
      check: 'max',
      expected: { value: BigInt(value), inclusive: options?.inclusive ?? true },
      message: options?.message,
    })
  }

  lt<V extends u.Numeric>(value: u.Integer<V>, options?: { readonly message?: string }): this {
    return this.max(value, { inclusive: false, message: options?.message })
  }

  lte<V extends u.Numeric>(value: u.Integer<V>, options?: { readonly message?: string }): this {
    return this.max(value, { inclusive: true, message: options?.message })
  }

  positive(options?: { readonly message?: string }): this {
    return this.min(0, { inclusive: false, message: options?.message })
  }

  nonnegative(options?: { readonly message?: string }): this {
    return this.min(0, { inclusive: true, message: options?.message })
  }

  negative(options?: { readonly message?: string }): this {
    return this.max(0, { inclusive: false, message: options?.message })
  }

  nonpositive(options?: { readonly message?: string }): this {
    return this.max(0, { inclusive: true, message: options?.message })
  }

  range<Min extends u.Numeric, Max extends u.Numeric>(
    min: u.Integer<Min>,
    max: u.Integer<Max>,
    options?: { readonly minInclusive?: boolean; readonly maxInclusive?: boolean; readonly message?: string }
  ): this {
    return this._addCheck({
      check: 'range',
      expected: {
        min: { value: BigInt(min), inclusive: options?.minInclusive ?? true },
        max: { value: BigInt(max), inclusive: options?.maxInclusive ?? true },
      },
      message: options?.message,
    })
  }

  between<Min extends u.Numeric, Max extends u.Numeric>(
    min: u.Integer<Min>,
    max: u.Integer<Max>,
    options?: { readonly minInclusive?: boolean; readonly maxInclusive?: boolean; readonly message?: string }
  ): this {
    return this.range(min, max, options)
  }

  multiple<V extends u.Numeric>(base: u.Integer<V>, options?: { readonly message?: string }): this {
    return this._addCheck({ check: 'multiple', expected: BigInt(base), message: options?.message })
  }

  step<V extends u.Numeric>(value: u.Integer<V>, options?: { readonly message?: string }): this {
    return this.multiple(value, options)
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  ensure(this: TBigInt<Coerce, 'string'>): TSuperDefault<this, ''>
  ensure(this: TBigInt<Coerce, 'number'>): TSuperDefault<this, 0>
  ensure(this: TBigInt<Coerce>): TSuperDefault<this, 0n>
  ensure(): TSuperDefault<this, '' | 0 | 0n> {
    if (this._def.cast === 'string') {
      return this.superDefault('')
    }

    if (this._def.cast === 'number') {
      return this.superDefault(0)
    }

    return this.superDefault(BigInt(0) as 0n)
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  toNumber(): TNumber<Coerce, Cast extends 'string' ? true : false> {
    let number = TNumber.create(this.options()).integer()

    for (const check of this._def.checks) {
      if (check.check === 'range') {
        number = number._addCheck({
          check: 'range',
          expected: {
            min: { value: Number(check.expected.min.value), inclusive: check.expected.min.inclusive },
            max: { value: Number(check.expected.max.value), inclusive: check.expected.max.inclusive },
          },
          message: check.message,
        })
      } else if (check.check === 'multiple') {
        number = number._addCheck({ check: 'multiple', expected: Number(check.expected), message: check.message })
      } else if (check.check === 'min' || check.check === 'max') {
        number = number._addCheck({
          check: check.check,
          expected: { value: Number(check.expected.value), inclusive: check.expected.inclusive },
          message: check.message,
        })
      } else {
        TError.assertNever(check)
      }
    }

    const { examples, ...manifest } = this.manifest()

    return number
      .coerce(this._def.coerce)
      .cast((this._def.cast === 'string') as Cast extends 'string' ? true : false)
      .manifest({ ...manifest, ...(examples && { examples: examples.map((ex) => Number(ex)) }) })
  }

  /* ---------------------------------------------------- Getters --------------------------------------------------- */

  get minValue(): bigint | undefined {
    return this._getChecks('min', 'range').reduce<bigint | undefined>((min, check) => {
      const compare = 'min' in check.expected ? check.expected.min.value : check.expected.value
      return min === undefined || compare > min ? compare : min
    }, undefined)
  }

  get maxValue(): bigint | undefined {
    return this._getChecks('max', 'range').reduce<bigint | undefined>((max, check) => {
      const compare = 'max' in check.expected ? check.expected.max.value : check.expected.value
      return max === undefined || compare < max ? compare : max
    }, undefined)
  }

  get multipleOf(): bigint | undefined {
    return this._getChecks('multiple').reduce<bigint | undefined>(
      (mult, check) => (mult ?? BigInt(1)) * check.expected,
      undefined
    )
  }

  get isPositive(): boolean | undefined {
    return this.minValue === undefined ? undefined : this.minValue > 0
  }

  get isNegative(): boolean | undefined {
    return this.maxValue === undefined ? undefined : this.maxValue < 0
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create(options?: TOptions): TBigInt {
    return new TBigInt({
      typeName: TTypeName.BigInt,
      checks: [],
      coerce: false,
      cast: 'bigint',
      options: { ...options },
    })
  }
}

export type AnyTBigInt = TBigInt<boolean, TBigIntCasting>
