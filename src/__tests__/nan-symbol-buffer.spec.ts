import { t } from '../index'
import { assertEqual } from './_utils'

describe('TNaN', () => {
  test('typeName', () => {
    expect(t.nan().typeName).toStrictEqual('TNaN')
  })

  test('parses', () => {
    expect(t.nan().parse(Number.NaN)).toStrictEqual(Number.NaN)
  })

  test('parses async', async () => {
    expect(await t.nan().parseAsync(Number.NaN)).toStrictEqual(Number.NaN)
  })

  test('fails', () => {
    expect(() => t.nan().parse(1)).toThrow()
  })

  test('is', () => {
    expect(t.nan().isOptional).toStrictEqual(false)
    expect(t.nan().isNullable).toStrictEqual(false)
    expect(t.nan().isNullish).toStrictEqual(false)
    expect(t.nan().isRequired).toStrictEqual(true)
    expect(t.nan().isReadonly).toStrictEqual(false)
  })

  test('inference', () => {
    const schema = t.nan()
    assertEqual<t.infer<typeof schema>, number>(true)
  })
})

const testSymbol = Symbol('foo')

describe('TSymbol', () => {
  test('typeName', () => {
    expect(t.symbol().typeName).toStrictEqual('TSymbol')
  })

  test('parses', () => {
    expect(t.symbol().parse(testSymbol)).toStrictEqual(testSymbol)
  })

  test('parses async', async () => {
    expect(await t.symbol().parseAsync(testSymbol)).toStrictEqual(testSymbol)
  })

  test('fails', () => {
    expect(() => t.symbol().parse(1)).toThrow()
  })

  test('is', () => {
    expect(t.symbol().isOptional).toStrictEqual(false)
    expect(t.symbol().isNullable).toStrictEqual(false)
    expect(t.symbol().isNullish).toStrictEqual(false)
    expect(t.symbol().isRequired).toStrictEqual(true)
    expect(t.symbol().isReadonly).toStrictEqual(false)
  })

  test('inference', () => {
    const schema = t.symbol()
    assertEqual<t.infer<typeof schema>, symbol>(true)
  })
})

describe('TBuffer', () => {
  test('typeName', () => {
    expect(t.buffer().typeName).toStrictEqual('TBuffer')
  })

  test('parses', () => {
    expect(t.buffer().parse(Buffer.from('foo'))).toStrictEqual(Buffer.from('foo'))
  })

  test('parses async', async () => {
    expect(await t.buffer().parseAsync(Buffer.from('foo'))).toStrictEqual(Buffer.from('foo'))
  })

  test('fails', () => {
    expect(() => t.buffer().parse('foo')).toThrow()
  })

  test('is', () => {
    expect(t.buffer().isOptional).toStrictEqual(false)
    expect(t.buffer().isNullable).toStrictEqual(false)
    expect(t.buffer().isNullish).toStrictEqual(false)
    expect(t.buffer().isRequired).toStrictEqual(true)
    expect(t.buffer().isReadonly).toStrictEqual(false)
  })

  test('inference', () => {
    const schema = t.buffer()
    assertEqual<t.infer<typeof schema>, Buffer>(true)
  })
})
