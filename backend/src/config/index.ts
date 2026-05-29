import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '8000', 10),
  databaseUrl: process.env.DATABASE_URL || '',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:4200',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  nodeEnv: process.env.NODE_ENV || 'development',
};

/** Fail fast in production when critical env vars are missing. */
export function validateConfig(): void {
  const required: Array<{ key: keyof typeof config; env: string }> = [
    { key: 'databaseUrl', env: 'DATABASE_URL' },
    { key: 'supabaseUrl', env: 'SUPABASE_URL' },
    { key: 'supabaseServiceKey', env: 'SUPABASE_SERVICE_ROLE_KEY' },
  ];

  const missing = required.filter(({ key }) => !config[key]).map(({ env }) => env);

  if (missing.length === 0) {
    return;
  }

  const message = `Missing required environment variables: ${missing.join(', ')}`;

  if (config.nodeEnv === 'production') {
    throw new Error(message);
  }

  console.warn(`Warning: ${message}`);
}

/** Resolve CORS origin(s) from config — avoids credentials + wildcard mismatch. */
export function resolveCorsOrigin(): string | string[] {
  if (config.corsOrigin === '*') {
    return '*';
  }

  return config.corsOrigin
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}
