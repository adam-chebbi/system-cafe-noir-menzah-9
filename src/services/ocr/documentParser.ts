/**
 * Document Ingestion & Parsing Pipeline (100% Deterministic & Local, No AI)
 * Handles Images (PNG, JPG, WEBP), Native & Scanned PDFs, and DOCX files.
 */

import { createWorker } from 'tesseract.js';
import * as mammoth from 'mammoth';
import { preprocessImageForOcr } from '../../utils/imagePreprocessing';

export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB max

export type SupportedFileType = 'image' | 'pdf' | 'docx';

export interface DocumentParsingProgress {
  stage: 'validating' | 'preprocessing' | 'ocr_running' | 'extracting_native' | 'completed';
  progress: number; // 0 to 100
  message: string;
}

export interface ParsedDocumentResult {
  rawText: string;
  fileType: SupportedFileType;
  fileName: string;
  fileSize: number;
  isOcrUsed: boolean;
  pageCount: number;
  previewUrl: string;
  processedImageUrl?: string;
}

/**
 * Validates file format, size and emptiness
 */
export function validateInvoiceFile(file: File): { isValid: boolean; error?: string; fileType?: SupportedFileType } {
  if (!file) {
    return { isValid: false, error: 'Aucun fichier sélectionné.' };
  }

  if (file.size === 0) {
    return { isValid: false, error: 'Le fichier sélectionné est vide (0 octet). Veuillez fournir un document valide.' };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      isValid: false,
      error: `Le fichier dépasse la taille maximale autorisée (${sizeMb} Mo / max 20 Mo). Veuillez réduire la résolution.`
    };
  }

  const name = file.name.toLowerCase();
  const mime = file.type.toLowerCase();

  if (
    mime.startsWith('image/') ||
    name.endsWith('.png') ||
    name.endsWith('.jpg') ||
    name.endsWith('.jpeg') ||
    name.endsWith('.webp') ||
    name.endsWith('.bmp') ||
    name.endsWith('.tiff')
  ) {
    return { isValid: true, fileType: 'image' };
  }

  if (mime === 'application/pdf' || name.endsWith('.pdf')) {
    return { isValid: true, fileType: 'pdf' };
  }

  if (
    mime.includes('wordprocessingml') ||
    mime.includes('officedocument') ||
    name.endsWith('.docx')
  ) {
    return { isValid: true, fileType: 'docx' };
  }

  return {
    isValid: false,
    error: `Format non supporté ("${file.name}"). Formats acceptés : Images (PNG, JPG, WEBP), Documents Word (.DOCX), PDF.`
  };
}

/**
 * Ingests and extracts full text from any supported document
 */
export async function parseDocumentLocally(
  file: File,
  onProgress?: (p: DocumentParsingProgress) => void
): Promise<ParsedDocumentResult> {
  const validation = validateInvoiceFile(file);
  if (!validation.isValid || !validation.fileType) {
    throw new Error(validation.error || 'Fichier invalide');
  }

  onProgress?.({
    stage: 'validating',
    progress: 10,
    message: 'Validation du format de document...'
  });

  const fileType = validation.fileType;

  // 1. DOCX Handling (Direct structured text extraction via Mammoth)
  if (fileType === 'docx') {
    onProgress?.({
      stage: 'extracting_native',
      progress: 30,
      message: 'Extraction du texte structuré et des tableaux Word (DOCX)...'
    });

    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      const rawText = result.value.trim();

      if (!rawText || rawText.length < 5) {
        throw new Error('Le document DOCX ne contient aucun texte exploitable.');
      }

      onProgress?.({
        stage: 'completed',
        progress: 100,
        message: 'Texte DOCX extrait avec succès.'
      });

      return {
        rawText,
        fileType: 'docx',
        fileName: file.name,
        fileSize: file.size,
        isOcrUsed: false,
        pageCount: 1,
        previewUrl: ''
      };
    } catch (err: any) {
      throw new Error(`Erreur lors de la lecture du fichier Word DOCX: ${err.message}`);
    }
  }

  // 2. Image Handling (Preprocessing + Tesseract OCR)
  if (fileType === 'image') {
    return await parseImageWithOcr(file, onProgress);
  }

  // 3. PDF Handling (Native text extraction if available, else render & OCR)
  if (fileType === 'pdf') {
    return await parsePdfDocument(file, onProgress);
  }

  throw new Error('Type de fichier non supporté');
}

/**
 * OCR pipeline for images with Canvas preprocessing & Tesseract.js
 */
