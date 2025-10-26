import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import 'express-async-errors';
import { correlationIdMiddleware } from '../middlewares/correlationId.js';
import { errorHandler } from '../middlewares/errorHandler.js';
import { registerRoutes } from '../routes/index.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  
  // Configure CORS to allow requests from all frontends
  app.use(cors({
    origin: [
      // Local development
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      // Production - Homepage
      'https://allyoucanleads.com',
      'https://www.allyoucanleads.com',
      'https://checkout.allyoucanleads.com',
      // Production - CRM frontends (add your production URLs here)
      // 'https://admin.allyoucanleads.com',
      // 'https://seller.allyoucanleads.com',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'X-Correlation-ID',
      'X-Requested-With',
      'Accept',
      'Origin'
    ]
  }));
  
  app.use(express.json({ limit: '2mb' }));
  app.use(correlationIdMiddleware);

  // Serve static files from uploads directory
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  registerRoutes(app);

  app.use(errorHandler);

  return app;
}
