export interface ArrayUtils {
  includes<T extends readonly unknown[]>(arr: T, value: unknown): value is T[number]
}

export const arrayUtils: ArrayUtils = {
  includes<T extends readonly unknown[]>(arr: T, value: unknown): value is T[number] {
    return arr.includes(value)
  },
}
