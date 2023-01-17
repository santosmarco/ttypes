import { TError, type TErrorFormatter, type TErrorMap } from './error'
import { TOptions, type RequiredTOptions } from './options'

export class TGlobal {
  private static _instance: TGlobal | undefined

  private _options: RequiredTOptions = TOptions.defaultOptions
  private _errorFormatter: TErrorFormatter = TError.defaultFormatter
  private _errorMap: TErrorMap = TError.defaultIssueMap

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

  getOptions(): RequiredTOptions {
    return this._options
  }

  setOptions(options: TOptions): this {
    this._options = { ...this._options, ...options }
    return this
  }

  getErrorFormatter(): TErrorFormatter {
    return this._errorFormatter
  }

  setErrorFormatter(formatter: TErrorFormatter): this {
    this._errorFormatter = formatter
    return this
  }

  getErrorMap(): TErrorMap {
    return this._errorMap
  }

  setErrorMap(map: TErrorMap): this {
    this._errorMap = map
    return this
  }

  static get(): TGlobal {
    if (!this._instance) {
      this._instance = new TGlobal()
    }

    return this._instance
  }
}

export const getGlobal = (): TGlobal => TGlobal.get()
