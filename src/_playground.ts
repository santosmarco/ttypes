import { t } from './index'

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
    b: t.bigint().coerce(),
    c: t.ref('d.e'),
    d: t.object({
      e: t.string().optional(),
    }),
  })
  .partial()

type MyBool = t.input<typeof myBool>

console.log(
  myBool._parseSync.cache

  // t.string().manifest().required
)

myBool.safeParse(2)
myBool.safeParse('2')
// myBool.safeParse([2])
// console.log(myBool._parseSync.cache)

myBool.safeParse({})
// console.log(myBool._parseSync.cache)

myBool.safeParse({})
// console.log(myBool._parseSync.cache)
myBool.safeParse({})
// console.log(myBool._parseSync.cache)
myBool.safeParse({})
// console.log(myBool._parseSync.cache)
