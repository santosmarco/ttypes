import { TError } from './error'
import { TParsedType } from './parse'
import type { InputOf, ManifestOf, TObjectShape, TType } from './types/_internal'
import { u } from './utils'

/* ---------------------------------------------------- Manifest ---------------------------------------------------- */

export interface PublicManifest<T = unknown> {
  readonly title?: string
  readonly summary?: string
  readonly description?: string
  readonly examples?: readonly T[]
  readonly tags?: readonly string[]
  readonly notes?: readonly string[]
  readonly unit?: string
  readonly deprecated?: boolean
  readonly meta?: Readonly<Record<string, unknown>>
}

export type ManifestType =
  | u.LiteralUnion<TParsedType | `${TParsedType}`, string>
  | u.RequireExactlyOne<Readonly<Record<'allOf' | 'anyOf' | 'not', readonly ManifestType[]>>>

export interface Manifest<T = unknown> extends PublicManifest<T> {
  readonly type: ManifestType
  readonly required: boolean
  readonly nullable: boolean
  readonly readonly: boolean
}

export type MakeManifest<T, P extends Partial<Manifest<T>> & { readonly type: ManifestType }> = u.Simplify<
  PublicManifest<T> &
    u.ReadonlyDeep<
      u.Except<P, 'nullable' | 'readonly' | 'required' | 'type'> & {
        readonly type: P['type']
        readonly required: 'required' extends keyof P ? P['required'] : true
        readonly nullable: 'nullable' extends keyof P ? P['nullable'] : false
        readonly readonly: 'readonly' extends keyof P ? P['readonly'] : false
      }
    >
>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TManifest                                                     */
/* ------------------------------------------------------------------------------------------------------------------ */

export const TManifest =
  <T>() =>
  <P extends Partial<Manifest<T>> & { readonly type: ManifestType }>(manifest: {
    [K in keyof P]: P[K] | u.Narrow<P[K]>
  }): MakeManifest<T, P> =>
    ({
      ...(manifest as P),
      required: 'required' in manifest ? manifest.required : true,
      nullable: 'nullable' in manifest ? manifest.nullable : false,
      readonly: 'readonly' in manifest ? manifest.readonly : false,
    } as MakeManifest<T, P>)

TManifest.get = <T extends u.Nullish<TType>>(maybeType: T) =>
  maybeType?.manifest() as T extends TType ? ManifestOf<T> : T

TManifest.extract = <T extends Manifest, K extends keyof T>(manifest: T, key: K): T[K] => manifest[key]

TManifest.pickPublic = <T extends TType>(type: T): PublicManifest<InputOf<T>> =>
  u.pick(type.manifest(), [
    'title',
    'summary',
    'description',
    'examples',
    'tags',
    'notes',
    'unit',
    'deprecated',
    'meta',
  ])

TManifest.map = <T extends readonly TType[]>(types: T): [...{ [P in keyof T]: ManifestOf<T[P]> }] =>
  types.map((t) => t.manifest()) as [...{ [P in keyof T]: ManifestOf<T[P]> }]

TManifest.mapKey = <T extends readonly TType[], K extends keyof Manifest>(
  types: T,
  key: K
): [...{ [P in keyof T]: ManifestOf<T[P]>[K] }] =>
  types.map((t) => t.manifest()[key]) as [...{ [P in keyof T]: ManifestOf<T[P]>[K] }]

TManifest.mapShape = <T extends TObjectShape>(shape: T): { [K in keyof T]: ManifestOf<T[K]> } =>
  u.fromEntries(u.entries(shape).map(([k, v]) => [k, v.manifest()]))

TManifest.unwrapType = (types: readonly ManifestType[], mode: 'intersection' | 'not' | 'union'): string => {
  const unwrapInner = (
    types: readonly ManifestType[],
    mode: 'intersection' | 'not' | 'union'
  ): {
    readonly union: Set<ManifestType>
    readonly intersection: Set<ManifestType>
    readonly not: Set<ManifestType>
  } => {
    const union = new Set<ManifestType>()
    const intersection = new Set<ManifestType>()
    const not = new Set<ManifestType>()

    for (const type of types) {
      if (typeof type === 'string') {
        if (mode === 'union') {
          union.add(type)
        } else if (mode === 'intersection') {
          intersection.add(type)
        } else if (mode === 'not') {
          not.add(type)
        } else {
          TError.assertNever(mode)
        }
      } else {
        const unwrapped = type.anyOf
          ? unwrapInner(type.anyOf, 'union')
          : type.allOf
          ? unwrapInner(type.allOf, 'intersection')
          : type.not
          ? unwrapInner(type.not, 'not')
          : TError.assertNever(type)

        unwrapped.union.forEach((t) => union.add(t))
        unwrapped.intersection.forEach((t) => intersection.add(t))
        unwrapped.not.forEach((t) => not.add(t))
      }
    }

    return { union, intersection, not }
  }

  const { union, not } = unwrapInner(types, mode)

  if (union.has(TParsedType.Never)) {
    if (union.size === 1) {
      return TParsedType.Never
    }

    union.delete(TParsedType.Never)
  }

  if (union.has(TParsedType.Any)) {
    union.clear()
    union.add(TParsedType.Any)
  } else if (union.has(TParsedType.Unknown)) {
    union.clear()
    union.add(TParsedType.Unknown)
  }

  not.forEach((t) => union.delete(t))

  return [...union].join(' | ')
}
