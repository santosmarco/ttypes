import { t } from './index'

// console.log(t.array(t.number()).compact({ enforce: true }).parse([1, 2, 0, 0, 2, 1]))

console.log(
  t.object({
    a: t.number(),
    b: t.number(),
    c: t.number(),
    d: t.bigint().del(),
  })
)

const c = t.object({
  a: t.number(),
  b: t.number(),
  c: t.string(),
  d: t.bigint().del(),
  e: t.tuple([t.number().del(), t.string().delete()]),
})

type c = t.infer<typeof c>
console.log(c.shape)
