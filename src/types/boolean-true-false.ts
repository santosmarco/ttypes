import type { TDef } from '../def'
import { IssueKind } from '../issues'
import { TManifest } from '../manifest'
import type { TOptions } from '../options'
import { TParsedType, type ParseContextOf, type ParseResultOf } from '../parse'
import { TTypeName } from '../type-names'
import { u } from '../utils'
import { TType, type OutputOf } from './_internal'

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TBoolean                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TBooleanCoercion =
  | boolean
  | {
      readonly truthy?: readonly [u.Primitive, ...u.Primitive[]]
      readonly falsy?: readonly [u.Primitive, ...u.Primitive[]]
    }

export type TBooleanCasting = 'boolean' | 'number' | 'string'

export type TBooleanInput<Coerce extends TBooleanCoercion> = Coerce extends true
  ? any
  : Coerce extends Record<string, unknown>
  ? Coerce['falsy'] extends ReadonlyArray<infer F>
    ? Coerce['truthy'] extends ReadonlyArray<infer T>
      ? F | T
      : F
    : Coerce['truthy'] extends ReadonlyArray<infer T>
    ? T
    : never
  : boolean

export type TBooleanOutput<Cast extends TBooleanCasting> = Cast extends 'boolean'
  ? boolean
  : Cast extends 'string'
  ? 'false' | 'true'
  : Cast extends 'number'
  ? 0 | 1
  : never

function getExpectedLiterals(coercion: Exclude<TBooleanCoercion, boolean>) {
  return [...(coercion.truthy ?? [])].concat(coercion.falsy ?? []).sort((a, b) => String(b).localeCompare(String(a)))
}

function getExpectedType(coercion: TBooleanCoercion) {
  return coercion === true
    ? TParsedType.Any
    : coercion === false
    ? TParsedType.Boolean
    : TParsedType.AnyOf(...getExpectedLiterals(coercion).map((x) => TParsedType.Literal(x)))
}

export interface TBooleanDef extends TDef {
  readonly typeName: TTypeName.Boolean
  readonly coerce: TBooleanCoercion
  readonly cast: TBooleanCasting
}

export class TBoolean<Coerce extends TBooleanCoercion = false, Cast extends TBooleanCasting = 'boolean'> extends TType<
  TBooleanOutput<Cast>,
  TBooleanDef,
  TBooleanInput<Coerce>
