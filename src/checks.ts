import type { TDef, TType } from './_internal'

export interface TChecks<
  T extends TType<
    unknown,
    TDef & { readonly checks: ReadonlyArray<{ readonly check: string; readonly [x: string]: unknown }> }
  >
> {
  add(check: T['_def']['checks'][number], options?: { readonly noReplace?: boolean }): T
  remove(kind: T['_def']['checks'][number]['check']): T
  has(kind: T['_def']['checks'][number]['check']): boolean
}

export const TChecks = {
  of: <
    T extends TType<
      unknown,
      TDef & { readonly checks: ReadonlyArray<{ readonly check: string; readonly [x: string]: unknown }> }
    >
  >(
    type: T
  ): TChecks<T> => ({
    add(check, options): T {
      const updated = [...type._def.checks, check]

      return type._construct({
        ...type._def,
        checks: options?.noReplace
          ? updated
          : updated.filter((c, i, arr) => arr.findIndex((c2) => c2.check === c.check) === i),
      })
    },

    remove(kind): T {
      return type._construct({ ...type._def, checks: type._def.checks.filter((check) => check.check !== kind) })
    },

    has(kind): boolean {
      return type._def.checks.some((check) => check.check === kind)
    },
  }),
}
