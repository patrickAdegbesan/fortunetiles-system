import React, { useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';

/**
 * High-performance virtualized table component for large datasets
 * Uses react-window for efficient rendering of thousands of rows
 */
const VirtualizedTable = ({ 
  data = [], 
  columns = [], 
  height = 400, 
  itemHeight = 50,
  onRowClick,
  loading = false,
  className = ''
}) => {
  // Memoize row renderer for performance
  const Row = useCallback(({ index, style }) => {
    if (loading && index >= data.length) {
      return (
        <div style={style} className="flex items-center justify-center p-4">
          <div className="animate-pulse text-gray-500">Loading...</div>
        </div>
      );
    }

    const item = data[index];
    if (!item) return <div style={style} />;

    return (
      <div 
        style={style} 
        className={`flex items-center border-b border-gray-200 hover:bg-gray-50 cursor-pointer ${className}`}
        onClick={() => onRowClick && onRowClick(item, index)}
      >
        {columns.map((column, colIndex) => (
          <div 
            key={colIndex} 
            className={`px-4 py-2 ${column.className || ''}`}
            style={{ width: column.width || `${100/columns.length}%` }}
          >
            {typeof column.render === 'function' 
              ? column.render(item[column.key], item, index)
              : item[column.key] || '-'
            }
          </div>
        ))}
      </div>
    );
  }, [data, columns, onRowClick, loading, className]);

  // Memoize header renderer
  const Header = useMemo(() => (
    <div className="flex items-center bg-gray-100 border-b-2 border-gray-300 font-semibold">
      {columns.map((column, index) => (
        <div 
          key={index}
          className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${column.headerClassName || ''}`}
          style={{ width: column.width || `${100/columns.length}%` }}
        >
          {column.title || column.key}
        </div>
      ))}
    </div>
  ), [columns]);

  // Calculate total items (including loading placeholders)
  const itemCount = loading ? data.length + 3 : data.length;

  if (!data.length && !loading) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 mb-2">No data available</div>
        <div className="text-sm text-gray-400">Add some items to see them here</div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {Header}
      <List
        height={height}
        itemCount={itemCount}
        itemSize={itemHeight}
        className="border border-gray-200 rounded-b-lg"
      >
        {Row}
      </List>
    </div>
  );
};

export default VirtualizedTable;