import type { ComponentProps } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { documentationHref } from './api-docs';

export function ApiDocument({ source }: { source: string }) {
  return (
    <article className="api-doc-content">
      <ReactMarkdown
        components={{
          a: ({ href = '', ...props }: ComponentProps<'a'>) => {
            const resolved = documentationHref(href);
            const external = resolved.startsWith('http');
            return (
              <a
                {...props}
                href={resolved}
                rel={external ? 'noreferrer' : undefined}
                target={external ? '_blank' : undefined}
              />
            );
          },
        }}
        remarkPlugins={[remarkGfm]}
      >
        {source}
      </ReactMarkdown>
    </article>
  );
}
