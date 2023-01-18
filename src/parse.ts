import type { TDef } from './def'
import { TError, resolveErrorMaps } from './error'
import { getGlobal } from './global'
import { IssueKind, type TIssue } from './issues'
import { type ParseOptions } from './options'
import { emptyMarker, type InputOf, type OutputOf, type TType } from './types/_internal'
import { u } from './utils'

/* --------------------------------------------------- TParsedType -------------------------------------------------- */

export enum TParsedType {
  Any = 'any',
  Array = 'Array',
  BigInt = 'bigint',
  BigIntZero = '0n',
  Boolean = 'boolean',
  Buffer = 'Buffer',
  Constructor = 'constructor',
  Date = 'Date',
  EmptyString = '""',
  False = 'false',
  Falsy = 'false | 0 | "" | null | undefined',
  Function = 'function',
  Integer = 'integer',
  Intersection = 'Intersection',
  Map = 'Map',
  NaN = 'NaN',
  Never = 'never',
  NoData = 'no data',
  Null = 'null',
  Number = 'number',
  Object = 'object',
  Primitive = 'string | number | bigint | boolean | symbol | null | undefined',
  Promise = 'Promise',
  PropertyKey = 'string | number | symbol',
  RegExp = 'RegExp',
  Set = 'Set',
  String = 'string',
  StringOrNumber = 'string | number',
  Symbol = 'symbol',
  True = 'true',
  Tuple = 'Tuple',
  TypedArray = 'TypedArray',
  Undefined = 'undefined',
  Union = 'Union',
  Unknown = 'unknown',
  Void = 'void',
  WeakMap = 'WeakMap',
  WeakSet = 'WeakSet',
  Zero = '0',
}

export namespace TParsedType {
  /* eslint-disable @typescript-eslint/no-unnecessary-qualifier */

  export const get = (x: unknown): TParsedType => {
    if (x === emptyMarker) return TParsedType.NoData

    switch (typeof x) {
      case 'string':
        return TParsedType.String
      case 'number':
        if (Number.isNaN(x)) return TParsedType.NaN
        return TParsedType.Number
      case 'bigint':
        return TParsedType.BigInt
      case 'boolean':
        return TParsedType.Boolean
      case 'symbol':
        return TParsedType.Symbol
      case 'undefined':
        return TParsedType.Undefined
      case 'function':
        if (u.isConstructor(x)) return TParsedType.Constructor
        return TParsedType.Function
      case 'object':
        if (u.isArray(x)) return TParsedType.Array
        if (u.isAsync(x)) return TParsedType.Promise
        if (u.isBuffer(x)) return TParsedType.Buffer
        if (u.isDate(x)) return TParsedType.Date
        if (u.isFunction(x)) return TParsedType.Function
        if (u.isMap(x)) return TParsedType.Map
        if (u.isNull(x)) return TParsedType.Null
        if (u.isRegExp(x)) return TParsedType.RegExp
        if (u.isSet(x)) return TParsedType.Set
        if (u.isTypedArray(x)) return TParsedType.TypedArray
        if (u.isWeakMap(x)) return TParsedType.WeakMap
        if (u.isWeakSet(x)) return TParsedType.WeakSet
        return TParsedType.Object

      default:
        return TParsedType.Unknown
    }
  }

  export const Literal = (x: u.Primitive): TParsedType => {
    if (u.isNull(x)) {
      return TParsedType.Null
    }

    switch (typeof x) {
      case 'string':
        return TParsedType.String
      case 'number':
        return TParsedType.Number
      case 'bigint':
        return TParsedType.BigInt
      case 'boolean':
        return TParsedType.Boolean
      case 'symbol':
        return TParsedType.Symbol
      case 'undefined':
        return TParsedType.Undefined

      default:
        return TParsedType.Unknown
    }
  }

  export const Enum = (values: ReadonlyArray<string | number>): TParsedType => {
    const types = [...new Set(values.map(TParsedType.Literal))]
    return types.length === 1 ? types[0] : TParsedType.StringOrNumber
  }

  /* eslint-enable @typescript-eslint/no-unnecessary-qualifier */
}

