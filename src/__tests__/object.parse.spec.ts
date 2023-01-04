import { t } from '../index'

const base = t.object({
  a: t.string(),
  b: t.number(),
  c: t.bigint(),
  d: t.boolean(),
  e: t.null(),
  f: t.undefined(),
  g: t.buffer().nullish(),
  h: t.unknown(),
  i: t.any(),
  j: t.record(t.string(), t.number()),
  k: t.array(t.number()).nonempty(),
  l: t.tuple([t.string(), t.number()]).rest(t.string()),
  m: t.promise(t.number()),
  n: t.set(t.date()),
})

describe('TObject -> parse', () => {
  test('parses', () => {
    expect(
      base.parse({
        a: 'foo',
        b: 1,
        c: BigInt(1),
        d: true,
        e: null,
        f: undefined,
        g: null,
        h: 'foo',
        i: /marco/,
        j: { foo: 1 },
        k: [1],
        l: ['foo', 1, 'bar'],
        m: Promise.resolve(1),
        n: new Set([new Date()]),
      })
    ).toStrictEqual({
      a: 'foo',
      b: 1,
      c: BigInt(1),
      d: true,
      e: null,
      f: undefined,
      g: null,
      h: 'foo',
      i: /marco/,
      j: { foo: 1 },
      k: [1],
      l: ['foo', 1, 'bar'],
      m: Promise.resolve(1),
      n: new Set([new Date()]),
    })
  })

  test('strips unknown keys', () => {
    expect(base.partial().strip().parse({ o: 'foo' })).toStrictEqual({})
  })

  test('throws on strict keys', () => {
    expect(() => base.partial().strict().parse({ o: 'foo' })).toThrow()
  })

  test('passes unknown keys through', () => {
    expect(base.partial().passthrough().parse({ o: 'foo' })).toStrictEqual({ o: 'foo' })
  })

  test('pick/omit', () => {
    const picked = base.pick(['a', 'b'])
    expect(picked.parse({ a: 'foo', b: 1 })).toStrictEqual({ a: 'foo', b: 1 })
    expect(picked.parse({ a: 'foo', b: 1, c: BigInt(1) })).toStrictEqual({ a: 'foo', b: 1 })
    expect(() => picked.parse({ a: 'foo' })).toThrow()
    expect(() => picked.parse({ b: 1 })).toThrow()
    expect(() => picked.parse({})).toThrow()
    const omitted = base.partial().omit(['a', 'b'])
    expect(omitted.parse({ a: 'foo', b: 1 })).toStrictEqual({})
    expect(omitted.parse({ a: 'foo', b: 1, c: BigInt(1) })).toStrictEqual({ c: BigInt(1) })
    expect(omitted.passthrough().parse({ a: 'foo', b: 1, c: BigInt(1) })).toStrictEqual({
      a: 'foo',
      b: 1,
      c: BigInt(1),
    })
    expect(omitted.parse({})).toStrictEqual({})
  })

  test('augment/extend', () => {
    const augmented = base.partial().augment({ o: t.string() })
    expect(augmented.parse({ o: 'foo' })).toStrictEqual({ o: 'foo' })
    expect(augmented.parse({ o: 'foo', a: 'bar' })).toStrictEqual({ o: 'foo', a: 'bar' })
  })

  test('merge', () => {
    const merge = (getIncoming: (obj: t.AnyTObject) => t.AnyTObject): t.AnyTObject =>
      base.partial().merge(getIncoming(t.object({ a: t.nan().nullable(), o: t.literal(1).or(t.literal(2)) })))
    expect(merge((obj) => obj).parse({ a: Number.NaN, o: 1 })).toStrictEqual({ a: Number.NaN, o: 1 })
    expect(merge((obj) => obj.passthrough()).parse({ a: Number.NaN, o: 1, p: 'foo' })).toStrictEqual({
      a: Number.NaN,
      o: 1,
      p: 'foo',
    })
    expect(merge((obj) => obj.strip()).parse({ a: Number.NaN, o: 1, p: 'foo' })).toStrictEqual({ a: Number.NaN, o: 1 })
  })

  test('parses async', async () => {
    expect(
      await base.parseAsync({
        a: 'foo',
        b: 1,
        c: BigInt(1),
        d: true,
        e: null,
        f: undefined,
        g: null,
        h: 'foo',
        i: /marco/,
        j: { foo: 1 },
        k: [1],
        l: ['foo', 1, 'bar'],
        m: Promise.resolve(1),
        n: new Set([new Date()]),
      })
    ).toStrictEqual({
      a: 'foo',
      b: 1,
      c: BigInt(1),
      d: true,
      e: null,
      f: undefined,
      g: null,
      h: 'foo',
      i: /marco/,
      j: { foo: 1 },
      k: [1],
      l: ['foo', 1, 'bar'],
      m: Promise.resolve(1),
      n: new Set([new Date()]),
    })
  })
})
