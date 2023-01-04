import { t } from '../index'

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

  test('manifest', () => {
    expect(t.undefined().manifest).toStrictEqual({
      type: 'undefined',
      required: false,
      nullable: false,
      readonly: false,
      promise: false,
    })
  })

  test('is', () => {
    expect(t.undefined().isOptional()).toStrictEqual(true)
    expect(t.undefined().isNullable()).toStrictEqual(false)
    expect(t.undefined().isNullish()).toStrictEqual(false)
    expect(t.undefined().isRequired()).toStrictEqual(false)
    expect(t.undefined().isReadonly()).toStrictEqual(false)
    expect(t.undefined().isDeprecated()).toStrictEqual(false)
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

  test('manifest', () => {
    expect(t.void().manifest).toStrictEqual({
      type: 'void',
      required: false,
      nullable: false,
      readonly: false,
      promise: false,
    })
  })

  test('is', () => {
    expect(t.void().isOptional()).toStrictEqual(true)
    expect(t.void().isNullable()).toStrictEqual(false)
    expect(t.void().isNullish()).toStrictEqual(false)
    expect(t.void().isRequired()).toStrictEqual(false)
    expect(t.void().isReadonly()).toStrictEqual(false)
    expect(t.void().isDeprecated()).toStrictEqual(false)
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

  test('manifest', () => {
    expect(t.null().manifest).toStrictEqual({
      type: 'null',
      required: true,
      nullable: true,
      readonly: false,
      promise: false,
    })
  })

  test('is', () => {
    expect(t.null().isOptional()).toStrictEqual(false)
    expect(t.null().isNullable()).toStrictEqual(true)
    expect(t.null().isNullish()).toStrictEqual(false)
    expect(t.null().isRequired()).toStrictEqual(true)
    expect(t.null().isReadonly()).toStrictEqual(false)
    expect(t.null().isDeprecated()).toStrictEqual(false)
  })
})
