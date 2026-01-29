export function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

export function getConfig() {
  const rawMode = String(process.env.WORKER_MODE || 'loop').trim().toLowerCase();
  const workerMode = rawMode === 'job' ? 'job' : 'loop';

  return {
    supabaseUrl: requireEnv('SUPABASE_URL'),
    supabaseServiceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    bucket: process.env.SUPABASE_BUCKET || 'epubs',
    workerId: process.env.WORKER_ID || `worker-${process.pid}`,
    pollIntervalMs: Math.max(250, Number(process.env.POLL_INTERVAL_MS) || 1500),
    maxAttempts: Math.max(1, Number(process.env.MAX_ATTEMPTS) || 5),
    workerMode,
    maxJobs: Math.max(1, Number(process.env.MAX_JOBS) || 1),
    urlFetchTimeoutMs: Math.max(1000, Number(process.env.URL_FETCH_TIMEOUT_MS) || 8000),
    urlMaxBytes: Math.max(1024 * 32, Number(process.env.URL_MAX_BYTES) || 8_000_000),
    urlUserAgent: process.env.URL_USER_AGENT || 'Mozilla/5.0 (compatible; IntelligentReader/1.0)'
  };
}