> {
  get _manifest() {
    const { coerce, cast } = this._def

    return TManifest<TBooleanInput<Coerce>>()({
      type: getExpectedType(coerce),
      coerce,
      cast,
      required: !(
        coerce === true ||
        (typeof coerce !== 'boolean' && u.values(coerce).some((v) => v?.includes(undefined)))
      ),
      nullable: coerce === true || (typeof coerce !== 'boolean' && u.values(coerce).some((v) => v?.includes(null))),
    })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    const { coerce, cast } = this._def

    if (coerce) {
      if (coerce === true) {
        ctx.setData(Boolean(ctx.data))
      } else {
        const expectedLiterals = getExpectedLiterals(coerce)

        if (!u.isPrimitive(ctx.data)) {
          return ctx.invalidType({ expected: getExpectedType(coerce) }).abort()
        }

        if (!expectedLiterals.includes(ctx.data)) {
          return ctx
            .addIssue(
              IssueKind.InvalidEnumValue,
              {
                expected: { values: expectedLiterals, formatted: expectedLiterals.map((x) => u.literalize(x)) },
                received: { value: ctx.data, formatted: u.literalize(ctx.data) },
              },
              this.options().messages?.invalidType
            )
            .abort()
        }

        if (coerce.truthy?.includes(ctx.data)) {
          ctx.setData(true)
        } else if (coerce.falsy?.includes(ctx.data)) {
          ctx.setData(false)
        }
      }
    }

    if (typeof ctx.data !== 'boolean') {
      return ctx.invalidType({ expected: TParsedType.Boolean }).abort()
    }

    return ctx.success({ boolean: Boolean, number: Number, string: String }[cast](ctx.data) as OutputOf<this>)
  }

  /* ----------------------------------------------- Coercion/Casting ----------------------------------------------- */

  coerce<C extends TBooleanCoercion = true>(value = true as u.Narrow<C>): TBoolean<C, Cast> {
    return new TBoolean({ ...this._def, coerce: u.widen(value) })
  }

  cast<C extends TBooleanCasting = 'number'>(value = 'number' as C): TBoolean<Coerce, C> {
    return new TBoolean({ ...this._def, cast: value })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  truthy<T extends readonly [u.Primitive, ...u.Primitive[]]>(
    ...values: T
  ): TBoolean<Coerce extends Record<string, unknown> ? u.Merge<Coerce, { truthy: T }> : { truthy: T }, Cast> {
    return new TBoolean({
      ...this._def,
      coerce: { ...(typeof this._def.coerce === 'object' ? this._def.coerce : {}), truthy: values },
    })
  }

  falsy<F extends readonly [u.Primitive, ...u.Primitive[]]>(
    ...values: F
  ): TBoolean<Coerce extends Record<string, unknown> ? u.Merge<Coerce, { falsy: F }> : { falsy: F }, Cast> {
    return new TBoolean({
      ...this._def,
      coerce: { ...(typeof this._def.coerce === 'object' ? this._def.coerce : {}), falsy: values },
    })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  true(): TTrue {
    return new TTrue({ ...this._def, typeName: TTypeName.True })
  }

  false(): TFalse {
    return new TFalse({ ...this._def, typeName: TTypeName.False })
  }

  /* ---------------------------------------------------- Getters --------------------------------------------------- */

  get truthyValues(): readonly [] | readonly [u.Primitive, ...u.Primitive[]] {
    return typeof this._def.coerce === 'object' ? this._def.coerce.truthy ?? [] : []
  }

  get falsyValues(): readonly [] | readonly [u.Primitive, ...u.Primitive[]] {
    return typeof this._def.coerce === 'object' ? this._def.coerce.falsy ?? [] : []
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create(options?: TOptions): TBoolean {
    return new TBoolean({
      typeName: TTypeName.Boolean,
      coerce: false,
      cast: 'boolean',
      options: { ...options },
    })
  }
}

export type AnyTBoolean = TBoolean<TBooleanCoercion>

/* ------------------------------------------------------ TTrue ----------------------------------------------------- */

export interface TTrueDef extends TDef {
  readonly typeName: TTypeName.True
}

export class TTrue extends TType<true, TTrueDef> {
  get _manifest() {
    return TManifest<true>()({
      type: TParsedType.True,
      literal: u.literalize(true),
    })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return ctx.data === true
      ? ctx.success(ctx.data)
      : ctx.data === false
      ? ctx
          .addIssue(
            IssueKind.InvalidLiteral,
            {
              expected: { value: true, formatted: u.literalize(true) },
              received: { value: false, formatted: u.literalize(false) },
            },
            this.options().messages?.invalidType
          )
          .abort()
      : ctx.invalidType({ expected: TParsedType.True }).abort()
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  invert(): TFalse {
    return new TFalse({ ...this._def, typeName: TTypeName.False })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create(options?: TOptions): TTrue {
    return new TTrue({ typeName: TTypeName.True, options: { ...options } })
  }
}

/* ----------------------------------------------------- TFalse ----------------------------------------------------- */

export interface TFalseDef extends TDef {
  readonly typeName: TTypeName.False
}

export class TFalse extends TType<false, TFalseDef> {
  get _manifest() {
    return TManifest<false>()({
      type: TParsedType.False,
      literal: u.literalize(false),
    })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return ctx.data === false
      ? ctx.success(ctx.data)
      : ctx.data === true
      ? ctx
          .addIssue(
            IssueKind.InvalidLiteral,
            {
              expected: { value: false, formatted: u.literalize(false) },
              received: { value: true, formatted: u.literalize(true) },
            },
            this.options().messages?.invalidType
          )
          .abort()
      : ctx.invalidType({ expected: TParsedType.False }).abort()
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  invert(): TTrue {
    return new TTrue({ ...this._def, typeName: TTypeName.True })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create(options?: TOptions): TFalse {
    return new TFalse({ typeName: TTypeName.False, options: { ...options } })
  }
}
