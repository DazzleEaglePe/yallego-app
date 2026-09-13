'use client';

import type { CreateApiKeyInput } from '@yallego/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuthSession } from '@/features/auth/auth-session';

import { createApiKey, fetchApiKeys, revokeApiKey } from '../api/api-keys';

export const apiKeysQueryKey = ['api-keys'] as const;

export function useApiKeys() {
  const { session } = useAuthSession();
  const accessToken = session?.accessToken ?? null;

  return useQuery({
    queryKey: apiKeysQueryKey,
    queryFn: () => fetchApiKeys(accessToken!),
    enabled: Boolean(accessToken),
  });
}

export function useApiKeyActions() {
  const { session } = useAuthSession();
  const accessToken = session?.accessToken ?? '';
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: apiKeysQueryKey });

  const create = useMutation({
    mutationFn: (input: CreateApiKeyInput) => createApiKey(accessToken, input),
    onSuccess: refresh,
  });

  const revoke = useMutation({
    mutationFn: (apiKeyId: string) => revokeApiKey(accessToken, apiKeyId),
    onSuccess: refresh,
  });

  return { create, revoke };
}
