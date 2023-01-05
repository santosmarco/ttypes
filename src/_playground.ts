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
const a = t.string().lowercase().capitalize()
type a = t.infer<typeof a>

const asdsd: a = 'a'

console.log(a.hint)
console.log(t.undefined().required().hint)
