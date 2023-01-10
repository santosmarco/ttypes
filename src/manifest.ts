import type { AnyTTypeBase, TParsedType, objectUtils, typeUtils } from './_internal'

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TManifest                                                     */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TManifest<T = unknown> {
  readonly type: TParsedType
  readonly title?: string
  readonly summary?: string
  readonly description?: string
  readonly examples?: readonly T[]
  readonly tags?: readonly string[]
  readonly notes?: readonly string[]
  readonly unit?: string
  readonly deprecated?: boolean
  readonly meta?: Readonly<Record<string, unknown>>
  readonly required: boolean
  readonly nullable: boolean
  readonly readonly: boolean
}

export const TManifest = {
  default<T>(type: TParsedType): TManifest<T> {
    return { type, required: true, nullable: false, readonly: false }
  },
}

export namespace TManifest {
  export type Public<T extends AnyTTypeBase> = Pick<
    T['_manifest'],
    objectUtils.OptionalKeysOf<TManifest>
  > extends infer X
    ? { [K in keyof X]: X[K] }
    : never

  export type Final<T extends AnyTTypeBase> = typeUtils.SimplifyFlat<
    T['_manifest'] & { readonly typeName: T['typeName'] }
  >
}
