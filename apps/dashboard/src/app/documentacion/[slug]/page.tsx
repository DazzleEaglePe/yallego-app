import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ApiDocument } from '@/features/api-docs/ApiDocument';
import { API_GUIDES, readApiGuide } from '@/features/api-docs/api-docs';

type GuidePageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return API_GUIDES.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: GuidePageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = API_GUIDES.find((candidate) => candidate.slug === slug);
  return { title: guide ? `${guide.label} · API` : 'Documentación de API' };
}

export default async function ApiGuidePage({ params }: GuidePageProps) {
  const { slug } = await params;
  const source = await readApiGuide(slug);
  if (!source) notFound();
  return <ApiDocument source={source} />;
}
