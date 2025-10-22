import 'dotenv/config';
import type { SignOptions } from 'jsonwebtoken';

const requiredEnv = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'] as const;

requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    if (process.env.NODE_ENV === 'test') {
      const defaults: Record<(typeof requiredEnv)[number], string> = {
        DATABASE_URL: 'postgres://test:test@localhost:5432/test',
        JWT_SECRET: 'test-secret',
        JWT_REFRESH_SECRET: 'test-refresh-secret'
      };
      process.env[key] = defaults[key];
    } else {
      throw new Error(`Missing environment variable ${key}`);
    }
  }
});

const tokenExpiresIn = (process.env.TOKEN_EXPIRES_IN ?? '15m') as SignOptions['expiresIn'];
const refreshTokenExpiresIn = (process.env.REFRESH_TOKEN_EXPIRES_IN ?? '7d') as SignOptions['expiresIn'];

export const config = {
  port: Number(process.env.PORT ?? 4000),
  appName: process.env.APP_NAME ?? 'CRM AYCL API',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: process.env.DATABASE_URL!,
  jwtSecret: process.env.JWT_SECRET!,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET!,
  tokenExpiresIn,
  refreshTokenExpiresIn,
  passwordResetTokenTtl: process.env.PASSWORD_RESET_TOKEN_TTL ?? '15m',
  webhookSecret: process.env.WEBHOOK_SECRET ?? 'change_me_webhook',
  auditLogRetentionDays: Number(process.env.AUDIT_LOG_RETENTION_DAYS ?? 365)
};
