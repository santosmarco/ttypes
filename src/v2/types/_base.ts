import type { TManifest } from '../manifest'
import type { TOptions } from '../options'
import type { utils } from '../utils'
import { TOptional } from './_internal'

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TTypeName                                                     */
/* ------------------------------------------------------------------------------------------------------------------ */

export enum TTypeName {
  Any = 'TAny',
  Array = 'TArray',
  BigInt = 'TBigInt',
  Boolean = 'TBoolean',
  Brand = 'TBrand',
  Buffer = 'TBuffer',
  Catch = 'TCatch',
  Custom = 'TCustom',
  Date = 'TDate',
  Default = 'TDefault',
  Defined = 'TDefined',
  DiscriminatedUnion = 'TDiscriminatedUnion',
  Effects = 'TEffects',
  Enum = 'TEnum',
  False = 'TFalse',
  Falsy = 'TFalsy',
  Function = 'TFunction',
  If = 'TIf',
  InstanceOf = 'TInstanceOf',
  Intersection = 'TIntersection',
  Lazy = 'TLazy',
  Literal = 'TLiteral',
  Map = 'TMap',
  NaN = 'TNaN',
  NativeEnum = 'TNativeEnum',
  Never = 'TNever',
  NonNullable = 'TNonNullable',
  Not = 'TNot',
  Null = 'TNull',
  Nullable = 'TNullable',
  Number = 'TNumber',
  Object = 'TObject',
  Optional = 'TOptional',
  Pipeline = 'TPipeline',
  Primitive = 'TPrimitive',
  Promise = 'TPromise',
  PropertyKey = 'TPropertyKey',
  Readonly = 'TReadonly',
  Record = 'TRecord',
  Ref = 'TRef',
  Set = 'TSet',
  String = 'TString',
  SuperDefault = 'TSuperDefault',
  Symbol = 'TSymbol',
  True = 'TTrue',
  Tuple = 'TTuple',
  Undefined = 'TUndefined',
  Union = 'TUnion',
  Unknown = 'TUnknown',
  Void = 'TVoid',
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TDef                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TDef = utils.BRANDED<
  {
    readonly typeName: TTypeName
    readonly options: TOptions
  },
  'TDef'
>

interface _MakeTDefSettings {
  typeName: TTypeName
  options?: TOptions
  checks?: ReadonlyArray<{ readonly check: string }>
}

export type MakeTDef<T extends utils.Exact<_MakeTDefSettings, T>> = utils.MergeDeep<
  TDef,
  {
    readonly typeName: T['typeName']
    readonly options: T['options'] extends Record<string, unknown> ? T['options'] : TOptions
  }
>

export const makeDef = <T extends TDef>(
  def: utils.UNBRANDED<utils.Merge<T, { readonly options: utils.UNBRANDED<T['options']> }>>
): T => def as T

export type CreateOptions<T extends TDef> = utils.Simplify<utils.UNBRANDED<utils.StrictOmit<T['options'], 'manifest'>>>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TType                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export abstract class TType<Out = any, Def extends TDef = TDef, In = Out> {
  declare readonly $O: Out
  declare readonly $I: In

  protected readonly _def: Def

  constructor(def: Def) {
    this._def = def
  }

  abstract get _manifest(): TManifest<Def['typeName']>

  optional(): TOptional<this> {
    return TOptional.create(this)
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */

export type OutputOf<T extends TType> = T['$O']
export type InputOf<T extends TType> = T['$I']
