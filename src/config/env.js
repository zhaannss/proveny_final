const { z } = require("zod");

// Хелпер для числовых переменных с дефолтными значениями
const numericDefault = (defaultValue) => 
  z.preprocess(
    (val) => {
      // Если переменная отсутствует или это пустая строка, возвращаем undefined, чтобы сработал .default()
      if (val === undefined || val === null || (typeof val === "string" && val.trim() === "")) {
        return undefined;
      }
      const parsed = Number(val);
      return isNaN(parsed) ? val : parsed; // отдаем как есть, если это реальный NaN, чтобы Zod выдал красивую ошибку
    },
    z.number().positive() // Сразу проверяет, что число > 0 (заменяет ваши проверки if внизу)
     .default(defaultValue)
  );

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: numericDefault(3000),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

  CORS_ALLOWED_ORIGINS: z.string().default(""),
  AUTH_RATE_LIMIT_PER_MIN: numericDefault(5),

  SMTP_HOST: z.string().default("smtp.mailtrap.io"),
  SMTP_PORT: numericDefault(587),
  SMTP_USER: z.string().default(""),
  SMTP_PASS: z.string().default(""),
  SMTP_FROM: z.string().default("noreply@Proveny.io"),
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
  EMAIL_VERIFY_TTL_HOURS: numericDefault(24),
  PASSWORD_RESET_TTL_HOURS: numericDefault(1),
  WORKER_CONCURRENCY: numericDefault(5),
});

// Валидация
const validatedEnv = envSchema.parse(process.env);

// Ручные проверки на <= 0 больше не нужны! Zod (.positive()) сделает это сам на этапе parse.

function parseAllowedOrigins(raw) {
  const origins = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

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