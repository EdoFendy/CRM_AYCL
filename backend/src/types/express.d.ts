import 'express-serve-static-core';

declare module 'express-serve-static-core' {
  interface Request {
    correlationId?: string;
    user?: {
      id: string;
      code11: string;
      role: 'admin' | 'seller' | 'reseller' | 'customer';
      permissions?: string[];
      scopes?: Record<string, unknown>;
      referralId?: string | null;
      referralCode?: string | null;
      referralLink?: string | null;
    };
  }
}
