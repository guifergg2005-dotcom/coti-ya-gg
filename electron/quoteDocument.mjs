import { calculateQuoteTotals, formatCurrency } from '../shared/quoteMath.mjs';

export const PAPER_SIZES = {
  A4: { css: '210mm 297mm', width: 210, height: 297, native: 'A4' },
  Carta: { css: '215.9mm 279.4mm', width: 215.9, height: 279.4, native: 'Letter' },
  Oficio: { css: '215.9mm 355.6mm', width: 215.9, height: 355.6, native: 'Legal' }
};

export const escapeHtml = value =>
  String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const image = value =>
  typeof value === 'string' && /^data:image\/(png|jpeg|jpg|webp|gif);base64,[a-z0-9+/=\s]+$/i.test(value) ? value : '';

const formatDisplayDate = raw => {
  const s = String(raw || '').trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
};

const formatDescriptionHtml = (desc, e) => {
  if (!desc) return '';
  const lines = String(desc).split(/\r?\n/);
  return '<div class="description">' + lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return '<div class="desc-spacer"></div>';
    const bulletMatch = /^(?:[✓✔•*-])\s*(.+)$/.exec(trimmed);
    if (bulletMatch) {
      return '<div class="desc-bullet"><span class="check">✓</span><span>' + e(bulletMatch[1]) + '</span></div>';
    }
    return '<div class="desc-line">' + e(trimmed) + '</div>';
  }).join('') + '</div>';
};

const LEFT_BRAND_SVG = `<svg class="brand-left-svg" viewBox="0 0 280 78" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M8 34 L38 8 L68 34 L68 72 L58 72 L58 37 L38 20 L18 37 L18 72 L8 72 Z" fill="#d99b26"/>
  <rect x="22" y="38" width="32" height="34" rx="2" fill="#4b4b4d"/>
  <rect x="36" y="49" width="4" height="10" rx="1" fill="#ffffff"/>
  <text x="78" y="27" font-family="Arial, Helvetica, sans-serif" font-size="9.5" font-weight="800" fill="#374151" letter-spacing="0.8">PUERTAS AUTOMÁTICAS</text>
  <line x1="78" y1="32" x2="78" y2="64" stroke="#9ca3af" stroke-width="1.5"/>
  <text x="86" y="51" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="900" fill="#4b5563" letter-spacing="2.5">SERYVER</text>
  <text x="86" y="63" font-family="Arial, Helvetica, sans-serif" font-size="6.7" font-weight="700" fill="#6b7280" letter-spacing="0.7">SEGURIDAD - MODERNIDAD - CONFORT</text>
</svg>`;

const RIGHT_BRAND_SVG = `<svg class="brand-right-svg" viewBox="0 0 220 76" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <g transform="translate(72, 2)">
    <path d="M8 8 H46 L58 18 H8 Z" fill="#e07a1b"/>
    <path d="M8 21 H42 L54 31 H20 L8 21 Z" fill="#e07a1b"/>
    <path d="M8 24 L20 33 V42 H8 Z" fill="#e07a1b"/>
  </g>
  <text x="110" y="57" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="21" font-weight="900" fill="#2f3e4e" letter-spacing="3">SERYVER</text>
  <text x="110" y="70" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="9.5" font-weight="700" fill="#4b5563" letter-spacing="2.5">G &amp; G  S.A.C</text>
</svg>`;

const DEFAULT_WATERMARK_SVG = `<svg class="watermark-svg" viewBox="0 0 500 320" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <g opacity="0.13">
    <path d="M170 20 H305 L345 55 H170 Z" fill="#d97706"/>
    <path d="M170 68 H290 L335 105 H215 L170 68 Z" fill="#d97706"/>
    <path d="M170 78 L215 112 V145 H170 Z" fill="#d97706"/>
    <text x="250" y="220" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="64" font-weight="900" fill="#64748b" letter-spacing="6">SERYVER</text>
    <text x="250" y="268" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700" fill="#94a3b8" letter-spacing="5">G &amp; G  S.A.C</text>
  </g>
</svg>`;

