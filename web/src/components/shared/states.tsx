import { Radio, AlertOctagon, Info } from 'lucide-react';

type MessageProps = {
  title: string;
  description?: string;
  theme?: 'admin' | 'driver';
};

export function LoadingState({ title, description }: MessageProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[#E2E8F0] bg-white p-5 shadow-sm">
      <div className="relative flex h-8 w-8 items-center justify-center rounded-md bg-[#F0FDF4] border border-[#DCFCE7] text-[#1B4332]">
        <Radio className="h-4 w-4 animate-pulse text-[#2D6A4F]" />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold tracking-wider text-[#0F172A] uppercase">
            {title.replaceAll('_', ' ')}
          </span>
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[#CBD5E1] border-t-[#2D6A4F]" />
        </div>
        {description && <p className="mt-0.5 text-xs text-[#64748B]">{description}</p>}
      </div>
    </div>
  );
}

export function ErrorState({ title, description }: MessageProps) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-[#FEE2E2] bg-[#FEF2F2] p-5 shadow-sm">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white border border-[#FEE2E2] text-[#DC2626]">
        <AlertOctagon className="h-4 w-4 text-[#DC2626]" />
      </div>
      <div>
        <p className="text-xs font-bold tracking-wider text-[#DC2626] uppercase">
          {title.replaceAll('_', ' ')}
        </p>
        {description && <p className="mt-1 text-xs text-[#DC2626]">{description}</p>}
      </div>
    </div>
  );
}

export function EmptyState({ title, description }: MessageProps) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-[#E2E8F0] bg-white p-5 shadow-sm">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#F8FAFC] border border-[#E2E8F0] text-[#94A3B8]">
        <Info className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs font-bold tracking-wider text-[#0F172A] uppercase">
          {title.replaceAll('_', ' ')}
        </p>
        {description && <p className="mt-1 text-xs text-[#64748B]">{description}</p>}
      </div>
    </div>
  );
}
