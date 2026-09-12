import type { Metadata } from 'next';

import { ApiDocument } from '@/features/api-docs/ApiDocument';
import { readApiGuide } from '@/features/api-docs/api-docs';

export const metadata: Metadata = {
  title: 'Documentación de API',
  description: 'Guías y referencia para integrar la API pública de Yallegó.',
};

export default async function ApiDocumentationPage() {
  const source = await readApiGuide();
  return <ApiDocument source={source ?? '# Documentación no disponible'} />;
}
