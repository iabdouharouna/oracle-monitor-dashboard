import {
  DataGrid,
  GridColDef,
  GridRowParams,
  GridRowSelectionModel,
} from '@mui/x-data-grid';
import { Chip } from '@mui/material';

interface DataTableProps<T> {
  rows: T[];
  columns: GridColDef[];
  loading?: boolean;
  error?: Error | null;
  onRowClick?: (row: T) => void;
  pageSize?: number;
  pageSizeOptions?: number[];
  autoHeight?: boolean;
  maxHeight?: number;
  checkboxSelection?: boolean;
  onSelectionChange?: (ids: (string | number)[]) => void;
}

export function DataTable<T extends object>({
  rows,
  columns,
  loading = false,
  error = null,
  onRowClick,
  pageSize = 25,
  pageSizeOptions = [10, 25, 50, 100],
  autoHeight = false,
  maxHeight = 500,
  checkboxSelection = false,
  onSelectionChange,
}: DataTableProps<T>) {
  const handleRowClick = (params: GridRowParams<T>) => {
    if (onRowClick) {
      onRowClick(params.row);
    }
  };

  const handleSelectionChange = (selection: GridRowSelectionModel) => {
    if (onSelectionChange) {
      onSelectionChange(selection as (string | number)[]);
    }
  };

  return (
    <div style={{ height: maxHeight, width: '100%' }}>
      {error && (
        <div style={{ padding: 16, color: '#D13438' }}>
          Error loading data: {error.message}
        </div>
      )}
      <DataGrid<T>
        rows={rows}
        columns={columns}
        loading={loading}
        pageSizeOptions={pageSizeOptions}
        initialState={{
          pagination: { paginationModel: { pageSize } },
        }}
        disableRowSelectionOnClick={!checkboxSelection}
        checkboxSelection={checkboxSelection}
        onRowSelectionModelChange={handleSelectionChange}
        autoHeight={autoHeight}
        onRowClick={handleRowClick}
        getRowId={(row) => String((row as { id?: unknown }).id ?? Math.random())}
        sx={{ border: '1px solid #E1E4E8', borderRadius: 4 }}
        slotProps={{
          baseButton: { sx: { textTransform: 'none' } },
        }}
      />
    </div>
  );
}

export const statusChip = (status: string) => {
  const colors: Record<string, { bg: string; color: string }> = {
    ACTIVE: { bg: '#E8F5E9', color: '#00A651' },
    INACTIVE: { bg: '#F5F5F5', color: '#605E5C' },
    KILLED: { bg: '#FCE4EC', color: '#D13438' },
    EXECUTING: { bg: '#E3F2FD', color: '#0066CC' },
    'DONE (ALL ROWS)': { bg: '#E8F5E9', color: '#00A651' },
    'DONE (ERROR)': { bg: '#FCE4EC', color: '#D13438' },
    'DONE (FIRST N ROWS)': { bg: '#FFF3E0', color: '#FF8C00' },
    WAITING: { bg: '#FFF3E0', color: '#FF8C00' },
    'ON CPU': { bg: '#E3F2FD', color: '#0066CC' },
    ONLINE: { bg: '#E8F5E9', color: '#00A651' },
    OFFLINE: { bg: '#FCE4EC', color: '#D13438' },
    'READ ONLY': { bg: '#FFF3E0', color: '#FF8C00' },
  };
  const style = colors[status] || { bg: '#F5F5F5', color: '#605E5C' };
  return (
    <Chip
      label={status}
      size="small"
      sx={{ backgroundColor: style.bg, color: style.color, fontWeight: 500 }}
    />
  );
};

export const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatDuration = (seconds: number) => {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${(seconds % 60).toFixed(0)}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
};

export const truncateText = (text: string, maxLength: number = 50) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};