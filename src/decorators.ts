import { type Manifest } from './manifest'
import { type AnyParseContext, type ParseResultOf } from './parse'
import type { TType } from './types/_internal'

export const BindAll = () => {
  return <
    T extends TType,
    Ctor extends new (...args: any[]) => T & {
      readonly _parse: (ctx: AnyParseContext) => ParseResultOf<TType>
      readonly _manifest: Manifest
    }
  >(
    target: Ctor
  ) => {
    Object.defineProperties(
      target.prototype,
      Object.fromEntries(
        Object.entries(Object.getOwnPropertyDescriptors(target.prototype))
          .filter(([k]) => k !== 'constructor')
          .map(([k, d]) => {
            const value = target.prototype[k] as T[keyof T]

            if (!(typeof value === 'function')) {
              return [k, { ...d, enumerable: true }]
            }

            const updatedFn = function (this: T, ...args: readonly unknown[]): unknown {
              return value.call(this, ...args)
            }

            return [k, { ...d, value: updatedFn, enumerable: true }] as const
          })
      )
    )
  }
}
