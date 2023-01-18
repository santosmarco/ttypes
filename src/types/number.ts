import { TChecks } from '../checks'
import type { TDef } from '../def'
import { TError } from '../error'
import { IssueKind, type InvalidNumberIssue, type ToChecks } from '../issues'
import { TManifest } from '../manifest'
import type { TOptions } from '../options'
import { TParsedType, type ParseContextOf, type ParseResultOf } from '../parse'
import { TTypeName } from '../type-names'
import { u } from '../utils'
import { TBigInt, TType, type OutputOf, type TSuperDefault } from './_internal'

/* ----------------------------------------------------------------------------------------------------------------- - */
/*                                                       TNumber                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TNumberInput<Coerce extends boolean> = Coerce extends true ? any : number

export type TNumberOutput<Cast extends boolean> = Cast extends true ? `${number}` : number

export interface TNumberDef<Coerce extends boolean, Cast extends boolean> extends TDef {
  readonly typeName: TTypeName.Number
  readonly checks: ToChecks<InvalidNumberIssue>
  readonly coerce: Coerce
  readonly cast: Cast
}

export class TNumber<Coerce extends boolean = false, Cast extends boolean = false> extends TType<
  TNumberOutput<Cast>,
  TNumberDef<Coerce, Cast>,
  TNumberInput<Coerce>
> {
  get _manifest() {
    return TManifest<TNumberInput<Coerce>>()({
      type: this.isInteger ? TParsedType.Integer : TParsedType.Number,
      min: this.minValue ?? null,
      max: this.maxValue ?? null,
      multipleOf: this.multipleOf ?? null,
      coerce: this._def.coerce,
      cast: this._def.cast,
      required: u.invert(this._def.coerce),
      nullable: this._def.coerce,
    })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (this._def.coerce) {
      ctx.setData(Number(ctx.data))
    }

    if (typeof ctx.data !== 'number' || Number.isNaN(ctx.data)) {
      return ctx.invalidType({ expected: TParsedType.Number }).abort()
    }

    const { data } = ctx

    const safeCheck = u.last(this._getChecks('safe'))
    const finiteCheck = u.last(this._getChecks('finite'))

    if (safeCheck?.enabled && (data < Number.MIN_SAFE_INTEGER || data > Number.MAX_SAFE_INTEGER)) {
      ctx.addIssue(IssueKind.InvalidNumber, { check: 'safe', enabled: true }, safeCheck.message)
      if (ctx.common.abortEarly) {
        return ctx.abort()
      }
    }

    if (finiteCheck?.enabled && !Number.isFinite(data)) {
      ctx.addIssue(IssueKind.InvalidNumber, { check: 'finite', enabled: true }, finiteCheck.message)
      if (ctx.common.abortEarly) {
        return ctx.abort()
      }
    }

    for (const check of this._def.checks.filter(
      (c): c is Exclude<typeof c, { readonly check: 'safe' | 'finite' }> => !['safe', 'finite'].includes(c.check)
    )) {
      if (check.check === 'min' || check.check === 'max') {
        if (!{ min: TChecks.handleMin, max: TChecks.handleMax }[check.check](data, check.expected)) {
          ctx.addIssue(
            IssueKind.InvalidNumber,
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
            IssueKind.InvalidNumber,
            { check: check.check, expected: check.expected, received: data },
            check.message
          )
          if (ctx.common.abortEarly) {
            return ctx.abort()
          }
        }
      } else if (check.check === 'integer') {
        if (!Number.isInteger(data)) {
          ctx.addIssue(IssueKind.InvalidNumber, { check: check.check }, check.message)
          if (ctx.common.abortEarly) {
            return ctx.abort()
          }
        }
      } else if (check.check === 'precision') {
        const precision = 10 ** check.expected.value // This is conceptually equivalent to using `.toFixed()` but much faster
        if (check.convert) {
          ctx.setData(Math.round(data * precision))
        } else {
          const { valid, decimals } = TNumber._internals.validatePrecision(data, check.expected)
          if (!valid) {
            ctx.addIssue(
              IssueKind.InvalidNumber,
              { check: check.check, expected: check.expected, convert: check.convert, received: decimals },
              check.message
            )
            if (ctx.common.abortEarly) {
              return ctx.abort()
            }
          }
        }
      } else if (check.check === 'multiple') {
        if (TNumber._internals.floatSafeRemainder(data, check.expected) !== 0) {
          ctx.addIssue(IssueKind.InvalidNumber, { check: check.check, expected: check.expected }, check.message)
          if (ctx.common.abortEarly) {
            return ctx.abort()
          }
        }
      } else if (check.check === 'port') {
        if (data < 0 || data > 65535) {
          ctx.addIssue(IssueKind.InvalidNumber, { check: check.check }, check.message)
          if (ctx.common.abortEarly) {
            return ctx.abort()
          }
        }
      } else {
        TError.assertNever(check)
      }
    }

    return ctx.isValid() ? ctx.success((this._def.cast ? data.toString() : data) as OutputOf<this>) : ctx.abort()
  }

  /* ----------------------------------------------- Coercion/Casting ----------------------------------------------- */

  coerce<C extends boolean = true>(value = true as C): TNumber<C, Cast> {
    return new TNumber({ ...this._def, coerce: value })
  }

  cast<C extends boolean = true>(value = true as C): TNumber<Coerce, C> {
    return new TNumber({ ...this._def, cast: value })
  }

  /* ---------------------------------------------------- Checks ---------------------------------------------------- */

  integer(options?: { readonly message?: string }): this {
    return this._addCheck({ check: 'integer', message: options?.message })
  }

  int(options?: { readonly message?: string }): this {
    return this.integer(options)
  }

  precision<V extends number>(
    limit: u.NonNegativeInteger<V>,
    options?: { readonly inclusive?: boolean; readonly convert?: boolean; readonly message?: string }
  ): this {
    return this._addCheck({
      check: 'precision',
      expected: { value: limit, inclusive: options?.inclusive ?? true },
      convert: options?.convert ?? false,
      message: options?.message,
    })
  }

  min(value: number, options?: { readonly inclusive?: boolean; readonly message?: string }): this {
    return this._addCheck({
      check: 'min',
      expected: { value, inclusive: options?.inclusive ?? true },
      message: options?.message,
    })
  }

  gt(value: number, options?: { readonly message?: string }): this {
    return this.min(value, { inclusive: false, message: options?.message })
  }

  gte(value: number, options?: { readonly message?: string }): this {
    return this.min(value, { inclusive: true, message: options?.message })
  }

  max(value: number, options?: { readonly inclusive?: boolean; readonly message?: string }): this {
    return this._addCheck({
      check: 'max',
      expected: { value, inclusive: options?.inclusive ?? true },
      message: options?.message,
    })
  }

  lt(value: number, options?: { readonly message?: string }): this {
    return this.max(value, { inclusive: false, message: options?.message })
  }

  lte(value: number, options?: { readonly message?: string }): this {
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

  range(
    min: number,
    max: number,
    options?: { readonly minInclusive?: boolean; readonly maxInclusive?: boolean; readonly message?: string }
  ): this {
    return this._addCheck({
      check: 'range',
      expected: {
        min: { value: min, inclusive: options?.minInclusive ?? true },
        max: { value: max, inclusive: options?.maxInclusive ?? true },
      },
      message: options?.message,
    })
  }

  between(
    min: number,
    max: number,
    options?: { readonly minInclusive?: boolean; readonly maxInclusive?: boolean; readonly message?: string }
  ): this {
    return this.range(min, max, options)
  }

  port(options?: { readonly message?: string }): this {
    return this._addCheck({ check: 'port', message: options?.message })
  }

  multiple(base: number, options?: { readonly message?: string }): this {
    return this._addCheck({ check: 'multiple', expected: base, message: options?.message })
  }

  step(value: number, options?: { readonly message?: string }): this {
    return this.multiple(value, options)
  }

  safe(enabled = true, options?: { readonly message?: string }): this {
    return this._addCheck({ check: 'safe', enabled, message: options?.message })
  }

  unsafe(options?: { readonly message?: string }): this {
    return this.safe(false, options)
  }

  finite(enabled = true, options?: { readonly message?: string }): this {
    return this._addCheck({ check: 'finite', enabled, message: options?.message })
  }

  infinite(options?: { readonly message?: string }): this {
    return this.finite(false, options)
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  ensure(this: TNumber<Coerce, true>): TSuperDefault<this, ''>
  ensure(this: TNumber<Coerce>): TSuperDefault<this, 0>
  ensure(): TSuperDefault<this, ''> | TSuperDefault<this, 0> {
    if (this._def.cast) {
      return this.superDefault('')
    }

    return this.superDefault(0)
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  toBigInt(): TBigInt<Coerce, Cast extends true ? 'string' : 'bigint'> {
    let bigint = TBigInt.create(this.options())

    for (const check of this._def.checks) {
      if (check.check === 'range') {
        bigint = bigint._addCheck({
          check: 'range',
          expected: {
            min: { value: BigInt(check.expected.min.value), inclusive: check.expected.min.inclusive },
            max: { value: BigInt(check.expected.max.value), inclusive: check.expected.max.inclusive },
          },
          message: check.message,
        })
      } else if (check.check === 'multiple') {
        bigint = bigint._addCheck({ check: 'multiple', expected: BigInt(check.expected), message: check.message })
      } else if (check.check === 'min' || check.check === 'max') {
        bigint = bigint._addCheck({
          check: check.check,
          expected: { value: BigInt(check.expected.value), inclusive: check.expected.inclusive },
          message: check.message,
        })
      }
    }

    const { examples, ...manifest } = this.manifest()

    return bigint
      .coerce(this._def.coerce)
      .cast((this._def.cast ? 'string' : 'bigint') as Cast extends true ? 'string' : 'bigint')
      .manifest({ ...manifest, ...(examples && { examples: examples.map((ex) => BigInt(ex)) }) })
  }

  /* ---------------------------------------------------- Getters --------------------------------------------------- */

  get isInteger(): boolean {
    return this._hasCheck('integer')
  }

  get minValue(): number | undefined {
    return this._getChecks('min', 'range').reduce<number | undefined>((min, check) => {
      const compare = 'min' in check.expected ? check.expected.min.value : check.expected.value
      return min === undefined || compare > min ? compare : min
    }, undefined)
  }

  get maxValue(): number | undefined {
    return this._getChecks('max', 'range').reduce<number | undefined>((max, check) => {
      const compare = 'max' in check.expected ? check.expected.max.value : check.expected.value
      return max === undefined || compare < max ? compare : max
    }, undefined)
  }

  get multipleOf(): number | undefined {
    return this._getChecks('multiple').reduce<number | undefined>(
      (mult, check) => (mult ?? 1) * check.expected,
      undefined
    )
  }

  get isPositive(): boolean | undefined {
    return this.minValue === undefined ? undefined : this.minValue > 0
  }

  get isNegative(): boolean | undefined {
    return this.maxValue === undefined ? undefined : this.maxValue < 0
  }

  get isPort(): boolean {
    return this._hasCheck('port')
  }

  get isSafe(): boolean {
    return this._hasCheck('safe')
  }

  get isFinite(): boolean {
    return this._hasCheck('finite')
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create(options?: TOptions): TNumber {
    return new TNumber({ typeName: TTypeName.Number, checks: [], coerce: false, cast: false, options: { ...options } })
      .safe()
      .finite()
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static readonly _internals = {
    rx: { precision: /(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/ },

    floatSafeRemainder(value: number, step: number): number {
      const valDecCount = (value.toString().split('.')[1] || '').length
      const stepDecCount = (step.toString().split('.')[1] || '').length
      const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount
      const valInt = parseInt(value.toFixed(decCount).replace('.', ''), 10)
      const stepInt = parseInt(step.toFixed(decCount).replace('.', ''), 10)
      return (valInt % stepInt) / 10 ** decCount
    },

    validatePrecision(
      data: number,
      expected: { readonly value: number; readonly inclusive: boolean }
    ): { readonly valid: boolean; readonly decimals: number } {
      const places = [...(this.rx.precision.exec(data.toString()) ?? [])]
      const decimals = Math.max((places[1] ? places[1].length : 0) - (places[2] ? parseInt(places[2], 10) : 0), 0)
      return { valid: expected.inclusive ? decimals <= expected.value : decimals < expected.value, decimals }
    },
  } as const
}

export type AnyTNumber = TNumber<boolean>
