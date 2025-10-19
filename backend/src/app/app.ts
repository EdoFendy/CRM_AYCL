import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import 'express-async-errors';
import { correlationIdMiddleware } from '../middlewares/correlationId.js';
import { errorHandler } from '../middlewares/errorHandler.js';
import { registerRoutes } from '../routes/index.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '2mb' }));
  app.use(correlationIdMiddleware);

  registerRoutes(app);

  app.use(errorHandler);

  return app;
}
