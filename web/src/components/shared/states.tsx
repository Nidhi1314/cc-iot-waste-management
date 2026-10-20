type MessageProps = {
  title: string;
  description?: string;
  theme?: 'admin' | 'driver';
};

export function LoadingState({ title, description }: MessageProps) {
  return (
    <div className="rounded-2xl border border-line bg-panel p-4 text-sm text-muted shadow-sm">
      <span className="text-main">{title.replaceAll('_', ' ')}</span>
      <span className="ml-1 inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-100 border-t-blue-600 align-middle" aria-hidden="true" />
      {description ? <p className="mt-1 pl-4 text-xs text-soft">{description}</p> : null}
    </div>
  );
}

export function ErrorState({ title, description }: MessageProps) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <p className="font-semibold">{title.replaceAll('_', ' ')}</p>
      {description ? <p className="mt-1 text-xs opacity-80">{description}</p> : null}
    </div>
  );
}

export function EmptyState({ title, description }: MessageProps) {
  return (
    <div className="rounded-2xl border border-line bg-panel p-4 text-sm shadow-sm">
      <p className="font-semibold text-main">{title.replaceAll('_', ' ')}</p>
      {description ? <p className="mt-1 text-soft">{description}</p> : null}
    </div>
  );
}
