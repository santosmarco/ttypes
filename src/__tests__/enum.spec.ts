import { t } from '../index'
import { assertEqual } from './_utils'

describe('TEnum', () => {
  const schema = t.enum(['foo', 'bar'])

  test('typeName', () => {
    expect(schema.typeName).toStrictEqual('TEnum')
  })

  test('parses', () => {
    expect(schema.parse('foo')).toStrictEqual('foo')
    expect(schema.parse('bar')).toStrictEqual('bar')
  })

  test('parses async', async () => {
    expect(await schema.parseAsync('foo')).toStrictEqual('foo')
    expect(await schema.parseAsync('bar')).toStrictEqual('bar')
  })

  test('fails', () => {
    expect(() => schema.parse('baz')).toThrow()
    expect(() => schema.parse(1)).toThrow()
  })

  test('values', () => {
    expect(schema.values).toStrictEqual(['foo', 'bar'])
  })

  test('enum', () => {
    expect(schema.enum).toStrictEqual({
      foo: 'foo',
      bar: 'bar',
    })
  })

  test('is', () => {
    expect(schema.isOptional).toStrictEqual(false)
    expect(schema.isNullable).toStrictEqual(false)
    expect(schema.isNullish).toStrictEqual(false)
    expect(schema.isRequired).toStrictEqual(true)
    expect(schema.isReadonly).toStrictEqual(false)
  })

  test('inference', () => {
    assertEqual<t.infer<typeof schema>, 'foo' | 'bar'>(true)
    assertEqual<typeof schema.values, readonly ['foo', 'bar']>(true)
    assertEqual<
      typeof schema.enum,
      {
        readonly foo: 'foo'
        readonly bar: 'bar'
      }
    >(true)
  })
})

describe('TNativeEnum', () => {
  enum TestEnum {
    Foo = 'foo',
    Bar = 1,
  }

  const schema = t.nativeEnum(TestEnum)

  test('typeName', () => {
    expect(schema.typeName).toStrictEqual('TNativeEnum')
  })

  test('parses', () => {
    expect(schema.parse('foo')).toStrictEqual('foo')
    expect(schema.parse(1)).toStrictEqual(1)
  })

  test('parses async', async () => {
    expect(await schema.parseAsync('foo')).toStrictEqual('foo')
    expect(await schema.parseAsync(1)).toStrictEqual(1)
  })

  test('fails', () => {
    expect(() => schema.parse('baz')).toThrow()
    expect(() => schema.parse(2)).toThrow()
  })

  test('values', () => {
    expect(schema.values).toStrictEqual(['foo', 1])
  })

  test('enum', () => {
    expect(schema.enum).toStrictEqual({
      Foo: 'foo',
      Bar: 1,
    })
  })

  test('is', () => {
    expect(schema.isOptional).toStrictEqual(false)
    expect(schema.isNullable).toStrictEqual(false)
    expect(schema.isNullish).toStrictEqual(false)
    expect(schema.isRequired).toStrictEqual(true)
    expect(schema.isReadonly).toStrictEqual(false)
  })

  test('inference', () => {
    assertEqual<`${t.infer<typeof schema>}`, `${TestEnum}`>(true)
    assertEqual<typeof schema.values, readonly [TestEnum.Foo, TestEnum.Bar]>(true)
    assertEqual<typeof schema.enum, typeof TestEnum>(true)
  })
})
