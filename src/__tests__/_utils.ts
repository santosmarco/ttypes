import { inspect } from 'util'
import { describe, expect, it } from 'vitest'
import type t from '../index'

export type AssertEqual<A, B> = (<X>() => X extends A ? 1 : 0) extends <Y>() => Y extends B ? 1 : 0 ? true : false

export const assertEqual = <A, B>(val: AssertEqual<A, B>): AssertEqual<A, B> => val

export type TTestsSpec = {
  readonly passes: ReadonlyArray<readonly [input: unknown, expected?: unknown]>
  readonly fails: ReadonlyArray<readonly [input: unknown, issues: readonly [t.OptionalDataIssue, ...t.OptionalDataIssue[]]]>
}

export type TTestsSpecOptions = {
  readonly async?: boolean
}

export type TTestDef = {
  readonly typeName: string
  readonly tests: TTestsSpec
  readonly variants: {
    readonly optional: TTestsSpec
    readonly nullable: TTestsSpec
    readonly defined: TTestsSpec
    readonly nonnullable: TTestsSpec
    readonly not: ReadonlyArray<readonly [forbid: readonly [t.TType, ...t.TType[]], spec: TTestsSpec]>
    readonly default: ReadonlyArray<readonly [value: unknown, spec: TTestsSpec]>
    readonly catch: ReadonlyArray<readonly [value: unknown, spec: TTestsSpec]>
  }
}

export function TTester(schema: t.TType, def: TTestDef) {
  it('typeName', () => {
    expect(schema.typeName).toStrictEqual(def.typeName)
  })

  describe('parses', () => {
    runTests('sync', schema, def.tests)
    runTests('async', schema, def.tests, { async: true })
  })

  runTests('optional', schema.optional(), def.variants.optional)
  runTests('nullable', schema.nullable(), def.variants.nullable)
  runTests('defined', schema.defined(), def.variants.defined)
  runTests('nonnullable', schema.nonnullable(), def.variants.nonnullable)

  describe('not', () => {
    for (const [forbid, spec] of def.variants.not) {
      runTests(forbid.map((f) => f.typeName).join(', '), schema.not(forbid), spec)
    }
  })

  describe('default', () => {
    for (const [value, spec] of def.variants.default) {
      runTests(
        `\`${inspect(value, { compact: true })}\``,
        schema.default(() => value),
        spec
      )
    }
  })

  describe('catch', () => {
    for (const [value, spec] of def.variants.catch) {
      runTests(
        `\`${inspect(value, { compact: true })}\``,
        schema.catch(() => value),
        spec
      )
    }
  })
}

function runTests(description: string, schema: t.TType, spec: TTestsSpec, options?: TTestsSpecOptions) {
  if (description) {
    describe(description, () => {
      runSpec()
    })
  } else {
    runSpec()
  }

  function runSpec() {
    it('passes', async () => {
      await Promise.all(spec.passes.map(async (test) => Promise.all([test, schema[options?.async ? 'safeParseAsync' : 'safeParse'](test[0])]))).then((resultPairs) => {
        for (const [test, result] of resultPairs) {
          const [input, expected] = test
          expect(result.ok).toBe(true)
          expect(result.data).toStrictEqual(test.length === 2 ? expected : input)
        }
      })
    })

    it('fails', async () => {
      await Promise.all(spec.fails.map(async (test) => Promise.all([test, schema[options?.async ? 'safeParseAsync' : 'safeParse'](test[0])]))).then((resultPairs) => {
        for (const [[input, issues], result] of resultPairs) {
          expect(result.ok).toBe(false)
          expect(result.error?.issues).toStrictEqual(issues.map((iss) => ({ ...iss, data: 'data' in iss ? iss.data : input })))
        }
      })
    })
  }
}
