import type {
  AnyTArray,
  AnyTBigInt,
  AnyTBoolean,
  AnyTBrand,
  AnyTCatch,
  AnyTConstructor,
  AnyTDefault,
  AnyTDefined,
  AnyTDelete,
  AnyTEffects,
  AnyTEnum,
  AnyTFunction,
  AnyTInstanceOf,
  AnyTIntersection,
  AnyTLazy,
  AnyTLiteral,
  AnyTMap,
  AnyTNonNullable,
  AnyTNot,
  AnyTNullable,
  AnyTNumber,
  AnyTOptional,
  AnyTPipeline,
  AnyTPromise,
  AnyTRecord,
  AnyTRef,
  AnyTSet,
  AnyTString,
  AnyTSuperDefault,
  AnyTTuple,
  AnyTUnion,
  SomeTObject,
  TAny,
  TBuffer,
  TFalse,
  TFalsy,
  TNaN,
  TNever,
  TNull,
  TPrimitive,
  TPropertyKey,
  TSymbol,
  TTrue,
  TType,
  TUndefined,
  TUnknown,
  TVoid,
} from './types/_internal'

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
  Constructor = 'TConstructor',
  Custom = 'TCustom',
  Date = 'TDate',
  Default = 'TDefault',
  Defined = 'TDefined',
  Delete = 'TStrip',
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

export type TTypeNameMap<T extends TTypeName = TTypeName> = {
  [TTypeName.Any]: TAny
  [TTypeName.Array]: AnyTArray
  [TTypeName.BigInt]: AnyTBigInt
  [TTypeName.Boolean]: AnyTBoolean
  [TTypeName.Brand]: AnyTBrand
  [TTypeName.Buffer]: TBuffer
  [TTypeName.Catch]: AnyTCatch
  [TTypeName.Constructor]: AnyTConstructor
  [TTypeName.Custom]: TType
  [TTypeName.Date]: TType //
  [TTypeName.Default]: AnyTDefault
  [TTypeName.Defined]: AnyTDefined
  [TTypeName.Delete]: AnyTDelete
  [TTypeName.DiscriminatedUnion]: TType //
  [TTypeName.Effects]: AnyTEffects
  [TTypeName.Enum]: AnyTEnum
  [TTypeName.False]: TFalse
  [TTypeName.Falsy]: TFalsy
  [TTypeName.Function]: AnyTFunction
  [TTypeName.If]: TType //
  [TTypeName.InstanceOf]: AnyTInstanceOf
  [TTypeName.Intersection]: AnyTIntersection
  [TTypeName.Lazy]: AnyTLazy
  [TTypeName.Literal]: AnyTLiteral
  [TTypeName.Map]: AnyTMap
  [TTypeName.NaN]: TNaN
  [TTypeName.NativeEnum]: TType //
  [TTypeName.Never]: TNever
  [TTypeName.NonNullable]: AnyTNonNullable
  [TTypeName.Not]: AnyTNot
  [TTypeName.Null]: TNull
  [TTypeName.Nullable]: AnyTNullable
  [TTypeName.Number]: AnyTNumber
  [TTypeName.Object]: SomeTObject
  [TTypeName.Optional]: AnyTOptional
  [TTypeName.Pipeline]: AnyTPipeline
  [TTypeName.Primitive]: TPrimitive
  [TTypeName.Promise]: AnyTPromise
  [TTypeName.PropertyKey]: TPropertyKey
  [TTypeName.Readonly]: TType //
  [TTypeName.Record]: AnyTRecord
  [TTypeName.Ref]: AnyTRef
  [TTypeName.Set]: AnyTSet
  [TTypeName.String]: AnyTString
  [TTypeName.SuperDefault]: AnyTSuperDefault
  [TTypeName.Symbol]: TSymbol
  [TTypeName.True]: TTrue
  [TTypeName.Tuple]: AnyTTuple
  [TTypeName.Undefined]: TUndefined
  [TTypeName.Union]: AnyTUnion
  [TTypeName.Unknown]: TUnknown
  [TTypeName.Void]: TVoid
}[T]
