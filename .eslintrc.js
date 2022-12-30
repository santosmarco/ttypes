module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: ['xo', 'xo-typescript', 'plugin:prettier/recommended'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: './tsconfig.json',
  },
  plugins: ['prettier'],
  rules: {
    '@typescript-eslint/explicit-return-type': 'warn',
  },
}
