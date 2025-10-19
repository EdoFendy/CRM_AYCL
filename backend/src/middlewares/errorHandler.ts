import { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/logger.js';

export class HttpError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const correlationId = req.correlationId ?? 'unknown';
  if (err instanceof HttpError) {
    logger.warn({ err, correlationId }, 'Handled error');
    res.status(err.status).json({
      code: err.code,
      message: err.message,
      details: err.details,
      correlationId
    });
    return;
  }

  logger.error({ err, correlationId }, 'Unhandled error');
  res.status(500).json({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Unexpected error',
    correlationId
  });
}
