import React, { useState, useEffect, useRef } from 'react';
import { Supplier, SupplierInvoice, Ingredient, StockZone, ProductLabelMapping } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSystem } from '../../context/SystemContext';
import { ZONE_LABELS, STOCK_ZONES } from '../../utils/stockZones';
import { INGREDIENT_CATEGORIES, INGREDIENT_CATEGORY_LABELS } from '../../utils/ingredientCategories';
import { IngredientPicker } from '../common/IngredientPicker';
import {
  parseDocumentLocally,
  validateInvoiceFile,
  DocumentParsingProgress,
  SupportedFileType
} from '../../services/ocr/documentParser';
import {
  DeterministicInvoiceExtractor,
  DeterministicExtractionResult,
  ExtractedInvoiceItem,
  ConfidenceLevel,
  calculateStringSimilarity
} from '../../services/ocr/deterministicExtractor';
import {
  STANDARD_UNITS,
  convertUnitQuantity,
  normalizeUnit
} from '../../services/ocr/unitConversionService';
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  X,
  Calendar,
  Building,
  DollarSign,
  Plus,
  Trash2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Search,
  Eye,
  Layers,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Package,
  RefreshCw,
  Copy,
  Check,
  Split,
  Combine,
  ShieldCheck,
  Maximize2,
  Link2
} from 'lucide-react';

interface InvoiceOcrModalProps {
  isOpen: boolean;
  onClose: () => void;
  suppliers: Supplier[];
  ingredients?: Ingredient[];
  onSuccess: () => void;
}

/** Comment l'ingrédient d'une ligne a été déterminé — trace d'audit affichée à l'administrateur. */
type MatchSource = 'mapping' | 'similarity' | 'manual' | 'none';

/** Ligne de facture enrichie avec la provenance du rattachement ingrédient (au-delà de ExtractedInvoiceItem). */
interface OcrLineItem extends ExtractedInvoiceItem {
  matchSource: MatchSource;
  matchScore?: number;
  /** Id de la correspondance mémorisée appliquée, pour incrémenter son compteur d'usage à l'enregistrement. */
  matchedMappingId?: string;
  /** Si coché, une correspondance réutilisable sera mémorisée pour ce fournisseur à l'enregistrement final. */
  rememberMapping: boolean;
}

