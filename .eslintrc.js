module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  rules: {
    "@typescript-eslint/explicit-module-boundary-types": "off"
  },
  plugins: [
    '@typescript-eslint',
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ]
};
