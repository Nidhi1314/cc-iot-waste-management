type MessageProps = {
  title: string;
  description?: string;
  theme?: 'admin' | 'driver';
};

export function LoadingState({ title, description }: MessageProps) {
  return (
    <div className="rounded-lg border border-line bg-panel p-4 font-mono text-sm text-muted">
      <span className="text-accent">{'> '}</span>
      <span className="text-main">{title}</span>
      <span className="cursor-blink text-accent">_</span>
      {description ? <p className="mt-1 pl-4 text-xs text-soft">{description}</p> : null}
    </div>
  );
}

export function ErrorState({ title, description }: MessageProps) {
  return (
    <div className="rounded-lg border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
      <p className="font-semibold">{title}</p>
      {description ? <p className="mt-1 text-xs opacity-80">{description}</p> : null}
    </div>
  );
}

export function EmptyState({ title, description }: MessageProps) {
  return (
    <div className="rounded-lg border border-line bg-panel p-4 text-sm">
      <p className="font-semibold text-main">{title}</p>
      {description ? <p className="mt-1 text-soft">{description}</p> : null}
    </div>
  );
}
