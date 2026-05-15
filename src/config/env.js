const { z } = require("zod");

// Наш новый "бронированный" хелпер
const numericDefault = (defaultValue) => 
  z.preprocess(
    (val) => {
      // Если переменной вообще нет
      if (val === undefined || val === null) {
        return undefined;
      }
      
      // Очищаем от случайных пробелов, если это строка
      const cleaned = typeof val === "string" ? val.trim() : val;
      
      // Если Dokku передал пустую строку "" — сработает дефолт
      if (cleaned === "") {
        return undefined;
      }
      
      const parsed = Number(cleaned);
      
      // ЕСЛИ ВЕРНУЛСЯ NaN (пришел текст) ИЛИ ЧИСЛО <= 0
      // Мы не падаем, а просто тихо берем дефолтное значение!
      if (isNaN(parsed) || parsed <= 0) {
        return defaultValue;
      }
      
      return parsed;
    },
    z.number().positive().default(defaultValue)
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
  PASSWORD_RESET_TTL_HOURS: numericDefault(1), // Вот тут Dokku больше не сможет все сломать
  WORKER_CONCURRENCY: numericDefault(5),
});

// Валидация
const validatedEnv = envSchema.parse(process.env);

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