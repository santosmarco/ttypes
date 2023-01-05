import type {
  AnyTArray,
  AnyTBrand,
  AnyTCatch,
  AnyTDefault,
  AnyTDefined,
  AnyTEnum,
  AnyTIntersection,
  AnyTLazy,
  AnyTLiteral,
  AnyTMap,
  AnyTNativeEnum,
  AnyTNullable,
  SomeTObject,
  AnyTOptional,
  AnyTPipeline,
  AnyTPromise,
  AnyTReadonly,
  AnyTRecord,
  AnyTRef,
  AnyTSet,
  AnyTTuple,
  AnyTUnion,
  TAny,
  TBigInt,
  TBoolean,
  TBuffer,
  TDate,
  TFalse,
  TNaN,
  TNever,
  TNull,
  TNumber,
  TString,
  TSymbol,
  TTrue,
  TUndefined,
  TUnknown,
  TVoid,
} from './_internal'

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
  Date = 'TDate',
  Default = 'TDefault',
  Defined = 'TDefined',
  Enum = 'TEnum',
  False = 'TFalse',
  Intersection = 'TIntersection',
  Lazy = 'TLazy',
  Literal = 'TLiteral',
  Map = 'TMap',
  NaN = 'TNaN',
  NativeEnum = 'TNativeEnum',
  Never = 'TNever',
  Null = 'TNull',
  Nullable = 'TNullable',
  Number = 'TNumber',
  Object = 'TObject',
  Optional = 'TOptional',
  Pipeline = 'TPipeline',
  Promise = 'TPromise',
  Readonly = 'TReadonly',
  Record = 'TRecord',
  Ref = 'TRef',
  Set = 'TSet',
  String = 'TString',
  Symbol = 'TSymbol',
  True = 'TTrue',
  Tuple = 'TTuple',
  Undefined = 'TUndefined',
  Union = 'TUnion',
  Unknown = 'TUnknown',
  Void = 'TVoid',
}

export type TTypeNameMap<T extends TTypeName> = {
  [TTypeName.Any]: TAny
  [TTypeName.Array]: AnyTArray
  [TTypeName.BigInt]: TBigInt
  [TTypeName.Boolean]: TBoolean
  [TTypeName.Brand]: AnyTBrand
  [TTypeName.Buffer]: TBuffer
  [TTypeName.Catch]: AnyTCatch
  [TTypeName.Date]: TDate
  [TTypeName.Default]: AnyTDefault
  [TTypeName.Enum]: AnyTEnum
  [TTypeName.False]: TFalse
  [TTypeName.Intersection]: AnyTIntersection
  [TTypeName.Lazy]: AnyTLazy
  [TTypeName.Literal]: AnyTLiteral
  [TTypeName.Map]: AnyTMap
  [TTypeName.NaN]: TNaN
  [TTypeName.NativeEnum]: AnyTNativeEnum
  [TTypeName.Never]: TNever
  [TTypeName.Null]: TNull
  [TTypeName.Nullable]: AnyTNullable
  [TTypeName.Number]: TNumber
  [TTypeName.Object]: SomeTObject
  [TTypeName.Optional]: AnyTOptional
  [TTypeName.Pipeline]: AnyTPipeline
  [TTypeName.Promise]: AnyTPromise
  [TTypeName.Readonly]: AnyTReadonly
  [TTypeName.Record]: AnyTRecord
  [TTypeName.Defined]: AnyTDefined
  [TTypeName.Ref]: AnyTRef
  [TTypeName.Set]: AnyTSet
  [TTypeName.String]: TString
  [TTypeName.Symbol]: TSymbol
  [TTypeName.True]: TTrue
  [TTypeName.Tuple]: AnyTTuple
  [TTypeName.Undefined]: TUndefined
  [TTypeName.Union]: AnyTUnion
  [TTypeName.Unknown]: TUnknown
  [TTypeName.Void]: TVoid
}[T]