export function renderQuoteDocument({ quote, pdfConfig = {} }) {
  if (!quote || !Array.isArray(quote.sections) || !quote.cliente || quote.sections.some(s => !Array.isArray(s.items))) {
    throw new Error('La cotización no tiene un formato válido.');
  }
  if (JSON.stringify({ quote, pdfConfig }).length > 8_000_000 || quote.sections.reduce((n, s) => n + s.items.length, 0) > 3000) {
    throw new Error('La cotización supera el tamaño admitido. Reduce las imágenes o la cantidad de productos.');
  }
  const e = escapeHtml;
  const paper = PAPER_SIZES[pdfConfig.pageSize] || PAPER_SIZES.A4;
  const rawColor = /^#[0-9a-f]{6}$/i.test(pdfConfig.color || '') ? pdfConfig.color : '#d99b26';
  const headerBg = rawColor.toLowerCase() === '#1e3a8a' ? '#e5bd68' : rawColor;
  const sections = quote.sections.filter(s => s.visible);
  const totals = calculateQuoteTotals(quote);
  const taxLabel = Math.abs(totals.igv - Math.round(totals.baseImponible * 18) / 100) <= 0.011 ? 'IGV (18%)' : 'IGV registrado';
  const currency = quote.moneda || 'S/';
  const money = v => e(currency) + ' ' + e(formatCurrency(v));
  const company = pdfConfig.companyName || 'SERYVER G&G S.A.C.';
  const ruc = pdfConfig.companyRuc || '20614510421';
  // eslint-disable-next-line no-control-regex
  const title = ('Cotizacion_' + (quote.numero || 'S-N') + '_' + (quote.cliente.nombre || 'Cliente')).replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').slice(0, 150);
  const logo = image(pdfConfig.logo), signature = image(pdfConfig.signature), watermark = image(pdfConfig.watermark);
  const markSize = Math.min(100, Math.max(10, Number(pdfConfig.watermarkSize) || 55));
  const markOpacity = Math.min(1, Math.max(0, Number(pdfConfig.watermarkOpacity ?? 0.12)));

  let globalIndex = 0;
  const rows = sections.map((section) => {
    const showSectionHeader = sections.length > 1 || (section.name && section.name !== 'Propuesta Principal');
    const sectionItems = section.items.map((item) => {
      globalIndex += 1;
      const qty = Number(item.cantidad ?? 1);
      const itemTotal = Number(item.total ?? (qty * Number(item.precio || 0)));
      const unitPrice = qty > 0 ? itemTotal / qty : Number(item.precio || 0);
      return '<tr>' +
        '<td class="item">' + globalIndex + '</td>' +
        '<td class="desc-cell"><strong>' + e(item.nombre || 'Ítem sin nombre') + '</strong>' + formatDescriptionHtml(item.descripcion, e) + '</td>' +
        '<td class="quantity">' + e(item.cantidad ?? 1) + '</td>' +
        '<td class="unit">' + e(item.unidad || 'UND') + '</td>' +
        '<td class="price">' + (unitPrice > 0 ? e(formatCurrency(unitPrice)) : '') + '</td>' +
        '<td class="subtotal">' + e(formatCurrency(itemTotal)) + '</td>' +
      '</tr>';
    }).join('');
    return (showSectionHeader ? '<tr class="section-row"><td colspan="6" class="section-title">' + e(section.name || section.nombre || 'Propuesta') + '</td></tr>' : '') + sectionItems;
  }).join('');

  const rawAccounts = Array.isArray(pdfConfig.accounts) ? pdfConfig.accounts : [];
  const isDemoAccounts = rawAccounts.length > 0 && rawAccounts.every(a => ['123-456789-00', '987-654321-00'].includes(String(a.numero || '').trim()));
  const accounts = isDemoAccounts ? [
    { banco: 'BCP SOLES GUIDO G.', moneda: 'Soles', numero: '535-01912154-0-87', cci: '002-535-101912154087-35' },
    { banco: 'BCP SOLES SERYVER', moneda: 'Soles', numero: '535-09572834-0-48', cci: '002-535-109572834048-39' }
  ] : rawAccounts;
  const rawObs = String(quote.observaciones || '').trim();
  const currencyWord = currency === 'USD' || currency === '$' ? 'DÓLARES AMERICANOS' : 'SOLES';

  const css = `
@page {
  size: ${paper.css};
  margin: 12mm 14mm 15mm;
  @bottom-left { content: "SERYVER G&G S.A.C · ${String(quote.numero || '').replace(/[^a-zA-Z0-9 -]/g, '').slice(0, 50)}"; font: 7.5pt Arial; color: #64748b; }
  @bottom-right { content: "Página " counter(page) " de " counter(pages); font: 7.5pt Arial; color: #64748b; }
}
* { box-sizing: border-box; }
html { background: #cbd5e1; }
body {
  margin: 0 auto;
  padding: 12mm 14mm;
  width: ${paper.width}mm;
  min-height: ${paper.height}mm;
  background: white;
  color: #111827;
  font: 9.5pt/1.38 Calibri, Arial, Helvetica, sans-serif;
  position: relative;
}
header.doc-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8mm;
  margin-bottom: 2mm;
  break-inside: avoid;
}
.header-left { flex: 1; min-width: 0; }
.logo { max-width: 68mm; max-height: 22mm; object-fit: contain; display: block; }
.brand-left-svg { width: 68mm; height: 19mm; display: block; }
.company-fallback { font-size: 13pt; font-weight: 800; color: #1f2937; margin: 1mm 0 0; }
.subtitle-fallback { font-size: 7.5pt; color: #64748b; margin: 0; }
.header-right { text-align: right; min-width: 55mm; }
.brand-right-svg { width: 52mm; height: 18mm; display: inline-block; }
.ruc-line { font-size: 10.5pt; font-weight: 700; color: #111827; margin-top: 1mm; text-align: right; }
.quote-Banner { text-align: center; margin: 1mm 0 1mm; }
.quote-Banner h1 { font-size: 13pt; font-weight: 700; letter-spacing: 0.4pt; margin: 0; color: #111827; text-transform: uppercase; }
.date-row { text-align: right; font-size: 10pt; font-weight: 600; margin: 0 0 2.5mm; color: #111827; }
.client-block { margin-bottom: 3mm; break-inside: avoid; }
.client-row { display: grid; grid-template-columns: 32mm 1fr; padding: 0.4mm 0; font-size: 9.5pt; }
.client-label { font-weight: 700; color: #111827; text-transform: uppercase; }
.client-val { font-weight: 600; color: #111827; text-transform: uppercase; overflow-wrap: anywhere; }
.greeting { margin: 2.5mm 0 3mm; font-size: 9.5pt; color: #111827; line-height: 1.4; }
.items-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  border: 1pt solid #000000;
  margin-bottom: 2.5mm;
  position: relative;
  z-index: 1;
}
.items-table thead { display: table-header-group; }
.items-table tr { break-inside: avoid; }
.items-table th {
  background: ${headerBg};
  color: #000000;
  border: 1pt solid #000000;
  padding: 1.6mm 1.5mm;
  font-size: 8.8pt;
  font-weight: 700;
  text-align: center;
  vertical-align: middle;
}
.items-table td {
  border-left: 1pt solid #000000;
  border-right: 1pt solid #000000;
  border-bottom: ${pdfConfig.tableStyle === 'bordered' ? '0.6pt solid #94a3b8' : '0'};
  padding: 2mm 2.2mm;
  vertical-align: top;
  overflow-wrap: anywhere;
  font-size: 9pt;
}
.items-table tbody tr:last-child td { border-bottom: 1pt solid #000000; }
${pdfConfig.tableStyle === 'zebra' ? '.items-table tbody tr:nth-child(even) { background: rgba(241, 245, 249, 0.65); }' : ''}
.section-row td.section-title {
  background: #f8fafc;
  border-top: 1pt solid #000000;
  border-bottom: 1pt solid #000000;
  font-weight: 800;
  font-size: 9.2pt;
  color: #111827;
  text-transform: uppercase;
  padding: 1.4mm 2.2mm;
}
.item { width: 13mm; text-align: center; font-weight: 600; }
.desc-cell strong { display: block; font-size: 9.2pt; font-weight: 800; text-transform: uppercase; margin-bottom: 1mm; color: #000000; }
.description { margin-top: 0.8mm; color: #111827; font-size: 8.6pt; line-height: 1.38; }
.desc-line { margin: 0.4mm 0; font-weight: 600; }
.desc-spacer { height: 1.5mm; }
.desc-bullet { display: flex; gap: 2.2mm; padding-left: 3.5mm; margin: 0.4mm 0; }
.desc-bullet .check { font-weight: 700; flex-shrink: 0; }
.quantity { width: 14mm; text-align: center; font-weight: 600; }
.unit { width: 14mm; text-align: center; font-weight: 600; }
.price { width: 23mm; text-align: right; font-weight: 600; }
.subtotal { width: 25mm; text-align: right; font-weight: 800; }
.closing-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 6mm;
  margin: 0 0 5mm;
  break-inside: avoid;
}
.signature-box { min-width: 50mm; text-align: center; }
.signature-box img { max-width: 52mm; max-height: 20mm; object-fit: contain; display: block; margin: 0 auto 1mm; }
.signature-line { border-top: 1pt solid #000000; padding-top: 1mm; font-size: 8.5pt; font-weight: 700; }
.totals-table {
  width: 66mm;
  border-collapse: collapse;
  border: 1pt solid #000000;
  margin-left: auto;
}
.totals-table td {
  border: 1pt solid #000000;
  padding: 1.4mm 2.5mm;
  font-size: 9.5pt;
  font-weight: 800;
}
.totals-table td.label-cell {
  background: ${headerBg};
  text-align: center;
  width: 55%;
  text-transform: uppercase;
}
.totals-table td.amount-cell {
  background: #ffffff;
  text-align: right;
  width: 45%;
  white-space: nowrap;
}
.cond-table, .banks-table {
  width: 100%;
  border-collapse: collapse;
  border: 1pt solid #000000;
  margin-bottom: 4mm;
  break-inside: avoid;
}
.cond-table th, .banks-table th {
  background: ${headerBg};
  color: #000000;
  border: 1pt solid #000000;
  padding: 1.4mm 2.5mm;
  font-size: 9.2pt;
  font-weight: 800;
  text-transform: uppercase;
}
.cond-table th { text-align: left; }
.banks-table th { text-align: center; }
.cond-table td, .banks-table td {
  border: 1pt solid #000000;
  padding: 1.6mm 2.5mm;
  font-size: 9pt;
  vertical-align: top;
}
.cond-labels { width: 34%; font-weight: 600; line-height: 1.55; }
.cond-values { width: 66%; line-height: 1.55; white-space: pre-wrap; overflow-wrap: anywhere; }
.bank-left { width: 30%; font-weight: 800; text-transform: uppercase; }
.bank-left .cci-lbl { font-weight: 500; margin-top: 0.6mm; }
.bank-right { width: 70%; font-family: Calibri, Arial, sans-serif; }
.bank-right .cci-val { margin-top: 0.6mm; }
.watermark {
  position: fixed;
  top: 26%;
  left: ${(100 - markSize) / 2}%;
  width: ${markSize}%;
  max-height: 55%;
  object-fit: contain;
  opacity: ${markOpacity};
  z-index: 0;
  pointer-events: none;
}
.watermark-svg {
  position: fixed;
  top: 25%;
  left: 15%;
  width: 70%;
  height: auto;
  z-index: 0;
  pointer-events: none;
}
main { position: relative; z-index: 1; }
@media print {
  html, body { width: auto; min-height: 0; background: white; margin: 0; padding: 0; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
`;

  const condBodyHtml = rawObs
    ? '<div class="cond-values">' + e(rawObs) + '</div>'
    : `<div class="cond-values"><div>${e(currencyWord)}</div><div>50% al inicio del contrato y el 50% al finalizar el proyecto</div><div>2 días</div><div>30 días calendario · Instalaciones del cliente</div><div>12 meses</div></div>`;

  const html =
    '<!doctype html><html lang="es"><head><meta charset="utf-8">' +
    '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src data:; object-src \'none\'; base-uri \'none\'; form-action \'none\'">' +
    '<title>' + e(title) + '</title><style>' + css + '</style></head><body>' +
    (watermark ? '<img class="watermark" alt="" src="' + watermark + '">' : DEFAULT_WATERMARK_SVG) +
    '<main>' +
      '<header class="doc-header">' +
        '<div class="header-left">' +
          (logo ? '<img class="logo" alt="Logo" src="' + logo + '">' : LEFT_BRAND_SVG) +
          (company && company !== 'SERYVER G&G S.A.C' && company !== 'SERYVER G&G S.A.C.' ? '<p class="company-fallback">' + e(company) + '</p>' : '') +
          (pdfConfig.companySubtitle && ! pdfConfig.companySubtitle.includes('PUERTAS AUTOMÁTICAS') ? '<p class="subtitle-fallback">' + e(pdfConfig.companySubtitle) + '</p>' : '') +
        '</div>' +
        '<div class="header-right">' +
          RIGHT_BRAND_SVG +
          '<div class="ruc-line">RUC: ' + e(ruc) + '</div>' +
        '</div>' +
      '</header>' +
      '<div class="quote-Banner"><h1>COTIZACION ' + e(quote.numero || 'S/N') + '</h1></div>' +
      '<div class="date-row">FECHA: ' + e(formatDisplayDate(quote.fecha)) + '</div>' +
      '<section class="client-block">' +
        '<div class="client-row"><span class="client-label">CLIENTE:</span><span class="client-val">' + e(quote.cliente.nombre || '—') + '</span></div>' +
        (quote.cliente.ruc ? '<div class="client-row"><span class="client-label">RUC / DNI:</span><span class="client-val">' + e(quote.cliente.ruc) + '</span></div>' : '') +
        '<div class="client-row"><span class="client-label">DIRECCION:</span><span class="client-val">' + e(quote.cliente.direccion || '—') + '</span></div>' +
        '<div class="client-row"><span class="client-label">CONTACTO:</span><span class="client-val">' + e(quote.cliente.contacto || '—') + '</span></div>' +
        '<div class="client-row"><span class="client-label">REFERENCIA:</span><span class="client-val">' + e(quote.cliente.referencia || '') + '</span></div>' +
      '</section>' +
      '<p class="greeting">Estimados Señores:<br>En atención a su solicitud, hacemos llegar nuestra propuesta económica para el requerimiento solicitado</p>' +
      '<table class="items-table">' +
        '<colgroup><col style="width:13mm"><col><col style="width:14mm"><col style="width:14mm"><col style="width:23mm"><col style="width:25mm"></colgroup>' +
        '<thead><tr><th>ITEM</th><th>DESCRIPCION</th><th>CANT</th><th>UM</th><th>Precio<br>Unitario ' + e(currency) + '</th><th>Sub Total ' + e(currency) + '</th></tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table>' +
      '<section class="closing-row">' +
        (signature ? '<div class="signature-box"><img alt="Firma" src="' + signature + '"><div class="signature-line">ÁREA COMERCIAL</div></div>' : '<div></div>') +
        '<table class="totals-table"><tbody>' +
          (!quote.omitIgv ? '<tr><td class="label-cell">SUBTOTAL</td><td class="amount-cell">' + money(totals.baseImponible) + '</td></tr><tr><td class="label-cell">' + taxLabel + '</td><td class="amount-cell">' + money(totals.igv) + '</td></tr>' : '') +
          '<tr><td class="label-cell">TOTAL</td><td class="amount-cell">' + money(totals.totalFinal) + '</td></tr>' +
        '</tbody></table>' +
      '</section>' +
      '<table class="cond-table"><thead><tr><th colspan="2">CONDICIONES COMERCIALES</th></tr></thead><tbody><tr>' +
        '<td class="cond-labels"><div>FORMA DE PAGO / MONEDA</div><div>TIEMPO DE ENTREGA</div><div>VALIDEZ DE OFERTA</div><div>LUGAR DE ENTREGA</div><div>GARANTIA</div><div>OBSERVACIONES</div></td>' +
        '<td>' + condBodyHtml + '</td>' +
      '</tr></tbody></table>' +
      (accounts.length ? '<table class="banks-table"><thead><tr><th colspan="2">NUESTRAS CUENTAS</th></tr></thead><tbody>' +
        accounts.map(a => '<tr><td class="bank-left"><div>' + e(a.banco) + (a.moneda && !String(a.banco).toUpperCase().includes(String(a.moneda).toUpperCase()) ? ' (' + e(a.moneda) + ')' : '') + '</div><div class="cci-lbl">CCI</div></td>' +
          '<td class="bank-right"><div>' + e(a.numero) + '</div><div class="cci-val">' + e(a.cci || '-') + '</div></td></tr>').join('') +
      '</tbody></table>' : '') +
    '</main></body></html>';

  return { html, title, paper };
}
