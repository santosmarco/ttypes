import { t } from '../index'
import { assertEqual } from './_utils'

const testDate = new Date()

describe('TDate', () => {
  test('typeName', () => {
    expect(t.date().typeName).toStrictEqual('TDate')
  })

  test('parses', () => {
    expect(t.date().parse(testDate)).toStrictEqual(testDate)
  })

  test('parses async', async () => {
    expect(await t.date().parseAsync(testDate)).toStrictEqual(testDate)
  })

  test('fails', () => {
    expect(() => t.date().parse(testDate.getTime())).toThrow()
  })

  test('manifest', () => {
    expect(t.date().manifest).toStrictEqual({
      type: 'Date',
      required: true,
      nullable: false,
      readonly: false,
      promise: false,
    })
  })

  test('is', () => {
    expect(t.date().isOptional()).toStrictEqual(false)
    expect(t.date().isNullable()).toStrictEqual(false)
    expect(t.date().isNullish()).toStrictEqual(false)
    expect(t.date().isRequired()).toStrictEqual(true)
    expect(t.date().isReadonly()).toStrictEqual(false)
    expect(t.date().isDeprecated()).toStrictEqual(false)
  })

  test('inference', () => {
    const schema = t.date()
    assertEqual<t.infer<typeof schema>, Date>(true)
  })
})
