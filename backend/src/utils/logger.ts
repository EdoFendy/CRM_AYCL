import pino from 'pino';
import { config } from '../config.js';

export const logger = pino({
  name: config.appName,
  level: config.nodeEnv === 'development' ? 'debug' : 'info',
  transport: config.nodeEnv === 'development' ? {
    target: 'pino-pretty',
    options: {
      translateTime: 'SYS:standard',
      colorize: true
    }
  } : undefined
});
