import { t } from '../index'
import { assertEqual } from './_utils'

describe('TBoolean', () => {
  test('typeName', () => {
    expect(t.boolean().typeName).toStrictEqual('TBoolean')
  })

  test('parses', () => {
    expect(t.boolean().parse(true)).toStrictEqual(true)
    expect(t.boolean().parse(false)).toStrictEqual(false)
  })

  test('parses async', async () => {
    expect(await t.boolean().parseAsync(true)).toStrictEqual(true)
    expect(await t.boolean().parseAsync(false)).toStrictEqual(false)
  })

  test('fails', () => {
    expect(() => t.boolean().parse(1)).toThrow()
    expect(() => t.boolean().parse('foo')).toThrow()
    expect(() => t.boolean().parse(null)).toThrow()
    expect(() => t.boolean().parse(undefined)).toThrow()
  })

  test('is', () => {
    expect(t.boolean().isOptional).toStrictEqual(false)
    expect(t.boolean().isNullable).toStrictEqual(false)
    expect(t.boolean().isNullish).toStrictEqual(false)
    expect(t.boolean().isRequired).toStrictEqual(true)
    expect(t.boolean().isReadonly).toStrictEqual(false)
  })

  test('inference', () => {
    const schema = t.boolean()
    assertEqual<t.infer<typeof schema>, boolean>(true)
  })
})

describe('TTrue', () => {
  test('typeName', () => {
    expect(t.true().typeName).toStrictEqual('TTrue')
  })

  test('parses', () => {
    expect(t.true().parse(true)).toStrictEqual(true)
  })

  test('parses async', async () => {
    expect(await t.true().parseAsync(true)).toStrictEqual(true)
  })

  test('fails', () => {
    expect(() => t.true().parse(false)).toThrow()
    expect(() => t.true().parse(1)).toThrow()
    expect(() => t.true().parse('foo')).toThrow()
    expect(() => t.true().parse(null)).toThrow()
    expect(() => t.true().parse(undefined)).toThrow()
  })

  test('is', () => {
    expect(t.true().isOptional).toStrictEqual(false)
    expect(t.true().isNullable).toStrictEqual(false)
    expect(t.true().isNullish).toStrictEqual(false)
    expect(t.true().isRequired).toStrictEqual(true)
    expect(t.true().isReadonly).toStrictEqual(false)
  })

  test('inference', () => {
    const schema = t.true()
    assertEqual<t.infer<typeof schema>, true>(true)
  })
})

describe('TFalse', () => {
  test('typeName', () => {
    expect(t.false().typeName).toStrictEqual('TFalse')
  })

  test('parses', () => {
    expect(t.false().parse(false)).toStrictEqual(false)
  })

  test('parses async', async () => {
    expect(await t.false().parseAsync(false)).toStrictEqual(false)
  })

  test('fails', () => {
    expect(() => t.false().parse(true)).toThrow()
    expect(() => t.false().parse(1)).toThrow()
    expect(() => t.false().parse('foo')).toThrow()
    expect(() => t.false().parse(null)).toThrow()
    expect(() => t.false().parse(undefined)).toThrow()
  })

  test('is', () => {
    expect(t.false().isOptional).toStrictEqual(false)
    expect(t.false().isNullable).toStrictEqual(false)
    expect(t.false().isNullish).toStrictEqual(false)
    expect(t.false().isRequired).toStrictEqual(true)
    expect(t.false().isReadonly).toStrictEqual(false)
  })

  test('inference', () => {
    const schema = t.false()
    assertEqual<t.infer<typeof schema>, false>(true)
  })
})
