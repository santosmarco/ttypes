import { TError, type TErrorFormatter, type TErrorMap } from './error'

export class TGlobal {
  private static _instance: TGlobal | undefined

  private _errorFormatter: TErrorFormatter = TError.defaultFormatter
  private _errorMap: TErrorMap = TError.defaultIssueMap

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

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
