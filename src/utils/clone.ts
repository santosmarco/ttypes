import { mergeDeep } from 'immutable'

export interface CloneUtils {
  cloneDeep<T>(data: T): T
}

export const cloneUtils: CloneUtils = {
  cloneDeep(data) {
    return mergeDeep(data)
  },
}
