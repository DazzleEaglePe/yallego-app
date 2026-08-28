import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import type { ApiErrorCode, ApiErrorResponse } from '@yallego/contracts';
import type { Response } from 'express';

import { ApiHttpException } from '../errors/api-http.exception';

const statusToCode: Partial<Record<number, ApiErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: 'VALIDATION_ERROR',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHENTICATED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.TOO_MANY_REQUESTS]: 'RATE_LIMIT_EXCEEDED',
  [HttpStatus.SERVICE_UNAVAILABLE]: 'SERVICE_UNAVAILABLE',
};

const statusToMessage: Partial<Record<number, string>> = {
  [HttpStatus.BAD_REQUEST]: 'La solicitud contiene datos inválidos.',
  [HttpStatus.UNAUTHORIZED]: 'Debes iniciar sesión para continuar.',
  [HttpStatus.FORBIDDEN]: 'No tienes permiso para realizar esta acción.',
  [HttpStatus.NOT_FOUND]: 'El recurso solicitado no existe.',
  [HttpStatus.TOO_MANY_REQUESTS]: 'Se alcanzó el límite de solicitudes. Inténtalo más tarde.',
  [HttpStatus.SERVICE_UNAVAILABLE]: 'El servicio no está disponible temporalmente.',
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const isHttpException = exception instanceof HttpException;
    const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const requestId = String(response.locals.requestId ?? 'unknown');

    // El cliente recibe un mensaje genérico para 5xx; el detalle real solo
    // queda en el registro del servidor (nunca se expone en la respuesta).
    if (status >= 500) {
      const detail = exception instanceof Error ? exception.stack : String(exception);
      this.logger.error(`[${requestId}] Unhandled exception: ${detail}`);
      Sentry.captureException(exception, { extra: { requestId } });
    }
    const code =
      exception instanceof ApiHttpException
        ? exception.code
        : (statusToCode[status] ?? 'INTERNAL_ERROR');
    const message = this.resolveMessage(exception, status);
    const body: ApiErrorResponse = {
      error: {
        code,
        message,
        ...(exception instanceof ApiHttpException && exception.details
          ? { details: exception.details }
          : {}),
        request_id: requestId,
      },
    };

    response.status(status).json(body);
  }

  private resolveMessage(exception: unknown, status: number): string {
    if (status >= 500) return 'Ocurrió un error interno. Inténtalo nuevamente.';
    if (exception instanceof ApiHttpException) return exception.message;
    if (statusToMessage[status]) return statusToMessage[status];
    if (!(exception instanceof HttpException)) return 'La solicitud no pudo procesarse.';

    const exceptionResponse = exception.getResponse();
    if (typeof exceptionResponse === 'string') return exceptionResponse;

    if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      'message' in exceptionResponse
    ) {
      const { message } = exceptionResponse as { message: string | string[] };
      return Array.isArray(message) ? message.join(' ') : message;
    }

    return exception.message;
  }
}
