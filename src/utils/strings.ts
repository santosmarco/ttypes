import type { Add, Subtract } from 'ts-arithmetic'
import type { AssertArray, Includes, NumericRange, Primitive, Try } from './types'

export namespace stringUtils {
  export const words = (str: string): string[] => str.split(_internals.wordSeparatorsRegex)

  export const joinWords = (str: string, delimiter: string): string => words(str).join(delimiter)

  export const safeHead = (str: string): string => str[0] ?? ''

  export const join = <T extends readonly string[], D extends string>(str: T, delimiter: D): Join<T, D> =>
    str.join(delimiter) as Join<T, D>

  export const split = <T extends string, D extends string>(str: T, delimiter: D): Split<T, D> =>
    str.split(delimiter) as Split<T, D>

  export const replace = <T extends string, S extends string, R extends string>(
    str: T,
    search: S,
    replace: R
  ): Replace<T, S, R> => str.replace(search, replace) as Replace<T, S, R>

  export const replaceAll = <T extends string, S extends string, R extends string>(
    str: T,
    search: S,
    replace: R
  ): ReplaceAll<T, S, R> => join(split(str, search), replace)

  export const charAt = <T extends string, I extends StringIndex<T>>(str: T, index: I): CharAt<T, I> =>
    str.charAt(index) as CharAt<T, I>

  export const trimStart = <T extends string>(str: T): TrimLeft<T> => str.trimStart() as TrimLeft<T>

  export const trimEnd = <T extends string>(str: T): TrimRight<T> => str.trimEnd() as TrimRight<T>

  export const trim = <T extends string>(str: T): Trim<T> => trimStart(trimEnd(str))

  export const slice = <T extends string, S extends number, E extends StringIndex<T> = LastIndex<T>>(
    str: T,
    start: S,
    end?: E
  ): Slice<T, S, E> => str.slice(start, end) as Slice<T, S, E>

  export const uppercase = <T extends string>(str: T): Uppercase<T> => str.toUpperCase() as Uppercase<T>

  export const lowercase = <T extends string>(str: T): Lowercase<T> => str.toLowerCase() as Lowercase<T>

  export const capitalize = <T extends string>(str: T): Capitalize<T> =>
    (uppercase(safeHead(str)) + str.slice(1)) as Capitalize<T>

  export const uncapitalize = <T extends string>(str: T): Uncapitalize<T> =>
    (lowercase(safeHead(str)) + str.slice(1)) as Uncapitalize<T>

  export const camelCase = <T extends string>(str: T): CamelCase<T> =>
    words(str).reduce(
      (acc, next) => `${acc}${acc ? uppercase(safeHead(next)) + lowercase(next.slice(1)) : lowercase(next)}`,
      ''
    ) as CamelCase<T>

  export const snakeCase = <T extends string>(str: T): SnakeCase<T> => joinWords(str, '_') as SnakeCase<T>

  export const screamingSnakeCase = <T extends string>(str: T): ScreamingSnakeCase<T> => uppercase(snakeCase(str))

  export const kebabCase = <T extends string>(str: T): KebabCase<T> => joinWords(str, '-') as KebabCase<T>

  export const pascalCase = <T extends string>(str: T): PascalCase<T> => capitalize(camelCase(str)) as PascalCase<T>

  export const sentenceCase = <T extends string>(str: T): SentenceCase<T> =>
    capitalize(joinWords(str, ' ')) as SentenceCase<T>

  export const titleCase = <T extends string>(str: T): TitleCase<T> =>
    words(str).map(capitalize).join(' ') as TitleCase<T>

  export const literalize = <T extends Primitive>(value: T): Literalize<T> =>
    ((): string => {
      if (typeof value === 'string') {
        return `"${value}"`
      }

      if (typeof value === 'bigint') {
        return `${value}n`
      }

      if (typeof value === 'symbol') {
        return `Symbol(${value.description ?? ''})`
      }

      return String(value)
    })() as Literalize<T>

  /* ----------------------------------------------------- Types ---------------------------------------------------- */

  /**
   * Joins an array of strings `T` with a string delimiter `D` into a string.
   */
  export type Join<T extends ReadonlyArray<string | number>, D extends string> = T extends readonly []
    ? ''
    : T extends readonly [string | number]
    ? `${T[0]}`
    : T extends readonly [string | number, ...infer R extends Array<string | number>]
    ? `${T[0]}${D}${Join<R, D>}`
    : string

  /**
   * Splits a string `S` by a string delimiter `D` into a tuple of strings.
   */
  export type Split<S extends string, D extends string> = S extends `${infer H}${D}${infer T}`
    ? [H, ...Split<T, D>]
    : S extends D
    ? []
    : [S]

  /**
   * Replaces a string `T` with another string `R` in the first match of a string `S`.
   */
  export type Replace<T extends string, S extends string, R extends string> = T extends `${infer H}${S}${infer T}`
    ? `${H}${R}${T}`
    : T

  /**
   * Replaces a string `T` with another string `R` in all matches of a string `S`.
   */
  export type ReplaceAll<T extends string, S extends string, R extends string> = Join<Split<T, S>, R>