/* --------------------------------------------------- ParseResult -------------------------------------------------- */

export interface SuccessfulParseResult<O> {
  readonly ok: true
  readonly data: O
  readonly error?: never
}

export interface FailedParseResult<I> {
  readonly ok: false
  readonly data?: never
  readonly error: TError<I>
}

export type SyncParseResult<O, I> = SuccessfulParseResult<O> | FailedParseResult<I>
export type AsyncParseResult<O, I> = Promise<SyncParseResult<O, I>>
export type ParseResult<O, I> = SyncParseResult<O, I> | AsyncParseResult<O, I>

export type SuccessfulParseResultOf<T extends TType> = SuccessfulParseResult<OutputOf<T>>
export type FailedParseResultOf<T extends TType> = FailedParseResult<InputOf<T>>
export type SyncParseResultOf<T extends TType> = SyncParseResult<OutputOf<T>, InputOf<T>>
export type AsyncParseResultOf<T extends TType> = AsyncParseResult<OutputOf<T>, InputOf<T>>
export type ParseResultOf<T extends TType> = ParseResult<OutputOf<T>, InputOf<T>>

export const OK = <O>(data: O): SuccessfulParseResult<O> => ({ ok: true, data })
export const FAIL = <I>(error: TError<I>): FailedParseResult<I> => ({ ok: false, error })

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                    ParseContext                                                    */
/* ------------------------------------------------------------------------------------------------------------------ */

export enum ParseStatus {
  Valid = 'valid',
  Invalid = 'invalid',
}

export type ParsePath = ReadonlyArray<string | number>

export interface ParseContextCommon extends ParseOptions {
  readonly async: boolean
}

export interface ParseContextDef<T extends TType> {
  readonly schema: T
  readonly data: unknown
  readonly path: ParsePath
  readonly parent: AnyParseContext | undefined
  readonly common: ParseContextCommon
}

export interface ParseContextInternals {
  status: ParseStatus
  data: unknown
  readonly ownChildren: AnyParseContext[]
  readonly ownIssues: TIssue[]
}

export interface ParseContext<O, I = O> {
  readonly status: ParseStatus
  readonly data: unknown
  readonly parsedType: TParsedType
  readonly schema: TType<O, TDef, I>
  readonly path: ParsePath
  readonly parent: AnyParseContext | undefined
  readonly root: AnyParseContext
  readonly common: ParseContextCommon
  readonly ownChildren: readonly AnyParseContext[]
  readonly allChildren: readonly AnyParseContext[]
  readonly ownIssues: readonly TIssue[]
  readonly allIssues: readonly TIssue[]
  setData(data: unknown): this
  isValid(): boolean
  isInvalid(): boolean
  setInvalid(): this
  child<T extends TType>(schema: T, data: unknown, path?: ReadonlyArray<ParsePath[number] | symbol>): ParseContextOf<T>
  clone<T extends TType>(schema: T, data: unknown, path?: ReadonlyArray<ParsePath[number] | symbol>): ParseContextOf<T>
  _addIssue<K extends IssueKind>(
    issue: u.LooseStripKey<TIssue<K>, 'path' | 'data' | 'manifest'> & {
      readonly path?: ParsePath
      readonly fatal?: boolean
    }
  ): void
  addIssue<K extends IssueKind>(
    kind: K,
    ...args: 'payload' extends u.OptionalKeysOf<TIssue<K>>
      ? [message: string | undefined]
      : [payload: TIssue<K>['payload'], message: string | undefined]
  ): this
  invalidType(payload: { readonly expected: TParsedType }): this
  success<T>(data: T): SuccessfulParseResult<T>
  abort(): FailedParseResult<I>
}

export type AnyParseContext = ParseContextOf<TType>

export type ParseContextOf<T extends TType> = ParseContext<OutputOf<T>, InputOf<T>>

