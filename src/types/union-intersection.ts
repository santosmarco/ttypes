import {
  TIssueKind,
  TParsedType,
  TType,
  TTypeName,
  getParsedType,
  type AnyTType,
  type InputOf,
  type OutputOf,
  type ParseContextOf,
  type ParseResultOf,
  type Simplify,
  type SyncParseResultOf,
  type TDef,
  type TOptions,
  type UnionToIntersection,
} from '../_internal'

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TUnion                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TUnionOptions = TOptions<{
  additionalIssueKind: TIssueKind.InvalidUnion
}>

export interface TUnionDef<T extends readonly AnyTType[]> extends TDef {
  readonly typeName: TTypeName.Union
  readonly options: TUnionOptions
  readonly members: T
}

export class TUnion<T extends readonly AnyTType[]> extends TType<
  OutputOf<T[number]>,
  TUnionDef<T>,
  InputOf<T[number]>
> {
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    const { members } = this._def

    const handleResults = (results: Array<SyncParseResultOf<T[number]>>): ParseResultOf<this> => {
      const issues = []

      for (const result of results) {
        if (result.ok) {
          return result
        }

        issues.push(...result.error.issues)
      }

      return ctx
        .addIssue({ kind: TIssueKind.InvalidUnion, payload: { issues } }, this._def.options.messages?.invalidUnion)
        .abort()
    }

    if (ctx.isAsync()) {
      return Promise.all(members.map(async (type) => type._parseAsync(ctx.clone(type, ctx.data)))).then(handleResults)
    }

    return handleResults(members.map((type) => type._parseSync(ctx.clone(type, ctx.data))))
  }

  get members(): T {
    return this._def.members
  }

  get alternatives(): T {
    return this.members
  }

  static create<T extends readonly [AnyTType, AnyTType, ...AnyTType[]]>(
    alternatives: T,
    options?: Simplify<TUnionOptions>
  ): TUnion<T> {
    return new TUnion({ typeName: TTypeName.Union, members: alternatives, options: { ...options } })
  }
}

export type AnyTUnion = TUnion<readonly AnyTType[]>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                    TIntersection                                                   */
/* ------------------------------------------------------------------------------------------------------------------ */

export const intersect = <A, B>(
  a: A,
  b: B
): { readonly ok: true; readonly data: A & B } | { readonly ok: false; readonly data?: never } => {
  // @ts-expect-error This comparison appears to be unintentional because the types 'A' and 'B' have no overlap.
  if (a === b) {
    return { ok: true, data: a }
  }

  const aType = getParsedType(a)
  const bType = getParsedType(b)

  if (aType === TParsedType.Object && bType === TParsedType.Object) {
    const a_ = a as Record<string, unknown>
    const b_ = b as Record<string, unknown>

    const bKeys = Object.keys(b_)
    const sharedKeys = Object.keys(a_).filter((key) => bKeys.includes(key))

    const merged: Record<string, unknown> = {}

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

export type TIntersectionOptions = TOptions<{
  additionalIssueKind: TIssueKind.InvalidIntersection
}>

export interface TIntersectionDef<T extends readonly AnyTType[]> extends TDef {
  readonly typeName: TTypeName.Intersection
  readonly options: TIntersectionOptions
  readonly members: T
}

export class TIntersection<T extends readonly AnyTType[]> extends TType<
  UnionToIntersection<OutputOf<T[number]>>,
  TIntersectionDef<T>,
  UnionToIntersection<InputOf<T[number]>>
> {
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    const { members } = this._def

    const handleResults = (results: Array<SyncParseResultOf<T[number]>>): ParseResultOf<this> => {
      if (!results[0]?.ok || !results[1]?.ok) {
        return ctx
          .addIssue({ kind: TIssueKind.InvalidIntersection }, this._def.options.messages?.invalidIntersection)
          .abort()
      }

      const intersection = intersect(results[0].data, results[1].data)
      if (!intersection.ok) {
        return ctx
          .addIssue({ kind: TIssueKind.InvalidIntersection }, this._def.options.messages?.invalidIntersection)
          .abort()
      }

      const next = results[2]
      if (!next) {
        return ctx.success(intersection.data as OutputOf<this>)
      }

      if (!next.ok) {
        return ctx
          .addIssue({ kind: TIssueKind.InvalidIntersection }, this._def.options.messages?.invalidIntersection)
          .abort()
      }

      return handleResults([intersection, ...results.slice(1)])
    }

    if (ctx.isAsync()) {
      return Promise.all(members.map(async (type) => type._parseAsync(ctx.clone(type, ctx.data)))).then(handleResults)
    }

    return handleResults(members.map((type) => type._parseSync(ctx.clone(type, ctx.data))))
  }

  get members(): T {
    return this._def.members
  }

  get intersectees(): T {
    return this.members
  }

  static create<T extends readonly [AnyTType, AnyTType, ...AnyTType[]]>(
    intersectees: T,
    options?: Simplify<TIntersectionOptions>
  ): TIntersection<T> {
    return new TIntersection({ typeName: TTypeName.Intersection, members: intersectees, options: { ...options } })
  }
}

export type AnyTIntersection = TIntersection<readonly AnyTType[]>
