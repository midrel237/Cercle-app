// ESLint 9 flat config — monorepo Cercle (backend NestJS + mobile Expo/RN).
// Regles non-bloquantes (warn) pour un premier passage vert en CI ; on
// pourra durcir progressivement vers "error" une fois le socle stable.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  // Fichiers ignores
  {
    ignores: [
      '**/dist/**',
      '**/coverage/**',
      '**/node_modules/**',
      '**/.expo/**',
      '**/generated/**',
      'apps/mobile/babel.config.js',
      'eslint.config.mjs',
    ],
  },

  // Base TS pour tout le monorepo
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    plugins: {
      import: importPlugin,
    },
    rules: {
      // Non-bloquantes au premier passage
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
      '@typescript-eslint/no-unsafe-function-type': 'warn',
      'import/no-duplicates': 'warn',
      'no-console': 'warn',
    },
  },

  // Backend NestJS — sources seulement (specs Jest mockées via useValue n'ont pas de types stricts)
  {
    files: ['apps/backend/src/**/*.ts'],
    rules: {
      'no-console': 'off', // main.ts log volontaire
    },
  },

  // Specs Jest — règles assouplies (mocks légers)
  {
    files: ['apps/backend/src/**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-var-requires': 'off',
      'no-console': 'off',
    },
  },

  // Mobile Expo/React Native + React Hooks
  {
    files: ['apps/mobile/app/**/*.tsx', 'apps/mobile/src/**/*.ts*'],
    ...tseslint.configs.recommended,
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      // RN : styles inline nombreux, styles non-types par design
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-code/no-unused-expressions': 'off',
    },
  },

  // Prettier en dernier — désactive les règles de style qui conflitent
  prettier,
);
