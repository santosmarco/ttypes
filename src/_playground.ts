import { t } from '.'

console.log(t.global())

console.log(t.any().optional().optional().optional().unwrapDeep().color('red').nullable().array())

const s = t.tuple([t.string().optional(), t.string().optional().unwrapNullishDeep()], t.bigint())

// Console.log(s.safeParse(['s', 'a', 2, 3]).error._issues)

type as = t.infer<typeof s>

const _t = console.log(s.manifest)
