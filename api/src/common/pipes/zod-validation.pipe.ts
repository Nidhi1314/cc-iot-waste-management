import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { z } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  // z.ZodType is the correct non-deprecated type in Zod v4 (replaces ZodSchema)
  constructor(private readonly schema: z.ZodType) {}

  transform(value: unknown): unknown {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        // Zod v4: .issues replaces .errors
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    return result.data;
  }
}
