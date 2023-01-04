import { t } from '../index'
import { assertEqual } from './_utils'

describe('TUndefined', () => {
  test('typeName', () => {
    expect(t.undefined().typeName).toStrictEqual('TUndefined')
  })

  test('parses', () => {
    // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
    expect(t.undefined().parse(undefined)).toStrictEqual(undefined)
  })

  test('parses async', async () => {
    // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
    expect(await t.undefined().parseAsync(undefined)).toStrictEqual(undefined)
  })

  test('fails', () => {
    expect(() => {
      t.undefined().parse(1)
    }).toThrow()
    expect(() => {
      t.undefined().parse('foo')
    }).toThrow()
    expect(() => {
      t.undefined().parse(null)
    }).toThrow()
  })

  test('is', () => {
    expect(t.undefined().isOptional()).toStrictEqual(true)
    expect(t.undefined().isNullable()).toStrictEqual(false)
    expect(t.undefined().isNullish()).toStrictEqual(false)
    expect(t.undefined().isRequired()).toStrictEqual(false)
    expect(t.undefined().isReadonly()).toStrictEqual(false)
  })

  test('inference', () => {
    const schema = t.undefined()
    assertEqual<t.infer<typeof schema>, undefined>(true)
    assertEqual<t.infer<typeof schema>, void>(false)
  })
})

describe('TVoid', () => {
  test('typeName', () => {
    expect(t.void().typeName).toStrictEqual('TVoid')
  })

  test('parses', () => {
    // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
    expect(t.void().parse(undefined)).toStrictEqual(undefined)
  })

  test('parses async', async () => {
    // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
    expect(await t.void().parseAsync(undefined)).toStrictEqual(undefined)
  })

  test('fails', () => {
    expect(() => {
      t.void().parse(1)
    }).toThrow()
    expect(() => {
      t.void().parse('foo')
    }).toThrow()
    expect(() => {
      t.void().parse(null)
    }).toThrow()
  })

  test('is', () => {
    expect(t.void().isOptional()).toStrictEqual(true)
    expect(t.void().isNullable()).toStrictEqual(false)
    expect(t.void().isNullish()).toStrictEqual(false)
    expect(t.void().isRequired()).toStrictEqual(false)
    expect(t.void().isReadonly()).toStrictEqual(false)
  })

  test('inference', () => {
    const schema = t.void()
    assertEqual<t.infer<typeof schema>, void>(true)
    assertEqual<t.infer<typeof schema>, undefined>(false)
  })
})

describe('TNull', () => {
  test('typeName', () => {
    expect(t.null().typeName).toStrictEqual('TNull')
  })

  test('parses', () => {
    expect(t.null().parse(null)).toStrictEqual(null)
  })

  test('parses async', async () => {
    expect(await t.null().parseAsync(null)).toStrictEqual(null)
  })

  test('fails', () => {
    expect(() => t.null().parse(1)).toThrow()
    expect(() => t.null().parse('foo')).toThrow()
    expect(() => t.null().parse(undefined)).toThrow()
  })

  test('is', () => {
    expect(t.null().isOptional()).toStrictEqual(false)
    expect(t.null().isNullable()).toStrictEqual(true)
    expect(t.null().isNullish()).toStrictEqual(false)
    expect(t.null().isRequired()).toStrictEqual(true)
    expect(t.null().isReadonly()).toStrictEqual(false)
  })

  test('inference', () => {
    const schema = t.null()
    // eslint-disable-next-line @typescript-eslint/ban-types
    assertEqual<t.infer<typeof schema>, null>(true)
  })
})
