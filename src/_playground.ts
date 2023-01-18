import { t } from './index'
import { TManifest } from './manifest'
import { u } from './utils'

const myArray = t
  .string()
  .min(10)
  .max(20)
  .pattern(/foo/)
  .pattern(/bar/, { name: 'my bar pattern' })
  .alphanum()
  .url()
  .startsWith('marco')
  .endsWith('polo')
  .uppercase()
  .array()
  .coerce()
  .manifest({ examples: [['MARCOAAPOLO']] })
  .toSet()

const myBool = t
  .object({
    a: t.boolean().coerce({ truthy: [1, '1', 'true', 'yes', 'on'] }),
    // b: t.bigint().coerce(),
    // c: t.ref('d.e'),
    d: t.object({
      e: t.string().optional(),
    }),
    f: t.any(),
  })
  .when([
    {
      key: 'f',
      is: 'a',
      then: (x) => x.setKey('ksok', t.bigint()),
      otherwise: (x) => x.setKey('kosdsdk', t.true()),
    },
    {
      key: 'a',
      is: true,
      then: (x) => x.setKey('sdsd', t.bigint()),
      otherwise: (x) => x.setKey('asd', t.true()),
    },
    {
      key: 'd.e',
      not: 'a',
      then: (x) => x.setKey('dasdasd', t.bigint()),
      otherwise: (x) => x.setKey('aasdasdadsd', t.true()),
    },
    {
      key: 'd.e',
      is: 'a',
      then: (x) => x.setKey('sadaddsd', t.bigint()),
      otherwise: (x) => x.setKey('aasdasdsd', t.true()),
    },
    {
      key: 'd.e',
      is: 'a',
      then: (x) => x.setKey('sdasdadssd', t.bigint()),
      otherwise: (x) => x.setKey('asdadasd', t.true()),
    },
    {
      key: 'd.e',
      is: 'a',
      then: (x) => x.setKey('sasdaddsd', t.bigint()),
      otherwise: (x) => x.setKey('asasdadd', t.true()),
    },
    {
      key: 'd.e',
      is: 'a',
      // then: (x) => x.setKey('sasdasdsd', t.bigint()),
      otherwise: (x) => x.setKey('aasdadsd', t.true()),
    },
  ])
  .extend({ asd: t.literal('foo') })
  .partial()
// .partial(['ksok'])
// .if('', {
//   is: 'hi',
//   then: (x) => x.setKey('f', t.true()),
//   otherwise: (x) => x.extend({ aa: t.falsy() }),
// })

type myBool = t.infer<typeof myBool>

console.log(t.null().or([t.number()]).pipe(t.number().integer().nullable()).manifest())
const asa = t
  .object({
    a: t.string().optional(),
    b: t.number().optional(),
    c: t
      .object({
        a: t.string().optional(),
        b: t.number().optional().nullable(),
        c: t.object({ dadsd: t.string().optional().nonnullable() }),
        d: t
          .tuple([t.string().optional(), t.number()], t.bigint())
          .partial()
          .map((x) => x.defined().or([t.nan()]))
          .pop()
          .toArray(),
        e: t.fn([t.string(), t.number()]).returns(t.boolean()).removeRest().thisType(t.object({})),
      })
      .nullish(),
  })
  .deepRequired()
  .not([t.string()])
type asa = t.infer<typeof asa>
console.log(
  t
    .object({
      a: t.string().optional(),
      b: t.number().optional(),
      c: t
        .object({
          a: t.string().optional(),
          b: t.number().optional(),
        })
        .nonnullable()
        .optional(),
    })
    .deepRequired().shape.c.underlying.underlying.shape
)

console.log(t.tuple.fill(t.string(), 10).manifest())

console.log(Object.prototype.toString.call(function* () {}))
