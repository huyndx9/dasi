import path from 'node:path';
import { loadEnvConfig } from '@next/env';
import type { NextConfig } from 'next';

// The monorepo keeps one .env.local at the root (README → Cài đặt).
loadEnvConfig(path.resolve(import.meta.dirname, '../..'));

// GitHub Codespaces serves the app from https://<name>-3000.app.github.dev; allow that
// host only when running there (.devcontainer/).
const codespaceHosts = process.env.CODESPACES === 'true' ? ['*.app.github.dev'] : [];

const config: NextConfig = {
  transpilePackages: ['@dasi/shared', '@dasi/i18n'],
  allowedDevOrigins: codespaceHosts,
  experimental: { serverActions: { allowedOrigins: codespaceHosts } },
  // Trace dependencies from the monorepo root so hosted builds (Vercel) include packages/*.
  outputFileTracingRoot: path.resolve(import.meta.dirname, '../..'),
};

export default config;
