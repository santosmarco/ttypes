import type { TDef } from '../def'
import { IssueKind, type CustomIssue } from '../error'
import type { TOptions } from '../options'
import type { AsyncParseResultOf, ParseContextOf, ParsePath, ParseResultOf, SyncParseResultOf } from '../parse'
import { TTypeName } from '../type-names'
import { u } from '../utils'
import { TType, type InputOf, type ManifestOf, type OutputOf, type TUnwrappable, type UnwrapDeep } from './_internal'

/* ----------------------------------------------------------------------------------------------------------------- - */
/*                                                      TEffects                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export enum EffectKind {
  Preprocess = 'preprocess',
  Refinement = 'refinement',
  Transform = 'transform',
}

export interface EffectCtx<T extends TType> {
  readonly addIssue: ParseContextOf<T>['_addIssue']
  readonly path: ParsePath
}

export interface EffectBase<K extends EffectKind, Effect extends u.Fn> {
  readonly kind: K
  readonly handler: Effect
}

export type PreprocessEffect<T extends TType> = EffectBase<EffectKind.Preprocess, (data: unknown) => InputOf<T>>

export type RefinementEffect<T extends TType> = EffectBase<
  EffectKind.Refinement,
  (data: OutputOf<T>, ctx: u.Simplify<EffectCtx<T>>) => boolean | Promise<boolean>
>

export type TransformEffect<T extends TType, U> = EffectBase<
  EffectKind.Transform,
  (data: OutputOf<T>, ctx: u.Simplify<EffectCtx<T>>) => U
>

export type TEffect<T extends TType = TType, U = unknown> =
  | PreprocessEffect<T>
  | RefinementEffect<T>
  | TransformEffect<T, U>

export type RefinementMessage<T extends TType> = string | CustomIssue | ((data: OutputOf<T>) => string | CustomIssue)

export interface TEffectsDef<T extends TType> extends TDef {
  readonly typeName: TTypeName.Effects
  readonly underlying: T
  readonly effect: TEffect
}

export class TEffects<T extends TType, O = OutputOf<T>, I = InputOf<T>>
  extends TType<O, TEffectsDef<T>, I>
  implements TUnwrappable<T>
{
  get _manifest(): ManifestOf<T> {
    return { ...this.underlying.manifest() }
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    const { underlying, effect } = this._def
    const { data } = ctx

    if (effect.kind === EffectKind.Preprocess) {
      const preprocessed = effect.handler(data)

      if (ctx.common.async) {
        return Promise.resolve(preprocessed).then(async (data) =>
          underlying._parseAsync(ctx.child(underlying, data))
        ) as AsyncParseResultOf<this>
      }

      return underlying._parseSync(ctx.child(underlying, preprocessed)) as SyncParseResultOf<this>
    }

    const effectCtx: EffectCtx<T> = {
      addIssue(issue) {
        ctx._addIssue(issue)
      },
      get path() {
        return ctx.path
      },
    }

    if (effect.kind === EffectKind.Refinement) {
      if (ctx.common.async) {
        return underlying._parseAsync(ctx.child(underlying, data)).then(async (awaitedRes) => {
          if (!awaitedRes.ok) {
            return ctx.abort()
          }

          const refinementResult = await effect.handler(awaitedRes.data, effectCtx)

          return refinementResult && ctx.isValid() ? ctx.success(awaitedRes.data as OutputOf<this>) : ctx.abort()
        })
      }

      const res = underlying._parseSync(ctx.child(underlying, data))
      if (!res.ok) {
        return ctx.abort()
      }

      const refinementResult = effect.handler(res.data, effectCtx)
      if (u.isAsync(refinementResult)) {
        throw new Error('Async refinement encountered during synchronous parse operation. Use `.parseAsync()` instead.')
      }

      return refinementResult && ctx.isValid() ? ctx.success(res.data as OutputOf<this>) : ctx.abort()
    }

    if (ctx.common.async) {
      return underlying._parseAsync(ctx.child(underlying, data)).then(async (baseRes) => {
        if (!baseRes.ok) {
          return ctx.abort()
        }

        const transformed = await effect.handler(baseRes.data, effectCtx)

        return ctx.isValid() ? ctx.success(transformed as OutputOf<this>) : ctx.abort()
      })
    }

    const baseRes = underlying._parseSync(ctx.child(underlying, data))
    if (!baseRes.ok) {
      return ctx.abort()
    }

    const transformed = effect.handler(baseRes.data, effectCtx)
    if (u.isAsync(transformed)) {
      throw new Error('Async transform encountered during synchronous parse operation. Use `.parseAsync()` instead.')
    }

    return ctx.isValid() ? ctx.success(transformed as OutputOf<this>) : ctx.abort()
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  get underlying(): T {
    return this._def.underlying
  }

  unwrap(): T {
    return this.underlying
  }

  unwrapDeep(): UnwrapDeep<T, TTypeName.Effects> {
    type U = UnwrapDeep<T, TTypeName.Effects>
    return (this.underlying instanceof TEffects ? this.underlying.unwrapDeep() : this.underlying) as U
  }
}

export type AnyTEffects = TEffects<TType, unknown, unknown>

/* --------------------------------------------------- TPreprocess -------------------------------------------------- */

