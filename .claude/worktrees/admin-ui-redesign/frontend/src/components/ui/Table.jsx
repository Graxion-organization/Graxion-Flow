import React from 'react';
import { motion } from 'framer-motion';
import Skeleton from './Skeleton';

const Table = ({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = 'No data available',
  onRowClick,
  pagination = false,
  page = 1,
  pageSize = 10,
  total = 0,
  onPageChange,
  className = '',
  striped = true,
  hoverable = true,
  sortable = false,
  sortColumn,
  sortDirection,
  onSort,
  selectedRows = [],
  onRowSelect,
  selectable = false,
  actions,
  stickyHeader = true
}) => {
  // Generate skeleton rows for loading state
  const skeletonRows = Array.from({ length: 5 }, (_, i) => i);

  return (
    <div className={`overflow-x-auto rounded-xl border border-white/10 bg-white/5 ${className}`}>
      <table className="w-full border-collapse">
        <thead className={stickyHeader ? 'sticky top-0 z-10' : ''}>
          <tr className="border-b border-white/10 bg-white/[0.02]">
            {selectable && (
              <th className="px-4 py-3 text-left w-10">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded bg-white/10 border-white/20 text-brand-500 focus:ring-brand-500/20"
                  onChange={() => onRowSelect?.(data.map(d => d.id))}
                />
              </th>
            )}
            {columns.map((col, index) => (
              <th
                key={col.key || index}
                className={`px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider ${col.className || ''}`}
                style={{ width: col.width }}
                onClick={sortable && col.sortable ? () => onSort?.(col.key) : undefined}
                aria-sort={sortable && col.key === sortColumn ? (sortDirection === 'asc' ? 'ascending' : 'descending') : undefined}
              >
                <div className="flex items-center gap-1.5">
                  {col.label}
                  {sortable && col.sortable && col.key === sortColumn && (
                    <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>
                  )}
                </div>
              </th>
            ))}
            {actions && (
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {loading ? (
            skeletonRows.map((_, i) => (
              <tr key={i}>
                {selectable && <td className="px-4 py-4"><Skeleton variant="circle" size="xs" /></td>}
                {columns.map((col, j) => (
                  <td key={j} className="px-4 py-4">
                    <Skeleton variant="text" width="medium" />
                  </td>
                ))}
                {actions && <td className="px-4 py-4"><Skeleton variant="button" width="xs" /></td>}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)} className="px-4 py-12 text-center">
                <p className="text-gray-500">{emptyMessage}</p>
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <motion.tr
                key={row.id || rowIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: rowIndex * 0.02 }}
                className={`transition-colors ${hoverable ? 'hover:bg-white/[0.02]' : ''} ${onRowClick ? 'cursor-pointer' : ''} ${striped && rowIndex % 2 === 1 ? 'bg-white/[0.02]' : ''} ${selectedRows.includes(row.id) ? 'bg-brand-500/5 border-l-2 border-brand-500' : ''}`}
                onClick={() => onRowClick?.(row)}
                onDoubleClick={() => {}}
              >
                {selectable && (
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded bg-white/10 border-white/20 text-brand-500 focus:ring-brand-500/20"
                      checked={selectedRows.includes(row.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        onRowSelect?.(e.target.checked ? [...selectedRows, row.id] : selectedRows.filter(id => id !== row.id));
                      }}
                    />
                  </td>
                )}
                {columns.map((col, colIndex) => (
                  <td key={colIndex} className={`px-4 py-3 ${col.className || ''}`}>
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
                {actions && (
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {actions.map((action, i) => (
                        <button
                          key={i}
                          onClick={(e) => {
                            e.stopPropagation();
                            action.onClick?.(row);
                          }}
                          className={`p-1.5 rounded-lg transition-colors ${action.variant === 'danger' ? 'text-rose-400 hover:bg-rose-500/10' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                          aria-label={action.label}
                        >
                          {action.icon}
                        </button>
                      ))}
                    </div>
                  </td>
                )}
              </motion.tr>
            ))
          )}
        </tbody>
      </table>

      {pagination && total > pageSize && (
        <div className="px-4 py-3 border-t border-white/10 bg-white/[0.02] flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing <span className="text-white font-medium">{((page - 1) * pageSize) + 1}</span> to{' '}
            <span className="text-white font-medium">{Math.min(page * pageSize, total)}</span> of{' '}
            <span className="text-white font-medium">{total}</span> entries
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange?.(page - 1)}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Previous
            </button>
            <span className="text-sm text-gray-400">
              Page {page} of {Math.ceil(total / pageSize)}
            </span>
            <button
              onClick={() => onPageChange?.(page + 1)}
              disabled={page >= Math.ceil(total / pageSize)}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Table;