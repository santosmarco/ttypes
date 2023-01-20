import type { TErrorMap } from './error'
import type { IssueKind } from './issues'
import type { u } from './utils'

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TOptions                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

/**
 * All colors available for the schema.
 */
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

/**
 * Global options for controlling the color output.
 */
export type GlobalColorOptions = {
  readonly colorsEnabled?: boolean
}

/**
 * Options regarding the the possibility of providing
 * a custom color for the schema.
 *
 * This is specially useful when debugging.
 */
export type SchemaColorOptions = {
  readonly schemaColor?: SchemaColor
}

/**
 * Library-wide, global options.
 */
export type GlobalOptions = GlobalColorOptions

/**
 * Options used on parsing.
 */
export type ParseOptions = {
  readonly abortEarly?: boolean
  readonly debug?: boolean
  readonly contextualErrorMap?: TErrorMap
}

/**
 * The `TOptions` type. This is the official `options` type,
 * extending all others.
 */
export type TOptions = GlobalOptions &
  ParseOptions &
  SchemaColorOptions & {
    readonly schemaErrorMap?: TErrorMap
    readonly messages?: {
      readonly [K in IssueKind.InvalidType | IssueKind.Required as u.CamelCase<K>]?: string
    }
  } extends infer X
  ? { [K in keyof X]: X[K] }
  : never

export type MakeTOptions<
  P extends { readonly additionalIssueKind?: Exclude<IssueKind, IssueKind.InvalidType | IssueKind.Required> }
> = Omit<TOptions, 'messages'> & {
  readonly messages?: {
    readonly [K in
      | IssueKind.InvalidType
      | IssueKind.Required
      | ('additionalIssueKind' extends keyof P ? P['additionalIssueKind'] : never) as u.CamelCase<K & string>]?: string
  }
} extends infer X
  ? { [K in keyof X]: X[K] }
  : never

export type RequiredTOptions = { [K in keyof TOptions]-?: TOptions[K] } extends infer X
  ? { [K in keyof X]: X[K] | undefined }
  : never

export const TOptions: { readonly defaultOptions: RequiredTOptions } = {
  defaultOptions: {
    abortEarly: false,
    debug: false,
    colorsEnabled: true,
    contextualErrorMap: undefined,
    messages: {},
    schemaErrorMap: undefined,
    schemaColor: undefined,
  },
}
