import type { PairingCodeResponse } from '@yallego/contracts';

import { authenticatedRequest } from '@/shared/lib/api-client';

export function createPairingCode(accessToken: string): Promise<PairingCodeResponse> {
  return authenticatedRequest<PairingCodeResponse>('/devices/pairing-codes', accessToken, {
    body: JSON.stringify({ label: 'Android de cobros' }),
    method: 'POST',
  });
}
