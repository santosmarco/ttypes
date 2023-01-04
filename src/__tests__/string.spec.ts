import { t } from '../index'
import { assertEqual } from './_utils'

describe('TString', () => {
  test('typeName', () => {
    expect(t.string().typeName).toStrictEqual('TString')
  })

  test('parses', () => {
    expect(t.string().parse('')).toStrictEqual('')
    expect(t.string().parse('foo')).toStrictEqual('foo')
  })

  test('parses async', async () => {
    expect(await t.string().parseAsync('')).toStrictEqual('')
    expect(await t.string().parseAsync('foo')).toStrictEqual('foo')
  })

  test('fails', () => {
    expect(() => t.string().parse(Buffer.from('foo'))).toThrow()
  })

  test('manifest', () => {
    expect(t.string().manifest).toStrictEqual({
      type: 'string',
      required: true,
      nullable: false,
      readonly: false,
      promise: false,
    })
  })

  test('is', () => {
    expect(t.string().isOptional()).toStrictEqual(false)
    expect(t.string().isNullable()).toStrictEqual(false)
    expect(t.string().isNullish()).toStrictEqual(false)
    expect(t.string().isRequired()).toStrictEqual(true)
    expect(t.string().isReadonly()).toStrictEqual(false)
    expect(t.string().isDeprecated()).toStrictEqual(false)
  })

  test('inference', () => {
    const schema = t.string()
    assertEqual<t.infer<typeof schema>, string>(true)
  })
})
