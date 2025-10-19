export interface AppConfiguration {
  app: {
    env: string;
    port: number;
    logLevel: string;
  };
  database: {
    url: string | undefined;
  };
  auth: {
    jwtSecret: string | undefined;
    accessTtl: string | undefined;
    refreshTtl: string | undefined;
  };
  redis: {
    url: string | undefined;
  };
  storage: {
    endpoint: string | undefined;
    accessKey: string | undefined;
    secretKey: string | undefined;
    documentsBucket: string | undefined;
  };
  payments: {
    stripeSecret: string | undefined;
    webhookSecret: string | undefined;
  };
  esign: {
    provider: string | undefined;
    apiKey: string | undefined;
  };
}

export const configuration = (): AppConfiguration => ({
  app: {
    env: process.env.NODE_ENV ?? 'development',
    port: Number.parseInt(process.env.PORT ?? '3000', 10),
    logLevel: process.env.LOG_LEVEL ?? 'info'
  },
  database: {
    url: process.env.DATABASE_URL
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET,
    accessTtl: process.env.JWT_EXPIRES_IN,
    refreshTtl: process.env.REFRESH_TOKEN_TTL
  },
  redis: {
    url: process.env.REDIS_URL
  },
  storage: {
    endpoint: process.env.S3_ENDPOINT,
    accessKey: process.env.S3_ACCESS_KEY,
    secretKey: process.env.S3_SECRET_KEY,
    documentsBucket: process.env.S3_BUCKET_DOCUMENTS
  },
  payments: {
    stripeSecret: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
  },
  esign: {
    provider: process.env.E_SIGN_PROVIDER,
    apiKey: process.env.E_SIGN_API_KEY
  }
});

export default configuration;
// CRITIC PASS: Configurazione priva di sezioni per notifiche, scheduler e feature flag; TODO espandere struttura una volta implementati i moduli correlati.
