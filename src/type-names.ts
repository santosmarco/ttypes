import type {
  AnyTArray,
  AnyTBrand,
  AnyTCatch,
  AnyTDate,
  AnyTDefault,
  AnyTDefined,
  AnyTEnum,
  AnyTFunction,
  AnyTInstanceOf,
  AnyTIntersection,
  AnyTLazy,
  AnyTLiteral,
  AnyTMap,
  AnyTNativeEnum,
  AnyTNullable,
  AnyTNumber,
  AnyTOptional,
  AnyTPipeline,
  AnyTPromise,
  AnyTReadonly,
  AnyTRecord,
  AnyTRef,
  AnyTSet,
  AnyTString,
  AnyTTuple,
  AnyTUnion,
  SomeTObject,
  TAny,
  TBigInt,
  TBoolean,
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
  TUndefined,
  TUnknown,
  TVoid,
} from './_internal'
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
  Falsy = 'TFalsy',
  Function = 'TFunction',
  InstanceOf = 'TInstanceOf',
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
  Primitive = 'TPrimitive',
  Promise = 'TPromise',
  PropertyKey = 'TPropertyKey',
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
  [TTypeName.Date]: AnyTDate
  [TTypeName.Default]: AnyTDefault
  [TTypeName.Defined]: AnyTDefined
  [TTypeName.Enum]: AnyTEnum
  [TTypeName.False]: TFalse
  [TTypeName.Falsy]: TFalsy
  [TTypeName.Function]: AnyTFunction
  [TTypeName.InstanceOf]: AnyTInstanceOf
  [TTypeName.Intersection]: AnyTIntersection
  [TTypeName.Lazy]: AnyTLazy
  [TTypeName.Literal]: AnyTLiteral
  [TTypeName.Map]: AnyTMap
  [TTypeName.NaN]: TNaN
  [TTypeName.NativeEnum]: AnyTNativeEnum
  [TTypeName.Never]: TNever
  [TTypeName.Null]: TNull
  [TTypeName.Nullable]: AnyTNullable
  [TTypeName.Number]: AnyTNumber
  [TTypeName.Object]: SomeTObject
  [TTypeName.Optional]: AnyTOptional
  [TTypeName.Pipeline]: AnyTPipeline
  [TTypeName.Primitive]: TPrimitive
  [TTypeName.Promise]: AnyTPromise
  [TTypeName.PropertyKey]: TPropertyKey
  [TTypeName.Readonly]: AnyTReadonly
  [TTypeName.Record]: AnyTRecord
  [TTypeName.Ref]: AnyTRef
  [TTypeName.Set]: AnyTSet
  [TTypeName.String]: AnyTString
  [TTypeName.Symbol]: TSymbol
  [TTypeName.True]: TTrue
  [TTypeName.Tuple]: AnyTTuple
  [TTypeName.Undefined]: TUndefined
  [TTypeName.Union]: AnyTUnion
  [TTypeName.Unknown]: TUnknown
  [TTypeName.Void]: TVoid
}[T]
