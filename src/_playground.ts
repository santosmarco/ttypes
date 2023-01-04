import { t } from '.'

console.log(t.global())

console.log(t.any().optional().optional().optional().unwrapDeep().color('red').nullable().array())

const s = t.object({
  a: t.string(),
  b: t.number(),
  c: t.boolean().optional(),
  d: t.array(t.string()),
})

// Console.log(s.safeParse(['s', 'a', 2, 3]).error._issues)

type as = t.infer<typeof s>

const _t = console.log(s.parse('2'))
