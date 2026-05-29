/**
 * 导出数据为 CSV 文件。
 * 添加 BOM 头以确保 Excel 正确识别 UTF-8 编码。
 *
 * @param filename - 下载的文件名（不含扩展名）
 * @param headers - 列标题数组
 * @param rows - 数据行数组，每行为字符串数组
 */
export function exportToCsv(
  filename: string,
  headers: string[],
  rows: string[][],
): void {
  // 处理单元格内容：如果包含逗号、引号或换行符，需要用引号包裹
  const escapeCsvCell = (cell: string): string => {
    if (cell.includes(',') || cell.includes('"') || cell.includes('\n') || cell.includes('\r')) {
      return `"${cell.replace(/"/g, '""')}"`;
    }
    return cell;
  };

  const csvContent = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row) => row.map(escapeCsvCell).join(',')),
  ].join('\r\n');

  // 添加 BOM 头以支持 Excel 正确显示中文
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

  // 触发下载
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
