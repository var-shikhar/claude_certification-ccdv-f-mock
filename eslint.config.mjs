import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const config = [
  ...nextVitals,
  ...nextTs,
  { ignores: ['.next/**', 'node_modules/**', '.claude/**', 'drizzle/**', 'next-env.d.ts', 'src/components/ui/**'] },
  {
    rules: {
      // Unused args prefixed with _ are intentional (destructuring to drop fields).
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
];

export default config;
