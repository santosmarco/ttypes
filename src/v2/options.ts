import type { ErrorMap } from './error'
import type { IssueKind } from './issues'
import type { TManifest } from './manifest'
import type { utils } from './utils'

export type SchemaColor =
  | 'black'
  | 'blackBright'
  | 'blue'
  | 'blueBright'
  | 'cyan'
  | 'cyanBright'
  | 'gray'
  | 'green'
  | 'greenBright'
  | 'grey'
  | 'magenta'
  | 'magentaBright'
  | 'red'
  | 'redBright'
  | 'white'
  | 'whiteBright'
  | 'yellow'
  | 'yellowBright'

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TOptions                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface GlobalOptions {
  readonly colorsEnabled?: boolean
}

export interface ParseOptions {
  readonly abortEarly?: boolean
  readonly debug?: boolean
  readonly errorMap?: ErrorMap
}

export type TOptions = utils.BRANDED<
  GlobalOptions &
    ParseOptions & {
      readonly color?: SchemaColor
      readonly errorMap?: ErrorMap
      readonly manifest?: TManifest
      readonly schemaMessages?: utils.CamelCaseProperties<{
        readonly [K in IssueKind.Required | IssueKind.InvalidType]?: string
      }>
    },
  'TOptions'
>

interface _MakeTOptionsSettings {
  schemaIssueKinds?: Array<utils.StrictExclude<IssueKind, IssueKind.Required | IssueKind.InvalidType>>
}

export type MakeTOptions<T extends utils.Exact<_MakeTOptionsSettings, T> | null = null> = utils.ReadonlyDeep<
  T extends Record<string, unknown>
    ? utils.MergeDeep<
        TOptions,
        {
          readonly schemaMessages?: T['schemaIssueKinds'] extends readonly unknown[]
            ? utils.CamelCaseProperties<{ readonly [K in T['schemaIssueKinds'][number]]?: string }>
            : TOptions['schemaMessages']
        }
      >
    : TOptions
>
