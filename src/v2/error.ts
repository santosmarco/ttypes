/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TError                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export type ErrorMapFn = () => void
export type ErrorMapRecord = Record<string, unknown>
export type ErrorMap = ErrorMapFn | ErrorMapRecord
