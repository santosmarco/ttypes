import { t } from './index'

// console.log(t.array(t.number()).compact({ enforce: true }).parse([1, 2, 0, 0, 2, 1]))

// console.log(
//   t.object({
//     a: t.number(),
//     b: t.number(),
//     c: t.number(),
//     d: t.bigint().del(),
//   })
// )

// const c = t.object({
//   a: t.number(),
//   b: t.number(),
//   c: t.string(),
//   d: t.bigint().del(),
//   e: t.tuple([t.number().del(), t.string().delete()]),
// })

console.log(
  t
    .array(t.string().coerce())
    .unique()
    .sorted()
    .compact()
    .manifest({ examples: [['a']] })
    .toSet()
    .toArray()
    .coerce()
    .nonempty()
    .min(10)
    .min(4)
    .min(20)
    .parse(['a'])
)
