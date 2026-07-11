/**
 * Nettoie et aligne des données collées depuis Excel/Google Sheets (format TSV,
 * cellules séparées par des tabulations) afin qu'elles restent lisibles en
 * colonnes une fois collées dans un <textarea> en police monospace.
 */
export function formatTsvForTextarea(raw: string): string {
  const normalized = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  if (!normalized.includes("\t")) {
    return normalized;
  }

  const rows = normalized.split("\n").map((row) => row.split("\t"));
  const columnCount = Math.max(...rows.map((row) => row.length));
  const columnWidths = new Array(columnCount).fill(0);

  rows.forEach((row) => {
    row.forEach((cell, index) => {
      columnWidths[index] = Math.max(columnWidths[index], cell.trim().length);
    });
  });

  return rows
    .map((row) =>
      row
        .map((cell, index) => {
          const isLastFilledCell = index === row.length - 1;
          const trimmed = cell.trim();
          return isLastFilledCell
            ? trimmed
            : trimmed.padEnd(columnWidths[index] + 3, " ");
        })
        .join("")
        .trimEnd()
    )
    .join("\n");
}
