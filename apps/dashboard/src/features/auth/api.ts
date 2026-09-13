export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/v1';

interface ApiErrorPayload {
  error?: {
    code?: string;
    details?: unknown;
    message?: string;
    request_id?: string;
  };
}

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code = 'REQUEST_FAILED',
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      cache: 'no-store',
      credentials: 'include',
      headers,
    });
  } catch {
    throw new ApiRequestError(
      'No pudimos conectar con Yallegó. Revisa tu conexión e inténtalo nuevamente.',
      0,
      'NETWORK_ERROR',
    );
  }

  const payload = await parseResponse(response);
  if (!response.ok) {
    const apiError = (payload as ApiErrorPayload | undefined)?.error;
    throw new ApiRequestError(
      apiError?.message ?? 'La solicitud no pudo procesarse. Inténtalo nuevamente.',
      response.status,
      apiError?.code,
      apiError?.details,
    );
  }

  return payload as T;
}

async function parseResponse(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;

  const contentType = response.headers.get('content-type');
  if (!contentType?.includes('application/json')) return undefined;

  return response.json();
}
