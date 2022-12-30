import cloneDeep from 'clone-deep'
import { TError, TIssue, TIssueKind } from './error'
import type { AnyTType, InputOf, OutputOf } from './types_v2'
import { isArray, isAsync, type StrictOmit, type StripKey } from './utils'

/* --------------------------------------------------- TParsedType -------------------------------------------------- */

export enum TParsedType {
  Array = 'Array',
  BigInt = 'bigint',
  Boolean = 'boolean',
  Buffer = 'Buffer',
  Date = 'Date',
  False = 'false',
  Function = 'function',
  Map = 'Map',
  NaN = 'NaN',
  Null = 'null',
  Number = 'number',
  Object = 'object',
  Promise = 'Promise',
  RegExp = 'RegExp',
  Set = 'Set',
  String = 'string',
  Symbol = 'symbol',
  True = 'true',
  Undefined = 'undefined',
  Unknown = 'unknown',
  Void = 'void',
}

export const getParsedType = (x: unknown): TParsedType => {
  switch (typeof x) {
    case 'string':
      return TParsedType.String
    case 'number':
      if (Number.isNaN(x)) return TParsedType.NaN
      else return TParsedType.Number
    case 'bigint':
      return TParsedType.BigInt
    case 'boolean':
      return TParsedType.Boolean
    case 'symbol':
      return TParsedType.Symbol
    case 'undefined':
      return TParsedType.Undefined
    case 'function':
      return TParsedType.Function
    case 'object':
      if (x === null) return TParsedType.Null
      if (isArray(x)) return TParsedType.Array
      if (isAsync(x)) return TParsedType.Promise
      if (x instanceof Date) return TParsedType.Date
      if (x instanceof Map) return TParsedType.Map
      if (x instanceof Set) return TParsedType.Set
      if (x instanceof RegExp) return TParsedType.RegExp
      if (x instanceof Buffer) return TParsedType.Buffer
      else return TParsedType.Object

    default:
      return TParsedType.Unknown
  }
}

/* --------------------------------------------------- ParseResult -------------------------------------------------- */

export interface SuccessfulParseResult<T> {
  readonly ok: true
  readonly data: T
  readonly error?: never
}

export interface FailedParseResult<T> {
  readonly ok: false
  readonly data?: never
  readonly error: TError<T>
}

export type SyncParseResult<O, I> = SuccessfulParseResult<O> | FailedParseResult<I>
export type AsyncParseResult<O, I> = Promise<SyncParseResult<O, I>>
export type ParseResult<O, I> = SyncParseResult<O, I> | AsyncParseResult<O, I>

export type SuccessfulParseResultOf<T extends AnyTType> = SuccessfulParseResult<OutputOf<T>>
export type FailedParseResultOf<T extends AnyTType> = FailedParseResult<InputOf<T>>
export type SyncParseResultOf<T extends AnyTType> = SyncParseResult<OutputOf<T>, InputOf<T>>
export type AsyncParseResultOf<T extends AnyTType> = AsyncParseResult<OutputOf<T>, InputOf<T>>
export type ParseResultOf<T extends AnyTType> = ParseResult<OutputOf<T>, InputOf<T>>

export const OK = <T>(data: T): SuccessfulParseResult<T> => ({ ok: true, data })
export const FAIL = <T>(error: TError<T>): FailedParseResult<T> => ({ ok: false, error })

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                    ParseContext                                                    */
/* ------------------------------------------------------------------------------------------------------------------ */

export enum ParseStatus {
  Valid = 'valid',
  Invalid = 'invalid',
}

export type ParsePath = readonly (string | number)[]

export interface ParseCommon {
  readonly async: boolean
  readonly abortEarly?: boolean
  readonly debug?: boolean
}

export type ParseOptions = StrictOmit<ParseCommon, 'async'>

export type ParseIssueInput<T extends TIssue = TIssue> = StripKey<T, 'path' | 'message'>

export interface ParseContext<T extends AnyTType = AnyTType> {
  readonly status: ParseStatus
  readonly data: unknown
  readonly parsedType: TParsedType
  readonly schema: AnyTType
  readonly path: ParsePath
  readonly parent: ParseContext | null
  readonly common: ParseCommon
  readonly ownChildren: readonly ParseContext[]
  readonly allChildren: readonly ParseContext[]
  readonly ownIssues: readonly TIssue[]
  readonly allIssues: readonly TIssue[]
  isValid(): boolean
  isInvalid(): boolean
  setInvalid(): this
  isAsync(): boolean
  child(schema: AnyTType, data: unknown, path: ParsePath): ParseContext
  clone(schema: AnyTType, data: unknown): ParseContext
  addIssue(issue: ParseIssueInput, message: string | undefined): this
  invalidType(payload: { readonly expected: TParsedType }): this
  abort(): FailedParseResultOf<T>
}

export const ParseContext = <T extends AnyTType>(
  schema: T,
  data: unknown,
  path: ParsePath,
  parent: ParseContext | null,
  common: ParseCommon
): ParseContext<T> => {
  const _internals: {
    status: ParseStatus
    data: unknown
    ownChildren: ParseContext[]
    ownIssues: TIssue[]
  } = {
    status: ParseStatus.Valid,
    data: cloneDeep(data),
    ownChildren: [],
    ownIssues: [],
  }

  const ctx: ParseContext<T> = {
    get status() {
      return _internals.status
    },
    get data() {
      return _internals.data
    },
    get parsedType() {
      return getParsedType(this.data)
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
    isValid() {
      return this.status === ParseStatus.Valid && this.allChildren.every((child) => child.isValid())
    },
    isInvalid() {
      return this.status === ParseStatus.Invalid || this.allChildren.some((child) => child.isInvalid())
    },
    setInvalid() {
      _internals.status = ParseStatus.Invalid
      if (this.parent) {
        this.parent.setInvalid()
      }
      return ctx
    },
    isAsync() {
      return this.common.async
    },
    child(schema, data, path) {
      const child = ParseContext(schema, data, this.path.concat(path), ctx, this.common)
      _internals.ownChildren.push(child)
      return child
    },
    clone(schema, data) {
      const clone = ParseContext(schema, data, this.path, this.parent, this.common)
      _internals.ownChildren.push(clone)
      return clone
    },
    addIssue(issue, message) {
      if (this.isInvalid()) {
        if (this.common.abortEarly) {
          return this
        }
      } else {
        this.setInvalid()
      }
      _internals.ownIssues.push({ ...issue, path: this.path, message: message ?? '' })
      return this
    },
    invalidType(payload) {
      if (this.data === undefined) {
        return this.addIssue({ kind: TIssueKind.Required }, this.schema.options.messages?.required)
      }
      return this.addIssue(
        { kind: TIssueKind.InvalidType, payload: { expected: payload.expected, received: this.parsedType } },
        this.schema.options.messages?.invalidType
      )
    },
    abort() {
      return FAIL(TError.fromContext(this))
    },
  }

  return ctx
}

ParseContext.of = <T extends AnyTType>(schema: T, data: unknown, common: ParseCommon) =>
  ParseContext(schema, data, [], null, common)

export const ParseContextSync = {
  of: <T extends AnyTType>(schema: T, data: unknown, options: ParseOptions | undefined) =>
    ParseContext.of(schema, data, { async: false, ...options }),
}

export const ParseContextAsync = {
  of: <T extends AnyTType>(schema: T, data: unknown, options: ParseOptions | undefined) =>
    ParseContext.of(schema, data, { async: true, ...options }),
}
