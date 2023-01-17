import { TParsedType } from './parse'
import type { ManifestOf, TType } from './types/_internal'
import { u } from './utils'

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TManifest                                                     */
/* ------------------------------------------------------------------------------------------------------------------ */

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
  | string
  | u.RequireAtLeastOne<{ readonly anyOf: readonly ManifestType[]; readonly allOf: readonly ManifestType[] }>

export interface Manifest<T = unknown> extends PublicManifest<T> {
  readonly type: ManifestType
  readonly required: boolean
  readonly nullable: boolean
  readonly readonly: boolean
}

export namespace TManifest {
  export interface Base<T = unknown> extends Manifest<T> {
    readonly required: true
    readonly nullable: false
    readonly readonly: false
  }

  export interface Optional<T> extends u.Except<Base<T>, 'required'> {
    readonly required: false
  }

  export interface Nullish<T> extends u.Except<Base<T>, 'required' | 'nullable'> {
    readonly required: false
    readonly nullable: true
  }

  export type Wrap<T extends TType, In, Ext extends Partial<Manifest<In>> | null = null> = u.Except<
    Base<In>,
    'required' | 'nullable' | 'readonly'
  > & {
    readonly underlying: ManifestOf<T>
    readonly required: 'required' extends keyof Ext ? Ext['required'] : ManifestOf<T>['required']
    readonly nullable: 'nullable' extends keyof Ext ? Ext['nullable'] : ManifestOf<T>['nullable']
    readonly readonly: 'readonly' extends keyof Ext ? Ext['readonly'] : ManifestOf<T>['readonly']
  }

  export interface Literal<T extends u.Primitive> extends u.Except<Base<T>, 'required' | 'nullable'> {
    readonly literal: u.Literalized<T>
    readonly required: T extends undefined ? false : true
    readonly nullable: T extends null ? true : false
  }
}

export class TManifest<M> {
  private constructor(private readonly _manifest: M) {}

  /* ---------------------------------------------------------------------------------------------------------------- */

  get value(): M {
    return this._manifest
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  with<M_>(manifest: u.Narrow<M_>): TManifest<u.Merge<M, M_>> {
    return this._update(u.widen(manifest))
  }

  setProp<P extends string, V>(prop: P, value: u.Narrow<V>): TManifest<u.Merge<M, { readonly [K in P]: V }>> {
    return this._update({ [prop]: value } as { [K in P]: V })
  }

  examples<T extends readonly unknown[]>(examples: T | undefined): TManifest<u.Merge<M, { readonly examples?: T }>> {
    return this._update({ examples })
  }

  required<T extends boolean = true>(value = true as T): TManifest<u.Merge<M, { readonly required: T }>> {
    return this._update({ required: value })
  }

  nullable<T extends boolean = true>(value = true as T): TManifest<u.Merge<M, { readonly nullable: T }>> {
    return this._update({ nullable: value })
  }

  wrap<T extends TType>(underlying: ManifestOf<T>): TManifest<u.Merge<M, { readonly underlying: ManifestOf<T> }>> {
    return this._update({ underlying })
  }

  element<T extends TType>(element: ManifestOf<T>): TManifest<u.Merge<M, { readonly element: ManifestOf<T> }>> {
    return this._update({ element })
  }

  literal<T extends string>(value: T): TManifest<u.Merge<M, { readonly literal: T }>> {
    return this._update({ literal: value })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  private _update<M_>(manifest: M_): TManifest<u.Merge<M, M_>> {
    return new TManifest(u.merge(this._manifest, manifest))
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static type<T>(type: ManifestType): TManifest<TManifest.Base<T>> {
    return new TManifest(this.base(type))
  }

  static base<T>(type?: ManifestType): TManifest.Base<T> {
    let unwrappedType: string | { anyOf?: readonly ManifestType[]; allOf?: readonly ManifestType[] } =
      TParsedType.Unknown

    if (typeof type === 'string') {
      unwrappedType = type
    } else {
      const [unionResult, intersectionResult] = [
        type?.anyOf && unwrapManifestType(type?.anyOf, 'union'),
        type?.allOf && unwrapManifestType(type?.allOf, 'intersection'),
      ]

      unwrappedType = {
        ...(unionResult && { anyOf: [...unionResult.union] }),
        ...(intersectionResult && { allOf: [...intersectionResult.intersection] }),
      }
    }

    if (typeof unwrappedType !== 'string' && !('allOf' in unwrappedType) && unwrappedType.anyOf?.length === 1) {
      unwrappedType = unwrappedType.anyOf?.[0]
    }

    if (typeof unwrappedType !== 'string' && !('anyOf' in unwrappedType) && unwrappedType.allOf?.length === 1) {
      unwrappedType = unwrappedType.allOf?.[0]
    }

    return {
      type: unwrappedType as ManifestType,
      required: true,
      nullable: false,
      readonly: false,
    }
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */

const unwrapManifestType = (
  types: readonly ManifestType[],
  mode: 'union' | 'intersection'
): {
  readonly union: Set<Exclude<ManifestType, { readonly anyOf: readonly ManifestType[] }>>
  readonly intersection: Set<Exclude<ManifestType, { readonly allOf: readonly ManifestType[] }>>
} => {
  const union = new Set<Exclude<ManifestType, { readonly anyOf: readonly ManifestType[] }>>()
  const intersection = new Set<Exclude<ManifestType, { readonly allOf: readonly ManifestType[] }>>()

  for (const type of types) {
    if (typeof type === 'string') {
      if (mode === 'union') {
        union.add(type)
      } else {
        intersection.add(type)
      }
    } else {
      const [unionResult, intersectionResult] = type.anyOf
        ? type.allOf
          ? [unwrapManifestType(type.anyOf, 'union'), unwrapManifestType(type.allOf, 'intersection')]
          : [unwrapManifestType(type.anyOf, 'union'), undefined]
        : type.allOf
        ? [undefined, unwrapManifestType(type.allOf, 'intersection')]
        : [undefined, undefined]

      unionResult?.union.forEach((t) => union.add(t))
      intersectionResult?.intersection.forEach((t) => intersection.add(t))
    }
  }

  if (union.has(TParsedType.Never) && union.size > 1) {
    union.delete(TParsedType.Never)
  }

  if (union.has(TParsedType.Any)) {
    union.clear()
    union.add(TParsedType.Any)
  } else if (union.has(TParsedType.Unknown)) {
    union.clear()
    union.add(TParsedType.Unknown)
  }

  return { union, intersection }
}
