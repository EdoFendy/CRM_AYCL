import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from './prisma/prisma.module';
import { configuration, validateEnvironment } from './config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { RbacGuard } from './common/guards/rbac.guard';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { CorrelationIdInterceptor } from './common/interceptors/correlation-id.interceptor';
import { AppLogger } from './common/services/app-logger.service';
import { AuditService } from './common/services/audit.service';
import { CorrelationIdService } from './common/services/correlation-id.service';
import { ZodValidationPipe } from './common/pipes/zod-validation.pipe';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnvironment,
      cache: true,
      expandVariables: true
    }),
    PrismaModule
  ],
  providers: [
    AppLogger,
    AuditService,
    CorrelationIdService,
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter
    },
    {
      provide: APP_GUARD,
      useClass: RbacGuard
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: CorrelationIdInterceptor
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor
    },
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe
    }
  ]
})
export class AppModule {}
// CRITIC PASS: AppModule privo di moduli funzionali e configurazioni CORS/versionamento; TODO abilitare swagger, rate limiting e moduli dominio.
