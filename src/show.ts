import chalk from 'chalk'
import {
  TParsedType,
  TTypeName,
  literalize,
  type AnyTType,
  type Primitive,
  type TArrayCardinality,
  type TEnumValues,
  type TObjectShape,
} from './_internal'

export const TShow = (type: AnyTType, options?: { readonly parens?: boolean }): string => {
  if (
    type.isT(
      TTypeName.Any,
      TTypeName.BigInt,
      TTypeName.Boolean,
      TTypeName.Buffer,
      TTypeName.Date,
      TTypeName.False,
      TTypeName.NaN,
      TTypeName.Never,
      TTypeName.Null,
      TTypeName.Number,
      TTypeName.String,
      TTypeName.Symbol,
      TTypeName.True,
      TTypeName.Undefined,
      TTypeName.Unknown,
      TTypeName.Void
    )
  ) {
    return {
      [TTypeName.Any]: TShow.Any,
      [TTypeName.BigInt]: TShow.BigInt,
      [TTypeName.Boolean]: TShow.Boolean,
      [TTypeName.Buffer]: TShow.Buffer,
      [TTypeName.Date]: TShow.Date,
      [TTypeName.False]: TShow.False,
      [TTypeName.NaN]: TShow.NaN,
      [TTypeName.Never]: TShow.Never,
      [TTypeName.Null]: TShow.Null,
      [TTypeName.Number]: TShow.Number,
      [TTypeName.String]: TShow.String,
      [TTypeName.Symbol]: TShow.Symbol,
      [TTypeName.True]: TShow.True,
      [TTypeName.Undefined]: TShow.Undefined,
      [TTypeName.Unknown]: TShow.Unknown,
      [TTypeName.Void]: TShow.Void,
    }[type.typeName]()
  }

  if (
    type.isT(
      TTypeName.Catch,
      TTypeName.Default,
      TTypeName.Lazy,
      TTypeName.Promise,
      TTypeName.Nullable,
      TTypeName.Optional,
      TTypeName.Defined,
      TTypeName.Readonly
    )
  ) {
    return {
      [TTypeName.Catch]: TShow.Catch,
      [TTypeName.Default]: TShow.Default,
      [TTypeName.Lazy]: TShow.Lazy,
      [TTypeName.Promise]: TShow.Promise,
      [TTypeName.Nullable]: TShow.Nullable,
      [TTypeName.Optional]: TShow.Optional,
      [TTypeName.Defined]: TShow.Defined,
      [TTypeName.Readonly]: TShow.Readonly,
    }[type.typeName](type.underlying, options)
  }

  if (type.isT(TTypeName.Array, TTypeName.Set)) {
    return {
      [TTypeName.Array]: TShow.Array,
      [TTypeName.Set]: TShow.Set,
    }[type.typeName](type.element, 'cardinality' in type._def ? type._def.cardinality : undefined)
  }

  if (type.isT(TTypeName.Map, TTypeName.Record)) {
    return {
      [TTypeName.Map]: TShow.Map,
      [TTypeName.Record]: TShow.Record,
    }[type.typeName](type.keys, type.values)
  }

  if (type.isT(TTypeName.Tuple)) {
    return TShow.Tuple(type.items, type.restType)
  }

  if (type.isT(TTypeName.Literal)) {
    return TShow.Literal(type.value)
  }

  if (type.isT(TTypeName.Enum, TTypeName.NativeEnum)) {
    return TShow.Enum(type.values)
  }

  if (type.isT(TTypeName.Brand)) {
    return TShow.Brand(type.underlying, type.getBrand())
  }

  if (type.isT(TTypeName.Object)) {
    return TShow.Object(type.shape)
  }

  if (type.isT(TTypeName.Pipeline)) {
    return TShow.Pipeline(type.from, type.to)
  }

  return TShow.Unknown()
}

TShow.Any = (): string => TParsedType.Any
TShow.BigInt = (): string => TParsedType.BigInt
TShow.Boolean = (): string => TParsedType.Boolean
TShow.Buffer = (): string => TParsedType.Buffer
TShow.Date = (): string => TParsedType.Date
TShow.False = (): string => TParsedType.False
TShow.NaN = (): string => TParsedType.NaN
TShow.Never = (): string => TParsedType.Never
TShow.Null = (): string => TParsedType.Null
TShow.Number = (): string => TParsedType.Number
TShow.String = (): string => TParsedType.String
TShow.Symbol = (): string => TParsedType.Symbol
TShow.True = (): string => TParsedType.True
TShow.Undefined = (): string => TParsedType.Undefined
TShow.Unknown = (): string => TParsedType.Unknown
TShow.Void = (): string => TParsedType.Void

