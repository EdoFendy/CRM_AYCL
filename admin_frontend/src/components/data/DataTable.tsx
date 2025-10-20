import { ReactNode } from 'react';

interface Column<T> {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  emptyState: ReactNode;
}

export function DataTable<T>({ data, columns, emptyState }: DataTableProps<T>) {
  if (!data.length) {
    return <div className="rounded-md border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">{emptyState}</div>;
  }

  return (
    <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((column) => (
              <th key={column.id} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {data.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-slate-50">
              {columns.map((column) => (
                <td key={column.id} className="px-4 py-3 text-sm text-slate-700">
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
