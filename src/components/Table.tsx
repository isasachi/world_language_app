import { ColumnDef, useReactTable, getCoreRowModel, flexRender } from "@tanstack/react-table";

type TableProps<T> = {
  data: T[];
  columns: ColumnDef<T>[];
  loading: boolean;
  enableHorizontalScroll?: boolean;
};

export default function Table<T>({ data, columns, loading, enableHorizontalScroll }: TableProps<T>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const LoadingSpinner = () => (
    <div className="flex justify-center items-center py-8">
      <div className="w-8 h-8 border-b-2 border-violet-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="w-full bg-white rounded-lg border border-gray-200">
      {/* Desktop Table View */}
      <div className="hidden md:block">
        {loading ? (
          <LoadingSpinner />
        ) : (
          <div className="relative overflow-x-auto">
            <table className={enableHorizontalScroll ? "w-full" : "w-full table-fixed"}>
              <thead className="bg-gray-50">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="border-b border-gray-200">
                    {headerGroup.headers.map((header) => (
                      <th 
                        key={header.id} 
                        className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${enableHorizontalScroll ? "" : "truncate"}`}
                        style={enableHorizontalScroll ? {} : { width: `${100 / columns.length}%` }}
                      >
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map((row) => (
                    <tr 
                      key={row.id} 
                      className="hover:bg-gray-50 transition-colors duration-200"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td 
                          key={cell.id} 
                          className={`px-4 py-4 text-sm text-gray-600 text-wrap ${enableHorizontalScroll ? "" : "truncate"}`}
                          style={enableHorizontalScroll ? {} : { width: `${100 / columns.length}%` }}
                        >
                          <div className={enableHorizontalScroll ? "" : "overflow-hidden text-ellipsis"}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td 
                      colSpan={columns.length} 
                      className="text-center text-gray-500 py-8"
                    >
                      No data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mobile Card View - Unchanged */}
      <div className="block md:hidden">
        {loading ? (
          <LoadingSpinner />
        ) : (
          <div className="space-y-3 p-4">
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <div 
                  key={row.id} 
                  className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm"
                >
                  {row.getVisibleCells().map((cell) => (
                    <div 
                      key={cell.id} 
                      className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-gray-100 last:border-0"
                    >
                      <span className="text-sm font-medium text-gray-500">
                        {typeof cell.column.columnDef.header === "string"
                          ? cell.column.columnDef.header
                          : ""}
                      </span>
                      <span className="text-sm text-gray-600 mt-1 sm:mt-0">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </span>
                    </div>
                  ))}
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-8">No data available</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
