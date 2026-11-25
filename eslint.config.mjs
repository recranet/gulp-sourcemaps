import gulpConfig from 'eslint-config-gulp';

export default [
  ...gulpConfig,
  {
    files: ['**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
    },
  },
  {
    rules: {
      'max-depth': ['warn', { max: 5 }],
      'max-statements': ['warn', { max: 50 }],
    },
  },
  {
    ignores: ['test/assets/**', 'tmp/**'],
  },
];
