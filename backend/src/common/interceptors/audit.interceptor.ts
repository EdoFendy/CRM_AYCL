import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

import type { RequestWithUser } from '../interfaces/request-with-user.interface';
import { AuditService } from '../services/audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<RequestWithUser>();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap(() => {
        void this.auditService.record({
          action: `${request.method} ${request.url}`,
          userId: request.user?.id ?? null,
          statusCode: httpContext.getResponse().statusCode,
          durationMs: Date.now() - startedAt,
          request
        });
      }),
      catchError((error) => {
        void this.auditService.record({
          action: `${request.method} ${request.url}`,
          userId: request.user?.id ?? null,
          statusCode: error?.status ?? error?.statusCode ?? 500,
          durationMs: Date.now() - startedAt,
          request,
          error
        });
        return throwError(() => error);
      })
    );
  }
}
// CRITIC PASS: Audit non distingue tra letture e modifiche né aggiunge diff dei payload; TODO integrare cattura dettagli mutazioni e scrittura su audit_log.