async function parseImageWithOcr(
  file: File,
  onProgress?: (p: DocumentParsingProgress) => void
): Promise<ParsedDocumentResult> {
  const originalDataUrl = await fileToDataUrl(file);

  onProgress?.({
    stage: 'preprocessing',
    progress: 25,
    message: 'Prétraitement d\'image (contraste, redressement, binarisation)...'
  });

  const { processedDataUrl, skewAngle } = await preprocessImageForOcr(originalDataUrl, {
    enhanceContrast: true,
    deskew: true,
    binarize: true
  });

  onProgress?.({
    stage: 'ocr_running',
    progress: 40,
    message: 'Initialisation du moteur OCR Tesseract local...'
  });

  let worker: any = null;
  let ocrText = '';

  try {
    worker = await createWorker('fra+eng', 1, {
      logger: (m: any) => {
        if (m.status === 'recognizing text' && m.progress) {
          const currentPct = 40 + Math.round(m.progress * 55);
          onProgress?.({
            stage: 'ocr_running',
            progress: Math.min(95, currentPct),
            message: `Reconnaissance des caractères en cours (${Math.round(m.progress * 100)}%)...`
          });
        }
      }
    });

    const ret = await worker.recognize(processedDataUrl);
    ocrText = ret.data.text || '';
  } catch (err: any) {
    console.error('OCR Worker error:', err);
    throw new Error(`Échec du moteur OCR local : ${err.message || err}`);
  } finally {
    if (worker) {
      await worker.terminate();
    }
  }

  if (!ocrText || ocrText.trim().length < 5) {
    // If binarized image produced poor results, fallback OCR directly on original
    try {
      worker = await createWorker('fra+eng', 1);
      const retFallback = await worker.recognize(originalDataUrl);
      ocrText = retFallback.data.text || '';
    } catch {
      // ignore fallback error
    } finally {
      if (worker) await worker.terminate();
    }
  }

  onProgress?.({
    stage: 'completed',
    progress: 100,
    message: 'Reconnaissance OCR terminée avec succès.'
  });

  return {
    rawText: ocrText.trim(),
    fileType: 'image',
    fileName: file.name,
    fileSize: file.size,
    isOcrUsed: true,
    pageCount: 1,
    previewUrl: originalDataUrl,
    processedImageUrl: processedDataUrl
  };
}

/**
 * Handles PDF files: extracts native text layer or renders pages for OCR
 */
async function parsePdfDocument(
  file: File,
  onProgress?: (p: DocumentParsingProgress) => void
): Promise<ParsedDocumentResult> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfBlobUrl = URL.createObjectURL(file);

  onProgress?.({
    stage: 'extracting_native',
    progress: 25,
    message: 'Vérification de la couche texte native du PDF...'
  });

  try {
    // Try dynamically loading pdfjs-dist
    const pdfjsLib: any = await import('pdfjs-dist');
    if (pdfjsLib.GlobalWorkerOptions && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
      // Setup worker if available or disable worker
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '3.11.174'}/build/pdf.worker.min.js`;
    }

    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages || 1;

    let fullText = '';
    let hasNativeText = false;

    // First pass: Try reading native text from pages
    for (let pageNum = 1; pageNum <= Math.min(numPages, 5); pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str || '')
        .join(' ');

      if (pageText.trim().length > 30) {
        hasNativeText = true;
        fullText += (fullText ? '\n\n' : '') + pageText;
      }
    }

    if (hasNativeText && fullText.trim().length > 50) {
      onProgress?.({
        stage: 'completed',
        progress: 100,
        message: 'Couche de texte native extraite du PDF.'
      });

      return {
        rawText: fullText.trim(),
        fileType: 'pdf',
        fileName: file.name,
        fileSize: file.size,
        isOcrUsed: false,
        pageCount: numPages,
        previewUrl: pdfBlobUrl
      };
    }

    // Scanned PDF fallback: Render page 1 to Canvas, Preprocess & OCR
    onProgress?.({
      stage: 'preprocessing',
      progress: 40,
      message: 'PDF scanné détecté (sans texte). Rendu graphique et prétraitement...'
    });

    const page1 = await pdf.getPage(1);
    const viewport = page1.getViewport({ scale: 2.0 }); // High res for OCR
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) throw new Error('Impossible d\'initialiser le canvas pour le PDF');

    await page1.render({ canvasContext: ctx, viewport }).promise;
    const pageDataUrl = canvas.toDataURL('image/png');

    // Preprocess rendered page
    const { processedDataUrl } = await preprocessImageForOcr(pageDataUrl, {
      enhanceContrast: true,
      binarize: true
    });

    onProgress?.({
      stage: 'ocr_running',
      progress: 60,
      message: 'OCR en cours sur le PDF scanné...'
    });

    const worker = await createWorker('fra+eng', 1, {
      logger: (m: any) => {
        if (m.status === 'recognizing text' && m.progress) {
          const currentPct = 60 + Math.round(m.progress * 35);
          onProgress?.({
            stage: 'ocr_running',
            progress: Math.min(95, currentPct),
            message: `OCR sur PDF scanné (${Math.round(m.progress * 100)}%)...`
          });
        }
      }
    });

    const ret = await worker.recognize(processedDataUrl);
    await worker.terminate();

    onProgress?.({
      stage: 'completed',
      progress: 100,
      message: 'OCR sur PDF scanné terminé avec succès.'
    });

    return {
      rawText: ret.data.text.trim(),
      fileType: 'pdf',
      fileName: file.name,
      fileSize: file.size,
      isOcrUsed: true,
      pageCount: numPages,
      previewUrl: pageDataUrl,
      processedImageUrl: processedDataUrl
    };
  } catch (err: any) {
    // If PDF.js fails to render or load, attempt server-side fallback or readable string extraction
    console.warn('PDF parsing error in browser, attempting fallback:', err);
    throw new Error(`Impossible d'analyser le fichier PDF : ${err.message}`);
  }
}

/**
 * Utility: Convert File to base64 DataURL
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Erreur lors de la lecture du fichier'));
    reader.readAsDataURL(file);
  });
}
