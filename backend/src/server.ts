import { createApp } from './app/app.js';
import { config } from './config.js';
import { logger } from './utils/logger.js';

const app = createApp();

app.listen(config.port, () => {
  logger.info(`🚀 ${config.appName} running on port ${config.port}`);
});
