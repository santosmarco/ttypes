import { t } from '../index'
import { assertEqual } from './_utils'

describe('TNever', () => {
  test('typeName', () => {
    expect(t.never().typeName).toStrictEqual('TNever')
  })

  test('fails', () => {
    expect(() => t.never().parse('foo')).toThrow()
    expect(() => t.never().parse(1)).toThrow()
    expect(() => t.never().parse(BigInt(1))).toThrow()
    expect(() => t.never().parse(true)).toThrow()
    expect(() => t.never().parse([])).toThrow()
    expect(() => t.never().parse({})).toThrow()
    expect(() => t.never().parse(null)).toThrow()
    expect(() => t.never().parse(undefined)).toThrow()
  })

  test('manifest', () => {
    expect(t.never().manifest).toStrictEqual({
      type: 'never',
      required: true,
      nullable: false,
      readonly: false,
      promise: false,
    })
  })

  test('is', () => {
    expect(t.never().isOptional()).toStrictEqual(false)
    expect(t.never().isNullable()).toStrictEqual(false)
    expect(t.never().isNullish()).toStrictEqual(false)
    expect(t.never().isRequired()).toStrictEqual(true)
    expect(t.never().isReadonly()).toStrictEqual(false)
    expect(t.never().isDeprecated()).toStrictEqual(false)
  })

  test('options', () => {
    expect(
      t.never({
        messages: {
          forbidden: 'foo',
        },
      }).options
    ).toStrictEqual({
      messages: {
        forbidden: 'foo',
      },
    })
  })

  test('inference', () => {
    const schema = t.never()
    assertEqual<t.infer<typeof schema>, never>(true)
  })
})
