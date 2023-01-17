import type { TDef } from '../def'
import { IssueKind } from '../error'
import { TManifest } from '../manifest'
import type { TOptions } from '../options'
import { TParsedType, type ParseContextOf, type ParseResultOf } from '../parse'
import { TTypeName } from '../type-names'
import { u } from '../utils'
import { TType, type InputOf, type OutputOf } from './_internal'

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TBoolean                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TBooleanCoercion =
  | boolean
  | { readonly truthy?: readonly u.Primitive[]; readonly falsy?: readonly u.Primitive[] }

export type TBooleanCasting = 'boolean' | 'string' | 'number'

export type TBooleanInput<Coerce extends TBooleanCoercion> = Coerce extends true
  ? any
  : Coerce extends Record<string, unknown>
  ? Coerce['falsy'] extends ReadonlyArray<infer F>
    ? F | (Coerce['truthy'] extends ReadonlyArray<infer T> ? T : never)
    : Coerce['truthy'] extends ReadonlyArray<infer T>
    ? T
    : never
  : boolean

export type TBooleanOutput<Cast extends TBooleanCasting> = Cast extends 'boolean'
  ? boolean
  : Cast extends 'string'
  ? 'true' | 'false'
  : Cast extends 'number'
  ? 0 | 1
  : never

export interface TBooleanManifest<Coerce extends TBooleanCoercion>
  extends u.Except<TManifest.Base<TBooleanInput<Coerce>>, 'required' | 'nullable'> {
  readonly coerce: TBooleanCoercion
  readonly cast: TBooleanCasting
  readonly required: Coerce extends true
    ? false
    : Coerce extends Record<string, unknown>
    ? undefined extends Coerce['truthy' | 'falsy']
      ? false
      : true
    : true
  readonly nullable: Coerce extends true
    ? true
    : Coerce extends Record<string, unknown>
    ? null extends Coerce['truthy' | 'falsy']
      ? true
      : false
    : false
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
  get _manifest(): TBooleanManifest<Coerce> {
    const { coerce } = this._def

    return TManifest.type<InputOf<this>>(TParsedType.Boolean)
      .setProp('coerce', coerce)
      .setProp('cast', this._def.cast)
      .required(
        !(
          coerce === true ||
          (typeof coerce !== 'boolean' && u.values(coerce).some((v) => v?.includes(undefined)))
        ) as TBooleanManifest<Coerce>['required']
      )
      .nullable(
        (coerce === true ||
          (typeof coerce !== 'boolean' &&
            u.values(coerce).some((v) => v?.includes(null)))) as TBooleanManifest<Coerce>['nullable']
      ).value
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    const { coerce, cast } = this._def

    if (coerce) {
      if (coerce === true) {
        ctx.setData(Boolean(ctx.data))
      } else if (coerce.truthy?.includes(ctx.data as u.Primitive)) {
        ctx.setData(true)
      } else if (coerce.falsy?.includes(ctx.data as u.Primitive)) {
        ctx.setData(false)
      } else if (u.isPrimitive(ctx.data)) {
        const expected = [...(coerce.truthy ?? [])]
          .concat(coerce.falsy ?? [])
          .sort((a, b) => String(a).localeCompare(String(b)))
        return ctx
          .addIssue(
            IssueKind.InvalidEnumValue,
            {
              expected: { values: expected, formatted: expected.map(u.literalize) },
              received: { value: ctx.data, formatted: u.literalize(ctx.data) },
            },
            this.options().messages?.invalidType
          )
          .abort()
      } else {
        return ctx.invalidType({ expected: TParsedType.Primitive }).abort()
      }
    }

    if (typeof ctx.data !== 'boolean') {
      return ctx.invalidType({ expected: TParsedType.Boolean }).abort()
    }

    return ctx.success(
      (cast === 'boolean' ? ctx.data : cast === 'number' ? Number(ctx.data) : String(ctx.data)) as OutputOf<this>
    )
  }

  /* ----------------------------------------------- Coercion/Casting ----------------------------------------------- */

  coerce<C extends TBooleanCoercion>(value: u.Narrow<C>): TBoolean<C, Cast> {
    return new TBoolean({ ...this._def, coerce: u.widen(value) })
  }

  cast<C extends TBooleanCasting = 'number'>(value = 'number' as C): TBoolean<Coerce, C> {
    return new TBoolean({ ...this._def, cast: value })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  truthy<T extends readonly [u.Primitive, ...u.Primitive[]]>(
    ...values: T
  ): TBoolean<
    Coerce extends Record<string, unknown> ? u.Simplify<u.Merge<Coerce, { truthy: T }>> : { truthy: T },
    Cast
  > {
    return new TBoolean({
      ...this._def,
      coerce: { ...(typeof this._def.coerce === 'object' ? this._def.coerce : {}), truthy: values },
    })
  }

  falsy<F extends readonly [u.Primitive, ...u.Primitive[]]>(
    ...values: F
  ): TBoolean<Coerce extends Record<string, unknown> ? u.Simplify<u.Merge<Coerce, { falsy: F }>> : { falsy: F }, Cast> {
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

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create(options?: TOptions): TBoolean {
    return new TBoolean({ typeName: TTypeName.Boolean, coerce: false, cast: 'boolean', options: { ...options } })
  }
}

export type AnyTBoolean = TBoolean<TBooleanCoercion>

/* ------------------------------------------------------ TTrue ----------------------------------------------------- */

export interface TTrueDef extends TDef {
  readonly typeName: TTypeName.True
}

export class TTrue extends TType<true, TTrueDef> {
  get _manifest(): TManifest.Literal<true> {
    return TManifest.type<true>(TParsedType.True).literal(u.literalize(true)).value
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return ctx.data === true ? ctx.success(ctx.data) : ctx.invalidType({ expected: TParsedType.True }).abort()
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
  get _manifest(): TManifest.Literal<false> {
    return TManifest.type<false>(TParsedType.False).literal(u.literalize(false)).value
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return ctx.data === false ? ctx.success(ctx.data) : ctx.invalidType({ expected: TParsedType.False }).abort()
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
