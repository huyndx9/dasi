import path from 'node:path';
import { loadEnvConfig } from '@next/env';
import type { NextConfig } from 'next';

// The monorepo keeps one .env.local at the root (README → Cài đặt).
loadEnvConfig(path.resolve(import.meta.dirname, '../..'));

const config: NextConfig = {
  transpilePackages: ['@dasi/shared', '@dasi/i18n'],
};

export default config;
