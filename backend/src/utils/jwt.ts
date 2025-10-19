import jwt from 'jsonwebtoken';
import { config } from '../config.js';

interface JwtPayload {
  sub: string;
  code11: string;
  role: 'admin' | 'seller' | 'reseller' | 'customer';
  permissions?: string[];
  scopes?: Record<string, unknown>;
}

export function createAccessToken(payload: JwtPayload) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.tokenExpiresIn });
}

export function createRefreshToken(payload: JwtPayload) {
  return jwt.sign(payload, config.jwtRefreshSecret, { expiresIn: config.refreshTokenExpiresIn });
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwtRefreshSecret) as JwtPayload;
}
