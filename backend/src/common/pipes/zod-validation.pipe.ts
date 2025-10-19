import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform, Type } from '@nestjs/common';
import { ZodError, ZodType, ZodTypeDef } from 'zod';

import { AppLogger } from '../services/app-logger.service';

type ZodSchemaProvider<T = unknown> = {
  schema: ZodType<T, ZodTypeDef, unknown>;
};

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly logger: AppLogger) {}

  transform<T>(value: T, metadata: ArgumentMetadata): T {
    if (!metadata.metatype) {
      return value;
    }

    const schema = this.extractSchema(metadata.metatype as Type<unknown>);

    if (!schema) {
      return value;
    }

    const parsed = schema.safeParse(value);

    if (!parsed.success) {
      this.logger.warn('Validation failed', {
        issues: parsed.error.issues.map((issue) => ({ path: issue.path, message: issue.message }))
      });

      throw new BadRequestException({
        message: 'Validation error',
        details: this.formatIssues(parsed.error)
      });
    }

    return parsed.data as T;
  }

  private extractSchema(metatype: Type<unknown>): ZodType | undefined {
    const candidate = metatype as unknown as ZodSchemaProvider;
    return candidate?.schema;
  }

  private formatIssues(error: ZodError): Array<{ path: string; message: string }> {
    return error.issues.map((issue) => ({
      path: issue.path.join('.') || 'root',
      message: issue.message
    }));
  }
}
// CRITIC PASS: Pipe richiede schema statico su classe e non supporta validazione contestuale; TODO integrare mapping DTO automatico e localizzazione messaggi.
