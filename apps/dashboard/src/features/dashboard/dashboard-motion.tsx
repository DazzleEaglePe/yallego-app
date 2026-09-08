'use client';

import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import type { ReactNode } from 'react';
import { useRef } from 'react';

gsap.registerPlugin(useGSAP);

export function DashboardMotion({
  children,
  routeKey,
}: Readonly<{ children: ReactNode; routeKey: string | null }>) {
  const container = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const media = gsap.matchMedia();

      media.add('(prefers-reduced-motion: no-preference)', () => {
        const timeline = gsap.timeline({ defaults: { ease: 'power2.out' } });
        timeline.fromTo(
          container.current,
          { autoAlpha: 0, y: 8 },
          { autoAlpha: 1, clearProps: 'opacity,visibility,transform', duration: 0.34, y: 0 },
        );

        const items = container.current?.querySelectorAll('[data-animate]');
        if (items?.length) {
          timeline.fromTo(
            items,
            { autoAlpha: 0, y: 10 },
            {
              autoAlpha: 1,
              clearProps: 'opacity,visibility,transform',
              duration: 0.32,
              stagger: 0.045,
              y: 0,
            },
            '-=0.2',
          );
        }
      });

      return () => media.revert();
    },
    { dependencies: [routeKey], revertOnUpdate: true, scope: container },
  );

  return <div ref={container}>{children}</div>;
}
