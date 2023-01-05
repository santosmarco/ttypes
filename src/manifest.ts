/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TManifest                                                     */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TManifest<T = unknown> {
  readonly title?: string
  readonly summary?: string
  readonly description?: string
  readonly examples?: readonly T[]
  readonly tags?: readonly string[]
  readonly notes?: readonly string[]
  readonly unit?: string
  readonly meta?: Readonly<Record<string, unknown>>
}
