import { TOptional, TType } from './v2/types/_internal'
import { type F } from 'ts-toolbelt'
import { type AnyTType, TObjectArray, TTypeName, t, type Narrow } from './index'
import { InferType, object, string } from 'yup'

const a = t.string()
const asda = t.tuple([t.string(), t.number(), t.string()], t.buffer()).partial()

type c = t.infer<typeof asda>

console.log(asda.manifest())

console.log(new TOptional({}))
