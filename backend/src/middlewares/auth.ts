import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { HttpError } from './errorHandler.js';

interface TokenPayload {
  sub: string;
  code11: string;
  role: 'admin' | 'seller' | 'reseller' | 'customer';
  permissions?: string[];
  scopes?: Record<string, unknown>;
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  // Try to get token from Authorization header first
  let token: string | undefined;
  
  const authHeader = req.headers.authorization;
  if (authHeader) {
    [, token] = authHeader.split(' ');
  }
  
  // If not in header, try query parameter (useful for file downloads)
  if (!token && req.query.token) {
    token = req.query.token as string;
  }
  
  if (!token) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Authentication required');
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret) as TokenPayload;
    req.user = {
      id: payload.sub,
      code11: payload.code11,
      role: payload.role,
      permissions: payload.permissions,
      scopes: payload.scopes
    };
    next();
  } catch (error) {
    throw new HttpError(401, 'INVALID_TOKEN', 'Invalid or expired token', { error: (error as Error).message });
  }
}

export function requireRoles(roles: TokenPayload['role'][]): (req: Request, res: Response, next: NextFunction) => void {
  return (req, _res, next) => {
    if (!req.user) {
      throw new HttpError(401, 'UNAUTHORIZED', 'Authentication required');
    }
    if (!roles.includes(req.user.role)) {
      throw new HttpError(403, 'FORBIDDEN', 'Insufficient permissions');
    }
    next();
  };
}

export function requirePermissions(permissions: string[]): (req: Request, res: Response, next: NextFunction) => void {
  return (req, _res, next) => {
    if (!req.user) {
      throw new HttpError(401, 'UNAUTHORIZED', 'Authentication required');
    }
    const granted = new Set(req.user.permissions ?? []);
    const missing = permissions.filter((perm) => !granted.has(perm));
    if (missing.length > 0) {
      throw new HttpError(403, 'FORBIDDEN', 'Missing permissions', { missing });
    }
    next();
  };
}
