/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TMarkers                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export const ttype = Symbol('t')

export const unsetMarker = Symbol('t.unsetMarker')
export const emptyMarker = Symbol('t.emptyMarker')
export const forbiddenMarker = Symbol('t.forbiddenMarker')
export const refMarker = Symbol('t.refMarker')
export const deleteMarker = Symbol('t.deleteMarker')

export type unsetMarker = typeof unsetMarker
export type emptyMarker = typeof emptyMarker
export type forbiddenMarker = typeof forbiddenMarker
export type refMarker = typeof refMarker
export type deleteMarker = typeof deleteMarker
