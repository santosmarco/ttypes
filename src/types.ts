import * as T from '@sinclair/typebox'
import { TypeCompiler } from '@sinclair/typebox/compiler'
import { Custom } from '@sinclair/typebox/custom'
import { FormatName } from 'ajv-formats'
import { CamelCase, PartialDeep } from 'type-fest'
import { TIssueKind } from './error'
import { TParser, type ParseResultOf } from './parse'
import { TSchemaErrorMessageObj } from './schemas'

/* ------------------------------ CreateParams ------------------------------ */

interface CreateParamsOptions {
  readonly additionalIssueKinds?: readonly Exclude<
    TIssueKind,
    TIssueKind.InvalidType
  >[]
}

interface CreateParams<Opts extends CreateParamsOptions | null = null> {
  readonly messages?: {
    readonly [K in
      | TIssueKind.InvalidType
      | ('additionalIssueKinds' extends keyof Opts
          ? Opts['additionalIssueKinds'][number &
              keyof Opts['additionalIssueKinds']] &
              string
          : never) as CamelCase<K>]?: string
  }
}

const processCreateParams = (
  params: CreateParams<Required<CreateParamsOptions>> | undefined
): { readonly errorMessage: Required<TSchemaErrorMessageObj> } => ({
  errorMessage: {
    type: params?.messages?.invalidType ?? TIssueKind.InvalidType,
    typeof: params?.messages?.invalidType ?? TIssueKind.InvalidType,
    format: params?.messages?.invalidFormat ?? TIssueKind.InvalidFormat,
    forbidden: params?.messages?.forbidden ?? TIssueKind.Forbidden,
  },
})

/* -------------------------------- TTypeName ------------------------------- */

export enum TTypeName {
  Any = 'TAny',
  Array = 'TArray',
  BigInt = 'TBigInt',
  Boolean = 'TBoolean',
  Intersection = 'TIntersection',
  Never = 'TNever',
  Null = 'TNull',
  Nullable = 'TNullable',
  Number = 'TNumber',
  Optional = 'TOptional',
  Promise = 'TPromise',
  String = 'TString',
  Symbol = 'TSymbol',
  Undefined = 'TUndefined',
  Union = 'TUnion',
  Unknown = 'TUnknown',
  Void = 'TVoid',
}

export type TTypeNameMap<T extends TTypeName = TTypeName> = {
  [TTypeName.Any]: { T: TAny }
  [TTypeName.Array]: { T: AnyTArray }
  [TTypeName.BigInt]: { T: TBigInt }
  [TTypeName.Boolean]: { T: TBoolean }
  [TTypeName.Intersection]: { T: AnyTIntersection }
  [TTypeName.Never]: { T: TNever }
  [TTypeName.Null]: { T: TNull }
  [TTypeName.Nullable]: { T: AnyTNullable }
  [TTypeName.Number]: { T: TNumber }
  [TTypeName.Optional]: { T: AnyTOptional }
  [TTypeName.Promise]: { T: AnyTPromise }
  [TTypeName.String]: { T: TString }
  [TTypeName.Symbol]: { T: TSymbol }
  [TTypeName.Undefined]: { T: TUndefined }
  [TTypeName.Union]: { T: AnyTUnion }
  [TTypeName.Unknown]: { T: TUnknown }
  [TTypeName.Void]: { T: TVoid }
}[T]

/* ---------------------------------- TDef ---------------------------------- */

export interface TDef {
  readonly typeName: TTypeName
  readonly schema: T.TSchema
}

export type MakeTDef<
  TN extends TTypeName,
  S extends T.TSchema,
  Extra extends Record<string, unknown> | unknown = unknown
> = Try<{ readonly typeName: TN; readonly schema: S } & Extra, TDef>

/* -------------------------------------------------------------------------- */
/*                                    TType                                   */
/* -------------------------------------------------------------------------- */

export class TType<O extends T.Static<D['schema']>, D extends TDef, I = O> {
  declare readonly $O: O
  declare readonly $I: I

  readonly _def: D
  readonly _parser: TParser<this>

  readonly typeName: D['typeName']

