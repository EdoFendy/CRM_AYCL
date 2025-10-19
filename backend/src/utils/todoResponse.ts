import { Request, Response } from 'express';

export function respondTodo(req: Request, res: Response, feature: string) {
  res.json({
    message: `${feature} not implemented yet`,
    todo: true,
    correlationId: req.correlationId,
    filters: req.query
  });
}
