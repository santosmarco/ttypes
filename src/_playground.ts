import { t } from './index'

// Const a = t
//   .object({
//     a: t.number().coerce(),
//     b: t.string().coerce(),
//     c: t.ref('b'),
//     d: t.object({
//       a: t.bigint(),
//       b: t.boolean(),
//       c: t.date(),
//       d: t.literal('a'),
//       e: t.nan(),
//       f: t.symbol(),
//       g: t.buffer(),
//       h: t.array(t.number()),
//       i: t.set(t.number()),
//       j: t.tuple([
//         t.number(),
//         t.string(),
//         t.object({
//           a: t.number(),
//           b: t.nan().optional(),
//         }),
//         t.tuple([t.boolean()]),
//       ]),
//       k: t.record(t.string(), t.number()),
//       l: t.ref('j.3[0]'),
//       dfbfg: t.object({
//         a: t.number(),
//         b: t.string(),
//         asda: t.object({
//           a: t.number(),
//           b: t.nan(),
//         }),
//       }),
//     }),
//   })
//   .pick(['d'])
//   .shape.d.pick(['l'])

// console.log(a.shape)

// const bool = console.log(t.coerce.bigint().parse(false))
// type b = t.output<typeof bool>
// type bb = t.input<typeof bool>

// type c = ObjectShapePaths<typeof a.shape>

// type cc = ReachSchema<'d.j.3[0]', typeof a.shape>

// type adsad = t.infer<typeof a>

// console.log(a.parse({ l: true }))

const asd = t.object({
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
  m: t.tuple([t.string(), t.bigint()]).tail(),
  n: t.set(t.date()),
})

console.log(t.string().preprocess(String).transform(Number).parse(true))

console.log(
  t
    .lazy(() =>
      t
        .object({
          a: t.coerce.string(),
          b: t.coerce.number(),
          c: t.coerce.bigint(),
          d: t.boolean(),
          e: t.null(),
          f: t.undefined(),
          g: t.buffer().nullish(),
          h: t.unknown(),
          i: t.any(),
          j: t.record(t.string(), t.number()),
          k: t.array(t.number()).nonempty(),
          l: t.tuple([t.string(), t.number()]).rest(t.string()),
          m: t.tuple([t.string(), t.bigint()]).tail(),
          n: t.set(t.date()),
        })
        .partial()
    )
    .parse({ a: 1, b: '2', c: 3 })
)
