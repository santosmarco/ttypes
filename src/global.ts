import { TError, type TErrorFormatter } from './error'

export class TGlobal {
  private static readonly _instance = new TGlobal()

  private _errorFormatter: TErrorFormatter = TError.defaultFormatter

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

  getErrorFormatter(): TErrorFormatter {
    return this._errorFormatter
  }

  setErrorFormatter(formatter: TErrorFormatter): this {
    this._errorFormatter = formatter
    return this
  }

  static get(): TGlobal {
    return this._instance
  }
}
