import { t } from './index'

const tintersection = t.intersection([
  t.object({
    a: t.string(),
  }),
  t.object({
    b: t.string(),
  }),
])

type Inter = t.infer<typeof tintersection>

console.log(
  tintersection.safeParse({
    a: 'a',
    b: 2,
  })
)
const a = t
  .object({
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
    l: t.tuple([t.string(), t.number()]).rest(t.string().optional()).readonly(),
    m: t.promise(t.number()),
    n: t.set(t.date()),
    s: t.object({
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
    }),
  })
  .readonly()
type a = t.infer<typeof a>

console.log(
  a
    .manifest({
      title: 'a',
    })
    .describe()
)
console.log(t.undefined().required().hint)
