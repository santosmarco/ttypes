import { t } from './src'

console.log(t.any().optional().optional().optional().unwrapDeep().color('red').nullable().array())

const s = t.string().optional().optional().optional().unwrapDeep().color('red').nullable().optional().array()

// console.log(s.safeParse(['s', 'a', 2, 3]).error._issues)

type as = t.infer<typeof s>

const _t = console.log(
  t
    .set(t.string())
    .title('a')
    .description('b')
    .summary('c')
    .tags('a', 'b')
    .optional()
    .title('a')
    .nullable()
    .unwrap()
    .abortEarly().
)
