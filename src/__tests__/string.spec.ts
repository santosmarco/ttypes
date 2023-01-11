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

  test('coercion', () => {
    const withCoercion = [t.string().coerce(), t.string().coerce(true), t.coerce.string()] as const
    const withoutCoercion = [t.string(), t.string().coerce(false)] as const

    expect(withCoercion.map((t) => t.parse(123))).toStrictEqual(['123', '123', '123'])

    expect(() => withoutCoercion[0].parse(123)).toThrow()
    expect(() => withoutCoercion[1].parse(123)).toThrow()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    assertEqual<t.input<(typeof withCoercion)[0]>, any>(true)
    assertEqual<t.output<(typeof withCoercion)[0]>, string>(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    assertEqual<t.input<(typeof withCoercion)[1]>, any>(true)
    assertEqual<t.output<(typeof withCoercion)[1]>, string>(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    assertEqual<t.input<(typeof withCoercion)[2]>, any>(true)
    assertEqual<t.output<(typeof withCoercion)[2]>, string>(true)
    // ----
    assertEqual<t.input<(typeof withoutCoercion)[0]>, string>(true)
    assertEqual<t.output<(typeof withoutCoercion)[0]>, string>(true)
    assertEqual<t.input<(typeof withoutCoercion)[1]>, string>(true)
    assertEqual<t.output<(typeof withoutCoercion)[1]>, string>(true)
  })

  test('min/max/length', () => {
    // Min
    expect(t.string().min(1).parse('a')).toStrictEqual('a')
    expect(() => t.string().min(1, { inclusive: false }).parse('a')).toThrow()
    expect(() => t.string().min(2).parse('a')).toThrow()

    // Max
    expect(t.string().max(3).parse('abc')).toStrictEqual('abc')
    expect(() => t.string().max(3, { inclusive: false }).parse('abc')).toThrow()
    expect(() => t.string().max(2).parse('abc')).toThrow()

    // Length
    expect(t.string().length(2).parse('ab')).toStrictEqual('ab')

    // Min + max
    expect(t.string().min(1).max(3).parse('a')).toStrictEqual('a')
    expect(t.string().min(1).max(3).parse('ab')).toStrictEqual('ab')
    expect(t.string().min(1).max(3).parse('abc')).toStrictEqual('abc')

    // Inclusive min + inclusive max
    expect(() => t.string().min(1, { inclusive: false }).max(3, { inclusive: false }).parse('a')).toThrow()
    expect(t.string().min(1, { inclusive: false }).max(3, { inclusive: false }).parse('ab')).toStrictEqual('ab')
    expect(() => t.string().min(1, { inclusive: false }).max(3, { inclusive: false }).parse('abc')).toThrow()

    // Length, then min + max (min & max override length)
    expect(t.string().length(2).min(1).max(3).parse('a')).toStrictEqual('a')
    expect(t.string().length(2).min(1).max(3).parse('ab')).toStrictEqual('ab')
    expect(t.string().length(2).min(1).max(3).parse('abc')).toStrictEqual('abc')

    // Min + max, then length (length overrides min & max)
    expect(() => t.string().min(1).max(3).length(2).parse('a')).toThrow()
    expect(t.string().min(1).max(3).length(2).parse('ab')).toStrictEqual('ab')
    expect(() => t.string().min(1).max(3).length(2).parse('abc')).toThrow()
  })

  test('pattern/disallow', () => {
    expect(t.string().pattern(/foo/).parse('foo')).toStrictEqual('foo')
    expect(() => t.string().pattern(/foo/).parse('bar')).toThrow()

    expect(t.string().disallow(/foo/).parse('bar')).toStrictEqual('bar')
    expect(() => t.string().disallow(/foo/).parse('foo')).toThrow()
  })

  test('email', () => {
    const email = t.string().email()
    expect(email.isEmail).toStrictEqual(true)
    expect(email.parse('mojojojo@example.com')).toStrictEqual('mojojojo@example.com')
    expect(email.parse('"josé.arrañoça"@domain.com')).toStrictEqual('"josé.arrañoça"@domain.com')
    expect(email.parse('"сайт"@domain.com')).toStrictEqual('"сайт"@domain.com')
    expect(email.parse('"💩"@domain.com')).toStrictEqual('"💩"@domain.com')
    expect(email.parse('"🍺🕺🎉"@domain.com')).toStrictEqual('"🍺🕺🎉"@domain.com')
    expect(email.parse('poop@💩.la')).toStrictEqual('poop@💩.la')
    expect(email.parse('"🌮"@i❤️tacos.ws')).toStrictEqual('"🌮"@i❤️tacos.ws')
    expect(email.parse('sss--asd@i❤️tacos.ws')).toStrictEqual('sss--asd@i❤️tacos.ws')
    expect(() => email.parse('asdf')).toThrow()
    expect(() => email.parse('@lkjasdf.com')).toThrow()
    expect(() => email.parse('asdf@sdf.')).toThrow()
    expect(() => email.parse('asdf@asdf.com-')).toThrow()
    expect(() => email.parse('asdf@-asdf.com')).toThrow()
    expect(() => email.parse('asdf@-a(sdf.com')).toThrow()
    expect(() => email.parse('asdf@-asdf.com(')).toThrow()
  })

  test('url', () => {
    const url = t.string().url()
    expect(url.isUrl).toStrictEqual(true)
    expect(url.parse('http://example.com')).toStrictEqual('http://example.com')
    expect(url.parse('https://example.com')).toStrictEqual('https://example.com')
    expect(url.parse('https://example.com:8080')).toStrictEqual('https://example.com:8080')
    expect(url.parse('https://example.com:8080/foo/bar')).toStrictEqual('https://example.com:8080/foo/bar')
    expect(url.parse('https://example.com:8080/foo/bar?baz=qux')).toStrictEqual(
      'https://example.com:8080/foo/bar?baz=qux'
    )
    expect(url.parse('https://example.com:8080/foo/bar?baz=qux#quux')).toStrictEqual(
      'https://example.com:8080/foo/bar?baz=qux#quux'
    )
    expect(() => url.parse('foo')).toThrow()
    expect(() => url.parse('http://')).toThrow()
    expect(() => url.parse('foo@foo.com')).toThrow()
  })

  test('uuid', () => {
    const uuid = t.string().uuid()
    expect(uuid.isUuid).toStrictEqual(true)
    expect(uuid.parse('9491d710-3185-4e06-bea0-6a2f275345e0')).toStrictEqual('9491d710-3185-4e06-bea0-6a2f275345e0')
    expect(uuid.parse('00000000-0000-0000-0000-000000000000')).toStrictEqual('00000000-0000-0000-0000-000000000000')
    expect(
      uuid.parse(
        'b3ce60f8-e8b9-40f5-1150-172ede56ff74' /* Variant 0 - RFC 4122: Reserved, NCS backward compatibility */
      )
    ).toStrictEqual('b3ce60f8-e8b9-40f5-1150-172ede56ff74')
    expect(
      uuid.parse(
        '92e76bf9-28b3-4730-cd7f-cb6bc51f8c09' /* Variant 2 - RFC 4122: Reserved, Microsoft Corporation backward compatibility */
      )
    ).toStrictEqual('92e76bf9-28b3-4730-cd7f-cb6bc51f8c09')
    expect(() => uuid.parse('9491d710-3185-4e06-bea0-6a2f275345e0X')).toThrow()
  })

  test('cuid', () => {
    const cuid = t.string().cuid()
    expect(cuid.isCuid).toStrictEqual(true)
    expect(cuid.parse('cjsj7c5w4000k0g6e8s97z9o9')).toStrictEqual('cjsj7c5w4000k0g6e8s97z9o9')
    expect(() => cuid.parse('cifjhdsfhsd-invalid-cuid')).toThrow()
  })

  test('is', () => {
    expect(t.string().isOptional).toStrictEqual(false)
    expect(t.string().isNullable).toStrictEqual(false)
    expect(t.string().isNullish).toStrictEqual(false)
    expect(t.string().isRequired).toStrictEqual(true)
    expect(t.string().isReadonly).toStrictEqual(false)
  })

  test('inference', () => {
    const schema = t.string()
    assertEqual<t.infer<typeof schema>, string>(true)
  })
})
