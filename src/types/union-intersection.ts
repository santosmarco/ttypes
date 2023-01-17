import type { TDef } from '../def'
import { IssueKind, type EIssueKind } from '../error'
import type { ExtendedTOptions } from '../options'
import { TParsedType, type ParseContextOf, type ParseResultOf } from '../parse'
import { TTypeName } from '../type-names'
import { u } from '../utils'
import { TType, type InputOf, type OutputOf } from './_internal'

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TUnion                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TUnionMembers = readonly [TType, TType, ...TType[]]

export type TUnionOptions = ExtendedTOptions<{
  additionalIssueKind: EIssueKind['InvalidUnion']
}>

export interface TUnionDef<T extends TUnionMembers> extends TDef {
  readonly typeName: TTypeName.Union
  readonly options: TUnionOptions
  readonly members: T
}

export class TUnion<T extends TUnionMembers> extends TType<OutputOf<T[number]>, TUnionDef<T>, InputOf<T[number]>> {
  get _manifest(): TManifest.Union<OutputOf<this>> {
    const { members } = this.flatten()

    return {
      ...TManifest.base(TParsedType.Union),
      anyOf: members.map((m) => m.manifest()),
      required: members.every((m) => m.isRequired),
      nullable: members.some((m) => m.isNullable),
    }
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
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
    return TIntersection.create(this.members, this.options())
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create<T extends TUnionMembers>(alternatives: T, options?: TUnionOptions): TUnion<T> {
    return new TUnion({ typeName: TTypeName.Union, members: alternatives, options: { ...options } })
  }
}

export type AnyTUnion = TUnion<TUnionMembers>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                    TIntersection                                                   */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TIntersectionMembers = readonly [TType, TType, ...TType[]]

export type TIntersectionOptions = ExtendedTOptions<{
  additionalIssueKind: EIssueKind['InvalidIntersection']
}>

export interface TIntersectionDef<T extends readonly TType[]> extends TDef {
  readonly typeName: TTypeName.Intersection
  readonly options: TIntersectionOptions
  readonly members: T
}

export class TIntersection<T extends TIntersectionMembers> extends TType<
  UnionToIntersection<OutputOf<T[number]>>,
  TIntersectionDef<T>,
  UnionToIntersection<InputOf<T[number]>>
> {
  get _manifest(): TManifest.Intersection<OutputOf<this>> {
    const { members } = this.flatten()

    return {
      ...TManifest.base(TParsedType.Intersection),
      allOf: members.map((m) => m.manifest()),
    }
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
    return TUnion.create(this.members, this.options())
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create<T extends TIntersectionMembers>(intersectees: T, options?: TIntersectionOptions): TIntersection<T> {
    return new TIntersection({ typeName: TTypeName.Intersection, members: intersectees, options: { ...options } })
  }
}

export type AnyTIntersection = TIntersection<TIntersectionMembers>

/* ------------------------------------------------------------------------------------------------------------------ */

export type FlattenMembers<
  M extends TUnionMembers | TIntersectionMembers,
  Compare extends TType & { readonly members: readonly TType[] }
> = M extends readonly []
  ? []
  : M extends readonly [infer H extends TType, ...infer R extends readonly TType[]]
  ? H extends Compare
    ? [...FlattenMembers<H['members'], Compare>, ...FlattenMembers<R, Compare>]
    : [H, ...FlattenMembers<R, Compare>]
  : TType[]

const flattenMembers = <
  M extends TUnionMembers,
  TN extends Extract<TTypeNameMap, { readonly members: readonly TType[] }>['typeName']
>(
  members: M,
  typeName: TN
): FlattenMembers<M, TTypeNameMap<TN>> =>
  members.reduce(
    (acc, m) => [...acc, ...(m.isT(typeName) ? flattenMembers(m.members, typeName) : [m])],
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
