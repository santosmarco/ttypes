import { t } from '../index'
import { assertEqual } from './_utils'

const testDate = new Date()
const testSymbol = Symbol('foo')

const stringRecords = [
  t.record(t.any()),
  t.record(t.array(t.string())),
  t.record(t.bigint()),
  t.record(t.boolean()),
  t.record(t.literal('foo')),
  t.record(t.never()),
  t.record(t.null()),
  t.record(t.number()),
  t.record(t.record(t.string())),
  t.record(t.string()),
  t.record(t.symbol()),
  t.record(t.tuple([t.string(), t.number()])),
  t.record(t.undefined()),
  t.record(t.union([t.string(), t.number()])),
  t.record(t.unknown()),
  t.record(t.void()),
] as const

const numericRecords = [
  t.record(t.number(), t.buffer()),
  t.record(t.number(), t.date()),
  t.record(t.number(), t.literal('foo').optional()),
  t.record(t.number(), t.literal('foo').nullable()),
] as const

const symbolicRecords = [
  t.record(t.symbol(), t.nan()),
  t.record(t.symbol(), t.primitive()),
  t.record(t.symbol(), t.propertykey()),
] as const

enum StringEnum {
  Foo = 'foo',
  Bar = 'bar',
  baz = 'Baz',
}

const stringEnumRecords = [
  t.record(t.enum(['foo', 'bar']), t.string().brand('myStringEnumRecord')),
  t.record(t.enum(['baz', 'qux']), t.string()),
  t.record(t.nativeEnum(StringEnum), t.string()),
] as const

enum NumericEnum {
  Zero = 0,
  One = 1,
}

const numericEnumRecords = [
  t.record(t.enum([1, 2]), t.number().brand('myNumericEnumRecord')),
  t.record(t.enum([3, 4]), t.number()),
  t.record(t.nativeEnum(NumericEnum), t.number()),
] as const

