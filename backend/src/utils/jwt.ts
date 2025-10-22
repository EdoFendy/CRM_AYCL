import jwt, { type SignOptions } from 'jsonwebtoken';
import { config } from '../config.js';

interface JwtPayload {
  sub: string;
  code11: string;
  role: 'admin' | 'seller' | 'reseller' | 'customer';
  permissions?: string[];
  scopes?: Record<string, unknown>;
}

export function createAccessToken(payload: JwtPayload) {
  const options: SignOptions = { expiresIn: config.tokenExpiresIn };
  return jwt.sign(payload, config.jwtSecret, options);
}

export function createRefreshToken(payload: JwtPayload) {
  const options: SignOptions = { expiresIn: config.refreshTokenExpiresIn };
  return jwt.sign(payload, config.jwtRefreshSecret, options);
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwtRefreshSecret) as JwtPayload;
}
