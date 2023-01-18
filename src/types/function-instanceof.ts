import type { TDef } from '../def'
import { type TError } from '../error'
import { IssueKind, type TIssue } from '../issues'
import { TManifest } from '../manifest'
import type { MakeTOptions, TOptions } from '../options'
import { TParsedType, type ParseContextOf, type ParseResultOf } from '../parse'
import { TTypeName } from '../type-names'
import { u } from '../utils'
import {
  TTuple,
  TType,
  TUnknown,
  type AnyTTuple,
  type InputOf,
  type OutputOf,
  type TPromise,
  type TTupleItems,
} from './_internal'

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TFunction                                                     */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TFunctionOuterIO<T extends TType | null, A extends AnyTTuple, R extends TType> = T extends TType
  ? (this: InputOf<T>, ...args: InputOf<A>) => OutputOf<R>
  : (...args: InputOf<A>) => OutputOf<R>

export type TFunctionInnerIO<T extends TType | null, A extends AnyTTuple, R extends TType> = T extends TType
  ? (this: OutputOf<T>, ...args: OutputOf<A>) => InputOf<R>
  : (...args: OutputOf<A>) => InputOf<R>

export type TFunctionOptions = MakeTOptions<{
  additionalIssueKind: IssueKind.InvalidThisType | IssueKind.InvalidArguments | IssueKind.InvalidReturnType
}>

export interface TFunctionDef<T extends TType | null, A extends AnyTTuple, R extends TType> extends TDef {
  readonly typeName: TTypeName.Function
  readonly options: TFunctionOptions
  readonly thisParameterType: T
  readonly parameters: A
  readonly returnType: R
}

export class TFunction<T extends TType | null, A extends AnyTTuple, R extends TType> extends TType<
  TFunctionOuterIO<T, A, R>,
  TFunctionDef<T, A, R>,
  TFunctionInnerIO<T, A, R>
