import { describe, expect, it } from 'vitest'
import { t } from '../index'
import { TTester, assertEqual } from './_utils'

describe('TBoolean', () => {
  const schema = t.boolean()

  TTester(schema, {
    typeName: 'TBoolean',

    tests: {
      passes: [[true], [false]],
      fails: [
        // eslint-disable-next-line no-new-wrappers
        [new Boolean(true), [{ code: 'invalid_type', message: 'Expected boolean, received object', payload: { expected: 'boolean', received: 'object' }, path: [] }]],
        [1, [{ code: 'invalid_type', message: 'Expected boolean, received number', payload: { expected: 'boolean', received: 'number' }, path: [] }]],
        ['foo', [{ code: 'invalid_type', message: 'Expected boolean, received string', payload: { expected: 'boolean', received: 'string' }, path: [] }]],
        [null, [{ code: 'invalid_type', message: 'Expected boolean, received null', payload: { expected: 'boolean', received: 'null' }, path: [] }]],
        [undefined, [{ code: 'required', message: 'Required', path: [] }]],
      ],
    },

    variants: {
      optional: {
        passes: [[true], [false], [undefined]],
        fails: [
          [1, [{ code: 'invalid_type', message: 'Expected boolean, received number', payload: { expected: 'boolean', received: 'number' }, path: [] }]],
          ['foo', [{ code: 'invalid_type', message: 'Expected boolean, received string', payload: { expected: 'boolean', received: 'string' }, path: [] }]],
          [null, [{ code: 'invalid_type', message: 'Expected boolean, received null', payload: { expected: 'boolean', received: 'null' }, path: [] }]],
        ],
      },

      nullable: {
        passes: [[true], [false], [null]],
        fails: [
          [1, [{ code: 'invalid_type', message: 'Expected boolean, received number', payload: { expected: 'boolean', received: 'number' }, path: [] }]],
          ['foo', [{ code: 'invalid_type', message: 'Expected boolean, received string', payload: { expected: 'boolean', received: 'string' }, path: [] }]],
          [undefined, [{ code: 'required', message: 'Required', path: [] }]],
        ],
      },

      defined: {
        passes: [[true], [false]],
        fails: [
          [1, [{ code: 'invalid_type', message: 'Expected boolean, received number', payload: { expected: 'boolean', received: 'number' }, path: [] }]],
          ['foo', [{ code: 'invalid_type', message: 'Expected boolean, received string', payload: { expected: 'boolean', received: 'string' }, path: [] }]],
          [null, [{ code: 'invalid_type', message: 'Expected boolean, received null', payload: { expected: 'boolean', received: 'null' }, path: [] }]],
          [undefined, [{ code: 'required', message: 'Required', path: [] }]],
        ],
      },

      nonnullable: {
        passes: [[true], [false]],
        fails: [
          [1, [{ code: 'invalid_type', message: 'Expected boolean, received number', payload: { expected: 'boolean', received: 'number' }, path: [] }]],
          ['foo', [{ code: 'invalid_type', message: 'Expected boolean, received string', payload: { expected: 'boolean', received: 'string' }, path: [] }]],
          [null, [{ code: 'invalid_type', message: 'Expected boolean, received null', payload: { expected: 'boolean', received: 'null' }, path: [] }]],
          [undefined, [{ code: 'required', message: 'Required', path: [] }]],
        ],
      },

      not: [
        [[t.true()], { passes: [[false]], fails: [[true, [{ code: 'forbidden', message: 'Forbidden', path: [] }]]] }],
        [[t.false()], { passes: [[true]], fails: [[false, [{ code: 'forbidden', message: 'Forbidden', path: [] }]]] }],
        [
          [t.true(), t.false()],
          {
            passes: [],
            fails: [
              [true, [{ code: 'forbidden', message: 'Forbidden', path: [] }]],
              [false, [{ code: 'forbidden', message: 'Forbidden', path: [] }]],
            ],
          },
        ],
        [[t.literal(0)], { passes: [[true], [false]], fails: [[0, [{ code: 'forbidden', message: 'Forbidden', path: [] }]]] }],
      ],

      default: [
        [
          true,
          {
            passes: [[true], [false], [undefined, true]],
            fails: [
              [1, [{ code: 'invalid_type', message: 'Expected boolean, received number', payload: { expected: 'boolean', received: 'number' }, path: [] }]],
              ['foo', [{ code: 'invalid_type', message: 'Expected boolean, received string', payload: { expected: 'boolean', received: 'string' }, path: [] }]],
              [null, [{ code: 'invalid_type', message: 'Expected boolean, received null', payload: { expected: 'boolean', received: 'null' }, path: [] }]],
            ],
          },
        ],
        [
          false,
          {
            passes: [[true], [false], [undefined, false]],
            fails: [[null, [{ code: 'invalid_type', message: 'Expected boolean, received null', payload: { expected: 'boolean', received: 'null' }, path: [] }]]],
          },
        ],
      ],

      catch: [
        [true, { passes: [[true], [false], [undefined, true], [1, true], ['foo', true], [null, true]], fails: [] }],
        [false, { passes: [[true], [false], [undefined, false], [1, false], ['foo', false], [null, false]], fails: [] }],
      ],
    },
  })

  const withCoercion = t.boolean().coerce(true)
  const withoutCoercion = t.boolean().coerce(false)
  const withTruthyCoercion = t.boolean().coerce({ truthy: ['y', 'yes', 1] })
  const withFalsyCoercion = t.boolean().coerce({ falsy: ['n', 'no', 0] })
  const withBothCoercions = t.boolean().coerce({ truthy: ['y', 'yes', 1], falsy: ['n', 'no', 0] })
  const withInvertedTruthyCoercion = t.boolean().falsy('y', 'yes', 1)
  const withInvertedFalsyCoercion = t.boolean().truthy('n', 'no', 0)
  const withReplacedCoercions = t.boolean().truthy('y', 'yes', 1).truthy(1).falsy('n', 'no').falsy(0)

  describe('coercion', () => {
    it('passes', () => {
      expect(withCoercion.parse(0)).toStrictEqual(false)
      expect(withCoercion.parse(1)).toStrictEqual(true)
      expect(withCoercion.parse('')).toStrictEqual(false)
      expect(withCoercion.parse('foo')).toStrictEqual(true)
      expect(withCoercion.parse(null)).toStrictEqual(false)
      expect(withCoercion.parse(undefined)).toStrictEqual(false)
      expect(withoutCoercion.parse(true)).toStrictEqual(true)
      expect(withoutCoercion.parse(false)).toStrictEqual(false)
      expect(withTruthyCoercion.parse('y')).toStrictEqual(true)
      expect(withTruthyCoercion.parse('yes')).toStrictEqual(true)
      expect(withTruthyCoercion.parse(1)).toStrictEqual(true)
      expect(withFalsyCoercion.parse('n')).toStrictEqual(false)
      expect(withFalsyCoercion.parse('no')).toStrictEqual(false)
      expect(withFalsyCoercion.parse(0)).toStrictEqual(false)
      expect(withBothCoercions.parse('y')).toStrictEqual(true)
      expect(withBothCoercions.parse('yes')).toStrictEqual(true)
      expect(withBothCoercions.parse(1)).toStrictEqual(true)
      expect(withBothCoercions.parse('n')).toStrictEqual(false)
      expect(withBothCoercions.parse('no')).toStrictEqual(false)
      expect(withBothCoercions.parse(0)).toStrictEqual(false)
      expect(withInvertedTruthyCoercion.parse('y')).toStrictEqual(false)
      expect(withInvertedTruthyCoercion.parse('yes')).toStrictEqual(false)
      expect(withInvertedTruthyCoercion.parse(1)).toStrictEqual(false)
      expect(withInvertedFalsyCoercion.parse('n')).toStrictEqual(true)
      expect(withInvertedFalsyCoercion.parse('no')).toStrictEqual(true)
      expect(withInvertedFalsyCoercion.parse(0)).toStrictEqual(true)
      expect(withReplacedCoercions.parse(0)).toStrictEqual(false)
      expect(withReplacedCoercions.parse(1)).toStrictEqual(true)
    })

    it('fails', () => {
      expect(withoutCoercion.safeParse(0).ok).toBe(false)
      expect(withoutCoercion.safeParse(0).error?.issues).toStrictEqual([
        { code: 'invalid_type', message: 'Expected boolean, received number', payload: { expected: 'boolean', received: 'number' }, path: [], data: 0 },
      ])
      expect(withoutCoercion.safeParse('').ok).toBe(false)
      expect(withoutCoercion.safeParse('').error?.issues).toStrictEqual([
        { code: 'invalid_type', message: 'Expected boolean, received string', payload: { expected: 'boolean', received: 'string' }, path: [], data: '' },
      ])
      expect(withTruthyCoercion.safeParse([]).ok).toBe(false)
      expect(withTruthyCoercion.safeParse([]).error?.issues).toStrictEqual([
        { code: 'invalid_type', message: 'Expected number | string, received Array', payload: { expected: 'number | string', received: 'Array' }, path: [], data: [] },
      ])
      expect(withTruthyCoercion.safeParse('foo').ok).toBe(false)
      expect(withTruthyCoercion.safeParse('foo').error?.issues).toStrictEqual([
        {
          code: 'invalid_enum_value',
          message: 'Expected one of: "yes" | "y" | 1; received "foo"',
          payload: { expected: { values: ['yes', 'y', 1], formatted: ['"yes"', '"y"', '1'] }, received: { value: 'foo', formatted: '"foo"' } },
          path: [],
          data: 'foo',
        },
      ])
      expect(withFalsyCoercion.safeParse({ a: true }).ok).toBe(false)
      expect(withFalsyCoercion.safeParse({ a: true }).error?.issues).toStrictEqual([
        { code: 'invalid_type', message: 'Expected number | string, received object', payload: { expected: 'number | string', received: 'object' }, path: [], data: { a: true } },
      ])
      expect(withFalsyCoercion.safeParse('foo').ok).toBe(false)
      expect(withFalsyCoercion.safeParse('foo').error?.issues).toStrictEqual([
        {
          code: 'invalid_enum_value',
          message: 'Expected one of: "no" | "n" | 0; received "foo"',
          payload: { expected: { values: ['no', 'n', 0], formatted: ['"no"', '"n"', '0'] }, received: { value: 'foo', formatted: '"foo"' } },
          path: [],
          data: 'foo',
        },
      ])
      expect(withBothCoercions.safeParse({ a: true }).ok).toBe(false)
      expect(withBothCoercions.safeParse({ a: true }).error?.issues).toStrictEqual([
        { code: 'invalid_type', message: 'Expected number | string, received object', payload: { expected: 'number | string', received: 'object' }, path: [], data: { a: true } },
      ])
      expect(withBothCoercions.safeParse('foo').ok).toBe(false)
      expect(withBothCoercions.safeParse('foo').error?.issues).toStrictEqual([
        {
          code: 'invalid_enum_value',
          message: 'Expected one of: "yes" | "y" | "no" | "n" | 1 | 0; received "foo"',
          payload: {
            expected: { values: ['yes', 'y', 'no', 'n', 1, 0], formatted: ['"yes"', '"y"', '"no"', '"n"', '1', '0'] },
            received: { value: 'foo', formatted: '"foo"' },
          },
          path: [],
          data: 'foo',
        },
      ])
      expect(withReplacedCoercions.safeParse('y').ok).toBe(false)
      expect(withReplacedCoercions.safeParse('y').error?.issues).toStrictEqual([
        {
          code: 'invalid_enum_value',
          message: 'Expected one of: 1 | 0; received "y"',
          payload: { expected: { values: [1, 0], formatted: ['1', '0'] }, received: { value: 'y', formatted: '"y"' } },
          path: [],
          data: 'y',
        },
      ])
    })
  })

  const withDefaultCasting = t.boolean()
  const withCastingToNumber = t.boolean().cast()
  const withCastingToString = t.boolean().cast('string')
  const withBothCoercionsAndCastingToString = withBothCoercions.cast('string')

  describe('casting', () => {
    it('works', () => {
      expect(withDefaultCasting.parse(false)).toStrictEqual(false)
      expect(withDefaultCasting.parse(true)).toStrictEqual(true)
      expect(withCastingToNumber.parse(false)).toStrictEqual(0)
      expect(withCastingToNumber.parse(true)).toStrictEqual(1)
      expect(withCastingToString.parse(false)).toStrictEqual('false')
      expect(withCastingToString.parse(true)).toStrictEqual('true')
      expect(withBothCoercionsAndCastingToString.parse(0)).toStrictEqual('false')
      expect(withBothCoercionsAndCastingToString.parse(1)).toStrictEqual('true')
    })
  })

  describe('inference', () => {
    it('output', () => {
      assertEqual<t.output<typeof schema>, boolean>(true)
      assertEqual<t.output<typeof withCoercion>, boolean>(true)
      assertEqual<t.output<typeof withoutCoercion>, boolean>(true)
      assertEqual<t.output<typeof withTruthyCoercion>, boolean>(true)
      assertEqual<t.output<typeof withFalsyCoercion>, boolean>(true)
      assertEqual<t.output<typeof withBothCoercions>, boolean>(true)
      assertEqual<t.output<typeof withInvertedTruthyCoercion>, boolean>(true)
      assertEqual<t.output<typeof withInvertedFalsyCoercion>, boolean>(true)
      assertEqual<t.output<typeof withReplacedCoercions>, boolean>(true)

      assertEqual<t.output<typeof withDefaultCasting>, boolean>(true)
      assertEqual<t.output<typeof withCastingToNumber>, 0 | 1>(true)
      assertEqual<t.output<typeof withCastingToString>, 'false' | 'true'>(true)
      assertEqual<t.output<typeof withBothCoercionsAndCastingToString>, 'false' | 'true'>(true)
    })

    it('input', () => {
      assertEqual<t.input<typeof schema>, boolean>(true)
      assertEqual<t.input<typeof withCoercion>, any>(true)
      assertEqual<t.input<typeof withoutCoercion>, boolean>(true)
      assertEqual<t.input<typeof withTruthyCoercion>, 'y' | 'yes' | 1>(true)
      assertEqual<t.input<typeof withFalsyCoercion>, 'n' | 'no' | 0>(true)
      assertEqual<t.input<typeof withBothCoercions>, 'n' | 'no' | 'y' | 'yes' | 0 | 1>(true)
      assertEqual<t.input<typeof withInvertedTruthyCoercion>, 'y' | 'yes' | 1>(true)
      assertEqual<t.input<typeof withInvertedFalsyCoercion>, 'n' | 'no' | 0>(true)
      assertEqual<t.input<typeof withReplacedCoercions>, 0 | 1>(true)

      assertEqual<t.input<typeof withDefaultCasting>, boolean>(true)
      assertEqual<t.input<typeof withCastingToNumber>, boolean>(true)
      assertEqual<t.input<typeof withCastingToString>, boolean>(true)
      assertEqual<t.input<typeof withBothCoercionsAndCastingToString>, 'n' | 'no' | 'y' | 'yes' | 0 | 1>(true)
    })
  })
})

