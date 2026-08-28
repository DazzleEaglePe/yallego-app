import type { SubscriptionSummary } from '@yallego/contracts';

import { authenticatedRequest } from '@/shared/lib/api-client';

export function fetchSubscription(accessToken: string): Promise<SubscriptionSummary> {
  return authenticatedRequest('/subscription', accessToken);
}
