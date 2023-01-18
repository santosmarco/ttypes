import { TChecks } from '../checks'
import type { TDef } from '../def'
import { IssueKind, type InvalidDateIssue, type ToChecks } from '../issues'
import { TManifest } from '../manifest'
import type { TOptions } from '../options'
import { TParsedType, type ParseContextOf, type ParseResultOf } from '../parse'
import { TTypeName } from '../type-names'
import { type u } from '../utils'
import { TType } from './_internal'

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TDate                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TDateCasting = 'date' | 'number' | 'iso' | 'utc'

export type TDateCheckInput = Date | number | u.LiteralUnion<'now', string>

export type TDateInput<Coerce extends boolean> = Coerce extends true ? Date | string | number : Date

export type TDateOutput<Cast extends TDateCasting> = Cast extends 'number'
  ? number
  : Cast extends 'iso' | 'utc'
  ? string
  : Date

export const handleTDateCheckInput = (value: Date | 'now', currentDate: Date): Date =>
  value === 'now' ? currentDate : value

export interface TDateDef<Coerce extends boolean, Cast extends TDateCasting> extends TDef {
  readonly typeName: TTypeName.Date
  readonly checks: ToChecks<InvalidDateIssue>
  readonly coerce: Coerce
  readonly cast: Cast
}

export class TDate<Coerce extends boolean = false, Cast extends TDateCasting = 'date'> extends TType<
  TDateOutput<Cast>,
  TDateDef<Coerce, Cast>,
  TDateInput<Coerce>
> {
  get _manifest() {
    return TManifest<TDateInput<Coerce>>()({
      type: TParsedType.Date,
      min: this.minDate ?? null,
      max: this.maxDate ?? null,
      coerce: this._def.coerce,
      cast: this._def.cast,
    })
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (this._def.coerce && (typeof ctx.data === 'string' || typeof ctx.data === 'number')) {
      ctx.setData(new Date(ctx.data))
    }

    if (!(ctx.data instanceof Date)) {
      return ctx.invalidType({ expected: TParsedType.Date }).abort()
    }

    const { data } = ctx

    const currentDate = new Date()

    for (const check of this._def.checks) {
      if (check.check === 'min' || check.check === 'max') {
        if (
          !{ min: TChecks.handleMin, max: TChecks.handleMax }[check.check](data, {
            value: handleTDateCheckInput(check.expected.value, currentDate),
            inclusive: check.expected.inclusive,
          })
        ) {
          ctx.addIssue(
            IssueKind.InvalidDate,
            { check: check.check, expected: check.expected, received: data },
            check.message
          )
          if (ctx.common.abortEarly) {
            return ctx.abort()
          }
        }
      } else if (check.check === 'range') {
        if (
          !TChecks.handleRange(data, {
            min: {
              value: handleTDateCheckInput(check.expected.min.value, currentDate),
              inclusive: check.expected.min.inclusive,
            },
            max: {
              value: handleTDateCheckInput(check.expected.max.value, currentDate),
              inclusive: check.expected.max.inclusive,
            },
          })
        ) {
          ctx.addIssue(
            IssueKind.InvalidDate,
            { check: check.check, expected: check.expected, received: data },
            check.message
          )
          if (ctx.common.abortEarly) {
            return ctx.abort()
          }
        }
      }
    }

    return (
      ctx.isValid()
        ? ctx.success(
            {
              date: data,
              number: data.getTime(),
              iso: data.toISOString(),
              utc: data.toUTCString(),
            }[this._def.cast]
          )
        : ctx.abort()
    ) as ParseResultOf<this>
  }

  /* --------------------------------------------------- Coercion --------------------------------------------------- */

  coerce<C extends boolean = true>(value = true as C): TDate<C, Cast> {
    return new TDate({ ...this._def, coerce: value })
  }

  cast<C extends TDateCasting = 'number'>(value = 'number' as C): TDate<Coerce, C> {
    return new TDate({ ...this._def, cast: value })
  }

  /* ---------------------------------------------------- Checks ---------------------------------------------------- */

  min(value: TDateCheckInput, options?: { readonly inclusive?: boolean; readonly message?: string }): this {
    return this._addCheck({
      check: 'min',
      expected: { value: value === 'now' ? 'now' : new Date(value), inclusive: options?.inclusive ?? true },
      message: options?.message,
    })
  }

  after(value: TDateCheckInput, options?: { readonly message?: string }): this {
    return this.min(value, { inclusive: false, message: options?.message })
  }

  sameOrAfter(value: TDateCheckInput, options?: { readonly message?: string }): this {
    return this.min(value, { inclusive: true, message: options?.message })
  }

  future(options?: { readonly message?: string }): this {
    return this.min('now', { inclusive: false, message: options?.message })
  }

  max(value: TDateCheckInput, options?: { readonly inclusive?: boolean; readonly message?: string }): this {
    return this._addCheck({
      check: 'max',
      expected: { value: value === 'now' ? 'now' : new Date(value), inclusive: options?.inclusive ?? true },
      message: options?.message,
    })
  }

  before(value: TDateCheckInput, options?: { readonly message?: string }): this {
    return this.max(value, { inclusive: false, message: options?.message })
  }

  sameOrBefore(value: TDateCheckInput, options?: { readonly message?: string }): this {
    return this.max(value, { inclusive: true, message: options?.message })
  }

  past(options?: { readonly message?: string }): this {
    return this.max('now', { inclusive: false, message: options?.message })
  }

  range(
    min: TDateCheckInput,
    max: TDateCheckInput,
    options?: { readonly minInclusive?: boolean; readonly maxInclusive?: boolean; readonly message?: string }
  ): this {
    return this._addCheck({
      check: 'range',
      expected: {
        min: { value: min === 'now' ? 'now' : new Date(min), inclusive: options?.minInclusive ?? true },
        max: { value: max === 'now' ? 'now' : new Date(max), inclusive: options?.maxInclusive ?? true },
      },
      message: options?.message,
    })
  }

  between(
    min: TDateCheckInput,
    max: TDateCheckInput,
    options?: { readonly minInclusive?: boolean; readonly maxInclusive?: boolean; readonly message?: string }
  ): this {
    return this.range(min, max, options)
  }

  /* ---------------------------------------------------- Getters --------------------------------------------------- */

  get minDate(): Date | 'now' | undefined {
    return this._getChecks('min', 'range').reduce<Date | 'now' | undefined>((min, check) => {
      const compare = 'min' in check.expected ? check.expected.min.value : check.expected.value
      return compare === 'now'
        ? !min || min === 'now' || new Date() > min
          ? 'now'
          : min
        : min === undefined || compare > min
        ? compare
        : min
    }, undefined)
  }

  get maxDate(): Date | 'now' | undefined {
    return this._getChecks('max', 'range').reduce<Date | 'now' | undefined>((max, check) => {
      const compare = 'max' in check.expected ? check.expected.max.value : check.expected.value
      return compare === 'now'
        ? !max || max === 'now' || new Date() < max
          ? 'now'
          : max
        : max === undefined || compare < max
        ? compare
        : max
    }, undefined)
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create(options?: TOptions): TDate {
    return new TDate({
      typeName: TTypeName.Date,
      checks: [],
      coerce: false,
      cast: 'date',
      options: { ...options },
    })
  }
}

export type AnyTDate = TDate<boolean, TDateCasting>
