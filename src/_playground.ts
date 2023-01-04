import { t } from '.'

console.log(t.global())

console.log(t.any().optional().optional().optional().unwrapDeep().color('red').nullable().array())

const s = t
  .array(t.string().optional())
  .array()
  .array()
  .title('a')
  .description('b')
  .summary('c')
  .tags('a', 'b')
  .optional()
  .title('a')
  .nullable()
  .unwrapNullishDeep()
  .unique({
    message: 'a',
  })
  .flattenDeep()
  .sparse(false)

// Console.log(s.safeParse(['s', 'a', 2, 3]).error._issues)

type as = t.infer<typeof s>

const _t = console.log(
  t
    .array(t.string())
    .title('a')
    .description('b')
    .summary('c')
    .tags('a', 'b')
    .optional()
    .title('a')
    .nullish()
    .unwrapNullishDeep()
    .unique({
      message: 'a',
    })
    .sparse()
    .abortEarly()
    .nullish()
    .or(t.array(t.string().or(t.number())).max(3))
    .safeParse(['s', 'a', 2, 3]).error?.issues[0]?.payload
)
