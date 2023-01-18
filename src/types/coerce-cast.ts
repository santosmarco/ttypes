import {
  TArray,
  TBigInt,
  TBoolean,
  TBuffer,
  TDate,
  TNumber,
  TSet,
  TString,
  type TBigIntCasting,
  type TBooleanCasting,
  type TDateCasting,
  type TType,
} from './_internal'

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
  date(...args: Parameters<typeof TDate.create>): TDate<true> {
    return TDate.create(...args).coerce(true)
  },
  string(...args: Parameters<typeof TString.create>): TString<[], string, true> {
    return TString.create(...args).coerce(true)
  },
  number(...args: Parameters<typeof TNumber.create>): TNumber<true> {
    return TNumber.create(...args).coerce(true)
  },
  bigint(...args: Parameters<typeof TBigInt.create>): TBigInt<true> {
    return TBigInt.create(...args).coerce(true)
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
  date<C extends Exclude<TDateCasting, 'date'> = 'number'>(
    value = 'number' as C,
    ...args: Parameters<typeof TDate.create>
  ): TDate<false, C> {
    return TDate.create(...args).cast(value)
  },
  number(...args: Parameters<typeof TNumber.create>): TNumber<false, true> {
    return TNumber.create(...args).cast(true)
  },
  bigint<C extends Exclude<TBigIntCasting, 'bigint'> = 'number'>(
    value = 'number' as C,
    ...args: Parameters<typeof TBigInt.create>
  ): TBigInt<false, C> {
    return TBigInt.create(...args).cast(value)
  },
  array<T extends TType>(...args: Parameters<typeof TArray.create<T>>): TArray<T, 'many', false, true> {
    return TArray.create(...args).cast(true)
  },
  set<T extends TType>(...args: Parameters<typeof TSet.create<T>>): TSet<T, false, true> {
    return TSet.create(...args).cast(true)
  },
} as const
