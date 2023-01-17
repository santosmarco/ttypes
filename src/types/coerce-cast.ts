import { TArray, TBoolean, TBuffer, TSet, TString, type TBooleanCasting, type TType } from './_internal'

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TCoerce                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export const TCoerce = {
  boolean(...args: Parameters<typeof TBoolean.create>): TBoolean<true> {
    return TBoolean.create(...args).coerce(true)
  },
  buffer(...args: Parameters<typeof TBuffer.create>): TBuffer<true> {
    return TBuffer.create(...args).coerce(true)
  },
  string(...args: Parameters<typeof TString.create>): TString<[], string, true> {
    return TString.create(...args).coerce(true)
  },
  array<T extends TType>(...args: Parameters<typeof TArray.create<T>>): TArray<T, 'many', true> {
    return TArray.create(...args).coerce(true)
  },
  set<T extends TType>(...args: Parameters<typeof TSet.create<T>>): TSet<T, true> {
    return TSet.create(...args).coerce(true)
  },
} as const

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TCast                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export const TCast = {
  boolean<C extends Exclude<TBooleanCasting, 'boolean'> = 'number'>(
    value = 'number' as C,
    ...args: Parameters<typeof TBoolean.create>
  ): TBoolean<false, C> {
    return TBoolean.create(...args).cast(value)
  },
  buffer(...args: Parameters<typeof TBuffer.create>): TBuffer<false, true> {
    return TBuffer.create(...args).cast(true)
  },
  array<T extends TType>(...args: Parameters<typeof TArray.create<T>>): TArray<T, 'many', false, true> {
    return TArray.create(...args).cast(true)
  },
  set<T extends TType>(...args: Parameters<typeof TSet.create<T>>): TSet<T, false, true> {
    return TSet.create(...args).cast(true)
  },
} as const
