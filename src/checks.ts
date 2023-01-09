import type { TDef, TType } from './_internal'

export type GetCheck<
  T extends TType<
    unknown,
    TDef & { readonly checks: ReadonlyArray<{ readonly check: string; readonly [x: string]: unknown }> }
  >
> = T['_def']['checks'][number]

export interface TChecks<
  T extends TType<
    unknown,
    TDef & { readonly checks: ReadonlyArray<{ readonly check: string; readonly [x: string]: unknown }> }
  >
> {
  add(
    check: GetCheck<T>,
    options?: {
      readonly noReplace?: boolean
      readonly remove?: ReadonlyArray<GetCheck<T>['check']>
    }
  ): T
  remove(kind: GetCheck<T>['check']): T
  has(kind: GetCheck<T>['check']): boolean
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
      let updated = [...type._def.checks, check]

      if (!options?.noReplace) {
        updated = updated.filter((c0, i, arr) => arr.findIndex((c1) => c1.check === c0.check) === i)
      }

      if (options?.remove) {
        updated = updated.filter((c) => !options.remove?.includes(c.check))
      }

      return type._construct({ ...type._def, checks: updated })
    },

    remove(kind): T {
      return type._construct({ ...type._def, checks: type._def.checks.filter((c) => c.check !== kind) })
    },

    has(kind): boolean {
      return type._def.checks.some((c) => c.check === kind)
    },
  }),
}
