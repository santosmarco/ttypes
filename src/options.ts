import type { EIssueKind, IssueKind, TErrorMap, stringUtils } from './_internal'

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
export interface GlobalColorOptions {
  readonly colorsEnabled?: boolean
}

/**
 * Options regarding the the possibility of providing
 * a custom color for the schema.
 *
 * This is specially useful when debugging.
 */
export interface SchemaColorOptions {
  readonly schemaColor?: SchemaColor
}

/**
 * Library-wide, global options.
 */
export interface GlobalOptions extends GlobalColorOptions {}

/**
 * Options used on parsing.
 */
export interface ParseOptions {
  readonly abortEarly?: boolean
  readonly debug?: boolean
  readonly contextualErrorMap?: TErrorMap
}

/**
 * The `TOptions` type. This is the official `options` type,
 * extending all others.
 */
export type TOptions = SchemaColorOptions &
  GlobalOptions &
  ParseOptions & {
    readonly schemaErrorMap?: TErrorMap
    readonly messages?: {
      readonly [K in EIssueKind['Required'] | EIssueKind['InvalidType'] as stringUtils.CamelCase<K>]?: string
    }
  } extends infer X
  ? { [K in keyof X]: X[K] }
  : never

export type ExtendedTOptions<
  E extends { readonly additionalIssueKind?: Exclude<IssueKind, EIssueKind['Required'] | EIssueKind['InvalidType']> }
> = Omit<TOptions, 'messages'> & {
  readonly messages?: {
    readonly [K in
      | EIssueKind['Required']
      | EIssueKind['InvalidType']
      | ('additionalIssueKind' extends keyof E
          ? E['additionalIssueKind'] & string
          : never) as stringUtils.CamelCase<K>]?: string
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
