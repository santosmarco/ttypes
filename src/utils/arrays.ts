export const includes = <T extends readonly unknown[]>(arr: T, value: unknown): value is T[number] =>
  arr.includes(value)
