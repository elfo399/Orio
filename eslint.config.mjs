import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [{
  files: ['**/*.ts'],
  ignores: ['dist/**', 'node_modules/**'],
  languageOptions: { parser: tsParser, parserOptions: { project: false } },
  plugins: { '@typescript-eslint': tseslint },
  rules: { ...tseslint.configs.recommended.rules, '@typescript-eslint/no-explicit-any': 'off' }
}];
