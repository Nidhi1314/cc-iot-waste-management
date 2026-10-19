import type { SmartBin } from '../../../types/api';
import { formatDateTime } from '../../../lib/utils';

type Props = {
  bins: SmartBin[];
  selectedBinId: string | null;
  onSelectBin: (binId: string) => void;
};

export function BinsTable({ bins, selectedBinId, onSelectBin }: Props) {
  return (
    <div className="overflow-auto rounded-lg border border-line bg-panel">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-panel2 text-xs uppercase text-soft">
          <tr>
            <th className="px-3 py-2">Address</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Fill %</th>
            <th className="px-3 py-2">Needs Collection</th>
            <th className="px-3 py-2">Last Updated</th>
          </tr>
        </thead>
        <tbody>
          {bins.map((bin) => (
            <tr
              className="cursor-pointer border-t border-line hover:bg-panel2"
              key={bin.id}
              onClick={() => onSelectBin(bin.id)}
            >
              <td className="px-3 py-2">
                <span
                  className={
                    selectedBinId === bin.id
                      ? 'font-semibold text-main'
                      : 'text-muted'
                  }
                >
                  {bin.address}
                </span>
              </td>
              <td className="px-3 py-2">{bin.status}</td>
              <td className="px-3 py-2">{bin.currentFillLevel}</td>
              <td className="px-3 py-2">{bin.needsCollection ? 'Yes' : 'No'}</td>
              <td className="px-3 py-2 text-xs text-soft">
                {formatDateTime(bin.lastUpdated)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
