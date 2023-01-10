export interface ArrayUtils {
  isArray<T>(value: T | readonly T[]): value is readonly T[]
  includes<T extends readonly unknown[]>(arr: T, value: unknown): value is T[number]
  head<T extends readonly unknown[]>(arr: T): arrayUtils.Head<T>
  tail<T extends readonly unknown[]>(arr: T): arrayUtils.Tail<T>
}

export const arrayUtils: ArrayUtils = {
  isArray<T>(value: T | readonly T[]): value is readonly T[] {
    return Array.isArray(value)
  },

  includes<T extends readonly unknown[]>(arr: T, value: unknown): value is T[number] {
    return arr.includes(value)
  },

  head(arr) {
    return arr[0] as arrayUtils.Head<typeof arr>
  },

  tail(arr) {
    return arr.slice(1) as arrayUtils.Tail<typeof arr>
  },
}

export namespace arrayUtils {
  export type Head<T extends readonly unknown[]> = T extends readonly [infer H, ...unknown[]] ? H : never

  export type Tail<T extends readonly unknown[]> = T extends readonly [unknown, ...infer R] ? R : never
}
