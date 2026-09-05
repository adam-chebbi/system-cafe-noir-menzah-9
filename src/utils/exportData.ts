/**
 * exportData.ts
 *
 * Export générique de jeux de données en CSV ou Excel (.xlsx), directement dans le navigateur —
 * aucune donnée ne transite par le serveur pour l'export lui-même.
 */
import * as XLSX from 'xlsx';

export type ExportCell = string | number;
export type ExportRow = ExportCell[];

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsvCell(value: ExportCell): string {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Exporte des données tabulaires en CSV (avec BOM UTF-8 pour un affichage correct des accents dans Excel). */
export function exportToCsv(filename: string, headers: string[], rows: ExportRow[]): void {
  const lines = [headers, ...rows].map(row => row.map(escapeCsvCell).join(','));
  const csv = '﻿' + lines.join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
}

/** Exporte des données tabulaires en classeur Excel (.xlsx). */
export function exportToExcel(filename: string, sheetName: string, headers: string[], rows: ExportRow[]): void {
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
  XLSX.writeFile(workbook, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}

export const todayFileTag = (): string => new Date().toISOString().slice(0, 10);
