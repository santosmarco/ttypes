import type { TManifest, TOptions, TTypeName } from './_internal'

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TDef                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TDef {
  readonly typeName: TTypeName
  readonly options: TOptions
  readonly manifest?: TManifest
  readonly checks?: ReadonlyArray<{ readonly check: string }>
  readonly isOptional?: boolean
  readonly isNullable?: boolean
  readonly isReadonly?: boolean
}