  constructor(def: D) {
    this._def = def
    this._parser = TParser.of(this)

    this.typeName = this._def.typeName

    this.parse = this.parse.bind(this)
    this.safeParse = this.safeParse.bind(this)
    this.parseAsync = this.parseAsync.bind(this)
    this.safeParseAsync = this.safeParseAsync.bind(this)
    this.optional = this.optional.bind(this)
    this.nullable = this.nullable.bind(this)
    this.nullish = this.nullish.bind(this)
    this.array = this.array.bind(this)
    this.promise = this.promise.bind(this)
    this.or = this.or.bind(this)
    this.and = this.and.bind(this)
    this.isT = this.isT.bind(this)
  }

  parse(data: unknown): O {
    return this._parser.parse(data)
  }

  safeParse(data: unknown): ParseResultOf<this> {
    return this._parser.safeParse(data)
  }

  async parseAsync(data: unknown): Promise<O> {
    return this._parser.parseAsync(data)
  }

  async safeParseAsync(data: unknown): Promise<ParseResultOf<this>> {
    return this._parser.safeParseAsync(data)
  }

  optional(): TOptional<this> {
    return TOptional.create(this)
  }

  nullable(): TNullable<this> {
    return TNullable.create(this)
  }

  nullish(): TOptional<TNullable<this>> {
    return this.nullable().optional()
  }

  array(): TArray<this> {
    return TArray.create(this)
  }

  promise(): TPromise<this> {
    return TPromise.create(this)
  }

  or<T extends readonly [AnyTType, ...AnyTType[]]>(
    ...types: T
  ): TUnion<[this, Head<T>, ...Tail<T>]> {
    return TUnion.create([this, head(types), ...tail(types)])
  }

  and<T extends readonly [AnyTType, ...AnyTType[]]>(
    ...types: T
  ): TIntersection<[this, Head<T>, ...Tail<T>]> {
    return TIntersection.create([this, head(types), ...tail(types)])
  }

  isT<T extends TTypeName>(type: T): this is TTypeNameMap<T>['T']
  isT<T extends readonly [TTypeName, ...TTypeName[]]>(
    ...types: T
  ): this is TTypeNameMap<T[number]>['T']
  isT(...types: TTypeName[]): this is TTypeNameMap['T'] {
    return types.some(t => this.typeName === t)
  }

  protected _setSchema(schema: T.TSchema): this {
    return this._construct({ schema })
  }

  private _construct(def?: PartialDeep<TDef>): this {
    return Reflect.construct(this.constructor as new (def: TDef) => this, [
      { ...this._def, ...def },
    ])
  }
}

export type AnyTType<O = any, I = any> = TType<O, TDef, I>

export type OutputOf<T extends AnyTType> = T['$O']
export type InputOf<T extends AnyTType> = T['$I']
export type DefOf<T extends AnyTType> = T['_def']

/* -------------------------------------------------------------------------- */
/*                                    TAny                                    */
/* -------------------------------------------------------------------------- */

export type TAnyDef = MakeTDef<TTypeName.Any, T.TAny>

export class TAny extends TType<any, TAnyDef> {
  static create(params?: CreateParams): TAny {
    return new TAny({
      typeName: TTypeName.Any,
      schema: T.Type.Any({ ...processCreateParams(params) }),
    })
  }
}

/* -------------------------------------------------------------------------- */
/*                                  TUnknown                                  */
/* -------------------------------------------------------------------------- */

export type TUnknownDef = MakeTDef<TTypeName.Unknown, T.TUnknown>

export class TUnknown extends TType<unknown, TUnknownDef> {
  static create(params?: CreateParams): TUnknown {
    return new TUnknown({
      typeName: TTypeName.Unknown,
      schema: T.Type.Unknown({ ...processCreateParams(params) }),
    })
  }
}

/* -------------------------------------------------------------------------- */
/*                                   TString                                  */
/* -------------------------------------------------------------------------- */

export type TStringDef = MakeTDef<TTypeName.String, T.TString<FormatName>>

export class TString extends TType<string, TStringDef> {
  date(options?: { readonly message?: string }): TString {
    return this._setSchema({ format: 'date' })
  }

  time(options?: { readonly message?: string }): TString {
    return this._setSchema({ format: 'time' })
  }

  datetime(options?: { readonly message?: string }): TString {
    return this._setSchema({ format: 'datetime' })
  }

