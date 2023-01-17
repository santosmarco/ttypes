import type { TOptions } from './options'
import type { TTypeName } from './type-names'

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TDef                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TDef {
  readonly typeName: TTypeName
  readonly options: TOptions
  readonly checks?: ReadonlyArray<{ readonly check: string }>
}
