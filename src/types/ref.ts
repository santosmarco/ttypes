import {
  TType,
  TTypeName,
  type AnyTType,
  type ParseContextOf,
  type ParseResultOf,
  type TDef,
  type TObjectShape,
} from '../_internal'

export interface TRefDef<K extends string, S extends TObjectShape | undefined> extends TDef {
  readonly typeName: TTypeName.Ref
  readonly $ref: K
  readonly $shape: S
}

export class TRef<K extends string, S extends TObjectShape | undefined> extends TType<unknown, TRefDef<K, S>> {
  _parse(_ctx: ParseContextOf<this>): ParseResultOf<this> {
    throw new Error('Not implemented')
  }

  get $ref(): K {
    return this._def.$ref
  }

  get $shape(): S {
    return this._def.$shape
  }

  resolve<S_ extends TObjectShape>(shape: S_): AnyTType {
    const { $ref } = this._def

    const path = String($ref)
      .split(/[.[\]]/g)
      .filter(Boolean)

    let current: AnyTType = shape[path[0] as keyof typeof shape]

    for (const p of path.slice(1)) {
      const numericP = Number(p)

      if (Number.isNaN(numericP)) {
        if (current.isT(TTypeName.Object)) {
          current = current.shape[p]
        } else if (current.isT(TTypeName.Union)) {
          const next = current.members.find((m) => m.isT(TTypeName.Object) && p in m.shape)
          if (!next) {
            throw new Error(`Unable to resolve path: ${$ref}`)
          }

          current = next
        } else {
          throw new Error(`Unable to resolve path: ${$ref}`)
        }
      } else if (current.isT(TTypeName.Tuple)) {
        current = current.items[numericP]
      } else {
        throw new Error(`Unable to resolve path: ${$ref}`)
      }
    }

    return current
  }

  static create<K extends string>(path: K): TRef<K, undefined> {
    return new TRef({ typeName: TTypeName.Ref, $ref: path, $shape: undefined, options: {} })
  }
}

export type AnyTRef = TRef<string, TObjectShape | undefined>
