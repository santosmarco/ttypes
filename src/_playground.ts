import ts from 'typescript'
import { t } from './index'

// import { validate } from 'typia'

const p1 = t
  .object({
    name: t.string().coerce(),
    age: t.string().numeric().transform(Number),
    address: t.object({
      street: t.string(),
      city: t.undefined(),
      state: t.string().optional(),
      zip: t
        .string()
        .transform(async (v) => v.split('-'))
        .refine(async (v) => v.length !== 2, 'length must not be 2')
        .preprocess((v) => String(v) + '-'),
    }),
  })
  .transform((d) => JSON.stringify(d))

type p1 = t.output<typeof p1>

console.log(
  p1
    .parseAsync({
      name: ['a'],
      age: '30',
      address: {
        street: '123 Main St',
        city: undefined,
        // state: 'CA',
        zip: '12345-6789',
      },
    })
    .then(console.log)
)

console.log(t.array(t.string().or([t.buffer()])))

const a = t
  .array(t.string().or([t.buffer()]))
  .coerce()
  .cast()
  .or([t.array(t.set(t.number().cast())).coerce(), t.number().array()])
type a = t.input<typeof a>

const aa = t.object({
  a: t.string(),
  b: t.undefined(),
  c: t.undefined(),
})

const bb = aa.patch(
  {
    b: t.bigint(),
  },
  t.undefined()
)

console.log(bb.conditionalPick(t.never()).deepPartial().shape)
console.log(
  ts
    .createPrinter()
    .printNode(
      ts.EmitHint.Unspecified,
      ts.factory.createObjectLiteralExpression([
        ts.factory.createPropertyAssignment('marco', ts.factory.createStringLiteral('polo')),
      ]),
      ts.createSourceFile('a.ts', 'a', ts.ScriptTarget.Latest)
    ),
  ts.createProgram({ rootNames: [], options: {} }).getRootFileNames(),
  // .getTypeChecker()
  // .getPropertyOfType(ts.factory.createNumericLiteral(1), 'a'),
  ts.factory.createNumericLiteral(1).text
)
