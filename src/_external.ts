import * as t from './types/_internal'
export * from './types/_internal'

export const anyType = t.TAny.create
export const arrayType = t.TArray.create
export const bigintType = t.TBigInt.create
export const booleanType = t.TBoolean.create
export const brandType = t.TBrand.create
export const bufferType = t.TBuffer.create
export const castType = t.TCast
export const catchType = t.TCatch.create
export const coerceType = t.TCoerce
export const defaultType = t.TDefault.create
export const definedType = t.TDefined.create
export const falseType = t.TFalse.create
export const falsyType = t.TFalsy.create
export const intersectionType = t.TIntersection.create
export const lazyType = t.TLazy.create
export const nanType = t.TNaN.create
export const neverType = t.TNever.create
export const nonnullableType = t.TNonNullable.create
export const notType = t.TNot.create
export const nullableType = t.TNullable.create
export const nullType = t.TNull.create
export const numberType = t.TNumber.create
export const objectType = t.TObject.create
export const optionalType = t.TOptional.create
export const preprocessType = t.TPreprocess.create
export const primitiveType = t.TPrimitive.create
export const promiseType = t.TPromise.create
export const propertykeyType = t.TPropertyKey.create
export const refinementType = t.TRefinement.create
export const refType = t.TRef.create
export const setType = t.TSet.create
export const stringType = t.TString.create
export const superDefaultType = t.TSuperDefault.create
export const symbolType = t.TSymbol.create
export const transformType = t.TTransform.create
export const trueType = t.TTrue.create
export const tupleType = t.TTuple.create
export const undefinedType = t.TUndefined.create
export const unionType = t.TUnion.create
export const unknownType = t.TUnknown.create
export const voidType = t.TVoid.create

export {
  anyType as any,
  arrayType as array,
  bigintType as bigint,
  booleanType as bool,
  booleanType as boolean,
  brandType as brand,
  brandType as branded,
  bufferType as binary,
  bufferType as buffer,
  castType as cast,
  catchType as catch,
  coerceType as coerce,
  defaultType as def,
  definedType as defined,
  falseType as false,
  falsyType as falsey,
  falsyType as falsy,
  intersectionType as and,
  intersectionType as intersection,
  lazyType as lazy,
  nanType as nan,
  neverType as never,
  nonnullableType as nonnullable,
  notType as nope,
  notType as not,
  nullableType as nullable,
  nullType as null,
  numberType as number,
  objectType as object,
  optionalType as optional,
  preprocessType as preprocess,
  primitiveType as primitive,
  promiseType as promise,
  propertykeyType as propertykey,
  refinementType as refine,
  refinementType as refinement,
  refType as ref,
  setType as set,
  stringType as string,
  superDefaultType as superDef,
  superDefaultType as superDefault,
  symbolType as symbol,
  transformType as transform,
  trueType as true,
  tupleType as tuple,
  undefinedType as undef,
  undefinedType as undefined,
  unionType as or,
  unionType as union,
  unknownType as unknown,
  voidType as void,
}

export type output<T extends t.TType> = t.OutputOf<T>
export type input<T extends t.TType> = t.InputOf<T>
export type infer<T extends t.TType> = output<T>

export default t