export const ParseContext = <T extends TType>({
  schema,
  data,
  path,
  parent,
  common,
}: ParseContextDef<T>): ParseContextOf<T> => {
  const _internals: ParseContextInternals = u.cloneDeep({
    status: ParseStatus.Valid,
    data,
    ownChildren: [],
    ownIssues: [],
  })

  const ctx: ParseContextOf<T> = {
    get status() {
      return _internals.status
    },

    get data() {
      return _internals.data
    },

    get parsedType() {
      return TParsedType.get(this.data)
    },

    get schema() {
      return schema
    },

    get path() {
      return path
    },

    get parent() {
      return parent
    },

    get root() {
      return parent ? parent.root : this
    },

    get common() {
      return common
    },

    get ownChildren() {
      return _internals.ownChildren
    },

    get allChildren() {
      return this.ownChildren.concat(this.ownChildren.flatMap((child) => child.allChildren))
    },

    get ownIssues() {
      return _internals.ownIssues
    },

    get allIssues() {
      return this.ownIssues.concat(this.ownChildren.flatMap((child) => child.allIssues))
    },

    setData(data: unknown) {
      _internals.data = data
      return this
    },

    isValid() {
      return this.status === ParseStatus.Valid && this.allChildren.every((child) => child.isValid())
    },

    isInvalid() {
      return this.status === ParseStatus.Invalid || this.allChildren.some((child) => child.isInvalid())
    },

    setInvalid() {
      _internals.status = ParseStatus.Invalid
      this.parent?.setInvalid()
      return this
    },

    child(schema, data, path) {
      const child = ParseContext({
        schema,
        data,
        path: this.path.concat((path ?? []).map((p) => (typeof p === 'symbol' ? String(p) : p))),
        parent: this,
        common: this.common,
      })
      _internals.ownChildren.push(child)
      return child
    },

    clone(schema, data, path) {
      return ParseContext({
        schema,
        data,
        path: this.path.concat((path ?? []).map((p) => (typeof p === 'symbol' ? String(p) : p))),
        parent: undefined,
        common: this.common,
      })
    },

    _addIssue(issue) {
      const shouldAbort = issue.fatal ?? this.common.abortEarly

      if (issue.fatal && this.isValid()) {
        this.setInvalid()
      }

      if (this.isInvalid()) {
        if (shouldAbort) {
          return
        }
      } else {
        this.setInvalid()
      }

      let issueWithPath = {
        ...issue,
        path: this.path.concat(issue.path ?? []),
        data: this.data,
        manifest: this.schema.manifest(),
      }

      if (issueWithPath.payload === undefined) {
        issueWithPath = u.omit(issueWithPath, ['payload']) as typeof issueWithPath
      }

      const issueMsg =
        issue.message ??
        resolveErrorMaps([
          this.common.contextualErrorMap,
          this.schema.options().schemaErrorMap,
          getGlobal().getErrorMap(),
          TError.defaultIssueMap,
        ])(issueWithPath)

      _internals.ownIssues.push({ ...issueWithPath, message: issueMsg })
    },

    addIssue(kind, ...args) {
      const [payload, message] = args.length === 2 ? args : [undefined, args[0]]

      this._addIssue({ kind, payload, message } as TIssue)

      return this
    },

    invalidType(payload) {
      if (this.data === undefined) {
        return this.addIssue(IssueKind.Required, this.schema.options().messages?.required)
      }

      return this.addIssue(
        IssueKind.InvalidType,
        { expected: payload.expected, received: this.parsedType },
        this.schema.options().messages?.invalidType
      )
    },

    success(data) {
      return OK(data)
    },

    abort() {
      return FAIL(TError.fromContext(this))
    },
  }

  return ctx
}

ParseContext.of = <T extends TType>(schema: T, data: unknown, common: ParseContextCommon): ParseContextOf<T> =>
  ParseContext({ schema, data, path: [], parent: undefined, common })

export const SyncParseContext = {
  of: <T extends TType>(schema: T, data: unknown, options: ParseOptions | undefined): ParseContextOf<T> =>
    ParseContext.of(schema, data, { ...getGlobal().getOptions(), ...schema.options(), ...options, async: false }),
}

export const AsyncParseContext = {
  of: <T extends TType>(schema: T, data: unknown, options: ParseOptions | undefined): ParseContextOf<T> =>
    ParseContext.of(schema, data, { ...getGlobal().getOptions(), ...schema.options(), ...options, async: true }),
}