  /**
   * Removes leading whitespace from a string.
   */
  export type TrimLeft<T extends string> = T extends ` ${infer R}` ? TrimLeft<R> : T

  /**
   * Removes trailing whitespace from a string.
   */
  export type TrimRight<T extends string> = T extends `${infer R} ` ? TrimRight<R> : T

  /**
   * Removes leading and trailing whitespace from a string.
   */
  export type Trim<T extends string> = TrimLeft<TrimRight<T>>

  /**
   * @internal
   */
  type _Length<T extends string, _Acc extends number = 0> = T extends ''
    ? 0
    : T extends `${infer _}${infer R}`
    ? R extends ''
      ? Add<_Acc, 1>
      : _Length<R, Add<_Acc, 1>>
    : never

  /**
   * Retrieves the length of a string `T`.
   */
  export type Length<T extends string> = _Length<T>

  /**
   * Retrieves all possible indexes for a string `T`.
   */
  export type StringIndex<T extends string> = NumericRange<0, Length<T>>

  /**
   * Retrieves the last character index of a string `T`.
   */
  export type LastIndex<T extends string> = Try<Subtract<Length<T>, 1>, StringIndex<T>>

  /**
   * Retrieves the character at index `I` from a string `T`.
   */
  export type CharAt<T extends string, I extends number> = T extends `${infer H}${infer R}`
    ? I extends 0
      ? H
      : CharAt<R, Subtract<I, 1>>
    : never

  /**
   * @internal
   */
  type _Slice<
    T extends string,
    S extends number,
    E extends number,
    _Idx extends number = 0,
    _State extends 0 | 1 = 0,
    _Acc extends string = ''
  > = E extends _Idx
    ? `${_Acc}${CharAt<T, _Idx>}`
    : (1 extends (_Idx extends S ? 1 : 0) | _State ? 1 : 0) extends infer _NewState extends 0 | 1
    ? _Slice<T, S, E, Add<_Idx, 1>, _NewState, _NewState extends 0 ? _Acc : `${_Acc}${CharAt<T, _Idx>}`>
    : never

  /**
   * Slices a string `T` from a start index `S` to an optional end index `E`.
   * If `E` is not provided, it will slice `T` until its end.
   */
  export type Slice<T extends string, S extends number, E extends StringIndex<T> = LastIndex<T>> = _Slice<T, S, E>

  /**
   * Converts a string literal to `camelCase`.
   */
  export type CamelCase<T extends string> = Uncapitalize<
    CamelCaseFromArray<SplitWords<T extends Uppercase<T> ? Lowercase<T> : T>>
  >

  /**
   * Converts a string literal to `snake_case`.
   */
  export type SnakeCase<T extends string> = DelimiterCase<T, '_'>

  /**
   * Converts a string literal to `SCREAMING_SNAKE_CASE`.
   */
  export type ScreamingSnakeCase<T extends string> = { 0: Uppercase<SnakeCase<T>>; 1: T }[IsScreamingSnakeCase<T>]

  /**
   * Converts a string literal to `kebab-case`.
   */
  export type KebabCase<T extends string> = DelimiterCase<T, '-'>
  /**
   * Converts a string literal to `PascalCase`.
   */
  export type PascalCase<T extends string> = CamelCase<T> extends string ? Capitalize<CamelCase<T>> : CamelCase<T>

  /**
   * Converts a string literal to `Sentence case`.
   */
  export type SentenceCase<T extends string> = Capitalize<ReplaceAll<SnakeCase<T>, '_', ' '>>

  /**
   * Converts a string literal to `Title Case`.
   */
  export type TitleCase<T extends string> = Split<SnakeCase<T>, '_'> extends infer X
    ? Join<AssertArray<{ [K in keyof X]: Capitalize<X[K] & string> }, string | number>, ' '>
    : never

  export type Literalize<T extends Primitive> = T extends string
    ? `"${T}"`
    : T extends bigint
    ? `${T}n`
    : T extends symbol
    ? `Symbol(${string})`
    : T extends number | boolean | null | undefined
    ? `${T}`
    : never

  /* ---------------------------------------------------- Helpers --------------------------------------------------- */

  export type UpperCaseCharacters =
    | 'A'
    | 'B'
    | 'C'
    | 'D'
    | 'E'
    | 'F'
    | 'G'
    | 'H'
    | 'I'
    | 'J'
    | 'K'
    | 'L'
    | 'M'
    | 'N'
    | 'O'
    | 'P'
    | 'Q'
    | 'R'
    | 'S'
    | 'T'
    | 'U'
    | 'V'
    | 'W'
    | 'X'
    | 'Y'
    | 'Z'
  export type WhitespaceCharacters =
    | '\f'
    | '\n'
    | '\r'
    | '\t'
    | '\v'
    | '\u00a0'
    | '\u1680'
    | '\u2000'
    | '\u200a'
    | '\u2028'
    | '\u2029'
    | '\u202f'
    | '\u205f'
    | '\u3000'
    | '\ufeff'
  export type WordSeparators = '-' | '_' | ' ' | WhitespaceCharacters