describe('TRecord', () => {
  test('typeName', () => {
    expect(stringRecords.every((r) => r.typeName === 'TRecord')).toStrictEqual(true)
  })

  describe('parses', () => {
    test('string records', () => {
      expect(stringRecords[0].parse({ foo: 'bar' })).toStrictEqual({ foo: 'bar' })
      expect(stringRecords[1].parse({ foo: ['bar'] })).toStrictEqual({ foo: ['bar'] })
      expect(stringRecords[2].parse({ foo: BigInt(1) })).toStrictEqual({ foo: BigInt(1) })
      expect(stringRecords[3].parse({ foo: true })).toStrictEqual({ foo: true })
      expect(stringRecords[4].parse({ foo: 'foo' })).toStrictEqual({ foo: 'foo' })
      // expect(testRecords[5].parse( /* never */ )).toStrictEqual( /* never */ )
      expect(stringRecords[6].parse({ foo: null })).toStrictEqual({ foo: null })
      expect(stringRecords[7].parse({ foo: 1 })).toStrictEqual({ foo: 1 })
      expect(stringRecords[8].parse({ foo: { bar: 'baz' } })).toStrictEqual({ foo: { bar: 'baz' } })
      expect(stringRecords[9].parse({ foo: 'bar' })).toStrictEqual({ foo: 'bar' })
      expect(stringRecords[10].parse({ foo: testSymbol })).toStrictEqual({ foo: testSymbol })
      expect(stringRecords[11].parse({ foo: ['bar', 1] })).toStrictEqual({ foo: ['bar', 1] })
      expect(stringRecords[12].parse({ foo: undefined })).toStrictEqual({ foo: undefined })
      // Union
      expect(stringRecords[13].parse({ foo: 'bar' })).toStrictEqual({ foo: 'bar' })
      expect(stringRecords[13].parse({ foo: 1 })).toStrictEqual({ foo: 1 })
      // ----
      expect(stringRecords[14].parse({ foo: 'bar' })).toStrictEqual({ foo: 'bar' })
      expect(stringRecords[15].parse({ foo: undefined })).toStrictEqual({ foo: undefined })
    })

    test('numeric records', () => {
      expect(numericRecords[0].parse({ 1: Buffer.from('foo') })).toStrictEqual({ 1: Buffer.from('foo') })
      expect(numericRecords[1].parse({ 1: testDate })).toStrictEqual({ 1: testDate })
      expect(numericRecords[2].parse({ 1: 'foo' })).toStrictEqual({ 1: 'foo' })
      expect(numericRecords[2].parse({ 1: undefined })).toStrictEqual({ 1: undefined })
      expect(numericRecords[2].parse({})).toStrictEqual({})
      expect(numericRecords[3].parse({ 1: 'foo' })).toStrictEqual({ 1: 'foo' })
      expect(numericRecords[3].parse({ 1: null })).toStrictEqual({ 1: null })
      expect(numericRecords[3].parse({})).toStrictEqual({})
    })

    test('symbolic records', () => {
      expect(t.record(t.symbol(), t.string()).parse({ [testSymbol]: 'foo' })).toStrictEqual({ [testSymbol]: 'foo' })
    })

    test('enum records', () => {
      expect(stringEnumRecords[0].parse({ foo: 'foo', bar: 'bar' })).toStrictEqual({ foo: 'foo', bar: 'bar' })
      expect(stringEnumRecords[1].parse({ baz: 'baz', qux: 'qux' })).toStrictEqual({ baz: 'baz', qux: 'qux' })
      expect(
        stringEnumRecords[2].parse({ foo: 'foo', [StringEnum.Bar]: StringEnum.baz, [StringEnum.baz]: StringEnum.Bar })
      ).toStrictEqual({ foo: 'foo', bar: 'Baz', Baz: 'bar' })

      expect(numericEnumRecords[0].parse({ 1: 1, 2: 2 })).toStrictEqual({ 1: 1, 2: 2 })
      expect(numericEnumRecords[1].parse({ 3: 3, 4: 4 })).toStrictEqual({ 3: 3, 4: 4 })
      expect(numericEnumRecords[2].parse({ 0: 0, [NumericEnum.One]: NumericEnum.One })).toStrictEqual({ 0: 0, 1: 1 })
    })
  })

  test('parses async', async () => {
    expect(await stringRecords[0].parseAsync({ foo: 'bar' })).toStrictEqual({ foo: 'bar' })
    expect(await stringRecords[1].parseAsync({ foo: ['bar'] })).toStrictEqual({ foo: ['bar'] })
    expect(await stringRecords[2].parseAsync({ foo: BigInt(1) })).toStrictEqual({ foo: BigInt(1) })
    expect(await stringRecords[3].parseAsync({ foo: true })).toStrictEqual({ foo: true })
    expect(await stringRecords[4].parseAsync({ foo: 'foo' })).toStrictEqual({ foo: 'foo' })
    // expect(await testRecords[5].parseAsync( /* never */ )).toStrictEqual( /* never */ )
    expect(await stringRecords[6].parseAsync({ foo: null })).toStrictEqual({ foo: null })
    expect(await stringRecords[7].parseAsync({ foo: 1 })).toStrictEqual({ foo: 1 })
    expect(await stringRecords[8].parseAsync({ foo: { bar: 'baz' } })).toStrictEqual({ foo: { bar: 'baz' } })
    expect(await stringRecords[9].parseAsync({ foo: 'bar' })).toStrictEqual({ foo: 'bar' })
    expect(await stringRecords[10].parseAsync({ foo: testSymbol })).toStrictEqual({ foo: testSymbol })
    expect(await stringRecords[11].parseAsync({ foo: ['bar', 1] })).toStrictEqual({ foo: ['bar', 1] })
    expect(await stringRecords[12].parseAsync({ foo: undefined })).toStrictEqual({ foo: undefined })
    // Union
    expect(await stringRecords[13].parseAsync({ foo: 'bar' })).toStrictEqual({ foo: 'bar' })
    expect(await stringRecords[13].parseAsync({ foo: 1 })).toStrictEqual({ foo: 1 })
    // ----
    expect(await stringRecords[14].parseAsync({ foo: 'bar' })).toStrictEqual({ foo: 'bar' })
    expect(await stringRecords[15].parseAsync({ foo: undefined })).toStrictEqual({ foo: undefined })
  })

  test('fails', () => {
    expect(() => t.record(t.enum(['a', 'b', 'c']), t.string()).parse({ a: 'foo', b: 'bar', c: 3, d: 'qux' })).toThrow()
    expect(() => t.record(t.enum([1, 2, 3]), t.string()).parse({ 1: 'foo', 2: 'bar', 3: 'baz', 4: 'qux' })).toThrow()
  })

  test('is', () => {
    expect(stringRecords.every((r) => r.isOptional)).toStrictEqual(false)
    expect(stringRecords.every((r) => r.isNullable)).toStrictEqual(false)
    expect(stringRecords.every((r) => r.isNullish)).toStrictEqual(false)
    expect(stringRecords.every((r) => r.isRequired)).toStrictEqual(true)
    expect(stringRecords.every((r) => r.isReadonly)).toStrictEqual(false)
  })

  test('inference', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    assertEqual<t.infer<(typeof stringRecords)[0]>, Record<string, any>>(true)
    assertEqual<t.infer<(typeof stringRecords)[1]>, Record<string, string[]>>(true)
    assertEqual<t.infer<(typeof stringRecords)[2]>, Record<string, bigint>>(true)
    assertEqual<t.infer<(typeof stringRecords)[3]>, Record<string, boolean>>(true)
    assertEqual<t.infer<(typeof stringRecords)[4]>, Record<string, 'foo'>>(true)
    assertEqual<t.infer<(typeof stringRecords)[5]>, Record<string, never>>(true)
    assertEqual<t.infer<(typeof stringRecords)[6]>, Record<string, null>>(true)
    assertEqual<t.infer<(typeof stringRecords)[7]>, Record<string, number>>(true)
    assertEqual<t.infer<(typeof stringRecords)[8]>, Record<string, Record<string, string>>>(true)
    assertEqual<t.infer<(typeof stringRecords)[9]>, Record<string, string>>(true)
    assertEqual<t.infer<(typeof stringRecords)[10]>, Record<string, symbol>>(true)
    assertEqual<t.infer<(typeof stringRecords)[11]>, Record<string, [string, number]>>(true)
    assertEqual<t.infer<(typeof stringRecords)[12]>, Record<string, undefined>>(true)
    assertEqual<t.infer<(typeof stringRecords)[13]>, Record<string, string | number>>(true)
    assertEqual<t.infer<(typeof stringRecords)[14]>, Record<string, unknown>>(true)
    assertEqual<t.infer<(typeof stringRecords)[15]>, Record<string, void>>(true)

    assertEqual<t.infer<(typeof numericRecords)[0]>, Record<number, Buffer>>(true)
    assertEqual<t.infer<(typeof numericRecords)[1]>, Record<number, Date>>(true)
    assertEqual<t.infer<(typeof numericRecords)[2]>, Record<number, 'foo' | undefined>>(true)
    assertEqual<t.infer<(typeof numericRecords)[3]>, Record<number, 'foo' | null>>(true)

    assertEqual<t.infer<(typeof symbolicRecords)[0]>, Record<symbol, number>>(true)
    assertEqual<
      t.infer<(typeof symbolicRecords)[1]>,
      Record<symbol, string | number | bigint | boolean | symbol | null | undefined>
    >(true)
    assertEqual<t.infer<(typeof symbolicRecords)[2]>, Record<symbol, string | number | symbol>>(true)

    assertEqual<t.infer<(typeof stringEnumRecords)[0]>, Record<'foo' | 'bar', t.BRANDED<string, 'myStringEnumRecord'>>>(
      true
    )
    assertEqual<t.infer<(typeof stringEnumRecords)[1]>, Record<'baz' | 'qux', string>>(true)
    assertEqual<t.infer<(typeof stringEnumRecords)[2]>, Record<'foo' | 'bar' | 'Baz', string>>(true)

    assertEqual<t.infer<(typeof numericEnumRecords)[0]>, Record<1 | 2, t.BRANDED<number, 'myNumericEnumRecord'>>>(true)
    assertEqual<t.infer<(typeof numericEnumRecords)[1]>, Record<3 | 4, number>>(true)
    assertEqual<t.infer<(typeof numericEnumRecords)[2]>, Record<0 | 1, number>>(true)
  })
})
