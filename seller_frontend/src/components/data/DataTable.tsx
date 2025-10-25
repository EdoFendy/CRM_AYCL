interface DataTableProps {
  headers: string[];
  rows: (string | number | React.ReactNode)[][];
  loading?: boolean;
  emptyMessage?: string;
}

export function DataTable({ headers, rows, loading = false, emptyMessage = 'Nessun dato disponibile' }: DataTableProps) {
  if (loading) {
    return <p className="py-8 text-center text-slate-500">Caricamento...</p>;
  }

  if (rows.length === 0) {
    return <p className="py-8 text-center text-slate-500">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            {headers.map((header, idx) => (
              <th key={idx} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIdx) => (
            <tr key={rowIdx} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
              {row.map((cell, cellIdx) => (
                <td key={cellIdx} className="px-6 py-4 text-sm text-slate-900">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
