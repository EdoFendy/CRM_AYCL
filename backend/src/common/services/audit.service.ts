import { Injectable } from '@nestjs/common';

import type { RequestWithUser } from '../interfaces/request-with-user.interface';
import { AppLogger } from './app-logger.service';
import { CorrelationIdService } from './correlation-id.service';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditRecordInput {
  action: string;
  userId: string | null;
  statusCode: number;
  durationMs: number;
  request: RequestWithUser;
  error?: unknown;
}

@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLogger,
    private readonly correlationIdService: CorrelationIdService
  ) {}

  async record(payload: AuditRecordInput): Promise<void> {
    const correlationId = payload.request.correlationId ?? this.correlationIdService.getId();

    this.logger.debug('Audit trail captured', {
      action: payload.action,
      userId: payload.userId,
      statusCode: payload.statusCode,
      durationMs: payload.durationMs,
      correlationId
    });

    // TODO: Persist audit entry via Prisma when repositories saranno disponibili
    void payload;
  }
}
// CRITIC PASS: Servizio audit non salva ancora su database e ignora dettagli richiesta/risposta; TODO implementare persistenza su audit_log e sanitizzazione dati sensibili.
