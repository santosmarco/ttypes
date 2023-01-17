import type { TDef } from '../def'
import { IssueKind, type EIssueKind } from '../error'
import { TManifest } from '../manifest'
import type { ExtendedTOptions, TOptions } from '../options'
import { TParsedType, type ParseContextOf, type ParseResultOf } from '../parse'
import { TTypeName } from '../type-names'
import { TType } from './_internal'

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TAny                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TAnyManifest = TManifest.Nullish<any>

export interface TAnyDef extends TDef {
  readonly typeName: TTypeName.Any
}

export class TAny extends TType<any, TAnyDef> {
  get _manifest(): TAnyManifest {
    return TManifest.type<any>(TParsedType.Any).required(false).nullable().value
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return ctx.success(ctx.data)
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create(options?: TOptions): TAny {
    return new TAny({ typeName: TTypeName.Any, options: { ...options } })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TUnknown                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TUnknownManifest = TManifest.Nullish<unknown>

export interface TUnknownDef extends TDef {
  readonly typeName: TTypeName.Unknown
}

export class TUnknown extends TType<unknown, TUnknownDef> {
  get _manifest(): TUnknownManifest {
    return TManifest.type<unknown>(TParsedType.Unknown).required(false).nullable().value
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return ctx.success(ctx.data)
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create(options?: TOptions): TUnknown {
    return new TUnknown({ typeName: TTypeName.Unknown, options: { ...options } })
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TNever                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TNeverOptions = ExtendedTOptions<{
  additionalIssueKind: EIssueKind['Forbidden']
}>

export interface TNeverManifest extends TManifest.Base<never> {
  readonly forbidden: true
}

export interface TNeverDef extends TDef {
  readonly typeName: TTypeName.Never
  readonly options: TNeverOptions
}

export class TNever extends TType<never, TNeverDef> {
  get _manifest(): TNeverManifest {
    return TManifest.type<never>(TParsedType.Never).setProp('forbidden', true).value
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return ctx.addIssue(IssueKind.Forbidden, this.options().messages?.forbidden).abort()
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create(options?: TNeverOptions): TNever {
    return new TNever({ typeName: TTypeName.Never, options: { ...options } })
  }
}
