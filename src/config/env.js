const { z } = require("zod");

const num = (def) => z.preprocess((v) => (!v || v === "" ? def : Number(v)), z.number().int().positive());

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: num(3000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_SECRET_KEY: z.string().min(32).optional(),
  JWT_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET_KEY: z.string().min(32).optional(),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  CORS_ALLOWED_ORIGINS: z.string().default(""),
  AUTH_RATE_LIMIT_PER_MIN: num(5),
  SMTP_HOST: z.string().default("sandbox.smtp.mailtrap.io"),
  SMTP_PORT: num(587),
  SMTP_USER: z.string().default(""),
  SMTP_PASS: z.string().default(""),
  SMTP_FROM: z.string().default("noreply@proveny.io"),
  APP_BASE_URL: z.string().default("http://localhost:3000"),
  EMAIL_VERIFY_TTL_HOURS: num(24),
  PASSWORD_RESET_TTL_HOURS: num(1),
  WORKER_CONCURRENCY: num(5),
  SEED_ADMIN_EMAIL: z.string().default("admin@proveny.local"),
  SEED_ADMIN_PASSWORD: z.string().default("AdminPass123!"),
});

function parseAllowedOrigins(raw) {
  if (!raw) return [];
  const origins = raw.split(",").map((s) => s.trim()).filter(Boolean);
  if (process.env.NODE_ENV === "production" && origins.includes("*")) {
    throw new Error("CORS_ALLOWED_ORIGINS must not include '*' in production");
  }
  return origins;
}

const env = envSchema.parse(process.env);
env.CORS_ALLOWED_ORIGINS = parseAllowedOrigins(env.CORS_ALLOWED_ORIGINS);

module.exports = { env };