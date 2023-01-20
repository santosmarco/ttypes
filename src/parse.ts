import type { TDef } from './def'
import { TError, resolveErrorMaps } from './error'
import { getGlobal } from './global'
import { IssueKind, type TIssue } from './issues'
import type { ManifestType } from './manifest'
import type { ParseOptions } from './options'
import { type InputOf, type OutputOf, type TType } from './types/_internal'
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
        if (x === null) return TParsedType.Null
        if (Array.isArray(x)) return TParsedType.Array
        if (Buffer.isBuffer(x)) return TParsedType.Buffer
        if (x instanceof Date) return TParsedType.Date
        if (x instanceof Map) return TParsedType.Map
        if (x instanceof Promise) return TParsedType.Promise
        if (x instanceof RegExp) return TParsedType.RegExp
        if (x instanceof Set) return TParsedType.Set
        if (x instanceof WeakMap) return TParsedType.WeakMap
        if (x instanceof WeakSet) return TParsedType.WeakSet
        return TParsedType.Object

      default:
        return TParsedType.Unknown
    }
  }

  export const Literal = (value: u.Primitive): TParsedType => {
    if (value === null) {
      return TParsedType.Null
    }

    switch (typeof value) {
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
        return TParsedType.Never
    }
  }

  export const Enum = (values: ReadonlyArray<number | string>): TParsedType => {
    const types = [...new Set(values.map(TParsedType.Literal))]
    return types.length === 1 ? types[0] : TParsedType.StringOrNumber
  }

  export function AnyOf(...values: readonly TParsedType[]) {
    const unique = [...new Set(values)]
    return unique.sort((a, b) => String(a).localeCompare(String(b))).join(' | ')
  }

  export const Primitive = AnyOf(
    TParsedType.String,
    TParsedType.Number,
    TParsedType.BigInt,
    TParsedType.Boolean,
    TParsedType.Symbol,
    TParsedType.Null,
    TParsedType.Undefined
  )

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

export type SyncParseResult<O, I> = FailedParseResult<I> | SuccessfulParseResult<O>
export type AsyncParseResult<O, I> = Promise<SyncParseResult<O, I>>
export type ParseResult<O, I> = AsyncParseResult<O, I> | SyncParseResult<O, I>

export type SuccessfulParseResultOf<T extends TType> = SuccessfulParseResult<OutputOf<T>>
export type FailedParseResultOf<T extends TType> = FailedParseResult<InputOf<T>>
export type SyncParseResultOf<T extends TType> = SyncParseResult<OutputOf<T>, InputOf<T>>
export type AsyncParseResultOf<T extends TType> = AsyncParseResult<OutputOf<T>, InputOf<T>>
export type ParseResultOf<T extends TType> = ParseResult<OutputOf<T>, InputOf<T>>

export type AnySyncParseResult = SyncParseResult<any, any>
export type AnyAsyncParseResult = AsyncParseResult<any, any>
export type AnyParseResult = ParseResult<any, any>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                    ParseContext                                                    */
/* ------------------------------------------------------------------------------------------------------------------ */

export enum ParseStatus {
  Valid = 'valid',
  Invalid = 'invalid',
}

export type ParsePath = ReadonlyArray<number | string>

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
    issue: u.StripKey<TIssue<K>, 'data' | 'path'> & {
      readonly path?: ParsePath
      readonly fatal?: boolean
    }
  ): void
  addIssue<T extends IssueKind>(
    code: T,
    ...args: 'payload' extends u.OptionalKeysOf<TIssue<T>>
      ? [message: string | undefined]
      : [payload: TIssue<T>['payload'], message: string | undefined]
  ): this
  invalidType(payload: { readonly expected: ManifestType }): this
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

  // @ts-expect-error
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

      const issueWithPath = { ...issue, path: this.path.concat(issue.path ?? []), data: this.data }

      if (issueWithPath.payload === undefined) {
        Reflect.deleteProperty(issueWithPath, 'payload')
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

    addIssue(code, ...args) {
      const [payload, message] = args.length === 2 ? args : [undefined, args[0]]

      this._addIssue({ code, payload, message } as TIssue)

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
      return { ok: true, data }
    },

    abort() {
      return { ok: false, error: TError.fromContext(this) }
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
