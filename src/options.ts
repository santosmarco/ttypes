import type { TErrorMap, TIssueKind } from './_internal'

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
export interface TOptions<
  T extends
    | { readonly additionalIssueKind?: Exclude<TIssueKind, TIssueKind.Required | TIssueKind.InvalidType> }
    | undefined = undefined
> extends SchemaColorOptions,
    GlobalOptions,
    ParseOptions {
  readonly schemaErrorMap?: TErrorMap
  readonly messages?: {
    readonly [K in
      | TIssueKind.Required
      | TIssueKind.InvalidType
      | ('additionalIssueKind' extends keyof T ? T['additionalIssueKind'] & string : never) as CamelCase<K>]?: string
  }
}

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

/* ------------------------------------------------------ Utils ----------------------------------------------------- */

type IsUpperCase<T extends string> = T extends Uppercase<T> ? true : false
type IsLowerCase<T extends string> = T extends Lowercase<T> ? true : false
type IsNumeric<T extends string> = T extends `${number}` ? true : false
type WordSeparators = '-' | '_' | ' '

type SkipEmptyWord<Word extends string> = Word extends '' ? [] : [Word]

type RemoveLastChar<Sentence extends string, Char extends string> = Sentence extends `${infer Left}${Char}`
  ? SkipEmptyWord<Left>
  : never

/**
 * Splits a string (almost) like Lodash's `_.words()` function.
 *
 * - Splits on each word that begins with a capital letter;
 * - Splits on each {@link WordSeparators};
 * - Splits on numeric sequence.
 *
 * @example
 * ```ts
 * type Words0 = SplitWords<'helloWorld'>; // => ['hello', 'World']
 * type Words1 = SplitWords<'helloWORLD'>; // => ['hello', 'WORLD']
 * type Words2 = SplitWords<'hello-world'>; // => ['hello', 'world']
 * type Words3 = SplitWords<'--hello the_world'>; // => ['hello', 'the', 'world']
 * type Words4 = SplitWords<'lifeIs42'>; // => ['life', 'Is', '42']
 * ```
 */
export type SplitWords<
  Sentence extends string,
  LastChar extends string = '',
  CurrWord extends string = ''
> = Sentence extends `${infer FirstChar}${infer RestChars}`
  ? FirstChar extends WordSeparators
    ? [...SkipEmptyWord<CurrWord>, ...SplitWords<RestChars, LastChar>]
    : LastChar extends ''
    ? SplitWords<RestChars, FirstChar, FirstChar>
    : [false, true] extends [IsNumeric<LastChar>, IsNumeric<FirstChar>]
    ? [...SkipEmptyWord<CurrWord>, ...SplitWords<RestChars, FirstChar, FirstChar>]
    : [true, false] extends [IsNumeric<LastChar>, IsNumeric<FirstChar>]
    ? [...SkipEmptyWord<CurrWord>, ...SplitWords<RestChars, FirstChar, FirstChar>]
    : [true, true] extends [IsNumeric<LastChar>, IsNumeric<FirstChar>]
    ? SplitWords<RestChars, FirstChar, `${CurrWord}${FirstChar}`>
    : [true, true] extends [IsLowerCase<LastChar>, IsUpperCase<FirstChar>]
    ? [...SkipEmptyWord<CurrWord>, ...SplitWords<RestChars, FirstChar, FirstChar>]
    : [true, true] extends [IsUpperCase<LastChar>, IsLowerCase<FirstChar>]
    ? [...RemoveLastChar<CurrWord, LastChar>, ...SplitWords<RestChars, FirstChar, `${LastChar}${FirstChar}`>]
    : SplitWords<RestChars, FirstChar, `${CurrWord}${FirstChar}`>
  : [...SkipEmptyWord<CurrWord>]

/**
 * Converts an array of words to camelCase.
 */
type CamelCaseFromArray<Words extends readonly string[], Result extends string = ''> = Words extends readonly [
  infer H extends string,
  ...infer R extends readonly string[]
]
  ? `${Capitalize<H>}${CamelCaseFromArray<R>}`
  : Result

/**
 * Converts a string literal to camelCase.
 */
type CamelCase<T> = T extends string
  ? string extends T
    ? T
    : Uncapitalize<CamelCaseFromArray<SplitWords<T extends Uppercase<T> ? Lowercase<T> : T>>>
  : T