  duration(options?: { readonly message?: string }): TString {
    return this._setSchema({ format: 'duration' })
  }

  email(options?: { readonly message?: string }): TString {
    return this._setSchema({ format: 'email' })
  }

  hostname(options?: { readonly message?: string }): TString {
    return this._setSchema({ format: 'hostname' })
  }

  ip(options?: {
    readonly version?: 'v4' | 'v6'
    readonly message?: string
  }): TString {
    return this._setSchema({ format: `ip${options?.version ?? 'v4'}` })
  }

  uuid(options?: { readonly message?: string }): TString {
    return this._setSchema({ format: 'uuid' })
  }

  static create(params?: CreateParams): TString {
    return new TString({
      typeName: TTypeName.String,
      schema: T.Type.String({ ...processCreateParams(params) }),
    })
  }
}

/* -------------------------------------------------------------------------- */
/*                                   TNumber                                  */
/* -------------------------------------------------------------------------- */

export type TNumberDef = MakeTDef<TTypeName.Number, T.TNumeric>

export class TNumber extends TType<number, TNumberDef> {
  static create(params?: CreateParams): TNumber {
    return new TNumber({
      typeName: TTypeName.Number,
      schema: T.Type.Number({ ...processCreateParams(params) }),
    })
  }
}

/* -------------------------------------------------------------------------- */
/*                                   TBigInt                                  */
/* -------------------------------------------------------------------------- */

Custom.Set(TTypeName.BigInt, (_, value) => typeof value === 'bigint')

export type TBigIntDef = MakeTDef<TTypeName.BigInt, T.TUnsafe<bigint>>

export class TBigInt extends TType<bigint, TBigIntDef> {
  static create(params?: CreateParams): TBigInt {
    return new TBigInt({
      typeName: TTypeName.BigInt,
      schema: T.Type.Unsafe({
        [T.Kind]: TTypeName.BigInt,
        ...processCreateParams(params),
      }),
    })
  }
}

/* -------------------------------------------------------------------------- */
/*                                  TBoolean                                  */
/* -------------------------------------------------------------------------- */

export type TBooleanDef = MakeTDef<TTypeName.Boolean, T.TBoolean>

export class TBoolean extends TType<boolean, TBooleanDef> {
  static create(params?: CreateParams): TBoolean {
    return new TBoolean({
      typeName: TTypeName.Boolean,
      schema: T.Type.Boolean({ ...processCreateParams(params) }),
    })
  }
}

/* -------------------------------------------------------------------------- */
/*                                   TSymbol                                  */
/* -------------------------------------------------------------------------- */

Custom.Set(TTypeName.Symbol, (_, value) => typeof value === 'symbol')

export type TSymbolDef = MakeTDef<TTypeName.Symbol, T.TUnsafe<symbol>>

export class TSymbol extends TType<symbol, TSymbolDef> {
  static create(params?: CreateParams): TSymbol {
    return new TSymbol({
      typeName: TTypeName.Symbol,
      schema: T.Type.Unsafe({
        [T.Kind]: TTypeName.Symbol,
        ...processCreateParams(params),
      }),
    })
  }
}

/* -------------------------------------------------------------------------- */
/*                                 TUndefined                                 */
/* -------------------------------------------------------------------------- */

export type TUndefinedDef = MakeTDef<TTypeName.Undefined, T.TUndefined>

export class TUndefined extends TType<undefined, TUndefinedDef> {
  static create(params?: CreateParams): TUndefined {
    return new TUndefined({
      typeName: TTypeName.Undefined,
      schema: T.Type.Undefined({ ...processCreateParams(params) }),
    })
  }
}

/* -------------------------------------------------------------------------- */
/*                                    TVoid                                   */
/* -------------------------------------------------------------------------- */

export type TVoidDef = MakeTDef<TTypeName.Void, T.TUnsafe<void>>

export class TVoid extends TType<void, TVoidDef> {
  static create(params?: CreateParams): TVoid {
    return new TVoid({
      typeName: TTypeName.Void,
      schema: T.Type.Undefined({ ...processCreateParams(params) }),
    })
  }
}

/* -------------------------------------------------------------------------- */
/*                                    TNull                                   */
/* -------------------------------------------------------------------------- */

