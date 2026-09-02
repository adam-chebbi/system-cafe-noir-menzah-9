/**
 * Deterministic Invoice Extraction Engine (100% Local, Rules, Heuristics & Regex, No AI)
 * Extracts structured accounting data and line items from raw OCR or document text.
 */

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface ExtractedField<T> {
  value: T;
  confidence: ConfidenceLevel;
  sourceText?: string;
  matchReason?: string;
}

export interface ExtractedInvoiceItem {
  id?: string;
  itemName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  tvaRate: number;
  totalLinePrice: number;
  confidence: ConfidenceLevel;
  matchedIngredientId?: string;
  matchedIngredientName?: string;
  packageFactor?: number;
  targetStockQuantity?: number;
  targetStockUnit?: string;
}

export interface TvaBreakdownItem {
  rate: number;
  baseAmount?: number;
  taxAmount: number;
}

export interface DeterministicExtractionResult {
  supplierName: ExtractedField<string>;
  supplierId: ExtractedField<string | undefined>;
  invoiceNumber: ExtractedField<string>;
  invoiceDate: ExtractedField<string>;
  dueDate: ExtractedField<string>;
  subtotal: ExtractedField<number>;
  taxAmount: ExtractedField<number>;
  totalAmount: ExtractedField<number>;
  tvaBreakdown: TvaBreakdownItem[];
  tvaRatesDetected: number[];
  items: ExtractedInvoiceItem[];
  rawText: string;
  overallConfidence: ConfidenceLevel;
  summary: string;
}

export interface SupplierRef {
  id: string;
  name: string;
  taxNumber?: string;
  contactName?: string;
}

export interface IngredientRef {
  id: string;
  name: string;
  unit: string;
  category?: string;
  costPerUnit?: number;
  supplierId?: string;
}

/**
 * Clean & normalize text for deterministic regex parsing
 */