  export type IsUpperCase<T extends string> = T extends Uppercase<T> ? 1 : 0
  export type IsLowerCase<T extends string> = T extends Lowercase<T> ? 1 : 0
  export type IsNumeric<T extends string> = T extends `${number}` ? 1 : 0

  export type SkipEmptyWord<Word extends string> = Word extends '' ? [] : [Word]

  export type RemoveLastChar<T extends string, Char extends string> = T extends `${infer L}${Char}`
    ? SkipEmptyWord<L>
    : never

  export type UpperToLower<T extends string> = T extends Uppercase<T> ? Lowercase<T> : T

  type _SplitIncludingDelimiters<T extends string, Delimiter extends string> = T extends ''
    ? []
    : T extends `${infer FirstPart}${Delimiter}${infer SecondPart}`
    ? T extends `${FirstPart}${infer UsedDelimiter}${SecondPart}`
      ? UsedDelimiter extends Delimiter
        ? T extends `${infer FirstPart}${UsedDelimiter}${infer SecondPart}`
          ? [
              ...SplitIncludingDelimiters<FirstPart, Delimiter>,
              UsedDelimiter,
              ...SplitIncludingDelimiters<SecondPart, Delimiter>
            ]
          : never
        : never
      : never
    : [T]
  export type SplitIncludingDelimiters<T extends string, Delimiter extends string> = _SplitIncludingDelimiters<
    UpperToLower<T>,
    Delimiter
  >

  export type StringPartToDelimiterCase<
    StringPart extends string,
    Start extends boolean,
    UsedWordSeparators extends string,
    UsedUpperCaseChars extends string,
    Delimiter extends string
  > = StringPart extends UsedWordSeparators
    ? Delimiter
    : Start extends true
    ? Lowercase<StringPart>
    : StringPart extends UsedUpperCaseChars
    ? `${Delimiter}${Lowercase<StringPart>}`
    : StringPart

  export type StringArrayToDelimiterCase<
    Parts extends readonly unknown[],
    Start extends boolean,
    UsedWordSeparators extends string,
    UsedUpperCaseChars extends string,
    Delimiter extends string
  > = Parts extends [`${infer FirstPart}`, ...infer RemainingParts]
    ? `${StringPartToDelimiterCase<
        FirstPart,
        Start,
        UsedWordSeparators,
        UsedUpperCaseChars,
        Delimiter
      >}${StringArrayToDelimiterCase<RemainingParts, false, UsedWordSeparators, UsedUpperCaseChars, Delimiter>}`
    : Parts extends [string]
    ? string
    : ''

  export type DelimiterCase<T, Delimiter extends string> = string extends T
    ? T
    : T extends string
    ? StringArrayToDelimiterCase<
        SplitIncludingDelimiters<T, WordSeparators | UpperCaseCharacters>,
        true,
        WordSeparators,
        UpperCaseCharacters,
        Delimiter
      >
    : T

  export type IsScreamingSnakeCase<T extends string> = T extends Uppercase<T>
    ? Includes<SplitIncludingDelimiters<Lowercase<T>, '_'>, '_'> extends 1
      ? 1
      : 0
    : 0

  /**
   * Splits a string into words.
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
      : [0, 1] extends [IsNumeric<LastChar>, IsNumeric<FirstChar>]
      ? [...SkipEmptyWord<CurrWord>, ...SplitWords<RestChars, FirstChar, FirstChar>]
      : [1, 0] extends [IsNumeric<LastChar>, IsNumeric<FirstChar>]
      ? [...SkipEmptyWord<CurrWord>, ...SplitWords<RestChars, FirstChar, FirstChar>]
      : [1, 1] extends [IsNumeric<LastChar>, IsNumeric<FirstChar>]
      ? SplitWords<RestChars, FirstChar, `${CurrWord}${FirstChar}`>
      : [1, 1] extends [IsLowerCase<LastChar>, IsUpperCase<FirstChar>]
      ? [...SkipEmptyWord<CurrWord>, ...SplitWords<RestChars, FirstChar, FirstChar>]
      : [1, 1] extends [IsUpperCase<LastChar>, IsLowerCase<FirstChar>]
      ? [...RemoveLastChar<CurrWord, LastChar>, ...SplitWords<RestChars, FirstChar, `${LastChar}${FirstChar}`>]
      : SplitWords<RestChars, FirstChar, `${CurrWord}${FirstChar}`>
    : [...SkipEmptyWord<CurrWord>]

  /**
   * Converts an array of words to `camelCase`.
   */
  export type CamelCaseFromArray<Words extends readonly string[], Result extends string = ''> = Words extends readonly [
    infer H extends string,
    ...infer R extends readonly string[]
  ]
    ? `${Capitalize<H>}${CamelCaseFromArray<R>}`
    : Result

  /* --------------------------------------------------- Internals -------------------------------------------------- */

  const _internals = Object.freeze({
    wordSeparatorsRegex: /\s/g,
  })
}
