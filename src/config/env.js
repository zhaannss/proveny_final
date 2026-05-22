const { z } = require("zod");

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.union([z.number(), z.string()]).default(3000).transform(v => Number(v)),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

  CORS_ALLOWED_ORIGINS: z.string().default(""),
  AUTH_RATE_LIMIT_PER_MIN: z.union([z.number(), z.string()]).default(5).transform(v => Number(v)),

  SMTP_HOST: z.string().default("smtp.mailtrap.io"),
  SMTP_PORT: z.union([z.number(), z.string()]).default(587).transform(v => Number(v)),
  SMTP_USER: z.string().default(""),
  SMTP_PASS: z.string().default(""),
  SMTP_FROM: z.string().default("noreply@Proveny.io"),
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
  EMAIL_VERIFY_TTL_HOURS: z.union([z.number(), z.string()]).default(24).transform(v => Number(v)),
  PASSWORD_RESET_TTL_HOURS: z.union([z.number(), z.string()]).default(1).transform(v => Number(v)),
  WORKER_CONCURRENCY: z.union([z.number(), z.string()]).default(5).transform(v => Number(v)),
});

// Валидация после преобразования
const validatedEnv = envSchema.parse(process.env);

// Проверка что числовые значения валидны
if (validatedEnv.PORT <= 0) {
  throw new Error("PORT must be a positive number");
}
if (validatedEnv.SMTP_PORT <= 0) {
  throw new Error("SMTP_PORT must be a positive number");
}
if (validatedEnv.AUTH_RATE_LIMIT_PER_MIN <= 0) {
  throw new Error("AUTH_RATE_LIMIT_PER_MIN must be a positive number");
}
if (validatedEnv.EMAIL_VERIFY_TTL_HOURS <= 0) {
  throw new Error("EMAIL_VERIFY_TTL_HOURS must be a positive number");
}
if (validatedEnv.PASSWORD_RESET_TTL_HOURS <= 0) {
  throw new Error("PASSWORD_RESET_TTL_HOURS must be a positive number");
}
if (validatedEnv.WORKER_CONCURRENCY <= 0) {
  throw new Error("WORKER_CONCURRENCY must be a positive number");
}

function parseAllowedOrigins(raw) {
  const origins = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // Production must never allow wildcard.
  if (process.env.NODE_ENV === "production" && origins.includes("*")) {
    throw new Error("CORS_ALLOWED_ORIGINS must not include '*' in production");
  }

  return origins;
}

const env = validatedEnv;
if (env.NODE_ENV === "production") {
  const required = ["SMTP_HOST", "SMTP_FROM"].filter((name) => !env[name]);
  if (required.length > 0) {
    throw new Error(`Missing production email configuration: ${required.join(", ")}`);
  }
  if (!env.SMTP_USER || !env.SMTP_PASS) {
    console.warn(
      "[env] SMTP_USER/SMTP_PASS not set — the API will boot, but the email worker cannot send until credentials are configured.",
    );
  }
}
env.CORS_ALLOWED_ORIGINS = parseAllowedOrigins(env.CORS_ALLOWED_ORIGINS);

module.exports = { env };



