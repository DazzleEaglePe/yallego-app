export function TransactionSkeleton() {
  return (
    <div className="space-y-3" role="status" aria-label="Cargando transacciones">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          className="animate-pulse rounded-2xl border border-neutral-200 bg-white p-5"
          key={index}
        >
          <div className="h-7 w-32 rounded bg-neutral-200" />
          <div className="mt-2 h-4 w-40 rounded bg-neutral-100" />
          <div className="mt-3 h-3 w-56 rounded bg-neutral-100" />
        </div>
      ))}
    </div>
  );
}
