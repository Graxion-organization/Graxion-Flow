module.exports = {
  env: {
    node: true,
    commonjs: true,
    es2021: true,
    jest: true,
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 'latest',
  },
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: 'next|^_' }],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
  },
};
