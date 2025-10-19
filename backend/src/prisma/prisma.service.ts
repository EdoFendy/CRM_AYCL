import { INestApplication, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

import type { AppConfiguration } from '../config/configuration';
import { AppLogger } from '../common/services/app-logger.service';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly configService: ConfigService<AppConfiguration>, private readonly logger: AppLogger) {
    super({
      datasources: {
        db: {
          url: configService.get<string>('database.url')
        }
      }
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Prisma connected to database');
  }

  async enableShutdownHooks(app: INestApplication): Promise<void> {
    this.$on('beforeExit', async () => {
      await app.close();
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Prisma disconnected from database');
  }
}
// CRITIC PASS: Service non configura middlewares Prisma (es. soft delete, logging) né gestione multi-tenant; TODO integrare hook per audit_log e encryption PII.
