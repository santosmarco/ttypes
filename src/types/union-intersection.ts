import type { TDef } from '../def'
import { IssueKind } from '../issues'
import { TManifest, type MakeManifest } from '../manifest'
import type { MakeTOptions } from '../options'
import {
  TParsedType,
  type ParseContext,
  type ParseContextOf,
  type ParseResultOf,
  type SyncParseResultOf,
} from '../parse'
import { TTypeName, type TTypeNameMap } from '../type-names'
import { u } from '../utils'
import { TType, type InputOf, type ManifestOf, type OutputOf } from './_internal'

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TUnion                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TUnionMembers = readonly [TType, TType, ...TType[]]

export type TUnionOptions = MakeTOptions<{
  additionalIssueKind: IssueKind.InvalidUnion
}>

export type TUnionManifest<T extends readonly TType[]> = MakeManifest<
  InputOf<T[number]>,
  {
    readonly type: { anyOf: [...{ [K in keyof T]: ManifestOf<T[K]>['type'] }] }
    readonly members: [...{ [K in keyof T]: ManifestOf<T[K]> }]
    readonly required: u.Equals<ManifestOf<T[number]>['required'], true> extends 1 ? true : false
    readonly nullable: u.Equals<ManifestOf<T[number]>['nullable'], false> extends 1 ? false : true
  }
>

export interface TUnionDef<T extends readonly TType[]> extends TDef {
  readonly typeName: TTypeName.Union
  readonly options: TUnionOptions
  readonly members: T
}