export type TNullDef = MakeTDef<TTypeName.Null, T.TNull>

export class TNull extends TType<null, TNullDef> {
  static create(params?: CreateParams): TNull {
    return new TNull({
      typeName: TTypeName.Null,
      schema: T.Type.Null({ ...processCreateParams(params) }),
    })
  }
}

/* -------------------------------------------------------------------------- */
/*                                   TNever                                   */
/* -------------------------------------------------------------------------- */

export type TNeverDef = MakeTDef<TTypeName.Never, T.TNever>

export class TNever extends TType<never, TNeverDef> {
  static create(
    params?: CreateParams<{ additionalIssueKinds: [TIssueKind.Forbidden] }>
  ): TNever {
    return new TNever({
      typeName: TTypeName.Never,
      schema: T.Type.Never({ ...processCreateParams(params) }),
    })
  }
}

/* -------------------------------------------------------------------------- */
/*                                   TArray                                   */
/* -------------------------------------------------------------------------- */

export type TArrayCardinality = 'atleastone' | 'many'

export type TArrayDef<T extends AnyTType> = MakeTDef<
  TTypeName.Array,
  T.TArray<T['_def']['schema']>,
  { readonly element: T }
>

export type TArrayIO<
  T extends AnyTType,
  C extends TArrayCardinality,
  IO extends '$I' | '$O' = '$O'
> = {
  atleastone: [T[IO], ...T[IO][]]
  many: T[IO][]
}[C]

export class TArray<
  T extends AnyTType,
  C extends TArrayCardinality = 'many'
> extends TType<TArrayIO<T, C>[], TArrayDef<T>, TArrayIO<T, C, '$I'>[]> {
  get element(): T {
    return this._def.element
  }

  min(value: number): TArray<T, C> {
    return this._setSchema(
      T.Type.Array(this.element._def.schema, {
        ...this._def.schema,
        minItems: value,
      })
    )
  }

  max(value: number): TArray<T, C> {
    return this._setSchema(
      T.Type.Array(this.element._def.schema, {
        ...this._def.schema,
        maxItems: value,
      })
    )
  }

  length(value: number): TArray<T, C> {
    return this.min(value).max(value)
  }

  nonempty(): TArray<T, 'atleastone'> {
    return this.min(1) as TArray<T, 'atleastone'>
  }

  static create<T extends AnyTType>(
    element: T,
    params?: CreateParams
  ): TArray<T, 'many'> {
    return new TArray({
      typeName: TTypeName.Array,
      schema: T.Type.Array(element._def.schema, {
        ...processCreateParams(params),
      }),
      element,
    })
  }
}

export type AnyTArray = TArray<AnyTType>

/* ------------------------------- Unwrappable ------------------------------ */

export type UnwrapDeep<T extends AnyTType, TN extends TTypeName> = T extends {
  readonly typeName: TN
  readonly underlying: infer U extends AnyTType
}
  ? UnwrapDeep<U, TN>
  : T

export interface Unwrappable<T extends AnyTType> extends AnyTType {
  readonly underlying: T
  unwrap(): T
  unwrapDeep(): UnwrapDeep<T, this['typeName']>
}

/* -------------------------------------------------------------------------- */
/*                                  TOptional                                 */
/* -------------------------------------------------------------------------- */

Custom.Set<{ readonly underlying: T.TSchema }>(
  TTypeName.Optional,
  (schema, value) =>
    value === undefined || TypeCompiler.Compile(schema.underlying).Check(value)
)

export type TOptionalDef<T extends AnyTType> = MakeTDef<
  TTypeName.Optional,
  T.TUnsafe<OutputOf<T> | undefined>,
  { readonly underlying: T }
>

export class TOptional<T extends AnyTType>
  extends TType<
    OutputOf<T> | undefined,
    TOptionalDef<T>,
    InputOf<T> | undefined
  >
  implements Unwrappable<T>
{
  get underlying(): T {
    return this._def.underlying
  }

  unwrap(): T {
    return this.underlying
  }

  unwrapDeep(): UnwrapDeep<T, TTypeName.Optional> {
    return this.underlying instanceof TOptional
      ? this.underlying.unwrapDeep()
      : this.underlying
  }

  static create<T extends AnyTType>(
    underlying: T,
    params?: CreateParams
  ): TOptional<T> {
    return new TOptional({
      typeName: TTypeName.Optional,
      underlying,
      schema: T.Type.Unsafe({
        ...processCreateParams(params),
        [T.Kind]: TTypeName.Optional,
        [T.Modifier]: 'Optional',
        underlying: underlying._def.schema,
      }),
    })
  }
}