describe('TTrue', () => {
  const schema = t.true()

  TTester(schema, {
    typeName: 'TTrue',

    tests: {
      passes: [[true]],
      fails: [
        [
          false,
          [
            {
              code: 'invalid_literal',
              message: 'Data must be exactly the literal value `true`; received `false`',
              payload: { expected: { value: true, formatted: 'true' }, received: { value: false, formatted: 'false' } },
              path: [],
            },
          ],
        ],
        // eslint-disable-next-line no-new-wrappers
        [new Boolean(true), [{ code: 'invalid_type', message: 'Expected true, received object', payload: { expected: 'true', received: 'object' }, path: [] }]],
        [1, [{ code: 'invalid_type', message: 'Expected true, received number', payload: { expected: 'true', received: 'number' }, path: [] }]],
        ['foo', [{ code: 'invalid_type', message: 'Expected true, received string', payload: { expected: 'true', received: 'string' }, path: [] }]],
        [null, [{ code: 'invalid_type', message: 'Expected true, received null', payload: { expected: 'true', received: 'null' }, path: [] }]],
        [undefined, [{ code: 'required', message: 'Required', path: [] }]],
      ],
    },

    variants: {
      optional: {
        passes: [[true], [undefined]],
        fails: [
          [1, [{ code: 'invalid_type', message: 'Expected true, received number', payload: { expected: 'true', received: 'number' }, path: [] }]],
          ['foo', [{ code: 'invalid_type', message: 'Expected true, received string', payload: { expected: 'true', received: 'string' }, path: [] }]],
          [null, [{ code: 'invalid_type', message: 'Expected true, received null', payload: { expected: 'true', received: 'null' }, path: [] }]],
        ],
      },

      nullable: {
        passes: [[true], [null]],
        fails: [
          [1, [{ code: 'invalid_type', message: 'Expected true, received number', payload: { expected: 'true', received: 'number' }, path: [] }]],
          ['foo', [{ code: 'invalid_type', message: 'Expected true, received string', payload: { expected: 'true', received: 'string' }, path: [] }]],
          [undefined, [{ code: 'required', message: 'Required', path: [] }]],
        ],
      },

      defined: {
        passes: [[true]],
        fails: [
          [1, [{ code: 'invalid_type', message: 'Expected true, received number', payload: { expected: 'true', received: 'number' }, path: [] }]],
          ['foo', [{ code: 'invalid_type', message: 'Expected true, received string', payload: { expected: 'true', received: 'string' }, path: [] }]],
          [null, [{ code: 'invalid_type', message: 'Expected true, received null', payload: { expected: 'true', received: 'null' }, path: [] }]],
          [undefined, [{ code: 'required', message: 'Required', path: [] }]],
        ],
      },

      nonnullable: {
        passes: [[true]],
        fails: [
          [1, [{ code: 'invalid_type', message: 'Expected true, received number', payload: { expected: 'true', received: 'number' }, path: [] }]],
          ['foo', [{ code: 'invalid_type', message: 'Expected true, received string', payload: { expected: 'true', received: 'string' }, path: [] }]],
          [null, [{ code: 'invalid_type', message: 'Expected true, received null', payload: { expected: 'true', received: 'null' }, path: [] }]],
          [undefined, [{ code: 'required', message: 'Required', path: [] }]],
        ],
      },

      not: [
        [[t.true()], { passes: [], fails: [[true, [{ code: 'forbidden', message: 'Forbidden', path: [] }]]] }],
        [[t.false()], { passes: [[true]], fails: [[false, [{ code: 'forbidden', message: 'Forbidden', path: [] }]]] }],
        [
          [t.true(), t.false()],
          {
            passes: [],
            fails: [
              [true, [{ code: 'forbidden', message: 'Forbidden', path: [] }]],
              [false, [{ code: 'forbidden', message: 'Forbidden', path: [] }]],
            ],
          },
        ],
        [[t.literal(0)], { passes: [[true]], fails: [[0, [{ code: 'forbidden', message: 'Forbidden', path: [] }]]] }],
      ],

      default: [
        [
          true,
          {
            passes: [[true], [undefined, true]],
            fails: [
              [
                false,
                [
                  {
                    code: 'invalid_literal',
                    message: 'Data must be exactly the literal value `true`; received `false`',
                    payload: { expected: { value: true, formatted: 'true' }, received: { value: false, formatted: 'false' } },
                    path: [],
                  },
                ],
              ],
              [1, [{ code: 'invalid_type', message: 'Expected true, received number', payload: { expected: 'true', received: 'number' }, path: [] }]],
              ['foo', [{ code: 'invalid_type', message: 'Expected true, received string', payload: { expected: 'true', received: 'string' }, path: [] }]],
              [null, [{ code: 'invalid_type', message: 'Expected true, received null', payload: { expected: 'true', received: 'null' }, path: [] }]],
            ],
          },
        ],
      ],

      catch: [
        [true, { passes: [[true], [false, true], [undefined, true], [1, true], ['foo', true], [null, true]], fails: [] }],
        [false, { passes: [[true], [false], [undefined, false], [1, false], ['foo', false], [null, false]], fails: [] }],
      ],
    },
  })

  it('inference', () => {
    assertEqual<t.output<typeof schema>, true>(true)
    assertEqual<t.input<typeof schema>, true>(true)
  })
})