TShow.Catch = (underlying: AnyTType): string => `Caught<${TShow(underlying)}>`
TShow.Default = (underlying: AnyTType): string => `Defaulted<${TShow(underlying)}>`
TShow.Lazy = (underlying: AnyTType): string => `Lazy<${TShow(underlying)}>`
TShow.Promise = (underlying: AnyTType): string => `Promise<${TShow(underlying)}>`

TShow.Nullable = (underlying: AnyTType, options?: { readonly parens?: boolean }): string =>
  TShow._unionize([TShow(underlying), TShow.Null()], options)
TShow.Optional = (underlying: AnyTType, options?: { readonly parens?: boolean }): string =>
  TShow._unionize([TShow(underlying), TShow.Undefined()], options)
TShow.Defined = (underlying: AnyTType): string =>
  TShow._unionize(TShow._deunionize(TShow(underlying)).filter((h) => h !== TShow.Undefined()))

TShow.Readonly = (underlying: AnyTType): string => {
  if (underlying.isT(TTypeName.Set, TTypeName.Map)) {
    return `Readonly${TShow(underlying)}`
  }

  if (underlying.isT(TTypeName.Array, TTypeName.Tuple)) {
    return `readonly ${TShow(underlying)}`
  }

  if (underlying.isT(TTypeName.Object)) {
    return TShow(underlying).replace(/^ {2}(\w*\??:)/gm, '  readonly $1')
  }

  return `Readonly<${TShow(underlying)}>`
}

TShow.Array = (element: AnyTType, cardinality: TArrayCardinality | undefined): string =>
  cardinality === 'atleastone'
    ? `[${TShow(element)}, ...${TShow(element, { parens: true })}[]]`
    : `${TShow(element, { parens: true })}[]`
TShow.Set = (element: AnyTType): string => `Set<${TShow(element)}>`
TShow.Tuple = (items: readonly AnyTType[], rest: AnyTType | undefined): string =>
  `[${items.map((i) => TShow(i)).join(', ')}${rest ? `, ...${TShow(rest, { parens: true })}[]` : ''}]`

TShow.Map = (keys: AnyTType, values: AnyTType): string => `Map<${TShow(keys)}, ${TShow(values)}>`
TShow.Record = (keys: AnyTType, values: AnyTType): string => `Record<${TShow(keys)}, ${TShow(values)}>`

TShow.Literal = (value: Primitive): string => literalize(value)
TShow.Enum = (values: TEnumValues): string => TShow._unionize(values.map(literalize))

TShow.Brand = (underlying: AnyTType, brand: PropertyKey): string =>
  `Branded<${TShow(underlying)}, ${literalize(brand)}>`

TShow.Object = (shape: TObjectShape, options = { padding: 2 }): string =>
  `{\n${Object.entries(shape)
    .map(([k, v]) => {
      const schema = v
      return `${' '.repeat(options.padding)}${k}${schema.isOptional ? '?' : ''}: ${
        schema.isT(TTypeName.Object) ? TShow.Object(schema.shape, { padding: options.padding + 2 }) : TShow(v)
      }`
    })
    .join(';\n')}\n${' '.repeat(options.padding - 2)}}`

TShow.Pipeline = (a: AnyTType, b: AnyTType): string => `Pipeline<${TShow(a)}, ${TShow(b)}>`

TShow.colorize = (hint: string): string => {
  return hint.replace(/(\w+(?!\??:))/g, chalk.cyan('$1')).replace(/(\||\.|\?|:|readonly)/g, chalk.magenta('$1'))
}

TShow._unionize = (values: readonly string[], options?: { readonly parens?: boolean }): string => {
  const deunionized = values.flatMap(TShow._deunionize)
  const unique = [...new Set(deunionized)]

  if (unique.length === 0) {
    return TShow.Never()
  }

  if (unique.includes(TShow.Any())) {
    return TShow.Any()
  }

  if (unique.includes(TShow.Unknown())) {
    return TShow.Unknown()
  }

  const joined = unique.join(' | ')

  return options?.parens && unique.length > 1 ? `(${joined})` : joined
}

TShow._deunionize = (hint: string): string[] => {
  const root = [...(/^[^<>,]*\|[^<>,]*$/.exec(hint) ?? [])][0]

  if (root) {
    return [...new Set(root.split(' | '))]
  }

  return [hint]
}