export type AnyTOptional = TOptional<AnyTType>

/* -------------------------------------------------------------------------- */
/*                                  TNullable                                 */
/* -------------------------------------------------------------------------- */

Custom.Set<{ readonly underlying: T.TSchema }>(
  TTypeName.Nullable,
  (schema, value) =>
    value === null || TypeCompiler.Compile(schema.underlying).Check(value)
)

export type TNullableDef<T extends AnyTType> = MakeTDef<
  TTypeName.Nullable,
  T.TUnsafe<OutputOf<T> | null>,
  { readonly underlying: T }
>

export class TNullable<T extends AnyTType>
  extends TType<OutputOf<T> | null, TNullableDef<T>, InputOf<T> | null>
  implements Unwrappable<T>
{
  get underlying(): T {
    return this._def.underlying
  }

  unwrap(): T {
    return this.underlying
  }

  unwrapDeep(): UnwrapDeep<T, TTypeName.Nullable> {
    return this.underlying instanceof TNullable
      ? this.underlying.unwrapDeep()
      : this.underlying
  }

  static create<T extends AnyTType>(
    underlying: T,
    params?: CreateParams
  ): TNullable<T> {
    return new TNullable({
      typeName: TTypeName.Nullable,
      underlying,
      schema: T.Type.Unsafe({
        ...processCreateParams(params),
        [T.Kind]: TTypeName.Nullable,
        underlying: underlying._def.schema,
      }),
    })
  }
}

export type AnyTNullable = TNullable<AnyTType>

/* -------------------------------------------------------------------------- */
/*                                  TPromise                                  */
/* -------------------------------------------------------------------------- */

export type TPromiseDef<T extends AnyTType> = MakeTDef<
  TTypeName.Promise,
  T.TPromise<T['_def']['schema']>,
  { readonly underlying: T }
>

export class TPromise<T extends AnyTType>
  extends TType<Promise<OutputOf<T>>, TPromiseDef<T>, Promise<InputOf<T>>>
  implements Unwrappable<T>
{
  get underlying(): T {
    return this._def.underlying
  }

  unwrap(): T {
    return this.underlying
  }

  unwrapDeep(): UnwrapDeep<T, TTypeName.Promise> {
    return this.underlying instanceof TPromise
      ? this.underlying.unwrapDeep()
      : this.underlying
  }

  static create<T extends AnyTType>(
    underlying: T,
    params?: CreateParams
  ): TPromise<T> {
    return new TPromise({
      typeName: TTypeName.Promise,
      underlying,
      schema: T.Type.Promise(underlying._def.schema, {
        ...processCreateParams(params),
      }),
    })
  }
}

export type AnyTPromise = TPromise<AnyTType>

/* -------------------------------- TMembers -------------------------------- */

export type TMembers = readonly [AnyTType, AnyTType, ...AnyTType[]]

export type FlattenTMembers<
  T extends TTypeName.Union | TTypeName.Intersection,
  M extends TMembers
> = M extends readonly [
  infer A extends AnyTType,
  infer B extends AnyTType,
  ...infer R
]
  ? [
      ...(A extends TTypeNameMap<T>['T']
        ? FlattenTMembers<T, A['members']>
        : [A]),
      ...(B extends TTypeNameMap<T>['T']
        ? FlattenTMembers<T, B['members']>
        : [B]),
      ...(R extends TMembers
        ? FlattenTMembers<T, R>
        : R extends readonly [infer C, infer D]
        ? [C, D]
        : R extends readonly [infer C]
        ? [C]
        : [])
    ]
  : never

export const flattenTMembers = <
  T extends TTypeName.Union | TTypeName.Intersection,
  M extends TMembers
>(
  t: T,
  members: M
): FlattenTMembers<T, M> =>
  members.reduce((acc, m) => {
    if (m.isT(t)) {
      return [...acc, ...flattenTMembers(t, m.members)] as AnyTType[]
    }
    return [...acc, m]
  }, [] as AnyTType[]) as FlattenTMembers<T, M>

