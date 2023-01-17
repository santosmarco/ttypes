import type { TOptions, TTypeName } from './_internal'

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TDef                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TDef {
  readonly typeName: TTypeName
  readonly options: TOptions
  readonly checks?: ReadonlyArray<{ readonly check: string }>
}
