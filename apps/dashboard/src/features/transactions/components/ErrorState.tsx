import { DashboardIcon } from '@/features/dashboard/dashboard-icon';

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

export function ErrorState({ message, onRetry }: Readonly<ErrorStateProps>) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center bg-danger-50 px-6 py-14 text-center">
      <div className="grid h-10 w-10 place-items-center rounded-lg border border-danger-200 bg-white text-danger-500">
        <DashboardIcon className="h-5 w-5" name="alert-circle" />
      </div>
      <p className="mt-4 text-sm font-semibold text-neutral-900">No pudimos cargar tus cobros</p>
      <p className="mt-1 max-w-sm text-sm text-neutral-600">{message}</p>
      <button
        className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800"
        onClick={onRetry}
        type="button"
      >
        <DashboardIcon className="h-4 w-4" name="refresh" />
        Reintentar
      </button>
    </div>
  );
}