export function cleanOcrText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\t\f\v]/g, ' ')
    .replace(/[«»“”„"]/g, '"')
    .replace(/[’‘`]/g, "'")
    .replace(/ +/g, ' ')
    .trim();
}

/**
 * String similarity using Levenshtein & N-gram Token Overlap (Deterministic)
 */
export function calculateStringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const s2 = str2.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;
  if (s1.includes(s2) || s2.includes(s1)) return 0.92;

  // Levenshtein distance
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  const levDist = dp[m][n];
  const maxLen = Math.max(m, n);
  const levSim = 1 - (levDist / maxLen);

  // Token Jaccard similarity
  const tokens1 = new Set(s1.split(/[\s,.-]+/).filter(Boolean));
  const tokens2 = new Set(s2.split(/[\s,.-]+/).filter(Boolean));
  const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
  const union = new Set([...tokens1, ...tokens2]);
  const jaccardSim = union.size > 0 ? intersection.size / union.size : 0;

  return Math.max(levSim, jaccardSim * 0.85 + levSim * 0.15);
}

/**
 * Parse monetary numbers in various French/Tunisian/European formats
 * e.g. "1 250,50", "1.250,50", "1250.50", "1250,500", "245 €", "245,000 DT"
 */
export function parseFinancialNumber(numStr: string): number {
  if (!numStr) return 0;
  let clean = numStr.replace(/[^0-9.,-]/g, '').trim();
  
  if (clean.includes(',') && clean.includes('.')) {
    const lastComma = clean.lastIndexOf(',');
    const lastDot = clean.lastIndexOf('.');
    if (lastComma > lastDot) {
      clean = clean.replace(/\./g, '').replace(',', '.');
    } else {
      clean = clean.replace(/,/g, '');
    }
  } else if (clean.includes(',')) {
    clean = clean.replace(',', '.');
  }
  
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : Number(parsed.toFixed(3));
}

/**
 * Parse French & ISO dates
 */
export function parseDateString(dateStr: string): string | null {
  if (!dateStr) return null;

  // Format DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = dateStr.match(/\b([0-3]?[0-9])[\/.-]([0-1]?[0-9])[\/.-]((?:19|20)\d{2})\b/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Format YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = dateStr.match(/\b((?:19|20)\d{2})[\/.-]([0-1]?[0-9])[\/.-]([0-3]?[0-9])\b/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // French textual date: "15 Octobre 2025" or "1er Juin 2026"
  const frenchMonths: { [key: string]: string } = {
    janvier: '01', janv: '01', jan: '01',
    fevrier: '02', 'février': '02', fevr: '02', fev: '02',
    mars: '03', mar: '03',
    avril: '04', avr: '04',
    mai: '05',
    juin: '06',
    juillet: '07', juil: '07',
    aout: '08', 'août': '08',
    septembre: '09', sept: '09', sep: '09',
    octobre: '10', oct: '10',
    novembre: '11', nov: '11',
    decembre: '12', 'décembre': '12', dec: '12'
  };

  const textMonthMatch = dateStr.match(/\b([0-3]?[0-9]|1er)\s+([a-zA-ZÀ-ÿ]+)\s+((?:19|20)\d{2})\b/i);
  if (textMonthMatch) {
    const rawDay = textMonthMatch[1].toLowerCase() === '1er' ? '01' : textMonthMatch[1].padStart(2, '0');
    const monthName = textMonthMatch[2].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const year = textMonthMatch[3];
    const month = frenchMonths[monthName];
    if (month) {
      return `${year}-${month}-${rawDay}`;
    }
  }

  return null;
}

/**
 * Main Deterministic Extraction Engine
 */
export class DeterministicInvoiceExtractor {
  /**
   * Main entrypoint: Extracts all invoice fields deterministically
   */
  public static extract(
    rawText: string,
    existingSuppliers: SupplierRef[] = [],
    existingIngredients: IngredientRef[] = []
  ): DeterministicExtractionResult {
    const cleaned = cleanOcrText(rawText);
    const lines = cleaned.split('\n').map(l => l.trim()).filter(Boolean);

    // 1. Extract Supplier
    const supplierResult = this.extractSupplier(lines, cleaned, existingSuppliers);

    // 2. Extract Invoice Number
    const invoiceNumResult = this.extractInvoiceNumber(lines, cleaned);

    // 3. Extract Dates (Invoice Date & Due Date)
    const datesResult = this.extractDates(lines, cleaned);

    // 4. Extract Financial Totals (HT, TVA, TTC)
    const financialResult = this.extractFinancialAmounts(lines, cleaned);

    // 5. Extract Tabular Line Items
    const itemsResult = this.extractLineItems(lines, existingIngredients);

    // 6. Compute Overall Confidence
    const scores = [
      supplierResult.confidence === 'high' ? 3 : supplierResult.confidence === 'medium' ? 2 : 1,
      invoiceNumResult.confidence === 'high' ? 3 : invoiceNumResult.confidence === 'medium' ? 2 : 1,
      datesResult.invoiceDate.confidence === 'high' ? 3 : datesResult.invoiceDate.confidence === 'medium' ? 2 : 1,
      financialResult.totalAmount.confidence === 'high' ? 3 : financialResult.totalAmount.confidence === 'medium' ? 2 : 1,
      itemsResult.length > 0 && itemsResult[0].confidence !== 'low' ? 3 : 2
    ];
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const overallConfidence: ConfidenceLevel = avgScore >= 2.4 ? 'high' : avgScore >= 1.7 ? 'medium' : 'low';

    const summary = `Facture ${invoiceNumResult.value} (${supplierResult.name.value}) - Total: ${financialResult.totalAmount.value.toFixed(2)} DT [${itemsResult.length} article(s)]`;

    return {
      supplierName: supplierResult.name,
      supplierId: supplierResult.id,
      invoiceNumber: invoiceNumResult,
      invoiceDate: datesResult.invoiceDate,
      dueDate: datesResult.dueDate,
      subtotal: financialResult.subtotal,
      taxAmount: financialResult.taxAmount,
      totalAmount: financialResult.totalAmount,
      tvaBreakdown: financialResult.tvaBreakdown,
      tvaRatesDetected: financialResult.tvaRatesDetected,
      items: itemsResult,
      rawText: cleaned,
      overallConfidence,
      summary
    };
  }

  /**
   * Supplier extraction via database fuzzy match + header heuristics
   */
  private static extractSupplier(
    lines: string[],
    fullText: string,
    existingSuppliers: SupplierRef[]
  ): { name: ExtractedField<string>; id: ExtractedField<string | undefined>; confidence: ConfidenceLevel } {
    let bestMatchSupplier: SupplierRef | null = null;
    let highestScore = 0;

    const headerText = lines.slice(0, 12).join(' ');

    // Match against known suppliers in database
    for (const sup of existingSuppliers) {
      // Direct inclusion in text
      if (fullText.toLowerCase().includes(sup.name.toLowerCase())) {
        highestScore = 0.96;
        bestMatchSupplier = sup;
        break;
      }

      // Fuzzy similarity on top lines
      const sim = calculateStringSimilarity(sup.name, headerText);
      if (sim > highestScore) {
        highestScore = sim;
        bestMatchSupplier = sup;
      }
    }

    if (bestMatchSupplier && highestScore >= 0.65) {
      const conf: ConfidenceLevel = highestScore >= 0.85 ? 'high' : 'medium';
      return {
        name: {
          value: bestMatchSupplier.name,
          confidence: conf,
          matchReason: `Fournisseur reconnu en base (${Math.round(highestScore * 100)}% de similarité)`
        },
        id: {
          value: bestMatchSupplier.id,
          confidence: conf
        },
        confidence: conf
      };
    }

    // Keyword detection in header
    for (const line of lines.slice(0, 8)) {
      const supPrefixMatch = line.match(/(?:fournisseur|émetteur|société|vendeur|entreprise|ste|sarl|sa|suarl)[\s:]+(.+)/i);
      if (supPrefixMatch && supPrefixMatch[1].trim().length > 2) {
        const detectedName = supPrefixMatch[1].trim();
        return {
          name: {
            value: detectedName,
            confidence: 'medium',
            sourceText: line,
            matchReason: 'Détecté après un mot-clé d\'en-tête (Société/Fournisseur)'
          },
          id: {
            value: undefined,
            confidence: 'low'
          },
          confidence: 'medium'
        };
      }
    }

    // Fallback: Use top line of document
    const topNonEmptyLine = lines[0] || 'Fournisseur Inconnu';
    const fallbackName = topNonEmptyLine.replace(/^(facture|devis|bon\s*de\s*livraison|bl|reçu)/i, '').trim() || topNonEmptyLine;

    return {
      name: {
        value: fallbackName.slice(0, 50),
        confidence: 'low',
        matchReason: 'Première ligne du document (à vérifier)'
      },
      id: {
        value: undefined,
        confidence: 'low'
      },
      confidence: 'low'
    };
  }

  /**
   * Invoice Number extraction
   */
  private static extractInvoiceNumber(lines: string[], fullText: string): ExtractedField<string> {
    const patterns = [
      /\b(?:facture\s*n°|facture|invoice\s*no|invoice|n°\s*facture|numéro\s*facture|n°\s*de\s*facture)\b[\s.:#*-]*([A-Z0-9\/-]{3,30})/i,
      /\b(?:bon\s*de\s*livraison|bl\s*n°|bon\s*n°|bl)\b[\s.:#*-]*([A-Z0-9\/-]{3,30})/i,
      /\b(?:n°|numéro|réf\.|référence|ref|no\.)[\s.:#*-]*([A-Z0-9\/-]{3,30})/i,
      /\b(FAC[-_/\s]?\d{4}[-_/\s]?\d{2,6})\b/i,
      /\b(INV[-_/\s]?\d{4}[-_/\s]?\d{2,6})\b/i,
      /\b(BL[-_/\s]?\d{4}[-_/\s]?\d{2,6})\b/i,
      /\b(F\d{6,10})\b/i
    ];

    for (const pattern of patterns) {
      const match = fullText.match(pattern);
      if (match && match[1]) {
        const val = match[1].trim();
        const invalidWords = ['TTC', 'TVA', 'EUR', 'TND', 'DT', 'DATE', 'TOTAL', 'NET', 'CLIENT', 'MERCI', 'SARL', 'SUD', 'ION'];
        if (val.length >= 3 && !invalidWords.includes(val.toUpperCase())) {
          return {
            value: val,
            confidence: pattern.source.includes('facture') || pattern.source.includes('FAC') ? 'high' : 'medium',
            sourceText: match[0],
            matchReason: 'Motif identifié avec préfixe de facture'
          };
        }
      }
    }

    const fallback = `FAC-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
    return {
      value: fallback,
      confidence: 'low',
      matchReason: 'Généré par défaut (non détecté dans le document)'
    };
  }

  /**
   * Dates extraction (Invoice Date & Due Date)
   */
  private static extractDates(
    lines: string[],
    fullText: string
  ): { invoiceDate: ExtractedField<string>; dueDate: ExtractedField<string> } {
    let invoiceDate: string | null = null;
    let dueDate: string | null = null;
    let invDateConfidence: ConfidenceLevel = 'low';
    let dueDateConfidence: ConfidenceLevel = 'low';

    for (const line of lines) {
      // Due date keywords
      if (/échéance|echeance|date\s*limite|régler\s*avant|paiement\s*(?:le|au)|due\s*date/i.test(line)) {
        const d = parseDateString(line);
        if (d) {
          dueDate = d;
          dueDateConfidence = 'high';
        }
      }
      // Invoice date keywords
      else if (/date\s*(?:de\s*facture|d'émission|du\s*document|d'envoi)?|facturé\s*le|émise\s*le|du\s*:/i.test(line)) {
        const d = parseDateString(line);
        if (d && !invoiceDate) {
          invoiceDate = d;
          invDateConfidence = 'high';
        }
      }
    }

    // Top lines scan for any date
    if (!invoiceDate) {
      for (const line of lines.slice(0, 15)) {
        const d = parseDateString(line);
        if (d) {
          invoiceDate = d;
          invDateConfidence = 'medium';
          break;
        }
      }
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (!invoiceDate) {
      invoiceDate = todayStr;
      invDateConfidence = 'low';
    }

    if (!dueDate) {
      // Default: +30 days
      const d = new Date(new Date(invoiceDate).getTime() + 30 * 24 * 3600 * 1000);
      dueDate = isNaN(d.getTime()) ? todayStr : d.toISOString().split('T')[0];
      dueDateConfidence = 'low';
    }

    return {
      invoiceDate: {
        value: invoiceDate,
        confidence: invDateConfidence,
        matchReason: invDateConfidence === 'high' ? 'Date trouvée avec libellé explicite' : 'Date déduite du document'
      },
      dueDate: {
        value: dueDate,
        confidence: dueDateConfidence,
        matchReason: dueDateConfidence === 'high' ? 'Date d\'échéance explicite' : 'Calculée par défaut (+30 jours)'
      }
    };
  }

  /**
   * Financial Totals (HT, Multi-TVA, TTC)
   */
  private static extractFinancialAmounts(
    lines: string[],
    fullText: string
  ): {
    subtotal: ExtractedField<number>;
    taxAmount: ExtractedField<number>;
    totalAmount: ExtractedField<number>;
    tvaBreakdown: TvaBreakdownItem[];
    tvaRatesDetected: number[];
  } {
    let subtotal = 0;
    let taxAmount = 0;
    let totalAmount = 0;
    let subtotalConf: ConfidenceLevel = 'low';
    let taxConf: ConfidenceLevel = 'low';
    let totalConf: ConfidenceLevel = 'low';

    const tvaRatesMap: Map<number, number> = new Map();

    for (const line of lines) {
      // Total TTC / Net à payer
      if (/total\s*ttc|net\s*à\s*payer|total\s*à\s*payer|montant\s*ttc|total\s*général|net\s*payer|total\s*dû/i.test(line)) {
        const match = line.match(/([0-9\s.,]+)(?:\s*(?:€|EUR|TND|DT|Dinar))?$/i) || line.match(/[:\s]+([0-9\s.,]+)/);
        if (match) {
          const val = parseFinancialNumber(match[1]);
          if (val > totalAmount) {
            totalAmount = val;
            totalConf = 'high';
          }
        }
      }

      // Subtotal HT
      if (/total\s*ht|montant\s*ht|sous[\s-]*total|total\s*net\s*ht|total\s*brut\s*ht|base\s*ht/i.test(line)) {
        const match = line.match(/([0-9\s.,]+)(?:\s*(?:€|EUR|TND|DT|Dinar))?$/i) || line.match(/[:\s]+([0-9\s.,]+)/);
        if (match) {
          const val = parseFinancialNumber(match[1]);
          if (val > subtotal) {
            subtotal = val;
            subtotalConf = 'high';
          }
        }
      }

      // TVA detection (with rates)
      if (/(?:total\s*)?t\.?v\.?a\.?|taxe|montant\s*tva/i.test(line) && !/non\s*soumis/i.test(line)) {
        const rateMatch = line.match(/(\d{1,2}(?:[.,]\d+)?)\s*%/);
        const rate = rateMatch ? parseFloat(rateMatch[1].replace(',', '.')) : 19; // Default 19%

        const match = line.match(/([0-9\s.,]+)(?:\s*(?:€|EUR|TND|DT|Dinar))?$/i) || line.match(/[:\s]+([0-9\s.,]+)/);
        if (match) {
          const val = parseFinancialNumber(match[1]);
          if (val > 0 && val < (totalAmount || Infinity)) {
            tvaRatesMap.set(rate, val);
            if (val > taxAmount) {
              taxAmount = val;
              taxConf = 'high';
            }
          }
        }
      }
    }

    // Mathematical verification: HT + TVA ≈ TTC
    if (subtotal > 0 && taxAmount > 0 && totalAmount > 0) {
      const diff = Math.abs((subtotal + taxAmount) - totalAmount);
      if (diff <= 0.1) {
        subtotalConf = 'high';
        taxConf = 'high';
        totalConf = 'high';
      }
    } else if (totalAmount > 0 && subtotal > 0 && taxAmount === 0) {
      taxAmount = Number((totalAmount - subtotal).toFixed(3));
      taxConf = 'medium';
    } else if (totalAmount > 0 && taxAmount > 0 && subtotal === 0) {
      subtotal = Number((totalAmount - taxAmount).toFixed(3));
      subtotalConf = 'medium';
    } else if (totalAmount === 0 && subtotal > 0 && taxAmount > 0) {
      totalAmount = Number((subtotal + taxAmount).toFixed(3));
      totalConf = 'medium';
    }

    // Format breakdown
    const tvaBreakdown: TvaBreakdownItem[] = [];
    if (tvaRatesMap.size > 0) {
      tvaRatesMap.forEach((taxVal, rate) => {
        tvaBreakdown.push({ rate, taxAmount: taxVal });
      });
    } else if (taxAmount > 0) {
      tvaBreakdown.push({ rate: 19, taxAmount });
    }

    return {
      subtotal: {
        value: subtotal,
        confidence: subtotalConf,
        matchReason: subtotalConf === 'high' ? 'Libellé Sous-total HT exact' : 'Montant déduit'
      },
      taxAmount: {
        value: taxAmount,
        confidence: taxConf,
        matchReason: taxConf === 'high' ? 'Montant TVA identifié' : 'Calculé par différence'
      },
      totalAmount: {
        value: totalAmount,
        confidence: totalConf,
        matchReason: totalConf === 'high' ? 'Total TTC / Net à payer validé' : 'Somme calculée'
      },
      tvaBreakdown,
      tvaRatesDetected: Array.from(tvaRatesMap.keys())
    };
  }

  /**
   * Tabular Line Items Extraction
   */
  private static extractLineItems(
    lines: string[],
    existingIngredients: IngredientRef[]
  ): ExtractedInvoiceItem[] {
    const items: ExtractedInvoiceItem[] = [];
    const tableHeaderKeywords = ['désignation', 'designation', 'description', 'article', 'produit', 'libellé', 'item', 'code'];

    let headerLineIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      const lower = lines[i].toLowerCase();
      if (
        tableHeaderKeywords.some(k => lower.includes(k)) &&
        (lower.includes('qt') || lower.includes('prix') || lower.includes('montant') || lower.includes('pu') || lower.includes('total'))
      ) {
        headerLineIdx = i;
        break;
      }
    }

    const startIdx = headerLineIdx !== -1 ? headerLineIdx + 1 : 0;
    const endKeywords = ['total', 'sous-total', 'net à payer', 'tva', 'acompte', 'banque', 'signature', 'bon pour accord', 'conditions'];

    for (let i = startIdx; i < lines.length; i++) {
      const line = lines[i];
      const lower = line.toLowerCase();

      // Check footer stop
      if (headerLineIdx !== -1 && endKeywords.some(k => lower.startsWith(k) || lower.includes('total ht') || lower.includes('total ttc'))) {
        break;
      }

      const parsedItem = this.parseItemLine(line, existingIngredients);
      if (parsedItem) {
        items.push(parsedItem);
      }
    }

    // Default fallback line if none parsed
    if (items.length === 0) {
      items.push({
        id: `item_${Date.now()}_1`,
        itemName: 'Fourniture diverse',
        quantity: 1,
        unit: 'unit',
        unitPrice: 0,
        tvaRate: 19,
        totalLinePrice: 0,
        confidence: 'low',
        packageFactor: 1
      });
    }

    return items;
  }

  /**
   * Parse a single text line as a product item
   */
  private static parseItemLine(
    line: string,
    existingIngredients: IngredientRef[]
  ): ExtractedInvoiceItem | null {
    if (/^(total|tva|sous-total|net|échéance|date|page|merci|rib|iban|siret|tel|fax|adresse|banque)/i.test(line)) {
      return null;
    }

    const numberMatches = [...line.matchAll(/(\d+(?:[.,]\d+)?)/g)];
    if (numberMatches.length < 1) return null;

    // Unit detection
    const unitPattern = /\b(kg|kilo|g|gramme|l|litre|cl|ml|carton|sac|sachet|bouteille|pack|boîte|boite|bidon|unit|unité|pc|pcs|portion)\b/i;
    const unitMatch = line.match(unitPattern);
    const unit = unitMatch ? unitMatch[1].toLowerCase() : 'unit';

    // Designation
    let designation = line;
    if (numberMatches.length > 0) {
      const firstNumIdx = numberMatches[0].index || 0;
      designation = line.slice(0, firstNumIdx).trim();
    }

    designation = designation.replace(/^[0-9\s.*#-]+/, '').replace(/[:;-]+$/, '').trim();
    if (designation.length < 2) {
      designation = line.replace(/[0-9.,€$DT]/g, '').trim();
    }
    if (designation.length < 2) return null;

    const numbers = numberMatches.map(m => parseFinancialNumber(m[0]));
    let quantity = 1;
    let unitPrice = 0;
    let totalLinePrice = 0;
    let confidence: ConfidenceLevel = 'low';

    if (numbers.length >= 3) {
      quantity = numbers[0];
      unitPrice = numbers[1];
      totalLinePrice = numbers[2];
      confidence = 'high';
    } else if (numbers.length === 2) {
      quantity = numbers[0];
      totalLinePrice = numbers[1];
      unitPrice = quantity > 0 ? Number((totalLinePrice / quantity).toFixed(3)) : totalLinePrice;
      confidence = 'medium';
    } else if (numbers.length === 1) {
      totalLinePrice = numbers[0];
      unitPrice = totalLinePrice;
      quantity = 1;
      confidence = 'low';
    }

    // Match against existing ingredients
    let matchedIngredientId: string | undefined;
    let matchedIngredientName: string | undefined;
    let targetStockUnit: string | undefined;
    let bestIngScore = 0;

    for (const ing of existingIngredients) {
      const sim = calculateStringSimilarity(ing.name, designation);
      if (sim > bestIngScore && sim >= 0.55) {
        bestIngScore = sim;
        matchedIngredientId = ing.id;
        matchedIngredientName = ing.name;
        targetStockUnit = ing.unit;
      }
    }

    return {
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      itemName: designation,
      quantity: quantity > 0 ? quantity : 1,
      unit,
      unitPrice,
      tvaRate: 19,
      totalLinePrice,
      confidence,
      matchedIngredientId,
      matchedIngredientName,
      targetStockUnit,
      packageFactor: 1
    };
  }
}
