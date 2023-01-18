import type { TDef } from '../def'
import { IssueKind } from '../issues'
import { TManifest } from '../manifest'
import type { MakeTOptions, TOptions } from '../options'
import { TParsedType, type ParseContextOf, type ParseResultOf } from '../parse'
import { TTypeName } from '../type-names'
import { TType } from './_internal'

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TAny                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TAnyDef extends TDef {
  readonly typeName: TTypeName.Any
}

export class TAny extends TType<any, TAnyDef> {
  get _hint(): TParsedType.Any {
    return TParsedType.Any
  }

  get _manifest() {
    return TManifest<any>()({ type: TParsedType.Any, required: false, nullable: true })
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

export interface TUnknownDef extends TDef {
  readonly typeName: TTypeName.Unknown
}

export class TUnknown extends TType<unknown, TUnknownDef> {
  get _hint(): TParsedType.Unknown {
    return TParsedType.Unknown
  }

  get _manifest() {
    return TManifest<unknown>()({ type: TParsedType.Unknown, required: false, nullable: true })
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

export type TNeverOptions = MakeTOptions<{
  additionalIssueKind: IssueKind.Forbidden
}>

export interface TNeverDef extends TDef {
  readonly typeName: TTypeName.Never
  readonly options: TNeverOptions
}

export class TNever extends TType<never, TNeverDef> {
  get _manifest() {
    return TManifest<never>()({ type: TParsedType.Never, forbidden: true })
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
