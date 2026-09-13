import { readOpenApiDocument } from '@/features/api-docs/api-docs';

export async function GET() {
  const source = await readOpenApiDocument();
  return new Response(source, {
    headers: {
      'Content-Disposition': 'inline; filename="yallego-openapi.yaml"',
      'Content-Type': 'application/yaml; charset=utf-8',
    },
  });
}