/* -------------------------------------------------------------------------- */
/*                                   TUnion                                   */
/* -------------------------------------------------------------------------- */

export type TUnionDef<T extends TMembers> = MakeTDef<
  TTypeName.Union,
  T.TUnion<T[number]['_def']['schema'][]>,
  { readonly members: T }
>

export class TUnion<T extends TMembers> extends TType<
  OutputOf<T[number]>,
  TUnionDef<T>,
  InputOf<T[number]>
> {
  get members(): T {
    return this._def.members
  }

  flatten(): TUnion<FlattenTMembers<TTypeName.Union, T>> {
    return TUnion.create(flattenTMembers(TTypeName.Union, this.members))
  }

  static create<T extends TMembers>(
    members: T,
    params?: CreateParams
  ): TUnion<T> {
    return new TUnion({
      typeName: TTypeName.Union,
      members,
      schema: T.Type.Union(
        members.map(m => m._def.schema),
        { ...processCreateParams(params) }
      ),
    })
  }
}

export type AnyTUnion = TUnion<TMembers>

/* -------------------------------------------------------------------------- */
/*                                TIntersection                               */
/* -------------------------------------------------------------------------- */

export type TIntersectionDef<T extends TMembers> = MakeTDef<
  TTypeName.Intersection,
  { readonly members: T }
>

export class TIntersection<T extends TMembers> extends TType<
  UnionToIntersection<OutputOf<T[number]>>,
  TIntersectionDef<T>,
  UnionToIntersection<InputOf<T[number]>>
> {
  get members(): T {
    return this._def.members
  }

  flatten(): TIntersection<FlattenTMembers<TTypeName.Intersection, T>> {
    return TIntersection.create(
      flattenTMembers(TTypeName.Intersection, this.members)
    )
  }

  static create<T extends TMembers>(members: T): TIntersection<T> {
    return new TIntersection({
      typeName: TTypeName.Intersection,
      members,
      _t: T.Type.Unsafe({ [T.Kind]: 'intersection' }),
    })
  }
}

export type AnyTIntersection = TIntersection<TMembers>

/* -------------------------------- External -------------------------------- */

export const anyType = TAny.create
export const arrayType = TArray.create
export const bigintType = TBigInt.create
export const booleanType = TBoolean.create
export const intersectionType = TIntersection.create
export const neverType = TNever.create
export const nullableType = TNullable.create
export const nullType = TNull.create
export const numberType = TNumber.create
export const optionalType = TOptional.create
export const promiseType = TPromise.create
export const stringType = TString.create
export const symbolType = TSymbol.create
export const undefinedType = TUndefined.create
export const unionType = TUnion.create
export const unknownType = TUnknown.create
export const voidType = TVoid.create

export {
  anyType as any,
  arrayType as array,
  bigintType as bigint,
  booleanType as boolean,
  intersectionType as intersection,
  neverType as never,
  nullableType as nullable,
  nullType as null,
  numberType as number,
  optionalType as optional,
  promiseType as promise,
  stringType as string,
  symbolType as symbol,
  undefinedType as undefined,
  unionType as union,
  unknownType as unknown,
  voidType as void,
}

export type output<T extends AnyTType> = OutputOf<T>
export type input<T extends AnyTType> = InputOf<T>
export type infer<T extends AnyTType> = OutputOf<T>

/* ---------------------------------- Utils --------------------------------- */

type Try<A, B, Catch = never> = A extends B ? A : Catch

type Head<T extends readonly [unknown, ...unknown[]]> = T extends readonly [
  infer H,
  ...unknown[]
]
  ? H
  : never

type Tail<T extends readonly [unknown, ...unknown[]]> = T extends readonly [
  unknown,
  ...infer R
]
  ? R
  : never

const head = <T extends readonly [unknown, ...unknown[]]>(arr: T): Head<T> =>
  arr[0] as Head<T>

const tail = <T extends readonly [unknown, ...unknown[]]>(arr: T): Tail<T> =>
  arr.slice(1) as Tail<T>

type UnionToIntersection<T> = (
  T extends unknown ? (x: T) => void : never
) extends (x: infer I) => void
  ? I
  : never
