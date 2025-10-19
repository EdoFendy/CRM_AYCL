import { Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import pino, { Logger as PinoLogger, LoggerOptions } from 'pino';

import type { AppConfiguration } from '../../config/configuration';
import { CorrelationIdService } from './correlation-id.service';

@Injectable()
export class AppLogger implements LoggerService {
  private readonly logger: PinoLogger;

  constructor(private readonly configService: ConfigService<AppConfiguration>, private readonly correlationIdService: CorrelationIdService) {
    const level = this.configService.get<string>('app.logLevel') ?? 'info';
    const options: LoggerOptions = {
      level,
      formatters: {
        level(label) {
          return { level: label };
        }
      }
    };

    this.logger = pino(options);
  }

  private bind(meta: Record<string, unknown> = {}): Record<string, unknown> {
    const correlationId = this.correlationIdService.getId();
    return correlationId ? { ...meta, correlationId } : meta;
  }

  private toMeta(optionalParams: unknown[]): Record<string, unknown> | undefined {
    if (optionalParams.length === 0) {
      return undefined;
    }

    if (optionalParams.length === 1 && typeof optionalParams[0] === 'object') {
      return optionalParams[0] as Record<string, unknown>;
    }

    if (optionalParams.length >= 2) {
      const [first, second, ...rest] = optionalParams;
      const base: Record<string, unknown> = {};
      if (first) {
        base.error = first;
      }
      if (second && typeof second === 'object') {
        Object.assign(base, second as Record<string, unknown>);
      } else if (second !== undefined) {
        base.second = second;
      }
      if (rest.length > 0) {
        base.rest = rest;
      }
      return base;
    }

    return { params: optionalParams };
  }

  log(message: string, ...optionalParams: unknown[]): void {
    const meta = this.toMeta(optionalParams);
    this.logger.info(this.bind(meta ?? {}), message);
  }

  error(message: string, ...optionalParams: unknown[]): void {
    const meta = this.toMeta(optionalParams);
    this.logger.error(this.bind(meta ?? {}), message);
  }

  warn(message: string, ...optionalParams: unknown[]): void {
    const meta = this.toMeta(optionalParams);
    this.logger.warn(this.bind(meta ?? {}), message);
  }

  debug(message: string, ...optionalParams: unknown[]): void {
    const meta = this.toMeta(optionalParams);
    this.logger.debug(this.bind(meta ?? {}), message);
  }

  verbose(message: string, ...optionalParams: unknown[]): void {
    const meta = this.toMeta(optionalParams);
    this.logger.trace(this.bind(meta ?? {}), message);
  }
}
// CRITIC PASS: Logger non integra appenders esterni (es. APM) né mask PII automaticamente; TODO aggiungere redazione campi sensibili e stream verso sistemi di osservabilità.
