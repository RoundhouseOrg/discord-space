// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

// Layering rule (docs/05-tech-stack.md): `src/engine/` is pure game logic
// and must never import from `src/discord/` or `discord.js` itself. This is
// enforced here so a violation fails `npm run lint` (and CI), not just a
// code-review comment. See also src/engine/__tests__/layering.test.ts for a
// second, config-independent enforcement of the same rule.
const engineMayNotImportDiscord = {
  files: ['src/engine/**/*.ts'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: [
              '**/discord/**',
              '**/discord',
              '../discord',
              'discord.js',
              'discord.js/*',
            ],
            message:
              'src/engine/ must never import from src/discord/ or discord.js (see docs/05-tech-stack.md).',
          },
        ],
      },
    ],
  },
};

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  engineMayNotImportDiscord,
);
