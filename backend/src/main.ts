import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';

import { AppModule } from './app.module';
import type { AppConfiguration } from './config/configuration';
import { AppLogger } from './common/services/app-logger.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = app.get(AppLogger);
  app.useLogger(logger);

  const configService = app.get(ConfigService<AppConfiguration>);
  const port = configService.get<number>('app.port', { infer: true }) ?? 3000;

  await app.listen(port);
  logger.log(`Backend application is running on port ${port}`);
}

void bootstrap();
// CRITIC PASS: Bootstrap non abilita CORS, shutdown hooks né prefix API; TODO integrare graceful shutdown, global prefix e configurazione sicurezza.
