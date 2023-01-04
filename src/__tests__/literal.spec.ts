import { t } from '../index'
import { assertEqual } from './_utils'

const testSymbol = Symbol('foo')

const literalString = t.literal('foo')
const literalNumber = t.literal(1)
// @ts-expect-error BigInt literals are not available when targeting lower than ES2020.
const literalBigInt = t.literal(1n)
const literalTrue = t.literal(true)
const literalFalse = t.literal(false)
const literalSymbol = t.literal(testSymbol)
const literalNull = t.literal(null)
const literalUndefined = t.literal(undefined)

describe('TLiteral', () => {
  test('typeName', () => {
    expect(t.literal('foo').typeName).toStrictEqual('TLiteral')
  })

  test('parses', () => {
    expect(literalString.parse('foo')).toStrictEqual('foo')
    expect(literalNumber.parse(1)).toStrictEqual(1)
    // @ts-expect-error BigInt literals are not available when targeting lower than ES2020.
    expect(literalBigInt.parse(1n)).toStrictEqual(1n)
    expect(literalTrue.parse(true)).toStrictEqual(true)
    expect(literalFalse.parse(false)).toStrictEqual(false)
    expect(literalSymbol.parse(testSymbol)).toStrictEqual(testSymbol)
    expect(literalNull.parse(null)).toStrictEqual(null)
    // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
    expect(literalUndefined.parse(undefined)).toStrictEqual(undefined)
  })

  test('parses async', async () => {
    expect(await literalString.parseAsync('foo')).toStrictEqual('foo')
    expect(await literalNumber.parseAsync(1)).toStrictEqual(1)
    // @ts-expect-error BigInt literals are not available when targeting lower than ES2020.
    expect(await literalBigInt.parseAsync(1n)).toStrictEqual(1n)
    expect(await literalTrue.parseAsync(true)).toStrictEqual(true)
    expect(await literalFalse.parseAsync(false)).toStrictEqual(false)
    expect(await literalSymbol.parseAsync(testSymbol)).toStrictEqual(testSymbol)
    expect(await literalNull.parseAsync(null)).toStrictEqual(null)
    // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
    expect(await literalUndefined.parseAsync(undefined)).toStrictEqual(undefined)
  })

  test('fails', () => {
    expect(() => literalString.parse('bar')).toThrow()
    expect(() => literalNumber.parse(2)).toThrow()
    // @ts-expect-error BigInt literals are not available when targeting lower than ES2020.
    expect(() => literalBigInt.parse(2n)).toThrow()
    expect(() => literalTrue.parse(false)).toThrow()
    expect(() => literalFalse.parse(true)).toThrow()
    expect(() => literalSymbol.parse(Symbol('bar'))).toThrow()
    expect(() => literalNull.parse(undefined)).toThrow()
    expect(() => {
      literalUndefined.parse(null)
    }).toThrow()
  })

  test('manifest', () => {
    expect(literalString.manifest).toStrictEqual({
      type: 'string',
      required: true,
      nullable: false,
      readonly: false,
      promise: false,
      literal: 'foo',
    })
    expect(literalNumber.manifest).toStrictEqual({
      type: 'number',
      required: true,
      nullable: false,
      readonly: false,
      promise: false,
      literal: 1,
    })
    expect(literalBigInt.manifest).toStrictEqual({
      type: 'bigint',
      required: true,
      nullable: false,
      readonly: false,
      promise: false,
      // @ts-expect-error BigInt literals are not available when targeting lower than ES2020.
      literal: 1n,
    })
    expect(literalTrue.manifest).toStrictEqual({
      type: 'boolean',
      required: true,
      nullable: false,
      readonly: false,
      promise: false,
      literal: true,
    })
    expect(literalFalse.manifest).toStrictEqual({
      type: 'boolean',
      required: true,
      nullable: false,
      readonly: false,
      promise: false,
      literal: false,
    })
    expect(literalSymbol.manifest).toStrictEqual({
      type: 'symbol',
      required: true,
      nullable: false,
      readonly: false,
      promise: false,
      literal: testSymbol,
    })
    expect(literalNull.manifest).toStrictEqual({
      type: 'null',
      required: true,
      nullable: false,
      readonly: false,
      promise: false,
      literal: null,
    })
    expect(literalUndefined.manifest).toStrictEqual({
      type: 'undefined',
      required: true,
      nullable: false,
      readonly: false,
      promise: false,
      literal: undefined,
    })
  })

  test('is', () => {
    expect(literalString.isOptional()).toStrictEqual(false)
    expect(literalString.isNullable()).toStrictEqual(false)
    expect(literalString.isNullish()).toStrictEqual(false)
    expect(literalString.isRequired()).toStrictEqual(true)
    expect(literalString.isReadonly()).toStrictEqual(false)
    expect(literalString.isDeprecated()).toStrictEqual(false)
    expect(literalNull.isOptional()).toStrictEqual(false)
    expect(literalNull.isNullable()).toStrictEqual(true)
    expect(literalNull.isNullish()).toStrictEqual(false)
    expect(literalNull.isRequired()).toStrictEqual(true)
    expect(literalUndefined.isOptional()).toStrictEqual(true)
    expect(literalUndefined.isNullable()).toStrictEqual(false)
    expect(literalUndefined.isNullish()).toStrictEqual(false)
    expect(literalUndefined.isRequired()).toStrictEqual(false)
  })

  test('inference', () => {
    assertEqual<t.infer<typeof literalString>, 'foo'>(true)
    assertEqual<t.infer<typeof literalNumber>, 1>(true)
    assertEqual<t.infer<typeof literalBigInt>, 1n>(true)
    assertEqual<t.infer<typeof literalTrue>, true>(true)
    assertEqual<t.infer<typeof literalFalse>, false>(true)
    assertEqual<t.infer<typeof literalSymbol>, typeof testSymbol>(true)
    // eslint-disable-next-line @typescript-eslint/ban-types
    assertEqual<t.infer<typeof literalNull>, null>(true)
    assertEqual<t.infer<typeof literalUndefined>, undefined>(true)
  })
})
