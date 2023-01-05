import {
  TParsedType,
  TString,
  TType,
  TTypeName,
  type AnyTType,
  type InputOf,
  type OutputOf,
  type ParseContextOf,
  type ParseResultOf,
  type Simplify,
  type TDef,
  type TOptions,
} from '../_internal'

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TRecord                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TRecordDef<K extends AnyTType<PropertyKey, PropertyKey>, V extends AnyTType> extends TDef {
  readonly typeName: TTypeName.Record
  readonly keys: K
  readonly values: V
}

export class TRecord<K extends AnyTType<PropertyKey, PropertyKey>, V extends AnyTType> extends TType<
  Record<OutputOf<K>, OutputOf<V>>,
  TRecordDef<K, V>,
  Record<InputOf<K>, InputOf<V>>
> {
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (typeof ctx.data !== 'object' || ctx.data === null) {
      return ctx.invalidType({ expected: TParsedType.Object }).abort()
    }

    const { keys, values } = this._def
    const { data } = ctx

    const result = {} as Record<OutputOf<K>, OutputOf<V>>

    if (ctx.isAsync()) {
      return Promise.all(
        Object.entries(data).map(async ([k, v]) =>
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

    for (const [k, v] of Object.entries(data)) {
      const keyRes = keys._parseSync(ctx.child(keys, k, [k, 'key']))
      const valueRes = values._parseSync(ctx.child(values, v, [k, 'value']))

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

  get keys(): K {
    return this._def.keys
  }

  get values(): V {
    return this._def.values
  }

  get entries(): readonly [keys: K, values: V] {
    return [this.keys, this.values]
  }

  toMap(): TMap<K, V> {
    return new TMap({ ...this._def, typeName: TTypeName.Map })
  }

  static create<V extends AnyTType>(values: V, options?: Simplify<TOptions>): TRecord<TString, V>
  static create<K extends AnyTType<PropertyKey, PropertyKey>, V extends AnyTType>(
    keys: K,
    values: V,
    options?: Simplify<TOptions>
  ): TRecord<K, V>
  static create(
    valuesOrKeys: AnyTType<PropertyKey, PropertyKey>,
    valuesOrOptions?: AnyTType | Simplify<TOptions>,
    maybeOptions?: Simplify<TOptions>
  ): TRecord<AnyTType<PropertyKey, PropertyKey>, AnyTType> {
    if (valuesOrOptions instanceof TType) {
      return new TRecord({
        typeName: TTypeName.Record,
        keys: valuesOrKeys,
        values: valuesOrOptions,
        options: { ...maybeOptions },
      })
    }

    return new TRecord({
      typeName: TTypeName.Record,
      keys: TString.create(),
      values: valuesOrKeys,
      options: { ...valuesOrOptions },
    })
  }
}

export type AnyTRecord = TRecord<AnyTType<PropertyKey, PropertyKey>, AnyTType>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TMap                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TMapDef<K extends AnyTType, V extends AnyTType> extends TDef {
  readonly typeName: TTypeName.Map
  readonly keys: K
  readonly values: V
}

export class TMap<K extends AnyTType, V extends AnyTType> extends TType<
  Map<OutputOf<K>, OutputOf<V>>,
  TMapDef<K, V>,
  Map<InputOf<K>, InputOf<V>>
> {
  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (!(ctx.data instanceof Map)) {
      return ctx.invalidType({ expected: TParsedType.Map }).abort()
    }

    const { keys, values } = this._def
    const { data } = ctx

    const result = new Map<OutputOf<K>, OutputOf<V>>()

    if (ctx.isAsync()) {
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

    for (const [k, v] of data.entries()) {
      const keyRes = keys._parseSync(ctx.child(keys, k, [k, 'key']))
      const valueRes = values._parseSync(ctx.child(values, v, [k, 'value']))

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

  get keys(): K {
    return this._def.keys
  }

  get values(): V {
    return this._def.values
  }

  get entries(): readonly [keys: K, values: V] {
    return [this.keys, this.values]
  }

  static create<K extends AnyTType, V extends AnyTType>(keys: K, values: V, options?: Simplify<TOptions>): TMap<K, V> {
    return new TMap({ typeName: TTypeName.Map, keys, values, options: { ...options } })
  }
}

export type AnyTMap = TMap<AnyTType, AnyTType>
