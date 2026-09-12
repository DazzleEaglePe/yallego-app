import type { Metadata } from 'next';

import { LandingPage } from '@/features/marketing/landing-page';

export const metadata: Metadata = {
  title: 'Confirma cada cobro, sin interrumpir tu negocio',
  description:
    'Yallegó conecta el Android de tu negocio con un espacio operativo que detecta y ordena tus cobros de Yape en tiempo real.',
};

export default function HomePage() {
  return <LandingPage />;
}
