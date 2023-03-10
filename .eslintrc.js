module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'xo',
    'xo-typescript',
    // 'plugin:jsdoc/recommended',
    'plugin:prettier/recommended',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: './tsconfig.json',
  },
  plugins: ['jsdoc', 'prettier'],
  rules: {
    '@typescript-eslint/ban-types': 'off',
    '@typescript-eslint/consistent-type-assertions': 'off',
    '@typescript-eslint/consistent-type-definitions': 'off',
    '@typescript-eslint/consistent-type-imports': 'error',
    '@typescript-eslint/member-ordering': 'off',
    '@typescript-eslint/naming-convention': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-namespace': 'off',
    '@typescript-eslint/no-redeclare': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/sort-type-constituents': 'warn',
    'capitalized-comments': 'off',
    'new-cap': 'off',
    'no-case-declarations': 'off',
    // '@typescript-eslint/explicit-function-return-type': 'warn',
    complexity: 'off',
  },
  overrides: [
    {
      files: ['./src/__tests__/*.ts', './src/_playground.ts', '.eslintrc.js'],
      parserOptions: {
        project: './tsconfig.no-emit.json',
      },
    },
  ],
}
