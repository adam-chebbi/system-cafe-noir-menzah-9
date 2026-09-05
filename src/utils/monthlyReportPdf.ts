/**
 * monthlyReportPdf.ts
 *
 * Génère le rapport mensuel PDF entièrement côté navigateur, à partir des données déjà calculées
 * par /api/reports/monthly (aucune donnée sensible ne transite ailleurs que vers l'appareil de
 * l'administrateur).
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const money = (value: number | undefined) => `${(value || 0).toFixed(3)} DT`;
const pct = (value: number | undefined) => `${(value ?? 0).toFixed(1)} %`;

const INK = '#252A27';
const MUTED = '#555D58';
const ACCENT = '#8BCFAE';

export function generateMonthlyReportPdf(report: any): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;

  // ── En-tête ──
  doc.setFillColor(INK);
  doc.rect(0, 0, pageWidth, 70, 'F');
  doc.setTextColor('#FFFFFF');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Café Noir — Rapport Mensuel', margin, 30);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(capitalize(report.monthLabel || report.month || ''), margin, 48);
  doc.setFontSize(9);
  doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`, margin, 62);

  let cursorY = 92;
  doc.setTextColor(INK);

  // ── Indicateurs clés ──
  const metrics = report.metrics || {};
  const pnl = report.pnl || {};
  const revenueDeltaLabel = `${metrics.revenueDelta >= 0 ? '+' : ''}${(metrics.revenueDelta ?? 0).toFixed(1)} % vs mois précédent`;

  cursorY = drawSectionTitle(doc, 'Chiffre d\'affaires & activité', cursorY);
  cursorY = drawKeyValueTable(doc, cursorY, margin, [
    ["Chiffre d'affaires TTC", money(metrics.totalRevenue)],
    ['Évolution mensuelle', revenueDeltaLabel],
    ['Tickets', String(metrics.ticketsCount ?? 0)],
    ['Panier moyen', money(metrics.avgTicket)]
  ]);

  cursorY = drawSectionTitle(doc, 'Achats, charges & personnel', cursorY + 12);
  cursorY = drawKeyValueTable(doc, cursorY, margin, [
    ['Achats fournisseurs', money(metrics.totalPurchases)],
    ["Dépenses d'exploitation", money(metrics.totalExpenses)],
    ['Coût du personnel', money(metrics.totalStaffCost)]
  ]);

  cursorY = drawSectionTitle(doc, 'Marge, stock & pertes', cursorY + 12);
  cursorY = drawKeyValueTable(doc, cursorY, margin, [
    ['Marge brute estimée', `${money(pnl.grossMargin)} (${pct(pnl.grossMarginPercent)})`],
    ["Résultat net d'exploitation", money(pnl.netOperatingProfit)],
    ['Valeur du stock actuel', money(metrics.stockValuation)],
    ['Pertes (casse, péremption...)', money(metrics.wasteLosses)],
    ["Écart net d'inventaire (mois)", money(metrics.totalInventoryDiscrepancyValue)]
  ]);

  cursorY += 16;

  // ── Écarts d'inventaire du mois ──
  const discrepancies = (report.inventoryDiscrepancies || []) as { auditNumber: string; date: string; totalDifferenceValue: number }[];
  cursorY = drawSectionTitle(doc, "Écarts d'inventaire du mois", cursorY);
  if (discrepancies.length > 0) {
    autoTable(doc, {
      startY: cursorY,
      margin: { left: margin, right: margin },
      head: [['Inventaire', 'Date', 'Écart net']],
      body: discrepancies.map(d => [d.auditNumber, d.date, money(d.totalDifferenceValue)]),
      styles: { font: 'helvetica', fontSize: 9, textColor: INK },
      headStyles: { fillColor: INK, textColor: '#FFFFFF' },
      theme: 'grid'
    });
    cursorY = ((doc as any).lastAutoTable?.finalY || cursorY) + 20;
  } else {
    doc.setFontSize(9);
    doc.setTextColor(MUTED);
    doc.text('Aucun inventaire validé ce mois-ci.', margin, cursorY + 14);
    doc.setTextColor(INK);
    cursorY += 30;
  }

  // ── Meilleures ventes ──
  const topProducts = (report.topProducts || report.rankings?.topSellingProducts || []) as { name: string; quantity: number; revenue: number }[];
  cursorY = ensureSpace(doc, cursorY, 90);
  cursorY = drawSectionTitle(doc, 'Meilleures ventes du mois', cursorY);
  if (topProducts.length > 0) {
    autoTable(doc, {
      startY: cursorY,
      margin: { left: margin, right: margin },
      head: [['Produit', 'Quantité vendue', 'Chiffre d\'affaires']],
      body: topProducts.slice(0, 5).map(p => [p.name, String(p.quantity), money(p.revenue)]),
      styles: { font: 'helvetica', fontSize: 9, textColor: INK },
      headStyles: { fillColor: INK, textColor: '#FFFFFF' },
      theme: 'grid'
    });
    cursorY = ((doc as any).lastAutoTable?.finalY || cursorY) + 20;
  } else {
    doc.setFontSize(9);
    doc.setTextColor(MUTED);
    doc.text('Aucune vente enregistrée ce mois-ci.', margin, cursorY + 14);
    doc.setTextColor(INK);
    cursorY += 30;
  }

  // ── Produits à faible marge ──
  const lowMarginProducts = (report.lowMarginProducts || []) as { name: string; targetMarginPercentage: number; actualMarginPercentage: number; gap: number }[];
  cursorY = ensureSpace(doc, cursorY, 90);
  cursorY = drawSectionTitle(doc, 'Produits sous leur marge objectif', cursorY);
  if (lowMarginProducts.length > 0) {
    autoTable(doc, {
      startY: cursorY,
      margin: { left: margin, right: margin },
      head: [['Produit', 'Marge réelle', 'Marge objectif', 'Écart']],
      body: lowMarginProducts.map(p => [p.name, pct(p.actualMarginPercentage), pct(p.targetMarginPercentage), `-${p.gap.toFixed(1)} pts`]),
      styles: { font: 'helvetica', fontSize: 9, textColor: INK },
      headStyles: { fillColor: INK, textColor: '#FFFFFF' },
      theme: 'grid'
    });
    cursorY = ((doc as any).lastAutoTable?.finalY || cursorY) + 20;
  } else {
    doc.setFontSize(9);
    doc.setTextColor(MUTED);
    doc.text('Tous les produits atteignent leur objectif de marge.', margin, cursorY + 14);
    doc.setTextColor(INK);
    cursorY += 30;
  }

  // ── Alertes principales ──
  const alerts = (report.alerts || []) as { title: string; message: string; severity: string }[];
  cursorY = ensureSpace(doc, cursorY, 90);
  cursorY = drawSectionTitle(doc, 'Alertes principales', cursorY);
  if (alerts.length > 0) {
    autoTable(doc, {
      startY: cursorY,
      margin: { left: margin, right: margin },
      head: [['Gravité', 'Alerte', 'Détail']],
      body: alerts.slice(0, 10).map(a => [severityLabel(a.severity), a.title, a.message]),
      styles: { font: 'helvetica', fontSize: 8.5, textColor: INK, cellWidth: 'wrap' },
      columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 140 }, 2: { cellWidth: 'auto' } },
      headStyles: { fillColor: INK, textColor: '#FFFFFF' },
      theme: 'grid'
    });
    cursorY = ((doc as any).lastAutoTable?.finalY || cursorY) + 10;
  } else {
    doc.setFontSize(9);
    doc.setTextColor(MUTED);
    doc.text('Aucune alerte active — toutes les opérations sont conformes.', margin, cursorY + 14);
    doc.setTextColor(INK);
  }

  // ── Pagination ──
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(MUTED);
    doc.text(`Café Noir · Rapport confidentiel · Page ${i} / ${pageCount}`, margin, doc.internal.pageSize.getHeight() - 20);
  }

  doc.save(`rapport_mensuel_cafe_noir_${report.month || 'mois'}.pdf`);
}

function drawSectionTitle(doc: jsPDF, title: string, y: number): number {
  y = ensureSpace(doc, y, 40);
  doc.setDrawColor(ACCENT);
  doc.setLineWidth(2);
  doc.line(40, y, 56, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(INK);
  doc.text(title, 64, y + 4);
  doc.setFont('helvetica', 'normal');
  return y + 16;
}

function drawKeyValueTable(doc: jsPDF, startY: number, margin: number, rows: [string, string][]): number {
  autoTable(doc, {
    startY,
    margin: { left: margin, right: margin },
    body: rows,
    styles: { font: 'helvetica', fontSize: 9.5, textColor: INK, cellPadding: 4 },
    columnStyles: { 0: { fontStyle: 'normal', textColor: '#555D58' }, 1: { fontStyle: 'bold', halign: 'right' } },
    theme: 'plain'
  });
  return (doc as any).lastAutoTable?.finalY || startY;
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - 40) {
    doc.addPage();
    return 40;
  }
  return y;
}

function severityLabel(severity: string): string {
  switch (severity) {
    case 'critical': return 'Critique';
    case 'warning': return 'Attention';
    case 'success': return 'OK';
    default: return 'Info';
  }
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
