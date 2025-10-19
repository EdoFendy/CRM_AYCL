import { z } from 'zod';

export const environmentSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z
      .string()
      .regex(/^[0-9]+$/)
      .transform((value) => Number.parseInt(value, 10))
      .refine((value) => value > 0 && value < 65536, { message: 'PORT must be between 1 and 65535' })
      .optional(),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    DATABASE_URL: z.string().url({ message: 'DATABASE_URL must be a valid URL' }),
    JWT_SECRET: z.string().min(16, { message: 'JWT_SECRET must have at least 16 characters' }),
    JWT_EXPIRES_IN: z.string().min(2),
    REFRESH_TOKEN_TTL: z.string().min(2),
    REDIS_URL: z.string().url(),
    S3_ENDPOINT: z.string().url(),
    S3_ACCESS_KEY: z.string().min(1),
    S3_SECRET_KEY: z.string().min(1),
    S3_BUCKET_DOCUMENTS: z.string().min(1),
    STRIPE_SECRET_KEY: z.string().min(1),
    STRIPE_WEBHOOK_SECRET: z.string().min(1),
    E_SIGN_PROVIDER: z.string().min(1),
    E_SIGN_API_KEY: z.string().optional()
  })
  .transform((value) => ({
    ...value,
    PORT: value.PORT ?? 3000
  }));

export type EnvironmentVariables = z.infer<typeof environmentSchema>;

export const validateEnvironment = (config: Record<string, unknown>): EnvironmentVariables => {
  const result = environmentSchema.safeParse(config);
  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${formatted}`);
  }

  return result.data;
};
// CRITIC PASS: Validazione attuale non gestisce fallback per configurazioni opzionali (es. storage multipli) né secret rotation; TODO introdurre supporto per variabili per-microservizio e validazione condizionale.