export class TUnion<T extends readonly TType[]> extends TType<OutputOf<T[number]>, TUnionDef<T>, InputOf<T[number]>> {
  get _manifest(): TUnionManifest<FlattenMembers<T, AnyTUnion>> {
    const { members } = this.flatten()

    type Required = u.Equals<ManifestOf<T[number]>['required'], true> extends 1 ? true : false
    type Nullable = u.Equals<ManifestOf<T[number]>['nullable'], false> extends 1 ? false : true

    return TManifest<InputOf<T[number]>>()({
      type: { anyOf: TManifest.mapKey(members, 'type') },
      members: TManifest.map(members),
      required: members.every((m) => m.isRequired) as u.Narrow<Required>,
      nullable: members.some((m) => m.isNullable) as u.Narrow<Nullable>,
    })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  _parse(ctx: ParseContext<OutputOf<T[number]>, InputOf<T[number]>>): ParseResultOf<this> {
    const { members } = this.flatten()

    const handleResults = (results: Array<SyncParseResultOf<T[number]>>): ParseResultOf<this> => {
      const issues = []

      for (const result of results) {
        if (result.ok) {
          return result
        }

        issues.push(...result.error.issues)
      }

      return ctx.addIssue(IssueKind.InvalidUnion, { issues }, this.options().messages?.invalidUnion).abort()
    }

    if (ctx.common.async) {
      return Promise.all(members.map(async (type) => type._parseAsync(ctx.clone(type, ctx.data)))).then(handleResults)
    }

    return handleResults(members.map((type) => type._parseSync(ctx.clone(type, ctx.data))))
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  get members(): T {
    return this._def.members
  }

  get alternatives(): T {
    return this.members
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  flatten(): TUnion<FlattenMembers<T, AnyTUnion>> {
    return new TUnion({ ...this._def, members: flattenMembers(this.members, this.typeName) })
  }

  toIntersection(): TIntersection<T> {
    return TIntersection._create(this.members, this.options())
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create<T extends TUnionMembers>(alternatives: T, options?: TUnionOptions): TUnion<T> {
    return this._create(alternatives, options)
  }

  static _create<T extends readonly TType[]>(alternatives: T, options?: TUnionOptions): TUnion<T> {
    return new TUnion({ typeName: TTypeName.Union, members: alternatives, options: { ...options } })
  }
}

export type AnyTUnion = TUnion<TUnionMembers>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                    TIntersection                                                   */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TIntersectionMembers = readonly [TType, TType, ...TType[]]

export type TIntersectionOptions = MakeTOptions<{
  additionalIssueKind: IssueKind.InvalidIntersection
}>

export type TIntersectionManifest<T extends readonly TType[]> = MakeManifest<
  u.UnionToIntersection<InputOf<T[number]>>,
  {
    readonly type: { allOf: [...{ [K in keyof T]: ManifestOf<T[K]>['type'] }] }
    readonly members: [...{ [K in keyof T]: ManifestOf<T[K]> }]
    readonly required: u.Equals<ManifestOf<T[number]>['required'], false> extends 1 ? false : true
    readonly nullable: u.Equals<ManifestOf<T[number]>['nullable'], true> extends 1 ? true : false
  }
>

export interface TIntersectionDef<T extends readonly TType[]> extends TDef {
  readonly typeName: TTypeName.Intersection
  readonly options: TIntersectionOptions
  readonly members: T
}

export class TIntersection<T extends readonly TType[]> extends TType<
  u.UnionToIntersection<OutputOf<T[number]>>,
  TIntersectionDef<T>,
  u.UnionToIntersection<InputOf<T[number]>>
> {
  get _manifest(): TIntersectionManifest<FlattenMembers<T, AnyTIntersection>> {
    const { members } = this.flatten()

    type Required = u.Equals<ManifestOf<T[number]>['required'], false> extends 1 ? false : true
    type Nullable = u.Equals<ManifestOf<T[number]>['nullable'], true> extends 1 ? true : false

    return TManifest<u.UnionToIntersection<InputOf<T[number]>>>()({
      type: { allOf: TManifest.mapKey(members, 'type') },
      members: TManifest.map(members),
      required: members.some((m) => m.isRequired) as u.Narrow<Required>,
      nullable: members.every((m) => m.isNullable) as u.Narrow<Nullable>,
    })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    const { members } = this.flatten()

    const handleResults = (results: Array<SyncParseResultOf<T[number]>>): ParseResultOf<this> => {
      if (!results[0]?.ok || !results[1]?.ok) {
        return ctx.addIssue(IssueKind.InvalidIntersection, this.options().messages?.invalidIntersection).abort()
      }

      const intersection = intersect(results[0].data, results[1].data)
      if (!intersection.ok) {
        return ctx.addIssue(IssueKind.InvalidIntersection, this.options().messages?.invalidIntersection).abort()
      }

      const next = results[2]
      if (!next) {
        return ctx.success(intersection.data as OutputOf<this>)
      }

      if (!next.ok) {
        return ctx.addIssue(IssueKind.InvalidIntersection, this.options().messages?.invalidIntersection).abort()
      }

      return handleResults([intersection, ...results.slice(1)])
    }

    if (ctx.common.async) {
      return Promise.all(members.map(async (type) => type._parseAsync(ctx.clone(type, ctx.data)))).then(handleResults)
    }

    return handleResults(members.map((type) => type._parseSync(ctx.clone(type, ctx.data))))
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  get members(): T {
    return this._def.members
  }

  get intersectees(): T {
    return this.members
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  flatten(): TIntersection<FlattenMembers<T, AnyTIntersection>> {
    return new TIntersection({ ...this._def, members: flattenMembers(this.members, this.typeName) })
  }

  toUnion(): TUnion<T> {
    return TUnion._create(this.members, this.options())
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create<T extends TIntersectionMembers>(intersectees: T, options?: TIntersectionOptions): TIntersection<T> {
    return this._create(intersectees, options)
  }

  static _create<T extends readonly TType[]>(intersectees: T, options?: TIntersectionOptions): TIntersection<T> {
    return new TIntersection({ typeName: TTypeName.Intersection, members: intersectees, options: { ...options } })
  }
}

export type AnyTIntersection = TIntersection<TIntersectionMembers>

/* ------------------------------------------------------------------------------------------------------------------ */

type _FlattenMembers<
  M extends readonly TType[],
  Compare extends { readonly members: readonly TType[] }
> = M extends readonly []
  ? []
  : M extends readonly [infer H extends TType, ...infer R extends readonly TType[]]
  ? H extends Compare
    ? [...FlattenMembers<H['members'], Compare>, ...FlattenMembers<R, Compare>]
    : [H, ...FlattenMembers<R, Compare>]
  : TType[]

export type FlattenMembers<M extends readonly TType[], Compare extends { readonly members: readonly TType[] }> = u.Try<
  _FlattenMembers<M, Compare>,
  readonly TType[]
>

const flattenMembers = <M extends readonly TType[], TN extends TTypeName>(
  members: M,
  typeName: TN
): FlattenMembers<M, TTypeNameMap<TN>> =>
  members.reduce(
    (acc, m) => [
      ...acc,
      ...(m.isT(typeName) ? flattenMembers((m as AnyTUnion | AnyTIntersection).members, typeName) : [m]),
    ],
    []
  ) as unknown as FlattenMembers<M, TTypeNameMap<TN>>

/* ------------------------------------------------------------------------------------------------------------------ */

const intersect = <A, B>(
  a: A,
  b: B
): { readonly ok: true; readonly data: A & B } | { readonly ok: false; readonly data?: never } => {
  // @ts-expect-error This comparison appears to be unintentional because the types 'A' and 'B' have no overlap.
  if (a === b) {
    return { ok: true, data: a }
  }

  const aType = TParsedType.get(a)
  const bType = TParsedType.get(b)

  if (aType === TParsedType.Object && bType === TParsedType.Object) {
    const a_ = a as Record<PropertyKey, unknown>
    const b_ = b as Record<PropertyKey, unknown>

    const bKeys = u.keys(b_)
    const sharedKeys = u.keys(a_).filter((key) => bKeys.includes(key))

    const merged: Record<PropertyKey, unknown> = {}

    for (const key of sharedKeys) {
      const sharedResult = intersect(a_[key], b_[key])

      if (!sharedResult.ok) {
        return { ok: false }
      }

      merged[key] = sharedResult.data
    }

    return { ok: true, data: merged as A & B }
  }

  if (aType === TParsedType.Array && bType === TParsedType.Array) {
    const a_ = a as unknown[]
    const b_ = b as unknown[]

    if (a_.length !== b_.length) {
      return { ok: false }
    }

    const merged: unknown[] = []

    for (let i = 0; i < a_.length; i++) {
      const sharedResult = intersect(a_[i], b_[i])

      if (!sharedResult.ok) {
        return { ok: false }
      }

      merged[i] = sharedResult.data
    }

    return { ok: true, data: merged as A & B }
  }

  if (aType === TParsedType.Date && bType === TParsedType.Date && Number(a) === Number(b)) {
    return { ok: true, data: a as A & B }
  }

  return { ok: false }
}
