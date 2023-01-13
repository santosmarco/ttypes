import { type TParsedType } from './parse'
import type { TTypeName } from './types/_internal'
import { utils } from './utils'

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TManifest                                                     */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TManifest<TN extends TTypeName = TTypeName> = utils.BRANDED<
  {
    readonly type: string
    readonly typeName: TN
    readonly title?: string
    readonly summary?: string
    readonly description?: string
    readonly examples?: readonly unknown[]
    readonly tags?: readonly string[]
    readonly notes?: readonly string[]
    readonly unit?: string
    readonly deprecated?: boolean
    readonly meta?: Readonly<Record<string, unknown>>
    readonly required: boolean
    readonly nullable: boolean
    readonly readonly: boolean
  },
  'TManifest'
>

export interface TDefaultManifest<TN extends TTypeName = TTypeName> extends TManifest<TN> {
  readonly required: true
  readonly nullable: false
  readonly readonly: false
}

export type MakeTManifest<TN extends TTypeName, P extends Partial<TManifest> | null = null> = utils.ReadonlyDeep<
  P extends Record<string, unknown> ? utils.MergeDeep<TDefaultManifest<TN>, P> : TDefaultManifest<TN>
>

export namespace TManifest {
  export type Optional<TN extends TTypeName> = MakeTManifest<TN, { required: false }>
}

export const getDefaultManifest = <TN extends TTypeName, T extends utils.LiteralUnion<TParsedType, string>>(
  typeName: TN,
  type: T
): utils.UNBRANDED<TDefaultManifest<TN>> =>
  utils.debrand({ type, typeName, required: true, nullable: false, readonly: false })

export const makeManifest = <
  TN extends TTypeName,
  T extends utils.LiteralUnion<TParsedType, string>,
  P extends Partial<TManifest> | null = null
>(
  typeName: TN,
  type: T,
  manifest?: utils.Narrow<NonNullable<P>>
): MakeTManifest<TN, P> => ({ ...getDefaultManifest(typeName, type), ...(manifest as P) } as MakeTManifest<TN, P>)
