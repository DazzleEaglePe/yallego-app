import type { ChangePasswordInput, UpdateProfileInput } from '@yallego/contracts';

import { authenticatedRequest } from '@/shared/lib/api-client';

interface ProfileResponse {
  user: { email: string; full_name: string; id: string };
}

export function updateProfile(accessToken: string, input: UpdateProfileInput) {
  return authenticatedRequest<ProfileResponse>('/auth/me', accessToken, {
    body: JSON.stringify(input),
    method: 'PATCH',
  });
}

export function changePassword(accessToken: string, input: ChangePasswordInput) {
  return authenticatedRequest<{ message: string }>('/auth/change-password', accessToken, {
    body: JSON.stringify(input),
    method: 'POST',
  });
}
