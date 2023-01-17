import { t } from '../index'
import { type u } from '../utils'
import { assertEqual } from './_utils'

const Person = t.object({
  givenName: t.string().capitalize().lowercase(),
  familyName: t.string().capitalize().optional(),
  email: t.string().email(),
  favoriteColors: t
    .array(t.string().or(t.tuple([t.nan(), t.nan(), t.nan()])))
    .coerce()
    .optional(),
})

describe('TObject -> complex', () => {
  test('inference', () => {
    assertEqual<
      t.input<typeof Person>,
      {
        givenName: string
        familyName?: string | undefined
        email: string
        favoriteColors?: Array<string | [number, number, number]> | Set<string | [number, number, number]> | undefined
      }
    >(true)

    assertEqual<
      t.output<typeof Person>,
      {
        givenName: string
        familyName?: string | undefined
        email: string
        favoriteColors?: Array<string | [number, number, number]>
      }
    >(true)
  })
})

type c = u.AnyOf<string, [number, string]>
