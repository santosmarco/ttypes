import { TNumber, TString } from '../_internal'

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TCoerce                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export const coerce = {
  string: (...args: Parameters<typeof TString.create>): TString<[], true> => TString.create(...args).coerce(),
  number: (...args: Parameters<typeof TNumber.create>): TNumber<true> => TNumber.create(...args).coerce(),
}
