export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env variable: ${name}`);
  }
  return value;
}

export const env = {
  SUPABASE_URL: requireEnv("SUPABASE_URL"),
  SUPABASE_SERVICE_ROLE_KEY: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  SUPABASE_PUBLISHABLE_KEY: requireEnv("SUPABASE_PUBLISHABLE_KEY"),
  LOVABLE_API_KEY: requireEnv("LOVABLE_API_KEY"),
  CRON_SECRET: requireEnv("CRON_SECRET"),
  SESSION_SECRET: requireEnv("SESSION_SECRET"),
};
