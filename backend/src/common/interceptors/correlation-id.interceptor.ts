import { randomUUID } from 'crypto';

import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import type { RequestWithUser } from '../interfaces/request-with-user.interface';
import { AppLogger } from '../services/app-logger.service';
import { CorrelationIdService } from '../services/correlation-id.service';

@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  constructor(private readonly correlationIdService: CorrelationIdService, private readonly logger: AppLogger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithUser>();
    const response = http.getResponse<Response>();

    const incomingCorrelationIdHeader = request.headers['x-correlation-id'];
    const correlationId = (Array.isArray(incomingCorrelationIdHeader)
      ? incomingCorrelationIdHeader[0]
      : incomingCorrelationIdHeader) ?? randomUUID();

    request.correlationId = correlationId;
    response.setHeader('x-correlation-id', correlationId);

    this.logger.debug('Request received', {
      method: request.method,
      path: request.url,
      correlationId
    });

    return this.correlationIdService.runWith(correlationId, () =>
      next.handle().pipe(
        tap({
          error: (error) => {
            this.logger.error('Unhandled error in request pipeline', error instanceof Error ? error : { error }, {
              method: request.method,
              path: request.url
            });
          }
        })
      )
    );
  }
}
// CRITIC PASS: Interceptor non gestisce streaming/lunga durata e non propaga correlationId a servizi esterni; TODO integrare con client HTTP/queue.
