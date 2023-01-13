import { makeManifest } from '../manifest'
import { TType, TTypeName, makeDef, type CreateOptions, type InputOf, type MakeTDef, type OutputOf } from './_internal'

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TOptional                                                     */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TOptionalDef = MakeTDef<{
  typeName: TTypeName.Optional
}>

export class TOptional<T extends TType> extends TType<OutputOf<T> | undefined, TOptionalDef, InputOf<T>> {
  get _manifest() {
    return makeManifest(TTypeName.Optional)
  }

  get underlying() {}

  static create<T extends TType>(underlying: T, options?: CreateOptions<TOptionalDef>): TOptional<T> {
    return new TOptional(makeDef({ typeName: TTypeName.Optional, options: { ...options } }))
  }
}
