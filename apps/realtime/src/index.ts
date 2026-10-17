import { buildApp } from './app';
import { loadEnv } from './env';

const env = loadEnv();
const app = buildApp(env);

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void app.close().then(() => process.exit(0));
  });
}

await app.listen({ port: env.REALTIME_PORT, host: env.REALTIME_HOST });
