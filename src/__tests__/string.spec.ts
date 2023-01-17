import { t } from '../index'
import { assertEqual } from './_utils'

describe('TString', () => {
  test('typeName', () => {
    expect(t.string().typeName).toStrictEqual('TString')
  })

  test('manifest', () => {
    const base = t
      .string()
      .min(10)
      .max(20)
      .pattern(/foo/)
      .pattern(/bar/, { name: 'my bar pattern' })
      .alphanum()
      .url()
      .startsWith('marco')
      .endsWith('polo')
      .uppercase()
    expect(base.manifest()).toStrictEqual({
      typeName: 'TString',
      type: 'string',
      min: 10,
      max: 20,
      formats: ['alphanumeric', 'url'],
      transforms: ['uppercase'],
      patterns: [/foo/, { regex: /bar/, name: 'my bar pattern' }],
      prefix: 'marco',
      suffix: 'polo',
      substrings: null,
      coerce: false,
      required: true,
      nullable: false,
      readonly: false,
    })

    const coerced = base.coerce()
    expect(coerced.manifest()).toStrictEqual({
      ...base.manifest(),
      coerce: true,
      required: false,
      nullable: true,
    })
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
    const withCoercion = t.coerce.string()
    const withoutCoercion = t.string().coerce(false)

    expect(withCoercion.parse(123)).toStrictEqual('123')

    expect(() => withoutCoercion.parse(123)).toThrow()
    expect(() => withoutCoercion.parse(123)).toThrow()

    assertEqual<t.input<typeof withCoercion>, any>(true)
    assertEqual<t.output<typeof withCoercion>, string>(true)
    assertEqual<t.input<typeof withoutCoercion>, string>(true)
    assertEqual<t.output<typeof withoutCoercion>, string>(true)
  })

  describe('validations', () => {
    test('min/max/length', () => {
      // Min
      expect(t.string().min(1).minLength).toStrictEqual(1)
      expect(t.string().min(1).parse('a')).toStrictEqual('a')
      expect(() => t.string().min(1, { inclusive: false }).parse('a')).toThrow()
      expect(() => t.string().min(2).parse('a')).toThrow()

      // Max
      expect(t.string().max(3).maxLength).toStrictEqual(3)
      expect(t.string().max(3).parse('abc')).toStrictEqual('abc')
      expect(() => t.string().max(3, { inclusive: false }).parse('abc')).toThrow()
      expect(() => t.string().max(2).parse('abc')).toThrow()

      // Length
      expect(t.string().length(2).minLength).toStrictEqual(2)
      expect(t.string().length(2).maxLength).toStrictEqual(2)
      expect(t.string().length(2).parse('ab')).toStrictEqual('ab')

      // Min + max
      expect(t.string().min(1).max(3).minLength).toStrictEqual(1)
      expect(t.string().min(1).max(3).maxLength).toStrictEqual(3)
      expect(t.string().min(1).max(3).parse('a')).toStrictEqual('a')
      expect(t.string().min(1).max(3).parse('ab')).toStrictEqual('ab')
      expect(t.string().min(1).max(3).parse('abc')).toStrictEqual('abc')

      // Inclusive min + inclusive max
      expect(() => t.string().min(1, { inclusive: false }).max(3, { inclusive: false }).parse('a')).toThrow()
      expect(t.string().min(1, { inclusive: false }).max(3, { inclusive: false }).parse('ab')).toStrictEqual('ab')
      expect(() => t.string().min(1, { inclusive: false }).max(3, { inclusive: false }).parse('abc')).toThrow()

      // Length, then min + max (min & max override length)
      expect(() => t.string().length(2).min(1).max(3).parse('a')).toThrow()
      expect(t.string().length(2).min(1).max(3).parse('ab')).toStrictEqual('ab')
      expect(() => t.string().length(2).min(1).max(3).parse('abc')).toThrow()

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

    test('alphanumeric/numeric', () => {
      const alphanumeric = t.string().alphanumeric()
      expect(alphanumeric.isAlphanumeric).toStrictEqual(true)
      expect(alphanumeric.parse('abc123')).toStrictEqual('abc123')
      expect(() => alphanumeric.parse('abc123!')).toThrow()

      const numeric = t.string().numeric()
      expect(numeric.isNumeric).toStrictEqual(true)
      expect(numeric.parse('123')).toStrictEqual('123')
      expect(() => numeric.parse('abc123')).toThrow()
    })

    test('cuid', () => {
      const cuid = t.string().cuid()
      expect(cuid.isCuid).toStrictEqual(true)
      expect(cuid.parse('cjsj7c5w4000k0g6e8s97z9o9')).toStrictEqual('cjsj7c5w4000k0g6e8s97z9o9')
      expect(() => cuid.parse('cifjhdsfhsd-invalid-cuid')).toThrow()
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

    test('isoDate', () => {
      const isoDate = t.string().isoDate()
      expect(isoDate.isIsoDate).toStrictEqual(true)
      expect(isoDate.parse('2018-12-31T23:59:59.999Z')).toStrictEqual('2018-12-31T23:59:59.999Z')
      expect(isoDate.parse('2018-12-31T23:59:59Z')).toStrictEqual('2018-12-31T23:59:59Z')
      expect(isoDate.parse('2018-12-31T23:59Z')).toStrictEqual('2018-12-31T23:59Z')
      expect(isoDate.parse('2018-12-31T23:59:59.999')).toStrictEqual('2018-12-31T23:59:59.999')
      expect(isoDate.parse('2018-12-31T23:59:59')).toStrictEqual('2018-12-31T23:59:59')
      expect(isoDate.parse('2018-12-31T23:59')).toStrictEqual('2018-12-31T23:59')
      expect(isoDate.parse('2018-12-31')).toStrictEqual('2018-12-31')
      expect(isoDate.parse('2018-12')).toStrictEqual('2018-12')
      expect(isoDate.parse('2018')).toStrictEqual('2018')
      expect(() => isoDate.parse('2018-12-31T23Z')).toThrow()
      expect(() => isoDate.parse('2018-12-31T23')).toThrow()
      expect(() => isoDate.parse('2018-12-31T23:59:59.999Z+00:00')).toThrow()
      expect(() => isoDate.parse('2018-12-31T23:59:59.999Z-00:00')).toThrow()
    })

    test('isoDuration', () => {
      const isoDuration = t.string().isoDuration()
      expect(isoDuration.isIsoDuration).toStrictEqual(true)
      expect(isoDuration.parse('P3Y6M4DT12H30M5S')).toStrictEqual('P3Y6M4DT12H30M5S')
      expect(isoDuration.parse('P3Y6M4DT12H30M')).toStrictEqual('P3Y6M4DT12H30M')
      expect(isoDuration.parse('P3Y6M4DT12H5S')).toStrictEqual('P3Y6M4DT12H5S')
      expect(isoDuration.parse('P3Y6M4DT30M5S')).toStrictEqual('P3Y6M4DT30M5S')
      expect(isoDuration.parse('P3Y6MT12H30M5S')).toStrictEqual('P3Y6MT12H30M5S')
      expect(isoDuration.parse('P3Y4DT12H30M5S')).toStrictEqual('P3Y4DT12H30M5S')
      expect(isoDuration.parse('P6M4DT12H30M5S')).toStrictEqual('P6M4DT12H30M5S')
      expect(isoDuration.parse('PT10H20M5S')).toStrictEqual('PT10H20M5S')
      expect(isoDuration.parse('PT40S')).toStrictEqual('PT40S')
      expect(isoDuration.parse('PT0S')).toStrictEqual('PT0S')
      expect(isoDuration.parse('P0D')).toStrictEqual('P0D')
      expect(() => isoDuration.parse('P30S')).toThrow()
      expect(() => isoDuration.parse('P30')).toThrow()
      expect(() => isoDuration.parse('')).toThrow()
    })

    test('base64', () => {
      const base64 = t.string().base64()
      expect(base64.isBase64).toStrictEqual(true)
      expect(base64.parse('YW55IGNhcm5hbCBwbGVhc3VyZS4=')).toStrictEqual('YW55IGNhcm5hbCBwbGVhc3VyZS4=')
      expect(base64.parse('YW55IGNh+/5hbCBwbGVhc3VyZS4=')).toStrictEqual('YW55IGNh+/5hbCBwbGVhc3VyZS4=')
      expect(base64.parse('YW==')).toStrictEqual('YW==')
      expect(base64.parse('YW5=')).toStrictEqual('YW5=')
      expect(() => base64.parse('=YW55IGNhcm5hbCBwbGVhc3VyZS4')).toThrow()
      expect(() => base64.parse('YW55IGNhcm5hb-_wbGVhc3VyZS4=')).toThrow()
      expect(() => base64.parse('YW55IGNhcm5hbCBwbGVhc3VyZS4==')).toThrow()
      expect(() => base64.parse('YW55IGNhcm5hbCBwbGVhc3VyZS4')).toThrow()
      expect(() => base64.parse('Y=')).toThrow()
      expect(() => base64.parse('Y===')).toThrow()
      expect(() => base64.parse('YW')).toThrow()
      expect(() => base64.parse('YW5')).toThrow()
      expect(() => base64.parse('$#%#$^$^)(*&^%')).toThrow()
    })
  })

  test('ensure', () => {
    expect(t.string().ensure().parse(null)).toStrictEqual('')
    expect(t.string().ensure().parse(undefined)).toStrictEqual('')
    expect(t.string().ensure().parse('')).toStrictEqual('')
    expect(() => t.string().ensure().parse(0)).toThrow()
  })

  test('is', () => {
    expect(t.string().isOptional).toStrictEqual(false)
    expect(t.string().isNullable).toStrictEqual(false)
    expect(t.string().isNullish).toStrictEqual(false)
    expect(t.string().isRequired).toStrictEqual(true)
    expect(t.string().isReadonly).toStrictEqual(false)

    expect(t.coerce.string().isOptional).toStrictEqual(true)
    expect(t.coerce.string().isNullable).toStrictEqual(true)
    expect(t.coerce.string().isNullish).toStrictEqual(true)
    expect(t.coerce.string().isRequired).toStrictEqual(false)
    expect(t.coerce.string().isReadonly).toStrictEqual(false)
  })

  test('inference', () => {
    const base = t.string()
    const uppercase = t.string().uppercase()
    const lowercase = t.string().lowercase()
    const capitalize = t.string().capitalize()
    const uncapitalize = t.string().uncapitalize()
    const combined = t.string().uppercase().lowercase().capitalize().uncapitalize()
    const numeric = t.string().numeric()
    const prefixed = t.string().startsWith('foo')
    const suffixed = t.string().endsWith('bar')
    const prefixedAndSuffixed = t.string().startsWith('foo').endsWith('bar')

    assertEqual<t.infer<typeof base>, string>(true)
    assertEqual<t.infer<typeof uppercase>, Uppercase<string>>(true)
    assertEqual<t.infer<typeof lowercase>, Lowercase<string>>(true)
    assertEqual<t.infer<typeof capitalize>, Capitalize<string>>(true)
    assertEqual<t.infer<typeof uncapitalize>, Uncapitalize<string>>(true)
    assertEqual<t.infer<typeof combined>, Uppercase<Lowercase<Capitalize<Uncapitalize<string>>>>>(true)
    assertEqual<t.infer<typeof numeric>, `${number}`>(true)
    assertEqual<t.infer<typeof prefixed>, `foo${string}`>(true)
    assertEqual<t.infer<typeof suffixed>, `${string}bar`>(true)
    assertEqual<t.infer<typeof prefixedAndSuffixed>, `foo${string}bar`>(true)
  })
})
