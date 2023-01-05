import {
  TChecks,
  TParsedType,
  TType,
  TTypeName,
  type LooseStripKey,
  type ParseContextOf,
  type ParseResultOf,
  type Simplify,
  type TDef,
  type TInvalidNumberIssue,
  type TOptions,
} from '../_internal'

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TNumber                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TNumberInput<C extends boolean> = C extends true ? any : number

export interface TNumberDef<C extends boolean> extends TDef {
  readonly typeName: TTypeName.Number
  readonly checks: ReadonlyArray<
    LooseStripKey<TInvalidNumberIssue['payload'], 'received'> & { readonly message: string | undefined }
  >
  readonly coerce: C
}

export class TNumber<C extends boolean = boolean> extends TType<number, TNumberDef<C>, TNumberInput<C>> {
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (typeof ctx.data !== 'number' || Number.isNaN(ctx.data)) {
      return ctx.invalidType({ expected: TParsedType.Number }).abort()
    }

    return ctx.success(ctx.data)
  }

  /* --------------------------------------------------- Coercion --------------------------------------------------- */

  coerce<V extends boolean = true>(value = true as V): TNumber<V> {
    return new TNumber({ ...this._def, coerce: value })
  }

  /* ---------------------------------------------------- Checks ---------------------------------------------------- */

  min(value: number, options?: { readonly inclusive?: boolean; readonly message?: string }): this {
    return this._checks.add({
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
    return this._checks.add({
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

  integer(options?: { readonly message?: string }): this {
    return this._checks.add({ check: 'integer', message: options?.message })
  }

  int(options?: { readonly message?: string }): this {
    return this.integer(options)
  }

  positive(options?: { readonly message?: string }): this {
    return this._checks.add({ check: 'positive', message: options?.message })
  }

  nonpositive(options?: { readonly message?: string }): this {
    return this._checks.add({ check: 'nonpositive', message: options?.message })
  }

  negative(options?: { readonly message?: string }): this {
    return this._checks.add({ check: 'negative', message: options?.message })
  }

  nonnegative(options?: { readonly message?: string }): this {
    return this._checks.add({ check: 'nonnegative', message: options?.message })
  }

  finite(options?: { readonly message?: string }): this {
    return this._checks.add({ check: 'finite', message: options?.message })
  }

  unsafe(options?: { readonly message?: string }): this {
    return this._checks.add({ check: 'unsafe', message: options?.message })
  }

  multipleOf(value: number, options?: { readonly message?: string }): this {
    return this._checks.add({ check: 'multipleOf', expected: value, message: options?.message })
  }

  step(value: number, options?: { readonly message?: string }): this {
    return this.multipleOf(value, options)
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  private readonly _checks = TChecks.of(this)

  static create(options?: Simplify<TOptions>): TNumber<false> {
    return new TNumber({ typeName: TTypeName.Number, checks: [], coerce: false, options: { ...options } })
  }
}
