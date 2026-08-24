export function exportToCsv<T extends Record<string, unknown>>(
  data: T[],
  columns: { key: string; label: string; render?: (value: unknown, row: T) => string }[],
  filename: string,
) {
  const header = columns.map((c) => `"${c.label.replace(/"/g, '""')}"`).join(',');
  const rows = data.map((row) =>
    columns
      .map((c) => {
        const raw = c.render ? c.render(row[c.key], row) : row[c.key];
        const val = raw == null ? '' : String(raw);
        return `"${val.replace(/"/g, '""')}"`;
      })
      .join(','),
  );
  const csv = [header, ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
