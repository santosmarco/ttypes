import { t } from '../index'
import { assertEqual } from './_utils'

describe('TNumber', () => {
  test('typeName', () => {
    expect(t.number().typeName).toStrictEqual('TNumber')
  })

  test('parses', () => {
    expect(t.number().parse(1)).toStrictEqual(1)
  })

  test('parses async', async () => {
    expect(await t.number().parseAsync(1)).toStrictEqual(1)
  })

  test('fails', () => {
    expect(() => t.number().parse('1')).toThrow()
    expect(() => t.number().parse(BigInt(1))).toThrow()
    expect(() => t.number().parse(Number.NaN)).toThrow()
  })

  test('is', () => {
    expect(t.number().isOptional).toStrictEqual(false)
    expect(t.number().isNullable).toStrictEqual(false)
    expect(t.number().isNullish).toStrictEqual(false)
    expect(t.number().isRequired).toStrictEqual(true)
    expect(t.number().isReadonly).toStrictEqual(false)
  })

  test('inference', () => {
    const schema = t.number()
    assertEqual<t.infer<typeof schema>, number>(true)
  })
})

describe('TBigInt', () => {
  test('typeName', () => {
    expect(t.bigint().typeName).toStrictEqual('TBigInt')
  })

  test('parses', () => {
    expect(t.bigint().parse(BigInt(1))).toStrictEqual(BigInt(1))
  })

  test('parses async', async () => {
    expect(await t.bigint().parseAsync(BigInt(1))).toStrictEqual(BigInt(1))
  })

  test('fails', () => {
    expect(() => t.bigint().parse('1')).toThrow()
    expect(() => t.bigint().parse(1)).toThrow()
    expect(() => t.bigint().parse(Number.NaN)).toThrow()
  })

  test('is', () => {
    expect(t.bigint().isOptional).toStrictEqual(false)
    expect(t.bigint().isNullable).toStrictEqual(false)
    expect(t.bigint().isNullish).toStrictEqual(false)
    expect(t.bigint().isRequired).toStrictEqual(true)
    expect(t.bigint().isReadonly).toStrictEqual(false)
  })

  test('inference', () => {
    const schema = t.bigint()
    assertEqual<t.infer<typeof schema>, bigint>(true)
  })
})
