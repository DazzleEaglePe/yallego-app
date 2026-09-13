import { apiRequest, ApiRequestError, API_BASE_URL } from '@/features/auth/api';

/** Igual que `apiRequest`, pero adjunta el token de sesión del panel. */
export function authenticatedRequest<T>(
  path: string,
  accessToken: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('authorization', `Bearer ${accessToken}`);
  return apiRequest<T>(path, { ...init, headers });
}

/** `apiRequest` solo entiende JSON; la exportación CSV necesita el cuerpo como texto. */
export async function authenticatedTextRequest(
  path: string,
  accessToken: string,
  init: RequestInit = {},
): Promise<string> {
  const headers = new Headers(init.headers);
  headers.set('authorization', `Bearer ${accessToken}`);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    cache: 'no-store',
    credentials: 'include',
    headers,
  });

  if (!response.ok) {
    throw new ApiRequestError('No se pudo generar la exportación.', response.status);
  }

  return response.text();
}
