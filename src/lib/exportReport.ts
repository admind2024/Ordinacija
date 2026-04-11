import * as XLSX from 'xlsx';

/**
 * Export utilities za izvjestaje — Excel (.xlsx) i print/PDF preko print window-a.
 *
 * Excel: koristi SheetJS da od niza objekata napravi workbook sa vise sheet-ova.
 * PDF: otvori novi prozor sa formatiranim HTML-om i zovi window.print(). Korisnik
 *      u dialogu izabere "Save as PDF" (svaki moderni browser podrzava PDF backend
 *      iz print dialoga).
 */

export interface SheetSpec {
  name: string;          // naziv sheet-a u Excel fajlu (max 31 char)
  columns: { key: string; label: string; format?: 'number' | 'currency' | 'percent' | 'date' }[];
  rows: Record<string, any>[];
}

export interface ReportExport {
  title: string;         // naslov izvjestaja (u PDF-u + kao filename base)
  subtitle?: string;     // podnaslov (periode, filteri)
  sheets: SheetSpec[];   // jedan ili vise sheet-ova
}

// ================================================================
// EXCEL
// ================================================================

export function exportToExcel(report: ReportExport) {
  const wb = XLSX.utils.book_new();

  for (const sheet of report.sheets) {
    // Header row + data rows
    const headers = sheet.columns.map((c) => c.label);
    const dataRows = sheet.rows.map((row) => sheet.columns.map((c) => {
      const val = row[c.key];
      if (val == null) return '';
      if (c.format === 'number' || c.format === 'currency') return Number(val) || 0;
      if (c.format === 'percent') return Number(val) || 0;
      return val;
    }));

    const wsData = [headers, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Kolone sirine — auto na osnovu max duzine headera + sadrzaja
    const colWidths = sheet.columns.map((c, i) => {
      const headerLen = c.label.length;
      const maxDataLen = sheet.rows.reduce((max, row) => {
        const val = String(row[c.key] ?? '');
        return Math.max(max, val.length);
      }, 0);
      return { wch: Math.max(headerLen, maxDataLen, 10) + 2, _colIdx: i };
    });
    ws['!cols'] = colWidths;

    // Sheet name max 31 chars, bez nedozvoljenih karaktera
    const safeName = sheet.name.replace(/[\\/?*[\]:]/g, '_').slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, safeName);
  }

  const safeTitle = report.title.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
  const datePart = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${safeTitle}_${datePart}.xlsx`);
}

// ================================================================
// PDF (print window)
// ================================================================

function escapeHtml(s: any): string {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatCell(value: any, format?: 'number' | 'currency' | 'percent' | 'date'): string {
  if (value == null || value === '') return '—';
  if (format === 'currency') {
    const n = Number(value);
    return isNaN(n) ? escapeHtml(value) : `${n.toFixed(2)} EUR`;
  }
  if (format === 'number') {
    const n = Number(value);
    return isNaN(n) ? escapeHtml(value) : n.toFixed(0);
  }
  if (format === 'percent') {
    const n = Number(value);
    return isNaN(n) ? escapeHtml(value) : `${n.toFixed(1)}%`;
  }
  return escapeHtml(value);
}

export function printToPdf(report: ReportExport) {
  const win = window.open('', '_blank', 'width=1100,height=800');
  if (!win) {
    alert('Ne mogu otvoriti prozor za stampanje. Provjerite popup blocker.');
    return;
  }

  const dateStr = new Date().toLocaleString('sr-Latn-ME');

  const sheetsHtml = report.sheets.map((sheet) => {
    const rowsHtml = sheet.rows.map((row) => {
      const cells = sheet.columns.map((c) => {
        const isNumeric = c.format === 'number' || c.format === 'currency' || c.format === 'percent';
        return `<td class="${isNumeric ? 'num' : ''}">${formatCell(row[c.key], c.format)}</td>`;
      }).join('');
      return `<tr>${cells}</tr>`;
    }).join('');

    const headerCells = sheet.columns.map((c) => {
      const isNumeric = c.format === 'number' || c.format === 'currency' || c.format === 'percent';
      return `<th class="${isNumeric ? 'num' : ''}">${escapeHtml(c.label)}</th>`;
    }).join('');

    return `
      <section class="sheet">
        <h2>${escapeHtml(sheet.name)}</h2>
        <table>
          <thead><tr>${headerCells}</tr></thead>
          <tbody>${rowsHtml || `<tr><td colspan="${sheet.columns.length}" class="empty">Nema podataka</td></tr>`}</tbody>
        </table>
      </section>
    `;
  }).join('');

  win.document.write(`<!doctype html>
<html lang="sr-Latn">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(report.title)}</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #1a1a1a;
    margin: 24px;
    font-size: 11px;
  }
  header {
    border-bottom: 2px solid #1a1a1a;
    padding-bottom: 12px;
    margin-bottom: 20px;
  }
  header h1 {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
  }
  header .subtitle {
    font-size: 11px;
    color: #666;
    margin-top: 4px;
  }
  header .datestamp {
    font-size: 10px;
    color: #999;
    margin-top: 6px;
  }
  .sheet {
    margin-bottom: 28px;
    page-break-inside: auto;
  }
  .sheet h2 {
    font-size: 13px;
    margin: 0 0 8px;
    padding-bottom: 4px;
    border-bottom: 1px solid #ccc;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #555;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10px;
  }
  th {
    background: #f3f3f3;
    padding: 6px 8px;
    text-align: left;
    font-weight: 600;
    border-bottom: 1px solid #bbb;
    text-transform: uppercase;
    font-size: 9px;
    letter-spacing: 0.03em;
    color: #555;
  }
  th.num, td.num { text-align: right; }
  td {
    padding: 5px 8px;
    border-bottom: 0.5px solid #eee;
    color: #333;
  }
  tr:nth-child(even) td { background: #fafafa; }
  td.empty {
    text-align: center;
    color: #aaa;
    font-style: italic;
    padding: 16px;
  }
  footer {
    margin-top: 24px;
    padding-top: 12px;
    border-top: 1px solid #ddd;
    font-size: 9px;
    color: #999;
    text-align: center;
  }
  @media print {
    body { margin: 12mm; }
    header { page-break-after: avoid; }
    .sheet h2 { page-break-after: avoid; }
    tr { page-break-inside: avoid; }
  }
</style>
</head>
<body>
  <header>
    <h1>${escapeHtml(report.title)}</h1>
    ${report.subtitle ? `<div class="subtitle">${escapeHtml(report.subtitle)}</div>` : ''}
    <div class="datestamp">Generisano: ${escapeHtml(dateStr)}</div>
  </header>
  ${sheetsHtml}
  <footer>Ministry of Aesthetics — izvjestaj</footer>
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 200);
    };
  </script>
</body>
</html>`);
  win.document.close();
}
