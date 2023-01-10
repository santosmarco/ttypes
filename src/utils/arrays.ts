export interface ArrayUtils {
  isArray<T>(value: T | readonly T[]): value is readonly T[]
  includes<T extends readonly unknown[]>(arr: T, value: unknown): value is T[number]
}

export const arrayUtils: ArrayUtils = {
  isArray<T>(value: T | readonly T[]): value is readonly T[] {
    return Array.isArray(value)
  },

  includes<T extends readonly unknown[]>(arr: T, value: unknown): value is T[number] {
    return arr.includes(value)
  },
}
