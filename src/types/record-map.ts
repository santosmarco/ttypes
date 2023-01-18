import type { TDef } from '../def'
import { IssueKind, type InvalidRecordIssue, type ToChecks } from '../issues'
import { TManifest } from '../manifest'
import type { TOptions } from '../options'
import { TParsedType, type ParseContextOf, type ParseResultOf } from '../parse'
import { TTypeName } from '../type-names'
import { u } from '../utils'
import { TString, TType, type InputOf, type OutputOf, type TDefined, type TOptional } from './_internal'

/* ----------------------------------------------------------------------------------------------------------------- - */
/*                                                       TRecord                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TRecordInput<
  K extends TType<PropertyKey, TDef, PropertyKey>,
  V extends TType,
  Coerce extends boolean
> = Coerce extends true ? Record<InputOf<K>, InputOf<V>> | Map<InputOf<K>, InputOf<V>> : Record<InputOf<K>, InputOf<V>>

const handleRecordEntry = <T>([k, v]: readonly [PropertyKey, T]): readonly [PropertyKey, T] => [
  typeof k === 'symbol' ? k : Number.isNaN(Number(k)) ? k : Number(k),
  v,
]

export interface TRecordDef<K extends TType<PropertyKey, TDef, PropertyKey>, V extends TType, Coerce extends boolean>
  extends TDef {
  readonly typeName: TTypeName.Record
  readonly keys: K
  readonly values: V
  readonly checks: ToChecks<InvalidRecordIssue>
  readonly coerce: Coerce
}

export class TRecord<
  K extends TType<PropertyKey, TDef, PropertyKey>,
  V extends TType,
  Coerce extends boolean = false
> extends TType<Record<OutputOf<K>, OutputOf<V>>, TRecordDef<K, V, Coerce>, TRecordInput<K, V, Coerce>> {
  get _manifest() {
    return TManifest<TRecordInput<K, V, Coerce>>()({
      type: TParsedType.Object,
      keys: this.keys.manifest(),
      values: this.values.manifest(),
      minKeys: this._def.checks.find((check) => check.check === 'min_keys')?.expected.value ?? null,
      maxKeys: this._def.checks.find((check) => check.check === 'max_keys')?.expected.value ?? null,
      coerce: this._def.coerce,
    })
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    const { coerce, keys, values, checks } = this._def

    if (coerce && ctx.data instanceof Map) {
      ctx.setData(u.fromEntries([...ctx.data.entries()]))
    }

    if (!u.isPlainObject(ctx.data)) {
      return ctx.invalidType({ expected: TParsedType.Object }).abort()
    }

    const { data } = ctx
    const result = {} as Record<OutputOf<K>, OutputOf<V>>

    const entries = u.entries(data)

    for (const check of checks) {
      if (
        check.check === 'min_keys' &&
        (check.expected.inclusive ? entries.length < check.expected.value : entries.length <= check.expected.value)
      ) {
        ctx.addIssue(
          IssueKind.InvalidRecord,
          {
            check: check.check,
            expected: check.expected,
            received: entries.length,
          },
          check.message
        )
        if (ctx.common.abortEarly) {
          return ctx.abort()
        }
      }

      if (
        check.check === 'max_keys' &&
        (check.expected.inclusive ? entries.length > check.expected.value : entries.length >= check.expected.value)
      ) {
        ctx.addIssue(
          IssueKind.InvalidRecord,
          {
            check: check.check,
            expected: check.expected,
            received: entries.length,
          },
          check.message
        )
        if (ctx.common.abortEarly) {
          return ctx.abort()
        }
      }
    }

    if (ctx.common.async) {
      return Promise.all(
        entries
          .map(handleRecordEntry)
          .map(async ([k, v]) =>
            Promise.all([
              keys._parseAsync(ctx.child(keys, k, [k, 'key'])),
              values._parseAsync(ctx.child(values, v, [k, 'value'])),
            ])
          )
      ).then((results) => {
        for (const [keyRes, valueRes] of results) {
          if (!keyRes.ok || !valueRes.ok) {
            if (ctx.common.abortEarly) {
              return ctx.abort()
            }

            continue
          }

          result[keyRes.data] = valueRes.data
        }

        return ctx.isValid() ? ctx.success(result) : ctx.abort()
      })
    }

    for (const [keyRes, valueRes] of entries
      .map(handleRecordEntry)
      .map(
        ([k, v]) =>
          [
            keys._parseSync(ctx.child(keys, k, [k, 'key'])),
            values._parseSync(ctx.child(values, v, [k, 'value'])),
          ] as const
      )) {
      if (!keyRes.ok || !valueRes.ok) {
        if (ctx.common.abortEarly) {
          return ctx.abort()
        }

        continue
      }

      result[keyRes.data] = valueRes.data
    }

    return ctx.isValid() ? ctx.success(result) : ctx.abort()
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  get keys(): K {
    return this._def.keys
  }

  get values(): V {
    return this._def.values
  }

  get entries(): readonly [keys: K, values: V] {
    return [this.keys, this.values]
  }

  /* --------------------------------------------------- Coercion --------------------------------------------------- */

  coerce<T extends boolean = true>(value = true as T): TRecord<K, V, T> {
    return new TRecord({ ...this._def, coerce: value })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  minKeys<V extends number>(
    value: u.NonNegativeInteger<V>,
    options?: { readonly inclusive?: boolean; readonly message?: string }
  ): this {
    return this._addCheck({
      check: 'min_keys',
      expected: { value, inclusive: options?.inclusive ?? true },
      message: options?.message,
    })
  }

  maxKeys<V extends number>(
    value: u.NonNegativeInteger<V>,
    options?: { readonly inclusive?: boolean; readonly message?: string }
  ): this {
    return this._addCheck({
      check: 'max_keys',
      expected: { value, inclusive: options?.inclusive ?? true },
      message: options?.message,
    })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  partial(): TRecord<K, TOptional<V>, Coerce> {
    return new TRecord({ ...this._def, values: this.values.optional() })
  }

  required(): TRecord<K, TDefined<V>, Coerce> {
    return new TRecord({ ...this._def, values: this.values.defined() })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  toMap(): TMap<K, V> {
    return new TMap({ ...this._def, typeName: TTypeName.Map })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create<V extends TType>(values: V, options?: TOptions): TRecord<TString, V>
  static create<K extends TType<PropertyKey, TDef, PropertyKey>, V extends TType>(
    keys: K,
    values: V,
    options?: TOptions
  ): TRecord<K, V>
  static create(
    first: TType<PropertyKey, TDef, PropertyKey>,
    second?: TType | TOptions,
    third?: TOptions
  ): TRecord<TType<PropertyKey, TDef, PropertyKey>, TType> {
    if (second instanceof TType) {
      return new TRecord({
        typeName: TTypeName.Record,
        keys: first,
        values: second,
        checks: [],
        coerce: false,
        options: { ...third },
      })
    }

    return new TRecord({
      typeName: TTypeName.Record,
      keys: TString.create(),
      values: first,
      checks: [],
      coerce: false,
      options: { ...second },
    })
  }
}

export type AnyTRecord = TRecord<TType<PropertyKey, TDef, PropertyKey>, TType, boolean>

/* ----------------------------------------------------------------------------------------------------------------- - */
/*                                                        TMap                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TMapDef<K extends TType, V extends TType> extends TDef {
  readonly typeName: TTypeName.Map
  readonly keys: K
  readonly values: V
}

export class TMap<K extends TType, V extends TType> extends TType<
  Map<OutputOf<K>, OutputOf<V>>,
  TMapDef<K, V>,
  Map<InputOf<K>, InputOf<V>>
> {
  get _manifest() {
    return TManifest<Map<InputOf<K>, InputOf<V>>>()({
      type: TParsedType.Map,
      keys: this.keys.manifest(),
      values: this.values.manifest(),
    })
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (!(ctx.data instanceof Map)) {
      return ctx.invalidType({ expected: TParsedType.Map }).abort()
    }

    const { keys, values } = this._def
    const { data } = ctx

    const result = new Map<OutputOf<K>, OutputOf<V>>()

    if (ctx.common.async) {
      return Promise.all(
        [...data.entries()].map(async ([k, v]) =>
          Promise.all([
            keys._parseAsync(ctx.child(keys, k, [k, 'key'])),
            values._parseAsync(ctx.child(values, v, [k, 'value'])),
          ])
        )
      ).then((results) => {
        for (const [keyRes, valueRes] of results) {
          if (!keyRes.ok || !valueRes.ok) {
            if (ctx.common.abortEarly) {
              return ctx.abort()
            }

            continue
          }

          result.set(keyRes.data, valueRes.data)
        }

        return ctx.isValid() ? ctx.success(result) : ctx.abort()
      })
    }

    for (const [keyRes, valueRes] of [...data.entries()].map(
      ([k, v]) =>
        [
          keys._parseSync(ctx.child(keys, k, [k, 'key'])),
          values._parseSync(ctx.child(values, v, [k, 'value'])),
        ] as const
    )) {
      if (!keyRes.ok || !valueRes.ok) {
        if (ctx.common.abortEarly) {
          return ctx.abort()
        }

        continue
      }

      result.set(keyRes.data, valueRes.data)
    }

    return ctx.isValid() ? ctx.success(result) : ctx.abort()
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  get keys(): K {
    return this._def.keys
  }

  get values(): V {
    return this._def.values
  }

  get entries(): readonly [keys: K, values: V] {
    return [this.keys, this.values]
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  partial(): TMap<K, TOptional<V>> {
    return new TMap({ ...this._def, values: this.values.optional() })
  }

  partialKeys(): TMap<TOptional<K>, V> {
    return new TMap({ ...this._def, keys: this.keys.optional() })
  }

  required(): TMap<K, TDefined<V>> {
    return new TMap({ ...this._def, values: this.values.defined() })
  }

  requiredKeys(): TMap<TDefined<K>, V> {
    return new TMap({ ...this._def, keys: this.keys.defined() })
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create<K extends TType, V extends TType>(keys: K, values: V, options?: TOptions): TMap<K, V> {
    return new TMap({ typeName: TTypeName.Map, keys, values, options: { ...options } })
  }
}

export type AnyTMap = TMap<TType, TType>
