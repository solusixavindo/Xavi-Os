const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  globalIgnores(['dist/**', 'coverage/**', 'node_modules/**']),
  expoConfig,
  {
    rules: {
      'no-console': 'error',
    },
  },
]);
