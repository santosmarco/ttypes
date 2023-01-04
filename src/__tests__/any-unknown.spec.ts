import { t } from '../index'
import { assertEqual } from './_utils'

const testSymbol = Symbol('foo')

describe('TAny', () => {
  test('typeName', () => {
    expect(t.any().typeName).toStrictEqual('TAny')
  })

  test('parses', () => {
    expect(t.any().parse('foo')).toStrictEqual('foo')
    expect(t.any().parse(1)).toStrictEqual(1)
    expect(t.any().parse(BigInt(1))).toStrictEqual(BigInt(1))
    expect(t.any().parse(true)).toStrictEqual(true)
    expect(t.any().parse([])).toStrictEqual([])
    expect(t.any().parse({})).toStrictEqual({})
    expect(t.any().parse(null)).toStrictEqual(null)
    expect(t.any().parse(undefined)).toStrictEqual(undefined)
    expect(t.any().parse(testSymbol)).toStrictEqual(testSymbol)
    expect(String(t.any().parse(() => 'foo'))).toStrictEqual(String(() => 'foo'))
  })

  test('parses async', async () => {
    expect(await t.any().parseAsync('foo')).toStrictEqual('foo')
    expect(await t.any().parseAsync(1)).toStrictEqual(1)
    expect(await t.any().parseAsync(BigInt(1))).toStrictEqual(BigInt(1))
    expect(await t.any().parseAsync(true)).toStrictEqual(true)
    expect(await t.any().parseAsync([])).toStrictEqual([])
    expect(await t.any().parseAsync({})).toStrictEqual({})
    expect(await t.any().parseAsync(null)).toStrictEqual(null)
    expect(await t.any().parseAsync(undefined)).toStrictEqual(undefined)
    expect(String(await t.any().parseAsync(() => 'foo'))).toStrictEqual(String(() => 'foo'))
  })

  test('is', () => {
    expect(t.any().isOptional()).toStrictEqual(true)
    expect(t.any().isNullable()).toStrictEqual(true)
    expect(t.any().isNullish()).toStrictEqual(true)
    expect(t.any().isRequired()).toStrictEqual(false)
    expect(t.any().isReadonly()).toStrictEqual(false)
  })

  test('inference', () => {
    const schema = t.any()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    assertEqual<t.infer<typeof schema>, any>(true)
  })
})

describe('TUnknown', () => {
  test('typeName', () => {
    expect(t.unknown().typeName).toStrictEqual('TUnknown')
  })

  test('parses', () => {
    expect(t.unknown().parse('foo')).toStrictEqual('foo')
    expect(t.unknown().parse(1)).toStrictEqual(1)
    expect(t.unknown().parse(BigInt(1))).toStrictEqual(BigInt(1))
    expect(t.unknown().parse(true)).toStrictEqual(true)
    expect(t.unknown().parse([])).toStrictEqual([])
    expect(t.unknown().parse({})).toStrictEqual({})
    expect(t.unknown().parse(null)).toStrictEqual(null)
    expect(t.unknown().parse(undefined)).toStrictEqual(undefined)
    expect(t.unknown().parse(testSymbol)).toStrictEqual(testSymbol)
    expect(String(t.unknown().parse(() => 'foo'))).toStrictEqual(String(() => 'foo'))
  })

  test('parses async', async () => {
    expect(await t.unknown().parseAsync('foo')).toStrictEqual('foo')
    expect(await t.unknown().parseAsync(1)).toStrictEqual(1)
    expect(await t.unknown().parseAsync(BigInt(1))).toStrictEqual(BigInt(1))
    expect(await t.unknown().parseAsync(true)).toStrictEqual(true)
    expect(await t.unknown().parseAsync([])).toStrictEqual([])
    expect(await t.unknown().parseAsync({})).toStrictEqual({})
    expect(await t.unknown().parseAsync(null)).toStrictEqual(null)
    expect(await t.unknown().parseAsync(undefined)).toStrictEqual(undefined)
    expect(String(await t.unknown().parseAsync(() => 'foo'))).toStrictEqual(String(() => 'foo'))
  })

  test('is', () => {
    expect(t.unknown().isOptional()).toStrictEqual(true)
    expect(t.unknown().isNullable()).toStrictEqual(true)
    expect(t.unknown().isNullish()).toStrictEqual(true)
    expect(t.unknown().isRequired()).toStrictEqual(false)
    expect(t.unknown().isReadonly()).toStrictEqual(false)
  })

  test('inference', () => {
    const schema = t.unknown()
    assertEqual<t.infer<typeof schema>, unknown>(true)
  })
})
