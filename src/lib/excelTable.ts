import type { ExcelCell, ExcelTable } from "@/types/prompt-builder";

/**
 * Un poids de police >= 600 (ou la valeur littérale "bold") est considéré
 * comme du gras. Excel exporte aussi parfois le gras via des balises <b>/
 * <strong> plutôt que via `style="font-weight"` : on couvre les deux cas.
 */
function isBoldCell(cell: HTMLTableCellElement): boolean {
  const styleWeight = cell.style.fontWeight;
  if (styleWeight) {
    const numeric = Number(styleWeight);
    if (!Number.isNaN(numeric)) return numeric >= 600;
    if (styleWeight.toLowerCase() === "bold") return true;
  }

  const boldElements = Array.from(cell.querySelectorAll("b, strong"));
  if (boldElements.length === 0) return false;

  const boldText = boldElements.map((el) => el.textContent ?? "").join("");
  const fullText = cell.textContent ?? "";
  // Ignore le gras qui ne couvre qu'un petit fragment du contenu (ex : un
  // exposant), pour ne considérer en gras que les cellules réellement mises
  // en avant dans leur totalité (en-têtes, totaux, etc.).
  return fullText.trim().length > 0 && boldText.trim().length >= fullText.trim().length * 0.6;
}

function getAlign(cell: HTMLTableCellElement): ExcelCell["align"] {
  const styleAlign = cell.style.textAlign?.toLowerCase();
  if (styleAlign === "left" || styleAlign === "center" || styleAlign === "right") {
    return styleAlign;
  }
  const attrAlign = cell.getAttribute("align")?.toLowerCase();
  if (attrAlign === "left" || attrAlign === "center" || attrAlign === "right") {
    return attrAlign;
  }
  return null;
}

/**
 * Extrait la structure d'un tableau Excel/Google Sheets à partir du HTML
 * fourni par le presse-papiers (`text/html`, disponible en plus du
 * `text/plain` lors d'un copier depuis un tableur).
 *
 * Excel/Sheets n'émettent, pour une cellule fusionnée, qu'une seule <td>
 * portant les attributs `colspan`/`rowspan` — les cellules "couvertes" par
 * la fusion n'apparaissent pas du tout dans le HTML des lignes suivantes. Il
 * suffit donc de reproduire fidèlement chaque <tr>/<td> avec ces mêmes
 * attributs pour que le moteur de rendu du navigateur recrée la fusion à
 * l'identique : aucune reconstruction de grille n'est nécessaire ici.
 */
export function parseExcelHtmlTable(html: string): ExcelTable | null {
  if (typeof window === "undefined" || !html || !html.includes("<table")) {
    return null;
  }

  const doc = new DOMParser().parseFromString(html, "text/html");
  const table = doc.querySelector("table");
  if (!table) return null;

  const rows: ExcelCell[][] = [];
  for (const tr of Array.from(table.querySelectorAll("tr"))) {
    const cells = Array.from(tr.querySelectorAll("td, th")) as HTMLTableCellElement[];
    if (cells.length === 0) continue;

    rows.push(
      cells.map((cell) => ({
        text: (cell.textContent ?? "").replace(/\u00a0/g, " ").trim(),
        colSpan: cell.colSpan || 1,
        rowSpan: cell.rowSpan || 1,
        bold: isBoldCell(cell),
        align: getAlign(cell),
      }))
    );
  }

  if (rows.length === 0) return null;
  return { rows };
}

/**
 * Décrit en langage naturel les cellules fusionnées détectées dans le
 * tableau source, afin de rappeler explicitement à l'IA comment les données
 * sont organisées (utile pour éviter une confusion entre une fusion de mise
 * en forme et une donnée manquante ou mal alignée).
 */
export function describeMergedCells(table: ExcelTable | null): string {
  if (!table) return "";

  const lines: string[] = [];
  table.rows.forEach((row, rowIndex) => {
    row.forEach((cell) => {
      if (cell.colSpan <= 1 && cell.rowSpan <= 1) return;

      const label = cell.text ? `"${cell.text}"` : "(cellule vide)";
      const spanParts: string[] = [];
      if (cell.rowSpan > 1) spanParts.push(`${cell.rowSpan} lignes`);
      if (cell.colSpan > 1) spanParts.push(`${cell.colSpan} colonnes`);

      lines.push(
        `- Ligne ${rowIndex + 1} du tableau source : la cellule ${label} fusionne ${spanParts.join(" x ")}.`
      );
    });
  });

  if (lines.length === 0) return "";

  return `Note structurelle (fusions de cellules détectées dans le tableau Excel source, à prendre en compte pour interpréter correctement la disposition des données) :\n${lines.join("\n")}`;
}