export class TPreprocess<T extends TType, I extends InputOf<T>> extends TEffects<T, OutputOf<T>, I> {
  static create<T extends TType, I extends InputOf<T>>(
    preprocess: (data: unknown) => I,
    underlying: T,
    options?: TOptions
  ): TPreprocess<T, I> {
    return new TPreprocess({
      typeName: TTypeName.Effects,
      underlying,
      effect: { kind: EffectKind.Preprocess, handler: preprocess },
      options: { ...options },
    })
  }
}

/* --------------------------------------------------- TRefinement -------------------------------------------------- */

export type RefinementIssue = Partial<u.StripKey<CustomIssue, 'kind' | 'data'>>

const handleStringOrCustomIssue = (strOrCustomIssue: string | RefinementIssue): RefinementIssue =>
  typeof strOrCustomIssue === 'string' ? { message: strOrCustomIssue } : strOrCustomIssue

export class TRefinement<T extends TType, O extends OutputOf<T> = OutputOf<T>> extends TEffects<T, O> {
  static create<T extends TType, O extends OutputOf<T>>(
    underlying: T,
    refinement: (data: OutputOf<T>, ctx: EffectCtx<T>) => data is O,
    options?: TOptions & { readonly refinementMessage?: RefinementMessage<T> }
  ): TRefinement<T, O>
  static create<T extends TType>(
    underlying: T,
    refinement:
      | ((data: OutputOf<T>, ctx: EffectCtx<T>) => boolean | Promise<boolean>)
      | ((data: OutputOf<T>, ctx: EffectCtx<T>) => unknown),
    options?: TOptions & { readonly refinementMessage?: RefinementMessage<T> }
  ): TRefinement<T>
  static create<T extends TType>(
    underlying: T,
    refinement: (data: OutputOf<T>, ctx: EffectCtx<T>) => unknown,
    options?: TOptions & { readonly refinementMessage?: RefinementMessage<T> }
  ): TRefinement<T> {
    const handler: (data: OutputOf<T>, ctx: EffectCtx<T>) => boolean | Promise<boolean> = (data, ctx) => {
      const setError = (): void => {
        const issue: RefinementIssue = options?.refinementMessage
          ? handleStringOrCustomIssue(
              typeof options.refinementMessage === 'function'
                ? options.refinementMessage(data)
                : options.refinementMessage
            )
          : {}

        ctx.addIssue({
          kind: IssueKind.Custom,
          message: issue.message ?? '',
          payload: issue.payload ?? {},
          path: issue.path ?? [],
        })
      }

      const result = refinement(data, ctx)

      if (u.isAsync(result)) {
        return result.then((innerRes) => {
          if (!innerRes) {
            setError()
            return false
          }

          return true
        })
      }

      if (!result) {
        setError()
        return false
      }

      return true
    }

    return new TRefinement({
      typeName: TTypeName.Effects,
      underlying,
      effect: { kind: EffectKind.Refinement, handler },
      options: { ...options },
    })
  }
}

/* --------------------------------------------------- TTransform --------------------------------------------------- */

export class TTransform<T extends TType, O> extends TEffects<T, O> {
  static create<T extends TType, O>(
    underlying: T,
    transform: (data: OutputOf<T>, ctx: EffectCtx<T>) => O | Promise<O>,
    options?: TOptions
  ): TTransform<T, O> {
    return new TTransform({
      typeName: TTypeName.Effects,
      underlying,
      effect: { kind: EffectKind.Transform, handler: transform },
      options: { ...options },
    })
  }
}
