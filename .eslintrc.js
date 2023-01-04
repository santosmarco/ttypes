module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'xo',
    'xo-typescript',
    'plugin:prettier/recommended',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: './tsconfig.json',
  },
  plugins: ['prettier'],
  rules: {
    '@typescript-eslint/consistent-type-definitions': ['warn', 'interface'],
    '@typescript-eslint/consistent-type-imports': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/member-ordering': 'off',
    '@typescript-eslint/naming-convention': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'new-cap': 'off',
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
