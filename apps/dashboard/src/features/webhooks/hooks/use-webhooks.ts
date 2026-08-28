'use client';

import type { RegisterWebhookInput, UpdateWebhookInput } from '@yallego/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuthSession } from '@/features/auth/auth-session';

import {
  createWebhook,
  deleteWebhook,
  fetchWebhooks,
  rotateWebhookSecret,
  sendWebhookTest,
  updateWebhook,
} from '../api/webhooks';

export const webhooksQueryKey = ['webhooks'] as const;

export function useWebhooks() {
  const { session } = useAuthSession();
  const accessToken = session?.accessToken ?? null;

  return useQuery({
    queryKey: webhooksQueryKey,
    queryFn: () => fetchWebhooks(accessToken!),
    enabled: Boolean(accessToken),
  });
}

export function useWebhookActions() {
  const { session } = useAuthSession();
  const accessToken = session?.accessToken ?? '';
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: webhooksQueryKey });

  const create = useMutation({
    mutationFn: (input: RegisterWebhookInput) => createWebhook(accessToken, input),
    onSuccess: refresh,
  });
  const update = useMutation({
    mutationFn: ({
      input,
      webhookId,
    }: {
      input: UpdateWebhookInput;
      webhookId: string;
    }) => updateWebhook(accessToken, webhookId, input),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (webhookId: string) => deleteWebhook(accessToken, webhookId),
    onSuccess: refresh,
  });
  const test = useMutation({
    mutationFn: (webhookId: string) => sendWebhookTest(accessToken, webhookId),
  });
  const rotateSecret = useMutation({
    mutationFn: (webhookId: string) => rotateWebhookSecret(accessToken, webhookId),
    onSuccess: refresh,
  });

  return { create, remove, rotateSecret, test, update };
}