describe('TFalse', () => {
  const schema = t.false()

  TTester(schema, {
    typeName: 'TFalse',

    tests: {
      passes: [[false]],
      fails: [
        [
          true,
          [
            {
              code: 'invalid_literal',
              message: 'Data must be exactly the literal value `false`; received `true`',
              payload: { expected: { value: false, formatted: 'false' }, received: { value: true, formatted: 'true' } },
              path: [],
            },
          ],
        ],
        // eslint-disable-next-line no-new-wrappers
        [new Boolean(false), [{ code: 'invalid_type', message: 'Expected false, received object', payload: { expected: 'false', received: 'object' }, path: [] }]],
        [1, [{ code: 'invalid_type', message: 'Expected false, received number', payload: { expected: 'false', received: 'number' }, path: [] }]],
        ['foo', [{ code: 'invalid_type', message: 'Expected false, received string', payload: { expected: 'false', received: 'string' }, path: [] }]],
        [null, [{ code: 'invalid_type', message: 'Expected false, received null', payload: { expected: 'false', received: 'null' }, path: [] }]],
        [undefined, [{ code: 'required', message: 'Required', path: [] }]],
      ],
    },

    variants: {
      optional: {
        passes: [[false], [undefined]],
        fails: [
          [1, [{ code: 'invalid_type', message: 'Expected false, received number', payload: { expected: 'false', received: 'number' }, path: [] }]],
          ['foo', [{ code: 'invalid_type', message: 'Expected false, received string', payload: { expected: 'false', received: 'string' }, path: [] }]],
          [null, [{ code: 'invalid_type', message: 'Expected false, received null', payload: { expected: 'false', received: 'null' }, path: [] }]],
        ],
      },

      nullable: {
        passes: [[false], [null]],
        fails: [
          [1, [{ code: 'invalid_type', message: 'Expected false, received number', payload: { expected: 'false', received: 'number' }, path: [] }]],
          ['foo', [{ code: 'invalid_type', message: 'Expected false, received string', payload: { expected: 'false', received: 'string' }, path: [] }]],
          [undefined, [{ code: 'required', message: 'Required', path: [] }]],
        ],
      },

      defined: {
        passes: [[false]],
        fails: [
          [1, [{ code: 'invalid_type', message: 'Expected false, received number', payload: { expected: 'false', received: 'number' }, path: [] }]],
          ['foo', [{ code: 'invalid_type', message: 'Expected false, received string', payload: { expected: 'false', received: 'string' }, path: [] }]],
          [null, [{ code: 'invalid_type', message: 'Expected false, received null', payload: { expected: 'false', received: 'null' }, path: [] }]],
          [undefined, [{ code: 'required', message: 'Required', path: [] }]],
        ],
      },

      nonnullable: {
        passes: [[false]],
        fails: [
          [1, [{ code: 'invalid_type', message: 'Expected false, received number', payload: { expected: 'false', received: 'number' }, path: [] }]],
          ['foo', [{ code: 'invalid_type', message: 'Expected false, received string', payload: { expected: 'false', received: 'string' }, path: [] }]],
          [null, [{ code: 'invalid_type', message: 'Expected false, received null', payload: { expected: 'false', received: 'null' }, path: [] }]],
          [undefined, [{ code: 'required', message: 'Required', path: [] }]],
        ],
      },

      not: [
        [[t.true()], { passes: [[false]], fails: [[true, [{ code: 'forbidden', message: 'Forbidden', path: [] }]]] }],
        [[t.false()], { passes: [], fails: [[false, [{ code: 'forbidden', message: 'Forbidden', path: [] }]]] }],
        [
          [t.true(), t.false()],
          {
            passes: [],
            fails: [
              [false, [{ code: 'forbidden', message: 'Forbidden', path: [] }]],
              [false, [{ code: 'forbidden', message: 'Forbidden', path: [] }]],
            ],
          },
        ],
        [[t.literal(0)], { passes: [[false]], fails: [[0, [{ code: 'forbidden', message: 'Forbidden', path: [] }]]] }],
      ],

      default: [
        [
          false,
          {
            passes: [[false], [undefined, false]],
            fails: [
              [
                true,
                [
                  {
                    code: 'invalid_literal',
                    message: 'Data must be exactly the literal value `false`; received `true`',
                    payload: { expected: { value: false, formatted: 'false' }, received: { value: true, formatted: 'true' } },
                    path: [],
                  },
                ],
              ],
              [1, [{ code: 'invalid_type', message: 'Expected false, received number', payload: { expected: 'false', received: 'number' }, path: [] }]],
              ['foo', [{ code: 'invalid_type', message: 'Expected false, received string', payload: { expected: 'false', received: 'string' }, path: [] }]],
              [null, [{ code: 'invalid_type', message: 'Expected false, received null', payload: { expected: 'false', received: 'null' }, path: [] }]],
            ],
          },
        ],
      ],

      catch: [
        [true, { passes: [[true], [false], [undefined, true], [1, true], ['foo', true], [null, true]], fails: [] }],
        [false, { passes: [[true, false], [false], [undefined, false], [1, false], ['foo', false], [null, false]], fails: [] }],
      ],
    },
  })

  it('inference', () => {
    assertEqual<t.output<typeof schema>, false>(true)
    assertEqual<t.input<typeof schema>, false>(true)
  })
})
