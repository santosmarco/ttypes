export interface TCheckHolder {
  readonly _def: { readonly checks: ReadonlyArray<{ readonly check: string }> }
  _construct(def?: this['_def']): this
}

export type GetCheck<T extends TCheckHolder> = T['_def']['checks'][number]

export interface TChecks<T extends TCheckHolder> {
  add(
    check: GetCheck<T>,
    options?: {
      readonly noReplace?: boolean
      readonly remove?: ReadonlyArray<GetCheck<T>['check']>
    }
  ): T
  remove(kind: GetCheck<T>['check']): T
  has(kind: GetCheck<T>['check']): boolean
  get<K extends GetCheck<T>['check']>(kind: K): Extract<GetCheck<T>, { readonly check: K }> | undefined
}

export const TChecks = {
  of: <T extends TCheckHolder>(type: T): TChecks<T> => ({
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

    get(kind): Extract<GetCheck<T>, { readonly check: typeof kind }> | undefined {
      return type._def.checks.find((c): c is Extract<GetCheck<T>, { readonly check: typeof kind }> => c.check === kind)
    },
  }),
}
