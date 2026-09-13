export function TransactionSkeleton() {
  return (
    <div className="divide-y divide-neutral-100" role="status" aria-label="Cargando transacciones">
      {Array.from({ length: 5 }).map((_, index) => (
        <div className="grid animate-pulse gap-4 px-5 py-5 xl:grid-cols-6" key={index}>
          <div className="xl:col-span-2">
            <div className="h-3 w-36 rounded bg-neutral-200" />
            <div className="mt-2 h-3 w-48 max-w-full rounded bg-neutral-200" />
          </div>
          <div className="h-4 w-20 rounded bg-neutral-200" />
          <div className="h-4 w-24 rounded bg-neutral-200" />
          <div className="h-6 w-20 rounded bg-neutral-200" />
          <div className="h-6 w-24 rounded bg-neutral-200" />
        </div>
      ))}
    </div>
  );
}
