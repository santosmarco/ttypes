import { t } from '../index'
import { assertEqual } from './_utils'

const base = t.object({
  a: t.string(),
  b: t.number(),
  c: t.bigint(),
  d: t.boolean(),
  e: t.null(),
  f: t.undefined(),
  g: t.buffer().nullish(),
  h: t.unknown(),
  i: t.any(),
  j: t.record(t.string(), t.number()),
  k: t.array(t.number()).nonempty(),
  l: t.tuple([t.string(), t.number()]).rest(t.string()),
  m: t.promise(t.number()),
  n: t.set(t.date()),
})

describe('TObject -> inference', () => {
  test('inference', () => {
    assertEqual<
      t.infer<typeof base>,
      {
        a: string
        b: number
        c: bigint
        d: boolean
        e: null
        f?: undefined
        g?: Buffer | null | undefined
        h?: unknown
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        i?: any
        j: Record<string, number>
        k: [number, ...number[]]
        l: [string, number, ...string[]]
        m: Promise<number>
        n: Set<Date>
      }
    >(true)
  })
})
