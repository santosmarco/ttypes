import type { AnyTType, ManifestOf, TParsedType, TStringTransformKind, objectUtils, stringUtils } from './_internal'

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
  base<T>(type: TParsedType): TManifest<T> {
    return { type, required: true, nullable: false, readonly: false }
  },

  nullish<T>(type: TParsedType): TManifest.Nullish<T> {
    return { ...TManifest.base(type), required: false, nullable: true }
  },

  length(
    min: { readonly value: number; readonly inclusive: boolean } | undefined,
    max: { readonly value: number; readonly inclusive: boolean } | undefined,
    length: number | undefined
  ): TManifest.Length {
    if (length !== undefined) {
      return TManifest.length({ value: length, inclusive: true }, { value: length, inclusive: true }, undefined)
    }

    return {
      ...(min ? { minLength: min.value } : {}),
      ...(min ? { exclusiveMinimum: !min.inclusive } : {}),
      ...(max ? { maxLength: max.value } : {}),
      ...(max ? { exclusiveMaximum: !max.inclusive } : {}),
    }
  },

  minMax(
    min: { readonly value: number; readonly inclusive: boolean } | undefined,
    max: { readonly value: number; readonly inclusive: boolean } | undefined,
    range:
      | {
          readonly min: { readonly value: number; readonly inclusive: boolean }
          readonly max: { readonly value: number; readonly inclusive: boolean }
        }
      | undefined
  ): TManifest.MinMax {
    if (range) {
      return TManifest.minMax(range.min, range.max, undefined)
    }

    return {
      ...(min ? { minimum: min.value } : {}),
      ...(min ? { exclusiveMinimum: !min.inclusive } : {}),
      ...(max ? { maximum: max.value } : {}),
      ...(max ? { exclusiveMaximum: !max.inclusive } : {}),
    }
  },
}

export namespace TManifest {
  export type Public<T extends AnyTType> = Pick<T['_manifest'], objectUtils.OptionalKeysOf<TManifest>> extends infer X
    ? { [K in keyof X]: X[K] }
    : never

  export interface Optional<T> extends Omit<TManifest<T>, 'required'> {
    readonly required: false
  }

  export interface Nullable<T> extends Omit<TManifest<T>, 'nullable'> {
    readonly nullable: true
  }

  export interface Nullish<T> extends Omit<TManifest<T>, 'required' | 'nullable'> {
    readonly required: false
    readonly nullable: true
  }

  export interface Length {
    readonly minLength?: number
    readonly exclusiveMinimum?: boolean
    readonly maxLength?: number
    readonly exclusiveMaximum?: boolean
  }

  export type StringFormat = 'email' | 'url' | 'cuid' | 'uuid' | 'iso_date' | 'iso_duration' | 'base64' | 'numeric'

  export interface String<T> extends TManifest<T>, Length {
    readonly formats?: readonly StringFormat[]
    readonly transforms?: readonly TStringTransformKind[]
    readonly patterns?: ReadonlyArray<RegExp | { readonly regex: RegExp; readonly name: string }>
    readonly prefix?: string
    readonly suffix?: string
    readonly substring?: string
    readonly coerce: boolean
  }

  export interface MinMax {
    readonly minimum?: number
    readonly exclusiveMinimum?: boolean
    readonly maximum?: number
    readonly exclusiveMaximum?: boolean
  }

  export interface Number<T> extends TManifest<T>, MinMax {
    readonly multipleOf?: number
    readonly coerce: boolean
    readonly cast: boolean
  }

  export interface Buffer<T> extends TManifest<T>, Length {
    readonly coerce: boolean
  }

  export interface Literal<T extends string | number | bigint | boolean | symbol | null | undefined>
    extends TManifest<T> {
    readonly literal: stringUtils.Literalized<T>
    readonly required: T extends undefined ? false : true
    readonly nullable: T extends null ? true : false
  }

  export interface Enum<T extends ReadonlyArray<string | number>, Out = T[number]> extends TManifest<Out> {
    readonly enum: T
  }

  export interface Tuple<T> extends TManifest<T> {
    readonly items: readonly TManifest[]
    readonly rest: TManifest | null
  }

  export interface Record<K extends AnyTType<PropertyKey, PropertyKey>, V extends AnyTType, Out>
    extends TManifest<Out> {
    readonly keys: ManifestOf<K>
    readonly values: ManifestOf<V>
    readonly coerce: boolean
  }

  export interface Map<K extends AnyTType, V extends AnyTType, Out> extends TManifest<Out> {
    readonly keys: ManifestOf<K>
    readonly values: ManifestOf<V>
  }

  export interface Never extends TManifest<never> {
    readonly forbidden: true
  }

  export interface Union<T> extends TManifest<T> {
    readonly anyOf: readonly TManifest[]
  }

  export interface Intersection<T> extends TManifest<T> {
    readonly allOf: readonly TManifest[]
  }
}
