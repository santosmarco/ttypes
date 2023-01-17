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
  .bool()
  .cast('number')
  .coerce({ truthy: [1, 'true', 'hi'] })

type MyBool = t.input<typeof myBool>

console.log(myBool.parse({}))