> {
  get _manifest() {
    return TManifest<TFunctionInnerIO<T, A, R>>()({
      type: TParsedType.Function,
      thisParameterType: this.thisParameterType?.manifest() ?? null,
      parameters: this.parameters.manifest(),
      returnType: this.returnType.manifest(),
    })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (!u.isFunction(ctx.data)) {
      return ctx.invalidType({ expected: TParsedType.Function }).abort()
    }

    const makeError =
      <K extends IssueKind.InvalidThisType | IssueKind.InvalidArguments | IssueKind.InvalidReturnType>(kind: K) =>
      <T extends TType>(ctx: ParseContextOf<T>, issues: readonly TIssue[]): TError<InputOf<T>> =>
        ctx
          .addIssue<IssueKind.InvalidThisType | IssueKind.InvalidArguments | IssueKind.InvalidReturnType>(
            kind,
            { issues },
            this.options().messages?.[u.toCamelCase(kind)]
          )
          .abort().error

    const { thisParameterType, parameters, returnType } = this._def
    const { data: fn } = ctx

    if (returnType.isT(TTypeName.Promise)) {
      return ctx.success(async function (this: unknown, ...args) {
        let boundFn = fn
        if (thisParameterType) {
          const thisCtx = ctx.clone(thisParameterType, this)
          const parsedThis = await thisParameterType._parseAsync(thisCtx)
          if (!parsedThis.ok) {
            throw makeError(IssueKind.InvalidThisType)(thisCtx, parsedThis.error.issues)
          }

          boundFn = fn.bind(parsedThis.data)
        }

        const argsCtx = ctx.clone(parameters, args)
        const parsedArgs = await parameters._parseAsync(argsCtx)
        if (!parsedArgs.ok) {
          throw makeError(IssueKind.InvalidArguments)(argsCtx, parsedArgs.error.issues)
        }

        const result = (await boundFn(...parsedArgs.data)) as unknown
        const returnCtx = ctx.clone<R>(returnType, result)
        const parsedResult = await returnType._parseAsync(returnCtx)
        if (!parsedResult.ok) {
          throw makeError(IssueKind.InvalidReturnType)(returnCtx, parsedResult.error.issues)
        }

        return parsedResult.data
      } as OutputOf<this>)
    }

    return ctx.success(function (this: unknown, ...args) {
      let boundFn = fn
      if (thisParameterType) {
        const thisCtx = ctx.clone(thisParameterType, this)
        const parsedThis = thisParameterType._parseSync(thisCtx)
        if (!parsedThis.ok) {
          throw makeError(IssueKind.InvalidThisType)(thisCtx, parsedThis.error.issues)
        }

        boundFn = fn.bind(parsedThis.data)
      }

      const argsCtx = ctx.clone(parameters, args)
      const parsedArgs = parameters._parseSync(argsCtx)
      if (!parsedArgs.ok) {
        throw makeError(IssueKind.InvalidArguments)(argsCtx, parsedArgs.error.issues)
      }

      const result = boundFn(...parsedArgs.data) as unknown
      const returnCtx = ctx.clone(returnType, result)
      const parsedResult = returnType._parseSync(returnCtx)
      if (!parsedResult.ok) {
        throw makeError(IssueKind.InvalidReturnType)(returnCtx, parsedResult.error.issues)
      }

      return parsedResult.data
    } as OutputOf<this>)
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  get thisParameterType(): T {
    return this._def.thisParameterType
  }

  get parameters(): A {
    return this._def.parameters
  }

  get returnType(): R {
    return this._def.returnType
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  thisType<T_ extends TType>(thisType: T_): TFunction<T_, A, R> {
    return new TFunction({ ...this._def, thisParameterType: thisType })
  }

  omitThisParameterType(): TFunction<null, A, R> {
    return new TFunction({ ...this._def, thisParameterType: null })
  }

  args<Args extends TTupleItems>(...args: Args): TFunction<T, TTuple<Args, A['restType']>, R> {
    return new TFunction({
      ...this._def,
      parameters: (this._def.parameters.restType
        ? TTuple.create(args, this._def.parameters.restType, this.options())
        : TTuple.create(args, this.options())) as TTuple<Args, A['restType']>,
    })
  }

  rest<Rest extends TType>(rest: Rest): TFunction<T, TTuple<A['items'], Rest>, R> {
    return new TFunction({ ...this._def, parameters: this._def.parameters.rest(rest) })
  }

  removeRest(): TFunction<T, TTuple<A['items']>, R> {
    return new TFunction({ ...this._def, parameters: this._def.parameters.removeRest() })
  }

  returns<Returns extends TType>(returnType: Returns): TFunction<T, A, Returns> {
    return new TFunction({ ...this._def, returnType })
  }

  implement<F extends TFunctionInnerIO<T, A, R>>(
    fn: F
  ): ReturnType<F> extends OutputOf<R>
    ? T extends TType
      ? (this: InputOf<T>, ...args: InputOf<A>) => ReturnType<F>
      : (...args: InputOf<A>) => ReturnType<F>
    : TFunctionOuterIO<T, A, R> {
    const parsedFn = this.parse(fn)
    return parsedFn as ReturnType<F> extends OutputOf<R>
      ? T extends TType
        ? (this: InputOf<T>, ...args: InputOf<A>) => ReturnType<F>
        : (...args: InputOf<A>) => ReturnType<F>
      : TFunctionOuterIO<T, A, R>
  }

  validate<F extends TFunctionInnerIO<T, A, R>>(
    fn: F
  ): ReturnType<F> extends OutputOf<R>
    ? T extends TType
      ? (this: InputOf<T>, ...args: InputOf<A>) => ReturnType<F>
      : (...args: InputOf<A>) => ReturnType<F>
    : TFunctionOuterIO<T, A, R> {
    return this.implement(fn)
  }

  strictImplement(fn: TFunctionInnerIO<T, A, R>): TFunctionInnerIO<T, A, R> {
    const parsedFn = this.parse(fn)
    return parsedFn
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  promisify(): TFunction<T, A, TPromise<R>> {
    return new TFunction({ ...this._def, returnType: this._def.returnType.promise() })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create(options?: TFunctionOptions): TFunction<null, TTuple<[], TUnknown>, TUnknown>
  static create<A extends TTupleItems>(
    parameters: A,
    options?: TFunctionOptions
  ): TFunction<null, TTuple<A, TUnknown>, TUnknown>
  static create<A extends TTupleItems, R extends TType>(
    parameters: A,
    returnType: R,
    options?: TFunctionOptions
  ): TFunction<null, TTuple<A, TUnknown>, R>
  static create<T extends TType, A extends TTupleItems, R extends TType>(
    thisType: T,
    parameters: A,
    returnType: R,
    options?: TFunctionOptions
  ): TFunction<T, TTuple<A, TUnknown>, R>
  static create(
    first?: TFunctionOptions | TTupleItems | TType,
    second?: TFunctionOptions | TType | TTupleItems,
    third?: TFunctionOptions | TType,
    fourth?: TFunctionOptions
  ) {
    if (first instanceof TType && u.isArray(second) && third instanceof TType) {
      return new TFunction({
        typeName: TTypeName.Function,
        thisParameterType: first,
        parameters: TTuple.create(second).rest(TUnknown.create()),
        returnType: third,
        options: { ...fourth },
      })
    }

    if (u.isArray(first) && second instanceof TType) {
      return new TFunction({
        typeName: TTypeName.Function,
        thisParameterType: null,
        parameters: TTuple.create(first).rest(TUnknown.create()),
        returnType: second,
        options: { ...(third as TOptions) },
      })
    }

    if (u.isArray(first)) {
      return new TFunction({
        typeName: TTypeName.Function,
        thisParameterType: null,
        parameters: TTuple.create(first).rest(TUnknown.create()),
        returnType: TUnknown.create(),
        options: { ...(second as TOptions) },
      })
    }

    return new TFunction({
      typeName: TTypeName.Function,
      thisParameterType: null,
      parameters: TTuple.create([]).rest(TUnknown.create()),
      returnType: TUnknown.create(),
      options: { ...(first as TOptions) },
    })
  }
}

export type AnyTFunction = TFunction<TType | null, AnyTTuple, TType>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                     TInstanceOf                                                    */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TInstanceOfOptions = MakeTOptions<{
  additionalIssueKind: IssueKind.InvalidInstance
}>

export interface TInstanceOfDef<T extends u.Ctor> extends TDef {
  readonly typeName: TTypeName.InstanceOf
  readonly options: TInstanceOfOptions
  readonly cls: T
}

export class TInstanceOf<T extends u.Ctor> extends TType<InstanceType<T>, TInstanceOfDef<T>> {
  get _manifest() {
    return TManifest<InstanceType<T>>()({
      type: TParsedType.Class,
      cls: this.cls,
    })
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    const { cls } = this._def

    if (!(ctx.data instanceof cls)) {
      return ctx
        .addIssue(IssueKind.InvalidInstance, { expected: cls.name }, this.options().messages?.invalidInstance)
        .abort()
    }

    return ctx.success(ctx.data as OutputOf<this>)
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  get cls(): T {
    return this._def.cls
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create<T extends u.Ctor>(cls: T, options?: TInstanceOfOptions): TInstanceOf<T> {
    return new TInstanceOf({ typeName: TTypeName.InstanceOf, cls, options: { ...options } })
  }
}

export type AnyTInstanceOf = TInstanceOf<u.Ctor>
