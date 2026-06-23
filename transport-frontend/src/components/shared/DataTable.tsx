// src/components/shared/DataTable.tsx
import React from 'react';
import Table from '@/components/ui/Table';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/shared/EmptyState';
import { Inbox } from 'lucide-react';

const { THead, TBody, Tr, Th, Td } = Table;

interface Column<T> {
  key: string;
  label: string;
  render?: (value: any, row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data?: T[];
  loading?: boolean;
  emptyMessage?: string;
}

export const DataTable = <T extends Record<string, any>>({
  columns,
  data = [],
  loading = false,
  emptyMessage = 'No data available',
}: DataTableProps<T>) => {
  if (loading) {
    return (
      <div className="w-full">
        <Table overflow={true}>
          <THead>
            <Tr>
              {columns.map((col) => (
                <Th key={col.key}>{col.label}</Th>
              ))}
            </Tr>
          </THead>
          <TBody>
            {Array.from({ length: 5 }).map((_, rIdx) => (
              <Tr key={rIdx}>
                {columns.map((col) => (
                  <Td key={col.key}>
                    <Skeleton height={20} className="w-2/3" />
                  </Td>
                ))}
              </Tr>
            ))}
          </TBody>
        </Table>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="my-8">
        <EmptyState
          icon={<Inbox className="w-8 h-8 text-slate-400" />}
          title="No Records Found"
          description={emptyMessage}
        />
      </div>
    );
  }

  return (
    <div className="w-full">
      <Table overflow={true}>
        <THead>
          <Tr>
            {columns.map((col) => (
              <Th key={col.key}>{col.label}</Th>
            ))}
          </Tr>
        </THead>
        <TBody>
          {data.map((row, rIdx) => (
            <Tr key={rIdx}>
              {columns.map((col) => {
                const cellValue = row[col.key];
                return (
                  <Td key={col.key}>
                    {col.render ? col.render(cellValue, row) : cellValue ?? '-'}
                  </Td>
                );
              })}
            </Tr>
          ))}
        </TBody>
      </Table>
    </div>
  );
};

export default DataTable;