const normalizeLabelClient = (label: string): string =>
  (label || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Détermine l'ingrédient à rattacher à une ligne, dans l'ordre de confiance : correspondance
 * mémorisée pour ce fournisseur (exacte, la plus fiable) > correspondance déjà proposée par
 * l'extracteur > ressemblance de nom calculée à la volée (seuil 0.55).
 */
function resolveIngredientMatch(
  rawLabel: string,
  extractorMatchedId: string | undefined,
  ingredientsList: Ingredient[],
  activeMappings: ProductLabelMapping[]
): { ingredient?: Ingredient; matchSource: MatchSource; matchScore?: number; mappingId?: string } {
  const norm = normalizeLabelClient(rawLabel);
  const mapping = activeMappings.find(m => m.normalizedLabel === norm);
  if (mapping) {
    const ing = ingredientsList.find(i => i.id === mapping.ingredientId);
    if (ing) return { ingredient: ing, matchSource: 'mapping', matchScore: 1, mappingId: mapping.id };
  }

  if (extractorMatchedId) {
    const ing = ingredientsList.find(i => i.id === extractorMatchedId);
    if (ing) return { ingredient: ing, matchSource: 'similarity' };
  }

  if (rawLabel) {
    let highest = 0;
    let best: Ingredient | undefined;
    for (const ing of ingredientsList) {
      const sim = calculateStringSimilarity(ing.name, rawLabel);
      if (sim > highest && sim >= 0.55) {
        highest = sim;
        best = ing;
      }
    }
    if (best) return { ingredient: best, matchSource: 'similarity', matchScore: highest };
  }

  return { matchSource: 'none' };
}

export const DeterministicInvoiceOcrModal: React.FC<InvoiceOcrModalProps> = ({
  isOpen,
  onClose,
  suppliers,
  ingredients: propIngredients,
  onSuccess
}) => {
  const { currentUser } = useAuth();
  const { showRouteNotification } = useSystem();

  // Step 1: Upload & Extraction, Step 2: Review & Edit, Step 3: Confirmation
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<SupportedFileType>('image');
  const [rawOcrText, setRawOcrText] = useState<string>('');

  // Processing & progress state
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsingProgress, setParsingProgress] = useState<DocumentParsingProgress | null>(null);
  const [parsingError, setParsingError] = useState<string | null>(null);

  // Ingredients state
  const [ingredientsList, setIngredientsList] = useState<Ingredient[]>(propIngredients || []);
  const [isNewIngredientModalOpen, setIsNewIngredientModalOpen] = useState(false);
  const [targetItemIndexForNewIngredient, setTargetItemIndexForNewIngredient] = useState<number | null>(null);
  const [newIngredientForm, setNewIngredientForm] = useState<{
    name: string;
    category: Ingredient['category'];
    unit: string;
    minStockThreshold: number;
    costPerUnit: number;
    supplierId: string;
  }>({
    name: '',
    category: 'coffee',
    unit: 'kg',
    minStockThreshold: 5,
    costPerUnit: 0,
    supplierId: ''
  });

  // Extracted data state
  const [invoiceHeader, setInvoiceHeader] = useState<{
    supplierId: string;
    supplierName: string;
    supplierConfidence: ConfidenceLevel;
    supplierMatchReason?: string;
    invoiceNumber: string;
    invoiceNumberConfidence: ConfidenceLevel;
    invoiceDate: string;
    invoiceDateConfidence: ConfidenceLevel;
    dueDate: string;
    dueDateConfidence: ConfidenceLevel;
    subtotal: number;
    subtotalConfidence: ConfidenceLevel;
    taxAmount: number;
    taxConfidence: ConfidenceLevel;
    totalAmount: number;
    totalConfidence: ConfidenceLevel;
    overallConfidence: ConfidenceLevel;
    updateStock: boolean;
    stockZone: StockZone;
    forceManualTotals: boolean;
    manualSubtotal: number;
    manualTax: number;
    manualTotal: number;
  }>({
    supplierId: '',
    supplierName: '',
    supplierConfidence: 'low',
    invoiceNumber: '',
    invoiceNumberConfidence: 'low',
    invoiceDate: new Date().toISOString().split('T')[0],
    invoiceDateConfidence: 'low',
    dueDate: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
    dueDateConfidence: 'low',
    subtotal: 0,
    subtotalConfidence: 'low',
    taxAmount: 0,
    taxConfidence: 'low',
    totalAmount: 0,
    totalConfidence: 'low',
    overallConfidence: 'low',
    updateStock: true,
    stockZone: 'reserve_principale',
    forceManualTotals: false,
    manualSubtotal: 0,
    manualTax: 0,
    manualTotal: 0
  });

  const [invoiceItems, setInvoiceItems] = useState<OcrLineItem[]>([]);
  const [saving, setSaving] = useState(false);

  // Correspondances produits mémorisées pour le fournisseur actuellement identifié
  const [activeMappings, setActiveMappings] = useState<ProductLabelMapping[]>([]);

  // Viewer controls
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [viewProcessedImage, setViewProcessedImage] = useState(false);
  const [isLoupeActive, setIsLoupeActive] = useState(false);
  const [loupePos, setLoupePos] = useState<{ x: number; y: number; relX: number; relY: number }>({ x: 0, y: 0, relX: 0, relY: 0 });
  const [showRawTextModal, setShowRawTextModal] = useState(false);
  const [copiedRawText, setCopiedRawText] = useState(false);

  const imageContainerRef = useRef<HTMLDivElement>(null);
  const imageElementRef = useRef<HTMLImageElement>(null);

  // Load ingredients if not passed via props
  useEffect(() => {
    if (!propIngredients || propIngredients.length === 0) {
      api.getIngredients().then(data => setIngredientsList(data || [])).catch(() => {});
    } else {
      setIngredientsList(propIngredients);
    }
  }, [propIngredients, isOpen]);

  // Si l'administrateur corrige le fournisseur détecté (ou si l'extraction n'en a trouvé aucun),
  // ré-applique les correspondances mémorisées de ce fournisseur — uniquement sur les lignes encore
  // non rattachées, pour ne jamais écraser une correspondance ou un choix déjà fait.
  useEffect(() => {
    if (currentStep !== 2 || !invoiceHeader.supplierId) return;
    let cancelled = false;
    api.getProductMappings(invoiceHeader.supplierId).then(rows => {
      if (cancelled) return;
      setActiveMappings(rows);
      setInvoiceItems(prev => prev.map(it => {
        if (it.matchSource !== 'none') return it;
        const match = resolveIngredientMatch(it.itemName, undefined, ingredientsList, rows);
        if (!match.ingredient) return it;
        const stockUnit = match.ingredient.unit;
        const conv = convertUnitQuantity(it.quantity, it.unit, stockUnit, it.packageFactor || 1);
        return {
          ...it,
          matchedIngredientId: match.ingredient.id,
          matchedIngredientName: match.ingredient.name,
          matchSource: match.matchSource,
          matchScore: match.matchScore,
          matchedMappingId: match.mappingId,
          rememberMapping: match.matchSource !== 'mapping',
          targetStockUnit: stockUnit,
          targetStockQuantity: conv.convertedQuantity
        };
      }));
    }).catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceHeader.supplierId, currentStep]);

  if (!isOpen) return null;

  // Handle file selection
  const handleFileSelect = async (file: File) => {
    setParsingError(null);
    const validation = validateInvoiceFile(file);
    if (!validation.isValid) {
      setParsingError(validation.error || 'Fichier invalide');
      return;
    }

    setSelectedFile(file);
    setFileType(validation.fileType || 'image');

    try {
      setIsProcessing(true);
      setParsingProgress({
        stage: 'validating',
        progress: 5,
        message: 'Chargement du document...'
      });

      // Parse document locally (Image preprocessing + Tesseract OCR / Native PDF / DOCX)
      const parseResult = await parseDocumentLocally(file, (p) => {
        setParsingProgress(p);
      });

      setPreviewUrl(parseResult.previewUrl);
      setProcessedImageUrl(parseResult.processedImageUrl || null);
      setRawOcrText(parseResult.rawText);

      // Extract structured fields deterministically
      const extraction = DeterministicInvoiceExtractor.extract(
        parseResult.rawText,
        suppliers.map(s => ({ id: s.id, name: s.name, taxNumber: s.taxNumber })),
        ingredientsList.map(i => ({ id: i.id, name: i.name, unit: i.unit, category: i.category, costPerUnit: i.costPerUnit }))
      );

      // Map to form state
      const initialSupplierId = extraction.supplierId.value || suppliers[0]?.id || '';
      const initialSupplierName = extraction.supplierName.value || suppliers[0]?.name || 'Fournisseur Inconnu';

      // Charge les correspondances mémorisées de ce fournisseur AVANT de résoudre les lignes, pour
      // qu'elles priment d'emblée sur la simple ressemblance de nom (jamais de flash visuel trompeur).
      let mappingsForSupplier: ProductLabelMapping[] = [];
      if (initialSupplierId) {
        try {
          mappingsForSupplier = await api.getProductMappings(initialSupplierId);
        } catch { /* pas bloquant : le rattachement manuel reste possible */ }
      }
      setActiveMappings(mappingsForSupplier);

      // Enhance items with stock conversions
      const enhancedItems: OcrLineItem[] = (extraction.items || []).map((item, idx) => {
        const match = resolveIngredientMatch(item.itemName, item.matchedIngredientId, ingredientsList, mappingsForSupplier);
        const matchedIng = match.ingredient;

        const stockUnit = matchedIng ? matchedIng.unit : (item.unit || 'unit');
        const factor = item.packageFactor || 1;
        const conv = convertUnitQuantity(item.quantity, item.unit, stockUnit, factor);

        return {
          ...item,
          id: item.id || `item_${idx}_${Date.now()}`,
          matchedIngredientId: matchedIng?.id,
          matchedIngredientName: matchedIng?.name,
          matchSource: match.matchSource,
          matchScore: match.matchScore,
          matchedMappingId: match.mappingId,
          rememberMapping: match.matchSource !== 'mapping' && !!matchedIng,
          targetStockUnit: stockUnit,
          targetStockQuantity: conv.convertedQuantity,
          packageFactor: factor
        };
      });

      setInvoiceHeader({
        supplierId: initialSupplierId,
        supplierName: initialSupplierName,
        supplierConfidence: extraction.supplierName.confidence,
        supplierMatchReason: extraction.supplierName.matchReason,
        invoiceNumber: extraction.invoiceNumber.value,
        invoiceNumberConfidence: extraction.invoiceNumber.confidence,
        invoiceDate: extraction.invoiceDate.value,
        invoiceDateConfidence: extraction.invoiceDate.confidence,
        dueDate: extraction.dueDate.value,
        dueDateConfidence: extraction.dueDate.confidence,
        subtotal: extraction.subtotal.value,
        subtotalConfidence: extraction.subtotal.confidence,
        taxAmount: extraction.taxAmount.value,
        taxConfidence: extraction.taxAmount.confidence,
        totalAmount: extraction.totalAmount.value,
        totalConfidence: extraction.totalAmount.confidence,
        overallConfidence: extraction.overallConfidence,
        updateStock: true,
        forceManualTotals: false,
        manualSubtotal: extraction.subtotal.value,
        manualTax: extraction.taxAmount.value,
        manualTotal: extraction.totalAmount.value
      });

      setInvoiceItems(enhancedItems);
      setCurrentStep(2);
      showRouteNotification('Analyse déterministe terminée avec succès (100% local)', 'success');
    } catch (err: any) {
      console.error('Invoice extraction failed:', err);
      setParsingError(err.message || 'Erreur lors du traitement du document');
      showRouteNotification(`Erreur d'analyse : ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
      setParsingProgress(null);
    }
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Recalculate line & total amounts dynamically
  const updateItem = (index: number, updates: Partial<OcrLineItem>) => {
    const updated = [...invoiceItems];
    const current = { ...updated[index], ...updates };

    // Recalculate line total if price or qty changed
    if (updates.quantity !== undefined || updates.unitPrice !== undefined) {
      current.totalLinePrice = Number(((current.quantity || 0) * (current.unitPrice || 0)).toFixed(3));
    }

    // Recalculate stock converted quantity
    if (updates.quantity !== undefined || updates.unit !== undefined || updates.packageFactor !== undefined || updates.matchedIngredientId !== undefined) {
      const ing = ingredientsList.find(i => i.id === current.matchedIngredientId);
      const stockUnit = ing ? ing.unit : (current.unit || 'unit');
      const factor = current.packageFactor || 1;
      const conv = convertUnitQuantity(current.quantity, current.unit, stockUnit, factor);
      current.targetStockUnit = stockUnit;
      current.targetStockQuantity = conv.convertedQuantity;
      if (ing) {
        current.matchedIngredientName = ing.name;
      }
    }

    updated[index] = current;
    setInvoiceItems(updated);

    // Auto-update totals if not manually forced
    if (!invoiceHeader.forceManualTotals) {
      const newSubtotal = Number(updated.reduce((sum, it) => sum + (it.totalLinePrice || 0), 0).toFixed(3));
      const newTax = Number(updated.reduce((sum, it) => sum + ((it.totalLinePrice || 0) * ((it.tvaRate || 0) / 100)), 0).toFixed(3));
      const newTotal = Number((newSubtotal + newTax).toFixed(3));

      setInvoiceHeader(prev => ({
        ...prev,
        subtotal: newSubtotal,
        taxAmount: newTax,
        totalAmount: newTotal,
        manualSubtotal: newSubtotal,
        manualTax: newTax,
        manualTotal: newTotal
      }));
    }
  };

  // Line actions: Add, Remove, Split, Merge
  const handleAddItem = () => {
    const newItem: OcrLineItem = {
      id: `item_${Date.now()}_manual`,
      itemName: 'Nouvel article',
      quantity: 1,
      unit: 'unit',
      unitPrice: 0,
      tvaRate: 19,
      totalLinePrice: 0,
      confidence: 'high',
      packageFactor: 1,
      targetStockQuantity: 1,
      targetStockUnit: 'unit',
      matchSource: 'none',
      rememberMapping: false
    };
    setInvoiceItems([...invoiceItems, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    if (invoiceItems.length <= 1) {
      showRouteNotification('Une facture doit contenir au moins une ligne', 'warning');
      return;
    }
    const updated = invoiceItems.filter((_, i) => i !== index);
    setInvoiceItems(updated);

    if (!invoiceHeader.forceManualTotals) {
      const newSubtotal = Number(updated.reduce((sum, it) => sum + (it.totalLinePrice || 0), 0).toFixed(3));
      const newTax = Number(updated.reduce((sum, it) => sum + ((it.totalLinePrice || 0) * ((it.tvaRate || 0) / 100)), 0).toFixed(3));
      setInvoiceHeader(prev => ({
        ...prev,
        subtotal: newSubtotal,
        taxAmount: newTax,
        totalAmount: Number((newSubtotal + newTax).toFixed(3))
      }));
    }
  };

  const handleSplitItem = (index: number) => {
    const target = invoiceItems[index];
    const halfQty = Math.max(1, Math.floor(target.quantity / 2)) || target.quantity / 2;
    const remQty = target.quantity - halfQty;

    const item1: OcrLineItem = {
      ...target,
      id: `split_${Date.now()}_1`,
      quantity: halfQty,
      totalLinePrice: Number((halfQty * target.unitPrice).toFixed(3))
    };

    const item2: OcrLineItem = {
      ...target,
      id: `split_${Date.now()}_2`,
      quantity: remQty,
      totalLinePrice: Number((remQty * target.unitPrice).toFixed(3))
    };

    const updated = [...invoiceItems];
    updated.splice(index, 1, item1, item2);
    setInvoiceItems(updated);
    showRouteNotification('Ligne scindée en deux', 'info');
  };

  const handleMergeWithNext = (index: number) => {
    if (index >= invoiceItems.length - 1) return;
    const current = invoiceItems[index];
    const next = invoiceItems[index + 1];

    const mergedQty = current.quantity + next.quantity;
    const mergedTotal = current.totalLinePrice + next.totalLinePrice;
    const mergedUnitPrice = mergedQty > 0 ? Number((mergedTotal / mergedQty).toFixed(3)) : current.unitPrice;

    const mergedItem: OcrLineItem = {
      ...current,
      itemName: `${current.itemName} + ${next.itemName}`,
      quantity: mergedQty,
      unitPrice: mergedUnitPrice,
      totalLinePrice: mergedTotal,
      confidence: 'medium'
    };

    const updated = [...invoiceItems];
    updated.splice(index, 2, mergedItem);
    setInvoiceItems(updated);
    showRouteNotification('Lignes fusionnées avec succès', 'info');
  };

  // Quick ingredient creation handler
  const handleCreateIngredientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIngredientForm.name.trim()) return;

    try {
      const created = await api.createIngredient({
        name: newIngredientForm.name.trim(),
        category: newIngredientForm.category,
        unit: newIngredientForm.unit,
        currentStock: 0,
        minStockThreshold: Number(newIngredientForm.minStockThreshold) || 5,
        costPerUnit: Number(newIngredientForm.costPerUnit) || 0,
        supplierId: newIngredientForm.supplierId || invoiceHeader.supplierId
      }, currentUser?.name || 'Comptable');

      setIngredientsList(prev => [...prev, created]);

      if (targetItemIndexForNewIngredient !== null) {
        updateItem(targetItemIndexForNewIngredient, {
          matchedIngredientId: created.id,
          matchedIngredientName: created.name,
          targetStockUnit: created.unit,
          matchSource: 'manual',
          matchScore: undefined,
          matchedMappingId: undefined,
          rememberMapping: true
        });
      }

      setIsNewIngredientModalOpen(false);
      setTargetItemIndexForNewIngredient(null);
      showRouteNotification(`Ingrédient "${created.name}" créé et associé`, 'success');
    } catch (err: any) {
      showRouteNotification(`Erreur lors de la création de l'ingrédient: ${err.message}`, 'error');
    }
  };

  // Interactive Loupe (Magnifier) Mouse Move Handler
  const handleImageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isLoupeActive || !imageElementRef.current) return;
    const rect = imageElementRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
      const relX = (x / rect.width) * 100;
      const relY = (y / rect.height) * 100;
      setLoupePos({ x, y, relX, relY });
    }
  };

  // Final confirmation & save to database
  const handleFinalSave = async () => {
    try {
      setSaving(true);
      const subtotalFinal = invoiceHeader.forceManualTotals ? invoiceHeader.manualSubtotal : invoiceHeader.subtotal;
      const taxFinal = invoiceHeader.forceManualTotals ? invoiceHeader.manualTax : invoiceHeader.taxAmount;
      const totalFinal = invoiceHeader.forceManualTotals ? invoiceHeader.manualTotal : invoiceHeader.totalAmount;

      await api.createSupplierInvoice({
        supplierId: invoiceHeader.supplierId,
        supplierName: invoiceHeader.supplierName,
        invoiceNumber: invoiceHeader.invoiceNumber,
        invoiceDate: invoiceHeader.invoiceDate,
        dueDate: invoiceHeader.dueDate,
        subtotal: subtotalFinal,
        taxAmount: taxFinal,
        totalAmount: totalFinal,
        paymentStatus: 'unpaid',
        ocrProcessed: true,
        ocrRawText: rawOcrText,
        stockUpdated: invoiceHeader.updateStock,
        stockZone: invoiceHeader.updateStock ? invoiceHeader.stockZone : undefined,
        attachmentUrl: previewUrl || undefined,
        items: invoiceItems.map(item => ({
          itemName: item.itemName,
          ingredientId: item.matchedIngredientId,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          tvaRate: item.tvaRate,
          totalLinePrice: item.totalLinePrice,
          packageFactor: item.packageFactor || 1,
          convertedStockQuantity: item.targetStockQuantity || item.quantity,
          targetStockUnit: item.targetStockUnit || item.unit,
          unitCostInStockUnit: item.targetStockQuantity && item.targetStockQuantity > 0
            ? Number((item.totalLinePrice / item.targetStockQuantity).toFixed(3))
            : item.unitPrice,
          matchSource: item.matchSource
        }))
      }, currentUser?.name || 'Comptable');

      // Mémorise les nouvelles correspondances validées par l'administrateur (checkbox cochée), et
      // trace l'usage de celles déjà mémorisées — jamais bloquant pour l'enregistrement de la facture.
      const performedBy = currentUser?.name || 'Comptable';
      await Promise.allSettled(
        invoiceItems
          .filter(item => !!item.matchedIngredientId)
          .map(item => {
            if (item.matchSource === 'mapping' && item.matchedMappingId) {
              return api.recordProductMappingUsage(item.matchedMappingId);
            }
            if (item.rememberMapping) {
              return api.upsertProductMapping({
                supplierId: invoiceHeader.supplierId,
                supplierName: invoiceHeader.supplierName,
                rawLabel: item.itemName,
                ingredientId: item.matchedIngredientId!,
                ingredientName: item.matchedIngredientName || ''
              }, performedBy);
            }
            return Promise.resolve();
          })
      );

      showRouteNotification(
        `Facture ${invoiceHeader.invoiceNumber} enregistrée avec succès ${invoiceHeader.updateStock ? '(Stock mis à jour)' : ''}`,
        'success'
      );

      onSuccess();
      onClose();
    } catch (err: any) {
      showRouteNotification(`Erreur lors de l'enregistrement : ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Helper for confidence badge
  const renderConfidenceBadge = (level: ConfidenceLevel, reason?: string) => {
    if (level === 'high') {
      return (
        <span
          title={reason || 'Reconnaissance exacte et validée'}
          className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300"
        >
          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
          <span>Élevé</span>
        </span>
      );
    }
    if (level === 'medium') {
      return (
        <span
          title={reason || 'Déduit par position ou similarité'}
          className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300"
        >
          <AlertCircle className="w-2.5 h-2.5 text-amber-600" />
          <span>Moyen</span>
        </span>
      );
    }
    return (
      <span
        title={reason || 'À vérifier impérativement (confiance faible)'}
        className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse"
      >
        <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />
        <span>À vérifier</span>
      </span>
    );
  };

  const activeDisplayImage = viewProcessedImage && processedImageUrl ? processedImageUrl : previewUrl;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-[#F2F3F0] rounded-2xl w-full max-w-7xl max-h-[96vh] shadow-2xl border border-[#C7CDC8] flex flex-col overflow-hidden">
        
        {/* HEADER */}
        <div className="px-5 py-3.5 bg-white border-b border-[#D9DDD8] flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-[#55A9C0]/15 text-[#252A27] border border-[#55A9C0]/40 flex items-center justify-center">
              <FileText className="w-5 h-5 text-[#55A9C0]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-serif font-black text-sm text-[#252A27]">
                  Numérisation & OCR Facture
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-[#A4DEC2]/40 text-[#252A27] border border-[#A4DEC2]">
                  100% Local • Sans IA
                </span>
              </div>
              <p className="text-[11px] text-[#555D58]">
                Extraction déterministe (Images, PDF, DOCX) avec prévisualisation et correction obligatoire
              </p>
            </div>
          </div>

          {/* Stepper indicator */}
          <div className="hidden md:flex items-center space-x-2 text-xs font-bold">
            <span className={`px-2.5 py-1 rounded-lg ${currentStep === 1 ? 'bg-[#252A27] text-white' : 'bg-[#ECEEEA] text-[#555D58]'}`}>
              1. Téléversement
            </span>
            <span className="text-[#C7CDC8]">→</span>
            <span className={`px-2.5 py-1 rounded-lg ${currentStep === 2 ? 'bg-[#252A27] text-white' : 'bg-[#ECEEEA] text-[#555D58]'}`}>
              2. Prévisualisation & Correction
            </span>
            <span className="text-[#C7CDC8]">→</span>
            <span className={`px-2.5 py-1 rounded-lg ${currentStep === 3 ? 'bg-[#252A27] text-white' : 'bg-[#ECEEEA] text-[#555D58]'}`}>
              3. Confirmation
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#ECEEEA] hover:bg-[#D9DDD8] text-[#252A27] transition-colors border border-[#D9DDD8]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-hidden flex flex-col p-4">

          {/* STEP 1: UPLOAD & EXTRACTION */}
          {currentStep === 1 && (
            <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full py-6">
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="w-full border-2 border-dashed border-[#C7CDC8] hover:border-[#55A9C0] rounded-2xl p-8 text-center bg-white shadow-xs transition-all relative group cursor-pointer"
              >
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  disabled={isProcessing}
                  className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />

                <div className="w-16 h-16 rounded-2xl bg-[#55A9C0]/10 text-[#55A9C0] flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform border border-[#55A9C0]/30">
                  <Upload className="w-8 h-8" />
                </div>

                <h4 className="text-base font-bold text-[#252A27]">
                  Glissez-déposez votre facture ici
                </h4>
                <p className="text-xs text-[#555D58] mt-1">
                  ou cliquez pour parcourir vos fichiers depuis votre ordinateur
                </p>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <span className="px-2 py-1 rounded-md bg-[#F2F3F0] text-[#252A27] text-[11px] font-bold border border-[#D9DDD8]">
                    Images : PNG, JPG, WEBP
                  </span>
                  <span className="px-2 py-1 rounded-md bg-[#F2F3F0] text-[#252A27] text-[11px] font-bold border border-[#D9DDD8]">
                    PDF : Texte natif & Scanné
                  </span>
                  <span className="px-2 py-1 rounded-md bg-[#F2F3F0] text-[#252A27] text-[11px] font-bold border border-[#D9DDD8]">
                    Word : DOCX
                  </span>
                  <span className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200">
                    Max 20 Mo
                  </span>
                </div>
              </div>

              {/* Progress Bar / Processing Stage */}
              {isProcessing && parsingProgress && (
                <div className="w-full mt-6 bg-white p-4 rounded-xl border border-[#D9DDD8] shadow-xs space-y-2.5 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs font-bold text-[#252A27]">
                    <div className="flex items-center space-x-2">
                      <RefreshCw className="w-3.5 h-3.5 text-[#55A9C0] animate-spin" />
                      <span>{parsingProgress.message}</span>
                    </div>
                    <span className="font-mono text-[#55A9C0]">{parsingProgress.progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-[#ECEEEA] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#55A9C0] to-[#A4DEC2] transition-all duration-300 rounded-full"
                      style={{ width: `${parsingProgress.progress}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-[#555D58]">
                    Traitement 100% sécurisé et local exécuté sur votre machine sans appel à un service tiers.
                  </p>
                </div>
              )}

              {/* Error Box */}
              {parsingError && (
                <div className="w-full mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-start space-x-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Erreur de lecture du document</p>
                    <p className="text-[11px] text-rose-700 mt-0.5">{parsingError}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: SIDE-BY-SIDE REVIEW & CORRECTION */}
          {currentStep === 2 && (
            <div className="flex-1 flex flex-col md:flex-row gap-4 overflow-hidden">

              {/* LEFT COLUMN: INTERACTIVE DOCUMENT VIEWER WITH LOUPE */}
              <div className="w-full md:w-1/2 flex flex-col bg-white rounded-xl border border-[#D9DDD8] overflow-hidden shadow-xs">
                {/* Viewer Toolbar */}
                <div className="p-2.5 bg-[#F2F3F0] border-b border-[#D9DDD8] flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-1.5">
                    <span className="font-bold text-[#252A27] truncate max-w-[160px]" title={selectedFile?.name}>
                      {selectedFile?.name}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-white text-[10px] font-bold text-[#555D58] border border-[#D9DDD8] uppercase">
                      {fileType}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1">
                    {/* Zoom controls */}
                    <button
                      type="button"
                      onClick={() => setZoomLevel(prev => Math.max(0.6, prev - 0.2))}
                      title="Zoom arrière"
                      className="p-1 rounded bg-white hover:bg-[#ECEEEA] text-[#252A27] border border-[#D9DDD8]"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[11px] font-mono px-1 font-bold">{Math.round(zoomLevel * 100)}%</span>
                    <button
                      type="button"
                      onClick={() => setZoomLevel(prev => Math.min(3, prev + 0.2))}
                      title="Zoom avant"
                      className="p-1 rounded bg-white hover:bg-[#ECEEEA] text-[#252A27] border border-[#D9DDD8]"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setRotation(prev => (prev + 90) % 360)}
                      title="Pivoter 90°"
                      className="p-1 rounded bg-white hover:bg-[#ECEEEA] text-[#252A27] border border-[#D9DDD8]"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>

                    {/* Loupe tool toggle */}
                    <button
                      type="button"
                      onClick={() => setIsLoupeActive(!isLoupeActive)}
                      title="Activer la loupe d'inspection (zoom x2.5)"
                      className={`px-2 py-1 rounded text-[11px] font-bold flex items-center space-x-1 border ${
                        isLoupeActive
                          ? 'bg-[#55A9C0] text-white border-[#55A9C0]'
                          : 'bg-white hover:bg-[#ECEEEA] text-[#252A27] border-[#D9DDD8]'
                      }`}
                    >
                      <Eye className="w-3 h-3" />
                      <span>Loupe</span>
                    </button>

                    {/* Processed binarized view toggle */}
                    {processedImageUrl && (
                      <button
                        type="button"
                        onClick={() => setViewProcessedImage(!viewProcessedImage)}
                        title="Basculer entre original et image binarisée/prétraitée"
                        className={`px-2 py-1 rounded text-[11px] font-bold flex items-center space-x-1 border ${
                          viewProcessedImage
                            ? 'bg-[#252A27] text-white border-[#252A27]'
                            : 'bg-white hover:bg-[#ECEEEA] text-[#252A27] border-[#D9DDD8]'
                        }`}
                      >
                        <Layers className="w-3 h-3" />
                        <span>{viewProcessedImage ? 'Binarisé' : 'Original'}</span>
                      </button>
                    )}

                    {/* View raw text button */}
                    <button
                      type="button"
                      onClick={() => setShowRawTextModal(true)}
                      title="Voir le texte brut intégral extrait"
                      className="p-1 rounded bg-white hover:bg-[#ECEEEA] text-[#252A27] border border-[#D9DDD8]"
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Viewer Canvas Container */}
                <div
                  ref={imageContainerRef}
                  onMouseMove={handleImageMouseMove}
                  className="flex-1 overflow-auto p-4 bg-[#2A2E2C] flex items-center justify-center relative select-none"
                >
                  {activeDisplayImage ? (
                    <div className="relative inline-block">
                      <img
                        ref={imageElementRef}
                        src={activeDisplayImage}
                        alt="Facture originale"
                        style={{
                          transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                          transformOrigin: 'center center',
                          transition: 'transform 0.15s ease-out'
                        }}
                        className="max-h-[75vh] max-w-full object-contain rounded shadow-lg"
                      />

                      {/* Loupe Lens Overlay */}
                      {isLoupeActive && activeDisplayImage && (
                        <div
                          style={{
                            left: `${loupePos.x - 70}px`,
                            top: `${loupePos.y - 70}px`,
                            backgroundImage: `url(${activeDisplayImage})`,
                            backgroundPosition: `${loupePos.relX}% ${loupePos.relY}%`,
                            backgroundSize: `${(imageElementRef.current?.clientWidth || 400) * 2.8}px auto`,
                            pointerEvents: 'none'
                          }}
                          className="absolute w-36 h-36 rounded-full border-3 border-[#55A9C0] shadow-2xl z-30 bg-no-repeat overflow-hidden ring-4 ring-black/40"
                        />
                      )}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-white/80 space-y-2">
                      <FileText className="w-12 h-12 mx-auto text-[#55A9C0]" />
                      <p className="font-bold text-sm">Document numérique : {selectedFile?.name}</p>
                      <p className="text-xs text-white/60">
                        Le texte a été extrait directement depuis la structure du fichier {fileType.toUpperCase()}.
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowRawTextModal(true)}
                        className="mt-2 px-3 py-1.5 rounded-lg bg-[#55A9C0] text-white text-xs font-bold shadow-xs"
                      >
                        Consulter le texte extrait ({rawOcrText.split('\n').length} lignes)
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: EDITABLE FORM & CORRECTION */}
              <div className="w-full md:w-1/2 flex flex-col bg-white rounded-xl border border-[#D9DDD8] overflow-hidden shadow-xs">
                
                {/* Review Header Banner */}
                <div className="p-3 bg-emerald-50/80 border-b border-emerald-200 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <div>
                      <span className="font-bold text-emerald-950">Vérification des champs extraits</span>
                      <p className="text-[11px] text-emerald-800">
                        Passez en revue les montants, lignes et correspondances d'ingrédients avant validation.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1.5 shrink-0">
                    <span className="text-[11px] font-bold text-[#555D58]">Confiance globale :</span>
                    {renderConfidenceBadge(invoiceHeader.overallConfidence)}
                  </div>
                </div>

                {/* Form Fields Scroll Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">

                  {/* HEADER FIELDS */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-[#F2F3F0] rounded-xl border border-[#D9DDD8]">
                    
                    {/* Supplier */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-[#252A27]">Fournisseur</label>
                        {renderConfidenceBadge(invoiceHeader.supplierConfidence, invoiceHeader.supplierMatchReason)}
                      </div>
                      <select
                        value={invoiceHeader.supplierId}
                        onChange={e => {
                          const sup = suppliers.find(s => s.id === e.target.value);
                          setInvoiceHeader({
                            ...invoiceHeader,
                            supplierId: e.target.value,
                            supplierName: sup ? sup.name : invoiceHeader.supplierName,
                            supplierConfidence: 'high'
                          });
                        }}
                        className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg font-bold text-[#252A27] focus:ring-1 focus:ring-[#55A9C0]"
                      >
                        {suppliers.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Invoice Number */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-[#252A27]">N° de Facture</label>
                        {renderConfidenceBadge(invoiceHeader.invoiceNumberConfidence)}
                      </div>
                      <input
                        type="text"
                        required
                        value={invoiceHeader.invoiceNumber}
                        onChange={e => setInvoiceHeader({ ...invoiceHeader, invoiceNumber: e.target.value })}
                        className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg font-mono font-bold text-[#252A27] focus:ring-1 focus:ring-[#55A9C0]"
                      />
                    </div>

                    {/* Dates */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-[#252A27]">Date d'émission</label>
                        {renderConfidenceBadge(invoiceHeader.invoiceDateConfidence)}
                      </div>
                      <input
                        type="date"
                        required
                        value={invoiceHeader.invoiceDate}
                        onChange={e => setInvoiceHeader({ ...invoiceHeader, invoiceDate: e.target.value })}
                        className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg font-semibold text-[#252A27]"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-[#252A27]">Date d'échéance</label>
                        {renderConfidenceBadge(invoiceHeader.dueDateConfidence)}
                      </div>
                      <input
                        type="date"
                        required
                        value={invoiceHeader.dueDate}
                        onChange={e => setInvoiceHeader({ ...invoiceHeader, dueDate: e.target.value })}
                        className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg font-semibold text-[#252A27]"
                      />
                    </div>
                  </div>

                  {/* LINE ITEMS TABLE */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Package className="w-4 h-4 text-[#55A9C0]" />
                        <h4 className="font-bold text-[#252A27] uppercase tracking-wide text-[11px]">
                          Lignes Articles & Rattachement Ingrédients ({invoiceItems.length})
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddItem}
                        className="px-2.5 py-1 rounded-lg bg-[#A4DEC2] hover:bg-[#8BCFAE] text-[#252A27] text-[11px] font-bold flex items-center space-x-1 border border-[#8BCFAE] shadow-2xs"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Ajouter une ligne</span>
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {invoiceItems.map((item, idx) => {
                        const matchedIngredient = ingredientsList.find(i => i.id === item.matchedIngredientId);

                        return (
                          <div
                            key={item.id || idx}
                            className="p-3 bg-[#F2F3F0]/60 rounded-xl border border-[#D9DDD8] hover:border-[#55A9C0] transition-colors space-y-2.5"
                          >
                            {/* Line top bar */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <span className="w-5 h-5 rounded-full bg-[#252A27] text-white flex items-center justify-center font-mono text-[10px] font-bold">
                                  {idx + 1}
                                </span>
                                <span className="font-bold text-[#252A27]">Ligne d'article</span>
                                {renderConfidenceBadge(item.confidence)}
                              </div>

                              {/* Row action tools */}
                              <div className="flex items-center space-x-1">
                                <button
                                  type="button"
                                  onClick={() => handleSplitItem(idx)}
                                  title="Scinder cette ligne en deux"
                                  className="p-1 rounded bg-white hover:bg-[#ECEEEA] text-[#555D58] border border-[#D9DDD8]"
                                >
                                  <Split className="w-3 h-3" />
                                </button>
                                {idx < invoiceItems.length - 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleMergeWithNext(idx)}
                                    title="Fusionner avec la ligne suivante"
                                    className="p-1 rounded bg-white hover:bg-[#ECEEEA] text-[#555D58] border border-[#D9DDD8]"
                                  >
                                    <Combine className="w-3 h-3" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(idx)}
                                  title="Supprimer la ligne"
                                  className="p-1 rounded bg-white hover:bg-rose-100 text-rose-600 border border-[#D9DDD8]"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            {/* Line item inputs */}
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                              {/* Item designation on invoice */}
                              <div className="sm:col-span-5 space-y-1">
                                <label className="text-[10px] font-bold text-[#555D58]">
                                  Désignation sur facture
                                </label>
                                <input
                                  type="text"
                                  value={item.itemName}
                                  onChange={e => updateItem(idx, { itemName: e.target.value })}
                                  placeholder="Nom de l'article"
                                  className="w-full p-1.5 bg-white border border-[#D9DDD8] rounded-lg font-bold text-[#252A27]"
                                />
                              </div>

                              {/* Ingredient mapping */}
                              <div className="sm:col-span-7 space-y-1">
                                <div className="flex items-center justify-between">
                                  <label className="text-[10px] font-bold text-[#555D58]">
                                    Ingrédient de stock lié
                                  </label>
                                </div>

                                <IngredientPicker
                                  ingredients={ingredientsList}
                                  value={item.matchedIngredientId}
                                  contextLabel={item.itemName}
                                  onChange={(id, ing) => {
                                    updateItem(idx, {
                                      matchedIngredientId: id,
                                      matchedIngredientName: ing?.name,
                                      matchSource: id ? 'manual' : 'none',
                                      matchScore: undefined,
                                      matchedMappingId: undefined,
                                      rememberMapping: !!id
                                    });
                                  }}
                                  onCreateNew={() => {
                                    setTargetItemIndexForNewIngredient(idx);
                                    setNewIngredientForm({
                                      name: item.itemName,
                                      category: 'coffee',
                                      unit: item.unit === 'carton' || item.unit === 'sac' ? 'kg' : (item.unit || 'kg'),
                                      minStockThreshold: 5,
                                      costPerUnit: item.unitPrice || 0,
                                      supplierId: invoiceHeader.supplierId
                                    });
                                    setIsNewIngredientModalOpen(true);
                                  }}
                                />

                                {/* Provenance du rattachement + mémorisation pour les prochaines factures */}
                                {item.matchedIngredientId && (
                                  <div className="flex items-center justify-between gap-2 pt-0.5 flex-wrap">
                                    {item.matchSource === 'mapping' ? (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-300">
                                        <Link2 className="w-2.5 h-2.5" />
                                        <span>Correspondance mémorisée</span>
                                      </span>
                                    ) : item.matchSource === 'similarity' ? (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#ECEEEA] text-[#555D58] border border-[#D9DDD8]">
                                        <span>Suggestion automatique{item.matchScore ? ` (${Math.round(item.matchScore * 100)}%)` : ''}</span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#ECEEEA] text-[#555D58] border border-[#D9DDD8]">
                                        <span>Choix manuel</span>
                                      </span>
                                    )}

                                    {item.matchSource !== 'mapping' && (
                                      <label className="flex items-center gap-1.5 text-[10px] font-semibold text-[#555D58] cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={item.rememberMapping}
                                          onChange={e => updateItem(idx, { rememberMapping: e.target.checked })}
                                          className="w-3 h-3"
                                        />
                                        <span>Mémoriser pour {invoiceHeader.supplierName}</span>
                                      </label>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Quantities, Units, Conditionnement & Prices */}
                            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-1 border-t border-[#D9DDD8]/60">
                              {/* Invoice Quantity */}
                              <div className="space-y-0.5">
                                <label className="text-[10px] font-bold text-[#555D58]">Qté Facture</label>
                                <input
                                  type="number"
                                  step="any"
                                  min="0.001"
                                  value={item.quantity}
                                  onChange={e => updateItem(idx, { quantity: parseFloat(e.target.value) || 0 })}
                                  className="w-full p-1.5 bg-white border border-[#D9DDD8] rounded-lg font-bold text-[#252A27]"
                                />
                              </div>

                              {/* Invoice Unit */}
                              <div className="space-y-0.5">
                                <label className="text-[10px] font-bold text-[#555D58]">Unité Facture</label>
                                <select
                                  value={item.unit}
                                  onChange={e => updateItem(idx, { unit: e.target.value })}
                                  className="w-full p-1.5 bg-white border border-[#D9DDD8] rounded-lg font-semibold text-[#252A27]"
                                >
                                  {STANDARD_UNITS.map(u => (
                                    <option key={u.value} value={u.value}>
                                      {u.label}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* Packaging Multiplier Factor */}
                              <div className="space-y-0.5">
                                <label className="text-[10px] font-bold text-[#555D58]">
                                  Facteur (1 {item.unit} = x)
                                </label>
                                <input
                                  type="number"
                                  step="any"
                                  min="0.001"
                                  value={item.packageFactor || 1}
                                  onChange={e => updateItem(idx, { packageFactor: parseFloat(e.target.value) || 1 })}
                                  className="w-full p-1.5 bg-white border border-[#D9DDD8] rounded-lg font-semibold text-[#252A27]"
                                />
                              </div>

                              {/* Unit Price HT */}
                              <div className="space-y-0.5">
                                <label className="text-[10px] font-bold text-[#555D58]">P.U. HT (DT)</label>
                                <input
                                  type="number"
                                  step="0.001"
                                  value={item.unitPrice}
                                  onChange={e => updateItem(idx, { unitPrice: parseFloat(e.target.value) || 0 })}
                                  className="w-full p-1.5 bg-white border border-[#D9DDD8] rounded-lg font-bold text-[#252A27]"
                                />
                              </div>

                              {/* TVA Rate */}
                              <div className="space-y-0.5">
                                <label className="text-[10px] font-bold text-[#555D58]">TVA %</label>
                                <select
                                  value={item.tvaRate}
                                  onChange={e => updateItem(idx, { tvaRate: parseFloat(e.target.value) || 0 })}
                                  className="w-full p-1.5 bg-white border border-[#D9DDD8] rounded-lg font-semibold text-[#252A27]"
                                >
                                  <option value="0">0%</option>
                                  <option value="7">7%</option>
                                  <option value="13">13%</option>
                                  <option value="19">19%</option>
                                </select>
                              </div>

                              {/* Line Total Price */}
                              <div className="space-y-0.5">
                                <label className="text-[10px] font-bold text-[#555D58]">Total HT</label>
                                <div className="p-1.5 bg-white border border-[#D9DDD8] rounded-lg font-mono font-bold text-[#252A27] text-right">
                                  {item.totalLinePrice.toFixed(3)} DT
                                </div>
                              </div>
                            </div>

                            {/* Resulting Stock preview banner */}
                            {matchedIngredient && (
                              <div className="px-2.5 py-1.5 bg-emerald-100/70 border border-emerald-300 rounded-lg flex items-center justify-between text-[11px] text-emerald-900 font-medium">
                                <div className="flex items-center space-x-1.5">
                                  <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                                  <span>
                                    Impact stock : <strong>+{item.targetStockQuantity} {matchedIngredient.unit}</strong> pour <em>{matchedIngredient.name}</em>
                                  </span>
                                </div>
                                <span className="text-[10px] text-emerald-700">
                                  (Unité de stock <strong>{matchedIngredient.unit}</strong> inchangée)
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* TOTALS SECTION */}
                  <div className="p-4 bg-[#F2F3F0] rounded-xl border border-[#D9DDD8] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <DollarSign className="w-4 h-4 text-[#55A9C0]" />
                        <h4 className="font-bold text-[#252A27] text-xs">Totaux & Récapitulatif Financier</h4>
                      </div>

                      <label className="flex items-center space-x-2 text-[11px] font-semibold text-[#555D58] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={invoiceHeader.forceManualTotals}
                          onChange={e => setInvoiceHeader({ ...invoiceHeader, forceManualTotals: e.target.checked })}
                          className="rounded text-[#55A9C0]"
                        />
                        <span>Forcer manuellement les totaux</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-[#252A27]">Sous-Total HT (DT)</label>
                          {!invoiceHeader.forceManualTotals && renderConfidenceBadge(invoiceHeader.subtotalConfidence)}
                        </div>
                        <input
                          type="number"
                          step="0.001"
                          disabled={!invoiceHeader.forceManualTotals}
                          value={invoiceHeader.forceManualTotals ? invoiceHeader.manualSubtotal : invoiceHeader.subtotal}
                          onChange={e => setInvoiceHeader({ ...invoiceHeader, manualSubtotal: parseFloat(e.target.value) || 0 })}
                          className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg font-bold text-[#252A27] disabled:bg-[#ECEEEA]"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-[#252A27]">Montant TVA (DT)</label>
                          {!invoiceHeader.forceManualTotals && renderConfidenceBadge(invoiceHeader.taxConfidence)}
                        </div>
                        <input
                          type="number"
                          step="0.001"
                          disabled={!invoiceHeader.forceManualTotals}
                          value={invoiceHeader.forceManualTotals ? invoiceHeader.manualTax : invoiceHeader.taxAmount}
                          onChange={e => setInvoiceHeader({ ...invoiceHeader, manualTax: parseFloat(e.target.value) || 0 })}
                          className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg font-bold text-[#252A27] disabled:bg-[#ECEEEA]"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-[#252A27]">Total TTC (DT)</label>
                          {!invoiceHeader.forceManualTotals && renderConfidenceBadge(invoiceHeader.totalConfidence)}
                        </div>
                        <input
                          type="number"
                          step="0.001"
                          disabled={!invoiceHeader.forceManualTotals}
                          value={invoiceHeader.forceManualTotals ? invoiceHeader.manualTotal : invoiceHeader.totalAmount}
                          onChange={e => setInvoiceHeader({ ...invoiceHeader, manualTotal: parseFloat(e.target.value) || 0 })}
                          className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg font-mono font-black text-[#252A27] text-sm disabled:bg-[#ECEEEA]"
                        />
                      </div>
                    </div>

                    {/* Stock update checkbox */}
                    <div className="pt-2 border-t border-[#D9DDD8] flex items-center justify-between">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={invoiceHeader.updateStock}
                          onChange={e => setInvoiceHeader({ ...invoiceHeader, updateStock: e.target.checked })}
                          className="w-4 h-4 rounded text-[#55A9C0]"
                        />
                        <span className="text-xs font-bold text-[#252A27]">
                          Mettre à jour le stock automatiquement pour les articles rattachés
                        </span>
                      </label>
                      <span className="text-[11px] text-[#555D58]">
                        ({invoiceItems.filter(i => !!i.matchedIngredientId).length} article(s) lié(s))
                      </span>
                    </div>

                    {invoiceHeader.updateStock && (
                      <div className="pt-2 space-y-1">
                        <label className="text-[11px] font-bold text-[#252A27]">Zone de réception du stock</label>
                        <div className="grid grid-cols-2 gap-2">
                          {STOCK_ZONES.map(z => (
                            <button
                              key={z}
                              type="button"
                              onClick={() => setInvoiceHeader({ ...invoiceHeader, stockZone: z })}
                              className={`p-2 rounded-lg border text-xs font-bold transition-all ${
                                invoiceHeader.stockZone === z
                                  ? 'bg-[#252A27] text-[#A4DEC2] border-[#252A27]'
                                  : 'bg-white text-[#252A27] border-[#D9DDD8]'
                              }`}
                            >
                              {ZONE_LABELS[z]}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Step Actions */}
                <div className="p-3 bg-[#F2F3F0] border-t border-[#D9DDD8] flex items-center justify-between shrink-0">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="px-4 py-2 rounded-lg bg-[#ECEEEA] hover:bg-[#D9DDD8] text-xs font-bold text-[#252A27] border border-[#D9DDD8] flex items-center space-x-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Changer de fichier</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="px-5 py-2 rounded-lg bg-[#252A27] hover:bg-black text-white text-xs font-bold flex items-center space-x-2 shadow-xs transition-colors"
                  >
                    <span>Continuer vers la Confirmation</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: FINAL CONFIRMATION BEFORE DATABASE WRITE */}
          {currentStep === 3 && (
            <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full py-4 overflow-y-auto space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-1">
                <div className="flex items-center space-x-2 text-emerald-950 font-bold text-sm">
                  <ShieldCheck className="w-5 h-5 text-emerald-700" />
                  <span>Confirmation finale & Enregistrement</span>
                </div>
                <p className="text-xs text-emerald-800">
                  Vérifiez le récapitulatif comptable ci-dessous. Aucune donnée n'a encore été écrite en base de données.
                </p>
                {invoiceItems.some(i => i.matchedIngredientId && i.rememberMapping && i.matchSource !== 'mapping') && (
                  <p className="text-[11px] text-emerald-800 flex items-center gap-1 pt-1">
                    <Link2 className="w-3 h-3 shrink-0" />
                    <span>
                      {invoiceItems.filter(i => i.matchedIngredientId && i.rememberMapping && i.matchSource !== 'mapping').length} nouvelle(s) correspondance(s) produit seront mémorisées pour {invoiceHeader.supplierName} — plus besoin de les re-rattacher sur les prochaines factures.
                    </span>
                  </p>
                )}
              </div>

              {/* Invoice Summary Card */}
              <div className="bg-white rounded-xl p-4 border border-[#D9DDD8] shadow-xs space-y-3">
                <h4 className="font-bold text-[#252A27] text-xs uppercase tracking-wide">
                  Détails de la Facture
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[11px] text-[#555D58] block">Fournisseur :</span>
                    <strong className="text-[#252A27]">{invoiceHeader.supplierName}</strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#555D58] block">N° Facture :</span>
                    <strong className="font-mono text-[#252A27]">{invoiceHeader.invoiceNumber}</strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#555D58] block">Date d'émission :</span>
                    <strong className="text-[#252A27]">{invoiceHeader.invoiceDate}</strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#555D58] block">Date d'échéance :</span>
                    <strong className="text-[#252A27]">{invoiceHeader.dueDate}</strong>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#ECEEEA] flex items-center justify-between">
                  <span className="text-xs font-bold text-[#555D58]">Montant Total TTC à payer :</span>
                  <span className="text-base font-serif font-black text-[#252A27]">
                    {(invoiceHeader.forceManualTotals ? invoiceHeader.manualTotal : invoiceHeader.totalAmount).toFixed(3)} DT
                  </span>
                </div>
              </div>

              {/* Stock Movements Projection Card */}
              {invoiceHeader.updateStock && (
                <div className="bg-white rounded-xl p-4 border border-[#D9DDD8] shadow-xs space-y-3">
                  <h4 className="font-bold text-[#252A27] text-xs uppercase tracking-wide flex items-center space-x-2">
                    <Package className="w-4 h-4 text-[#55A9C0]" />
                    <span>Mouvements d'entrée de stock qui seront générés</span>
                  </h4>

                  <div className="border border-[#ECEEEA] rounded-xl overflow-hidden divide-y divide-[#ECEEEA] text-xs">
                    {invoiceItems.map((item, idx) => {
                      const matchedIng = ingredientsList.find(i => i.id === item.matchedIngredientId);

                      if (!matchedIng) {
                        return (
                          <div key={idx} className="p-2.5 flex items-center justify-between bg-[#F2F3F0]/40 text-[#555D58]">
                            <span>{item.itemName} ({item.quantity} {item.unit})</span>
                            <span className="italic text-[11px]">Non lié à un ingrédient de stock</span>
                          </div>
                        );
                      }

                      const prevStock = matchedIng.currentStock;
                      const added = item.targetStockQuantity || item.quantity;
                      const nextStock = Number((prevStock + added).toFixed(3));

                      return (
                        <div key={idx} className="p-2.5 flex items-center justify-between bg-white">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <strong className="text-[#252A27]">{matchedIng.name}</strong>
                            <span className="text-[11px] text-[#555D58]">
                              (Livré : {item.quantity} {item.unit})
                            </span>
                            {item.matchSource === 'mapping' && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-100 text-sky-800 border border-sky-300">
                                <Link2 className="w-2.5 h-2.5" />
                                <span>Correspondance mémorisée</span>
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-emerald-700 font-mono">+{added} {matchedIng.unit}</span>
                            <span className="text-[11px] text-[#555D58] ml-2">
                              (Stock : {prevStock} → <strong>{nextStock} {matchedIng.unit}</strong>)
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-3 flex space-x-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="flex-1 py-2.5 rounded-xl bg-[#ECEEEA] hover:bg-[#D9DDD8] text-xs font-bold text-[#252A27] border border-[#D9DDD8] flex items-center justify-center space-x-1.5 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Retour aux modifications</span>
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={handleFinalSave}
                  className="flex-1 py-2.5 rounded-xl bg-[#A4DEC2] hover:bg-[#8BCFAE] text-[#252A27] text-xs font-bold transition-all shadow-sm flex items-center justify-center space-x-2 border border-[#8BCFAE] disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-800" />
                  <span>{saving ? 'Enregistrement en cours...' : 'Valider & Enregistrer Définitivement'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* QUICK NEW INGREDIENT MODAL */}
      {isNewIngredientModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#F2F3F0] rounded-2xl p-5 max-w-md w-full shadow-2xl border border-[#C7CDC8] animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#D9DDD8]">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-[#55A9C0]/20 text-[#55A9C0] flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <h4 className="font-serif font-black text-sm text-[#252A27]">
                  Créer une fiche ingrédient
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsNewIngredientModalOpen(false)}
                className="p-1 rounded-lg bg-[#ECEEEA] text-[#252A27] border border-[#D9DDD8]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleCreateIngredientSubmit} className="py-3 space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-[#252A27]">Nom de l'ingrédient *</label>
                <input
                  type="text"
                  required
                  value={newIngredientForm.name}
                  onChange={e => setNewIngredientForm({ ...newIngredientForm, name: e.target.value })}
                  className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg font-bold text-[#252A27]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-[#252A27]">Catégorie</label>
                  <select
                    value={newIngredientForm.category}
                    onChange={e => setNewIngredientForm({ ...newIngredientForm, category: e.target.value as Ingredient['category'] })}
                    className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg font-semibold text-[#252A27]"
                  >
                    {INGREDIENT_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{INGREDIENT_CATEGORY_LABELS[cat]}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#252A27]">Unité de stock *</label>
                  <select
                    value={newIngredientForm.unit}
                    onChange={e => setNewIngredientForm({ ...newIngredientForm, unit: e.target.value })}
                    className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg font-semibold text-[#252A27]"
                  >
                    <option value="kg">Kilogramme (kg)</option>
                    <option value="g">Gramme (g)</option>
                    <option value="L">Litre (L)</option>
                    <option value="cl">Centilitre (cl)</option>
                    <option value="ml">Millilitre (ml)</option>
                    <option value="unit">Unité / Pièce</option>
                    <option value="portion">Portion</option>
                    <option value="bouteille">Bouteille</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-[#252A27]">Seuil d'alerte stock bas</label>
                  <input
                    type="number"
                    step="any"
                    value={newIngredientForm.minStockThreshold}
                    onChange={e => setNewIngredientForm({ ...newIngredientForm, minStockThreshold: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg font-semibold text-[#252A27]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#252A27]">Coût unitaire HT initial</label>
                  <input
                    type="number"
                    step="0.001"
                    value={newIngredientForm.costPerUnit}
                    onChange={e => setNewIngredientForm({ ...newIngredientForm, costPerUnit: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg font-semibold text-[#252A27]"
                  />
                </div>
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsNewIngredientModalOpen(false)}
                  className="flex-1 py-2 rounded-lg bg-[#ECEEEA] text-[#252A27] font-bold border border-[#D9DDD8]"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-lg bg-[#A4DEC2] hover:bg-[#8BCFAE] text-[#252A27] font-bold border border-[#8BCFAE] shadow-2xs"
                >
                  Créer & Rattacher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RAW TEXT INSPECTION MODAL */}
      {showRawTextModal && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#F2F3F0] rounded-2xl p-5 max-w-2xl w-full shadow-2xl border border-[#C7CDC8] max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#D9DDD8]">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-[#55A9C0]" />
                <h4 className="font-serif font-black text-sm text-[#252A27]">
                  Texte Brut Extrait (Audit OCR Déterministe)
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowRawTextModal(false)}
                className="p-1 rounded-lg bg-[#ECEEEA] text-[#252A27] border border-[#D9DDD8]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3">
              <pre className="p-3 bg-white rounded-xl border border-[#D9DDD8] text-xs font-mono text-[#252A27] whitespace-pre-wrap select-all">
                {rawOcrText || 'Aucun texte extrait'}
              </pre>
            </div>

            <div className="pt-3 border-t border-[#D9DDD8] flex items-center justify-between">
              <span className="text-[11px] text-[#555D58]">
                {rawOcrText.split('\n').length} lignes • {rawOcrText.length} caractères
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(rawOcrText);
                  setCopiedRawText(true);
                  setTimeout(() => setCopiedRawText(false), 2000);
                }}
                className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#ECEEEA] text-xs font-bold text-[#252A27] border border-[#D9DDD8] flex items-center space-x-1"
              >
                {copiedRawText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedRawText ? 'Copié !' : 'Copier le texte'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const InvoiceOcrModal = DeterministicInvoiceOcrModal;
