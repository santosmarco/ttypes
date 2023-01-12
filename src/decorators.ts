/* eslint-disable @typescript-eslint/no-explicit-any */

export const BindAll = () => {
  return <T extends new (...args: any[]) => any>(target: T): T => {
    class _ extends target {
      constructor(...args: any[]) {
        super(...args)

        Object.defineProperties(
          this,
          Object.fromEntries(
            Object.entries(Object.getOwnPropertyDescriptors(target.prototype))
              .filter(([k]) => k !== 'constructor')
              .map(([k, d]): [typeof k, typeof d] => {
                const originalValue = this[k]

                if (!(typeof originalValue === 'function')) {
                  return [k, d]
                }

                const updatedFn = function (...args: any[]): any {
                  const originalReturn = originalValue.bind(this)(...args)

                  if (originalReturn instanceof target) {
                    return this._construct(originalReturn._def)
                  }

                  return originalReturn
                }

                Object.defineProperty(updatedFn, 'name', { value: originalValue.name })

                return [k, { ...d, value: updatedFn.bind(this), enumerable: true }]
              })
          )
        )
      }
    }

    Object.defineProperty(_, 'name', { value: target.name })

    return _
  }
}
