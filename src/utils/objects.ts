import { includes } from './arrays'

export const pick = <T extends Record<string, unknown>, K extends keyof T>(obj: T, keys: readonly K[]): Pick<T, K> =>
  Object.fromEntries(keys.map((k) => [k, obj[k]])) as Pick<T, K>

export const omit = <T extends Record<string, unknown>, K extends keyof T>(obj: T, keys: readonly K[]): Omit<T, K> =>
  Object.fromEntries(Object.entries(obj).filter(([k]) => !includes(keys, k))) as Omit<T, K>
