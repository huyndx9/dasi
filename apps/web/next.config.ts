import path from 'node:path';
import { loadEnvConfig } from '@next/env';
import type { NextConfig } from 'next';

// The monorepo keeps one .env.local at the root (README → Cài đặt).
loadEnvConfig(path.resolve(import.meta.dirname, '../..'));

const config: NextConfig = {
  transpilePackages: ['@dasi/shared', '@dasi/i18n'],
  // Trace dependencies from the monorepo root so hosted builds (Vercel) include packages/*.
  outputFileTracingRoot: path.resolve(import.meta.dirname, '../..'),
};

export default config;
