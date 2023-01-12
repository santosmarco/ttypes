import _ from 'lodash'
import util from 'util'
import { TTypeName, t } from './index'
import { uniqueBy } from 'lodash'

// const a = t.union([t.string(), t.number()]).match(
//   (val) => 2,
//   (v) => true,
//   (v) => 'string'
// )

const str = console.log(t.number().integer().parse(8))

type str = t.infer<typeof str>

console.log(
  t
    .number()
    .precision(5, { inclusive: false, convert: true })
    .array()
    .unique((a, b, c, d) => (c === d ? false : a === b), { convert: true })
    .parse([2, 2, 3])
)

const d = t.cast.array(t.number().positive().integer()).coerce()

type d = t.input<typeof d>

const a = t.match(t.when(t.string(), (v) => 2))

console.log(uniqueBy)

console.log(_.uniqWith([2, 1, 2], (a, b) => a === b))
