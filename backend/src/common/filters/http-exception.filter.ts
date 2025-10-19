import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

import type { RequestWithUser } from '../interfaces/request-with-user.interface';
import { AppLogger } from '../services/app-logger.service';
import { CorrelationIdService } from '../services/correlation-id.service';

interface ErrorResponseBody {
  code: string;
  message: string;
  details?: unknown;
  correlationId?: string;
}

@Catch()
@Injectable()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly logger: AppLogger,
    private readonly correlationIdService: CorrelationIdService
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<RequestWithUser>();
    const response = ctx.getResponse();

    const correlationId = request.correlationId ?? this.correlationIdService.getId();

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = exception instanceof HttpException ? exception.getResponse() : null;

    const body: ErrorResponseBody = {
      code: exception instanceof HttpException ? exception.name : 'InternalServerError',
      message:
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : typeof exceptionResponse === 'object' && exceptionResponse !== null && 'message' in exceptionResponse
            ? (exceptionResponse as Record<string, unknown>).message?.toString() ?? 'Unexpected error'
            : exception instanceof Error
              ? exception.message
              : 'Unexpected error',
      details:
        typeof exceptionResponse === 'object' && exceptionResponse !== null
          ? (exceptionResponse as Record<string, unknown>).details
          : undefined,
      correlationId
    };

    this.logger.error('HTTP exception captured', exception instanceof Error ? exception : { exception }, {
      status,
      path: request.url,
      method: request.method
    });

    httpAdapter.reply(response, body, status);
  }
}
// CRITIC PASS: Filter non supporta formati custom (es. GraphQL) né mapping codici business dettagliati; TODO integrare mapping errori dominio e localizzazione messaggi.
