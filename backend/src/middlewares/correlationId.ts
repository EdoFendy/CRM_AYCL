import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const correlationId = req.headers['x-correlation-id']?.toString() ?? randomUUID();
  req.correlationId = correlationId;
  res.setHeader('x-correlation-id', correlationId);
  next();
}
