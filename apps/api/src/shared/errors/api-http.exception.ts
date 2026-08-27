import { HttpException } from '@nestjs/common';
import type { ApiErrorCode } from '@yallego/contracts';

export class ApiHttpException extends HttpException {
  constructor(
    status: number,
    public readonly code: ApiErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message, status);
  }
}
