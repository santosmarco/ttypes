import { type F } from 'ts-toolbelt'
import { type AnyTType, TObjectArray, TTypeName, t, type Narrow } from './index'
import { InferType, object, string } from 'yup'

const a = t.string()
const asda = t.tuple([t.string(), t.number(), t.string()], t.buffer()).map({
  '0': t.array(t.nan()),
  '1': null,
  '2': () => t.null(),
  foo: 'bar',
  _: t.array(t.nan()),
})

type c = t.infer<typeof asda>

console.log(asda.manifest())
