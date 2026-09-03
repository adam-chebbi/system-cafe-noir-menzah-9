import React, { useState, useEffect, useRef } from 'react';
import { useSystem } from '../../context/SystemContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Supplier, PurchaseOrder, SupplierInvoice, SupplierInvoiceWithDueStatus, Ingredient, StockZone, IngredientPurchaseHistoryEntry, ProductLabelMapping } from '../../types';
import { InvoiceOcrModal } from './InvoiceOcrModal';
import { ProductMappingsPanel } from './ProductMappingsPanel';
import { CopyLinkButton } from '../common/CopyLinkButton';
import { ItemThumbnail } from '../common/ItemThumbnail';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { AttachmentViewer, AttachmentUpload } from '../common/AttachmentViewer';
import { SoftDeleteBadge } from '../common/SoftDeleteBadge';
import { RetroactiveDocumentPanel, emptyRetroactiveFields, RetroactiveFields } from '../common/RetroactiveDocumentPanel';
import { ZONE_LABELS, STOCK_ZONES } from '../../utils/stockZones';
import { DEFAULT_TVA_RATE } from '../../utils/currency';
import {
  Truck,
  Plus,
  Sparkles,
  FileText,
  DollarSign,
  CheckCircle2,
  Clock,
  Phone,
  MessageCircle,
  Mail,
  Building,
  Calendar,
  X,
  Send,
  AlertCircle,
  AlertTriangle,
  Search,
  Check,
  ChevronRight,
  History,
  Edit2,
  Trash2,
  Ban,
  Receipt,
  PackageCheck,
  Wallet,
  Info,
  Link2
} from 'lucide-react';

const PO_STATUS_LABELS: Record<PurchaseOrder['status'], { label: string; className: string }> = {
  draft: { label: 'Brouillon', className: 'bg-[#ECEEEA] text-[#555D58] border-[#D9DDD8]' },
  sent: { label: 'Commandée', className: 'bg-sky-50 text-sky-800 border-sky-200' },
  partially_received: { label: 'Partiellement reçue', className: 'bg-amber-100 text-amber-900 border-amber-200' },
  received: { label: 'Reçue', className: 'bg-emerald-100 text-emerald-900 border-emerald-200' },
  cancelled: { label: 'Annulée', className: 'bg-rose-100 text-rose-800 border-rose-200' }
};

const PoStatusBadge: React.FC<{ status: PurchaseOrder['status'] }> = ({ status }) => {
  const cfg = PO_STATUS_LABELS[status] || PO_STATUS_LABELS.draft;
  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${cfg.className}`}>
      {cfg.label}
    </span>
  );
};

const INVOICE_STATUS_LABELS: Record<SupplierInvoice['paymentStatus'], { label: string; className: string }> = {
  unpaid: { label: 'Non payée', className: 'bg-amber-100 text-amber-900 border-amber-200' },
  partially_paid: { label: 'Partiellement payée', className: 'bg-sky-50 text-sky-800 border-sky-200' },
  paid: { label: 'Payée', className: 'bg-emerald-100 text-emerald-900 border-emerald-200' }
};

const InvoiceStatusBadge: React.FC<{ status: SupplierInvoice['paymentStatus'] }> = ({ status }) => {
  const cfg = INVOICE_STATUS_LABELS[status] || INVOICE_STATUS_LABELS.unpaid;
  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${cfg.className}`}>
      {cfg.label}
    </span>
  );
};

const DueDateBadge: React.FC<{ isOverdue?: boolean; isDueSoon?: boolean; daysUntilDue?: number }> = ({ isOverdue, isDueSoon, daysUntilDue }) => {
  if (isOverdue) {
    return (
      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
        <AlertTriangle className="w-2.5 h-2.5" /> En retard ({Math.abs(daysUntilDue || 0)} j)
      </span>
    );
  }
  if (isDueSoon) {
    return (
      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1">
        <AlertTriangle className="w-2.5 h-2.5" /> Échéance dans {daysUntilDue} j
      </span>
    );
  }
  return null;
};

export const SuppliersView: React.FC = () => {
  const {
    globalVersion,
    refreshAlerts,
    triggerGlobalRefresh,
    currentSubTab,
    setCurrentSubTab,
    currentAction,
    setCurrentAction,
    currentRecordId,
    setCurrentRecordId,
    showRouteNotification
  } = useSystem();
  const { currentUser } = useAuth();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [invoices, setInvoices] = useState<SupplierInvoiceWithDueStatus[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [productMappings, setProductMappings] = useState<ProductLabelMapping[]>([]);
  const [activeTab, setActiveTab] = useState<'suppliers' | 'orders' | 'invoices' | 'mappings'>('suppliers');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<SupplierInvoiceWithDueStatus | null>(null);
  const hasValidatedIdRef = useRef(false);

  // Modals
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  const [isNewSupplierModalOpen, setIsNewSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierFormData, setSupplierFormData] = useState<Partial<Supplier>>({
    name: '',
    category: 'coffee_beans' as any,
    contactPerson: '',
    whatsapp: '',
    email: '',
    phone: '',
    paymentTerms: '30 jours',
    address: '',
    taxNumber: ''
  });

  const [isNewPOModalOpen, setIsNewPOModalOpen] = useState(false);
  const [newPO, setNewPO] = useState<{
    supplierId: string;
    expectedDeliveryDate: string;
    notes: string;
    items: { ingredientId: string; quantity: number; unitPrice: number }[];
  }>({
    supplierId: '',
    expectedDeliveryDate: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().split('T')[0],
    notes: '',
    items: []
  });

  // Historique des prix d'achat (affiché lors du choix d'un ingrédient sur une ligne de commande)
  const [priceHistoryIngredientId, setPriceHistoryIngredientId] = useState<string | null>(null);
  const [priceHistory, setPriceHistory] = useState<IngredientPurchaseHistoryEntry[]>([]);
  const [priceHistoryLoading, setPriceHistoryLoading] = useState(false);

  const loadPriceHistory = async (ingredientId: string) => {
    setPriceHistoryIngredientId(ingredientId);
    setPriceHistoryLoading(true);
    try {
      const rows = await api.getIngredientPurchaseHistory(ingredientId);
      setPriceHistory(rows);
    } catch (err) {
      console.error('Failed to load purchase history:', err);
      setPriceHistory([]);
    } finally {
      setPriceHistoryLoading(false);
    }
  };

  // Reception Modal (réception partielle ou totale d'un bon de commande)
  const [receivingPO, setReceivingPO] = useState<PurchaseOrder | null>(null);
  const [receiveLines, setReceiveLines] = useState<{ quantityReceived: number; unitCost: number }[]>([]);
  const [receiveZone, setReceiveZone] = useState<StockZone>('reserve_principale');
  const [receiveNote, setReceiveNote] = useState('');

  const openReceiveModal = (po: PurchaseOrder) => {
    setReceivingPO(po);
    setReceiveLines(po.items.map(item => ({
      quantityReceived: Number((item.quantity - (item.receivedQuantity || 0)).toFixed(4)),
      unitCost: item.expectedUnitCost
    })));
    setReceiveZone('reserve_principale');
    setReceiveNote('');
  };

  // Paiement Facture Modal (règlement total ou partiel, historique conservé)
  const [payingInvoice, setPayingInvoice] = useState<SupplierInvoiceWithDueStatus | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethodInput, setPaymentMethodInput] = useState('Virement bancaire');
  const [paymentNotes, setPaymentNotes] = useState('');

  const openPaymentModal = (inv: SupplierInvoiceWithDueStatus) => {
    const remaining = Number(((inv.totalTTC || inv.totalAmount) - (inv.paidAmount || 0)).toFixed(3));
    setPayingInvoice(inv);
    setPaymentAmount(Math.max(0, remaining));
    setPaymentMethodInput(inv.paymentMethod || 'Virement bancaire');
    setPaymentNotes('');
  };

  // Retroactive Invoice Modal
  const [isRetroInvoiceModalOpen, setIsRetroInvoiceModalOpen] = useState(false);
  const [retroInvoiceSupplierId, setRetroInvoiceSupplierId] = useState('');
  const [retroInvoicePOId, setRetroInvoicePOId] = useState('');
  const [retroInvoiceNumber, setRetroInvoiceNumber] = useState('');
  const [retroInvoiceDueDate, setRetroInvoiceDueDate] = useState('');
  const [retroInvoiceSubtotal, setRetroInvoiceSubtotal] = useState(0);
  const [retroInvoiceTva, setRetroInvoiceTva] = useState(0);
  const [retroInvoiceTotal, setRetroInvoiceTotal] = useState(0);
  const [retroInvoiceAlreadyPaid, setRetroInvoiceAlreadyPaid] = useState(true);
  const [retroFields, setRetroFields] = useState<RetroactiveFields>(emptyRetroactiveFields());

  // Edit Invoice Modal
  const [isEditInvoiceModalOpen, setIsEditInvoiceModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<SupplierInvoice | null>(null);
  const [editInvoiceForm, setEditInvoiceForm] = useState<{
    invoiceNumber: string;
    dueDate: string;
    totalAmount: number;
    paymentStatus: 'unpaid' | 'paid' | 'partially_paid';
    paymentMethod: string;
  }>({
    invoiceNumber: '',
    dueDate: '',
    totalAmount: 0,
    paymentStatus: 'unpaid',
    paymentMethod: 'Virement bancaire'
  });

  // Confirm Dialogs
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: 'danger' | 'warning' | 'info';
    confirmLabel: string;
    reasonLabel?: string;
    reasonRequired?: boolean;
    onConfirm: (reason?: string) => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'danger',
    confirmLabel: 'Confirmer',
    onConfirm: () => {}
  });

  useEffect(() => {
    if (currentSubTab === 'suppliers') setActiveTab('suppliers');
    else if (currentSubTab === 'orders') setActiveTab('orders');
    else if (currentSubTab === 'invoices') setActiveTab('invoices');
    else if (currentSubTab === 'mappings') setActiveTab('mappings');

    if (currentAction === 'ocr_modal') setIsOcrModalOpen(true);
    else if (currentAction === 'new_supplier') openCreateSupplierModal();
    else if (currentAction === 'new_po') setIsNewPOModalOpen(true);
    else if (currentAction === 'retro-invoice') openRetroInvoiceModal();
  }, [currentSubTab, currentAction]);

  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sups, pos, invs, ings, mappings] = await Promise.all([
        api.getSuppliers(),
        api.getPurchaseOrders(),
        api.getSupplierInvoices(),
        api.getIngredients(),
        api.getProductMappings()
      ]);
      setSuppliers(sups);
      setPurchaseOrders(pos);
      setInvoices(invs);
      setIngredients(ings);
      setProductMappings(mappings);

      // Deep link ID handling
      if (currentRecordId) {
        const foundSup = sups.find(s => s.id === currentRecordId);
        const foundPO = pos.find(p => p.id === currentRecordId);
        const foundInv = invs.find(i => i.id === currentRecordId);

        if (foundSup) {
          setSelectedSupplier(foundSup);
          setActiveTab('suppliers');
        } else if (foundPO) {
          setSelectedPO(foundPO);
          setActiveTab('orders');
        } else if (foundInv) {
          setSelectedInvoice(foundInv);
          setActiveTab('invoices');
        } else if (!hasValidatedIdRef.current) {
          showRouteNotification(`L'élément demandé (ID: "${currentRecordId}") est introuvable.`, 'warning');
          if (sups.length > 0) {
            setSelectedSupplier(sups[0]);
            setCurrentRecordId(sups[0].id, { replace: true });
          }
        }
        hasValidatedIdRef.current = true;
      } else {
        if (sups.length > 0 && !selectedSupplier) {
          setSelectedSupplier(sups[0]);
        }
        if (pos.length > 0 && !selectedPO) {
          setSelectedPO(pos[0]);
        }
        if (invs.length > 0 && !selectedInvoice) {
          setSelectedInvoice(invs[0]);
        }
      }

      if (sups.length > 0 && !newPO.supplierId) {
        setNewPO(prev => ({ ...prev, supplierId: sups[0].id }));
      }
    } catch (err) {
      console.error('Failed to load supplier data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [globalVersion]);

  // Supplier handlers
  const openCreateSupplierModal = () => {
    setEditingSupplier(null);
    setSupplierFormData({
      name: '',
      category: 'coffee_beans' as any,
      contactPerson: '',
      whatsapp: '',
      email: '',
      phone: '',
      paymentTerms: '30 jours',
      address: '',
      taxNumber: ''
    });
    setIsNewSupplierModalOpen(true);
  };

  const openEditSupplierModal = (sup: Supplier) => {
    setEditingSupplier(sup);
    setSupplierFormData({
      name: sup.name,
      category: sup.category,
      contactPerson: sup.contactPerson || '',
      whatsapp: sup.whatsapp || '',
      email: sup.email || '',
      phone: sup.phone || '',
      paymentTerms: sup.paymentTerms || '30 jours',
      address: sup.address || '',
      taxNumber: sup.taxNumber || ''
    });
    setIsNewSupplierModalOpen(true);
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierFormData.name) return;

    try {
      if (editingSupplier) {
        const updated = await api.updateSupplier(editingSupplier.id, supplierFormData, currentUser?.name || 'Admin');
        setSuppliers(prev => prev.map(s => s.id === updated.id ? updated : s));
        if (selectedSupplier?.id === updated.id) setSelectedSupplier(updated);
        showRouteNotification(`Fournisseur "${supplierFormData.name}" mis à jour`, 'success');
      } else {
        const created = await api.createSupplier({
          name: supplierFormData.name,
          category: (supplierFormData.category as any) || 'Matières Premières',
          contactPerson: supplierFormData.contactPerson || '',
          whatsapp: supplierFormData.whatsapp || undefined,
          email: supplierFormData.email || '',
          phone: supplierFormData.phone || '',
          paymentTerms: supplierFormData.paymentTerms || '30 jours',
          address: supplierFormData.address || '',
          taxNumber: supplierFormData.taxNumber || undefined,
          active: true
        }, currentUser?.name || 'Admin');
        setSuppliers(prev => [created, ...prev]);
        setSelectedSupplier(created);
        showRouteNotification(`Fournisseur "${supplierFormData.name}" créé avec succès`, 'success');
      }
      setIsNewSupplierModalOpen(false);
      triggerGlobalRefresh();
    } catch (err: any) {
      showRouteNotification(`Erreur: ${err.message}`, 'error');
    }
  };

  const handleDeleteSupplier = (sup: Supplier) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Désactiver le fournisseur',
      message: `Voulez-vous désactiver le fournisseur "${sup.name}" ? Il ne sera plus proposé pour de nouveaux bons de commande.`,
      variant: 'danger',
      confirmLabel: 'Désactiver',
      onConfirm: async () => {
        try {
          await api.deleteSupplier(sup.id, currentUser?.name || 'Admin');
          setSuppliers(prev => prev.map(s => s.id === sup.id ? { ...s, active: false } : s));
          showRouteNotification(`Fournisseur "${sup.name}" désactivé`, 'success');
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
          triggerGlobalRefresh();
        } catch (err: any) {
          showRouteNotification(`Erreur: ${err.message}`, 'error');
        }
      }
    });
  };

  // PO Handlers
  const handleCreatePO = async (status: 'draft' | 'sent') => {
    if (!newPO.supplierId || newPO.items.length === 0) {
      showRouteNotification('Veuillez ajouter au moins une ligne d’article au bon de commande', 'warning');
      return;
    }

    try {
      const sup = suppliers.find(s => s.id === newPO.supplierId);
      const poItems = newPO.items.map(item => {
        const ing = ingredients.find(i => i.id === item.ingredientId);
        return {
          ingredientId: item.ingredientId,
          itemName: ing ? ing.name : 'Article',
          quantity: item.quantity,
          unit: ing ? ing.unit : 'kg',
          expectedUnitCost: item.unitPrice,
          totalCost: Number((item.quantity * item.unitPrice).toFixed(2)),
          receivedQuantity: 0
        };
      });

      const totalAmount = poItems.reduce((sum, i) => sum + i.totalCost, 0);

      const created = await api.createPurchaseOrder({
        supplierId: newPO.supplierId,
        supplierName: sup ? sup.name : 'Fournisseur',
        expectedDeliveryDate: newPO.expectedDeliveryDate,
        status,
        totalAmount,
        notes: newPO.notes,
        items: poItems
      }, currentUser?.name || 'Admin');

      setIsNewPOModalOpen(false);
      setNewPO({
        supplierId: '',
        expectedDeliveryDate: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().split('T')[0],
        items: [],
        notes: ''
      });
      setPurchaseOrders(prev => [created, ...prev]);
      setSelectedPO(created);
      showRouteNotification(status === 'draft' ? 'Bon de commande enregistré en brouillon' : 'Bon de commande envoyé au fournisseur', 'success');
      triggerGlobalRefresh();
      refreshAlerts();
    } catch (err: any) {
      showRouteNotification(`Erreur: ${err.message}`, 'error');
    }
  };

  const handleSendPO = async (po: PurchaseOrder) => {
    try {
      const updated = await api.sendPurchaseOrder(po.id, currentUser?.name || 'Admin');
      setPurchaseOrders(prev => prev.map(p => p.id === po.id ? updated : p));
      if (selectedPO?.id === po.id) setSelectedPO(updated);
      showRouteNotification(`Bon ${po.orderNumber} envoyé au fournisseur`, 'success');
      triggerGlobalRefresh();
    } catch (err: any) {
      showRouteNotification(`Erreur: ${err.message}`, 'error');
    }
  };

  const handleCancelPO = (po: PurchaseOrder) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Annuler le bon de commande',
      message: `Êtes-vous sûr de vouloir annuler le bon de commande ${po.orderNumber} (${po.supplierName}) ?`,
      variant: 'warning',
      confirmLabel: 'Annuler le bon',
      reasonLabel: 'Motif d\'annulation',
      reasonRequired: true,
      onConfirm: async (reason) => {
        try {
          await api.cancelPurchaseOrder(po.id, reason || 'Annulation manuelle', currentUser?.name || 'Admin');
          setPurchaseOrders(prev => prev.map(p => p.id === po.id ? { ...p, status: 'cancelled', cancelled: true, cancelReason: reason } : p));
          showRouteNotification(`Bon de commande ${po.orderNumber} annulé`, 'success');
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
          triggerGlobalRefresh();
        } catch (err: any) {
          showRouteNotification(`Erreur: ${err.message}`, 'error');
        }
      }
    });
  };

  const handleSubmitReceive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receivingPO) return;

    const items = receiveLines
      .map((line, itemIndex) => ({ itemIndex, quantityReceived: Number(line.quantityReceived) || 0, unitCost: Number(line.unitCost) || undefined }))
      .filter(l => l.quantityReceived > 0);

    if (items.length === 0) {
      showRouteNotification('Saisissez au moins une quantité à réceptionner', 'warning');
      return;
    }

    try {
      const updated = await api.receivePurchaseOrder(receivingPO.id, currentUser?.name || 'Réceptionniste', {
        items,
        zone: receiveZone,
        note: receiveNote || undefined
      });
      setPurchaseOrders(prev => prev.map(p => p.id === updated.id ? updated : p));
      if (selectedPO?.id === updated.id) setSelectedPO(updated);
      showRouteNotification(`Réception enregistrée (${ZONE_LABELS[receiveZone]}) — statut : ${PO_STATUS_LABELS[updated.status].label}`, 'success');
      setReceivingPO(null);
      triggerGlobalRefresh();
      refreshAlerts();
    } catch (err: any) {
      showRouteNotification(`Erreur: ${err.message}`, 'error');
    }
  };

  // Invoice Handlers
  const openRetroInvoiceModal = () => {
    setRetroInvoiceSupplierId(suppliers.length > 0 ? suppliers[0].id : '');
    setRetroInvoicePOId('');
    setRetroInvoiceNumber('');
    setRetroInvoiceDueDate(new Date().toISOString().split('T')[0]);
    setRetroInvoiceSubtotal(100);
    setRetroInvoiceTva(Number((100 * DEFAULT_TVA_RATE / 100).toFixed(2)));
    setRetroInvoiceTotal(Number((100 * (1 + DEFAULT_TVA_RATE / 100)).toFixed(2)));
    setRetroInvoiceAlreadyPaid(true);
    setRetroFields(emptyRetroactiveFields());
    setIsRetroInvoiceModalOpen(true);
  };

  const handleSaveRetroInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!retroInvoiceNumber || !retroInvoiceSupplierId) return;

    try {
      const sup = suppliers.find(s => s.id === retroInvoiceSupplierId);
      const finalDocDate = retroFields.documentDate || new Date().toISOString().split('T')[0];
      const total = Number(retroInvoiceTotal) || 0;

      const created = await api.createSupplierInvoice({
        invoiceNumber: retroInvoiceNumber,
        supplierId: retroInvoiceSupplierId,
        supplierName: sup ? sup.name : 'Fournisseur',
        purchaseOrderId: retroInvoicePOId || undefined,
        invoiceDate: finalDocDate,
        dueDate: retroInvoiceDueDate || finalDocDate,
        subtotal: Number(retroInvoiceSubtotal) || 0,
        taxAmount: Number(retroInvoiceTva) || 0,
        totalAmount: total,
        paymentStatus: 'unpaid',
        attachmentUrl: retroFields.attachmentUrl || undefined,
        ocrProcessed: false,
        stockUpdated: retroFields.applyToStock,
        isRetroactive: true,
        documentDate: finalDocDate,
        retroNotes: retroFields.notes || undefined,
        items: []
      }, currentUser?.name || 'Admin');

      let finalInvoice: SupplierInvoice = created;
      if (retroInvoiceAlreadyPaid && total > 0) {
        finalInvoice = await api.paySupplierInvoice(created.id, total, 'Virement bancaire', currentUser?.name || 'Admin', 'Règlement historique (saisie rétroactive)');
      }

      setInvoices(prev => [finalInvoice as SupplierInvoiceWithDueStatus, ...prev]);
      setSelectedInvoice(finalInvoice as SupplierInvoiceWithDueStatus);
      showRouteNotification('Facture historique enregistrée avec succès', 'success');
      setIsRetroInvoiceModalOpen(false);
      triggerGlobalRefresh();
    } catch (err: any) {
      showRouteNotification(`Erreur: ${err.message}`, 'error');
    }
  };

  const openEditInvoiceModal = (inv: SupplierInvoice) => {
    setEditingInvoice(inv);
    setEditInvoiceForm({
      invoiceNumber: inv.invoiceNumber,
      dueDate: inv.dueDate,
      totalAmount: inv.totalAmount || inv.totalTTC || 0,
      paymentStatus: inv.paymentStatus || 'unpaid',
      paymentMethod: inv.paymentMethod || 'Virement bancaire'
    });
    setIsEditInvoiceModalOpen(true);
  };

  const handleSaveEditInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvoice) return;

    try {
      const updated = await api.updateSupplierInvoice(editingInvoice.id, editInvoiceForm, currentUser?.name || 'Admin');
      setInvoices(prev => prev.map(inv => inv.id === updated.id ? updated : inv));
      if (selectedInvoice?.id === updated.id) setSelectedInvoice(updated);
      showRouteNotification(`Facture ${editInvoiceForm.invoiceNumber} mise à jour`, 'success');
      setIsEditInvoiceModalOpen(false);
      triggerGlobalRefresh();
    } catch (err: any) {
      showRouteNotification(`Erreur: ${err.message}`, 'error');
    }
  };

  const handleCancelInvoice = (inv: SupplierInvoice) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Annuler la facture fournisseur',
      message: `Êtes-vous sûr de vouloir annuler la facture ${inv.invoiceNumber} (${inv.supplierName}) ?`,
      variant: 'warning',
      confirmLabel: 'Annuler la facture',
      reasonLabel: 'Motif d\'annulation',
      reasonRequired: true,
      onConfirm: async (reason) => {
        try {
          await api.cancelSupplierInvoice(inv.id, reason || 'Annulation manuelle', currentUser?.name || 'Admin');
          setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, paymentStatus: 'cancelled', cancelled: true, cancelReason: reason } : i));
          showRouteNotification(`Facture ${inv.invoiceNumber} annulée`, 'success');
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
          triggerGlobalRefresh();
        } catch (err: any) {
          showRouteNotification(`Erreur: ${err.message}`, 'error');
        }
      }
    });
  };

  const handleDeleteInvoice = (inv: SupplierInvoice) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Supprimer la facture',
      message: `Supprimer définitivement la facture ${inv.invoiceNumber} ? Cette action est irréversible.`,
      variant: 'danger',
      confirmLabel: 'Supprimer définitivement',
      onConfirm: async () => {
        try {
          await api.deleteSupplierInvoice(inv.id, currentUser?.name || 'Admin');
          setInvoices(prev => prev.filter(i => i.id !== inv.id));
          if (selectedInvoice?.id === inv.id) setSelectedInvoice(null);
          showRouteNotification(`Facture ${inv.invoiceNumber} supprimée`, 'success');
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
          triggerGlobalRefresh();
        } catch (err: any) {
          showRouteNotification(`Erreur: ${err.message}`, 'error');
        }
      }
    });
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingInvoice || !(paymentAmount > 0)) return;

    try {
      const updated = await api.paySupplierInvoice(payingInvoice.id, paymentAmount, paymentMethodInput, currentUser?.name || 'Comptable', paymentNotes || undefined);
      setInvoices(prev => prev.map(i => i.id === updated.id ? { ...i, ...updated } : i));
      if (selectedInvoice?.id === updated.id) setSelectedInvoice(prev => prev ? { ...prev, ...updated } : prev);
      showRouteNotification(`Paiement de ${paymentAmount.toFixed(3)} DT enregistré — statut : ${INVOICE_STATUS_LABELS[updated.paymentStatus].label}`, 'success');
      setPayingInvoice(null);
      triggerGlobalRefresh();
      refreshAlerts();
    } catch (err: any) {
      showRouteNotification(`Erreur: ${err.message}`, 'error');
    }
  };

  const safeInvoices = Array.isArray(invoices) ? invoices : [];
  const safeSuppliers = Array.isArray(suppliers) ? suppliers : [];
  const safePurchaseOrders = Array.isArray(purchaseOrders) ? purchaseOrders : [];
  const q = (searchQuery || '').toLowerCase();

  const unpaidInvoices = safeInvoices.filter(i => i.paymentStatus !== 'paid' && !i.cancelled);
  const totalInvoicesDue = unpaidInvoices.reduce((sum, i) => sum + ((i.totalTTC || i.totalAmount || 0) - (i.paidAmount || 0)), 0);
  const overdueInvoicesCount = unpaidInvoices.filter(i => i.isOverdue).length;
  const dueSoonInvoicesCount = unpaidInvoices.filter(i => i.isDueSoon).length;

  // Filtered lists
  const filteredSuppliers = safeSuppliers.filter(s =>
    (s.name || '').toLowerCase().includes(q) ||
    (s.category || '').toLowerCase().includes(q)
  );

  const filteredPOs = safePurchaseOrders.filter(p =>
    (p.orderNumber || '').toLowerCase().includes(q) ||
    (p.supplierName || '').toLowerCase().includes(q) ||
    (p.status || '').toLowerCase().includes(q)
  );

  const filteredInvoices = safeInvoices.filter(i =>
    (i.invoiceNumber || '').toLowerCase().includes(q) ||
    (i.supplierName || '').toLowerCase().includes(q) ||
    (i.isRetroactive && 'historique'.includes(q))
  );

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col overflow-hidden bg-[#F7F7F5]">
      {/* Top Header & Metric Bar */}
      <div className="bg-[#F2F3F0] border-b border-[#D9DDD8] px-4 py-2.5 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-[#252A27] text-[#A4DEC2] flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-serif font-black text-base text-[#252A27]">
                  Achats, Fournisseurs & Factures
                </h1>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-md bg-[#ECEEEA] text-[#555D58] border border-[#D9DDD8]">
                  {suppliers.length} fournisseurs
                </span>
              </div>
              <p className="text-[11px] text-[#555D58]">
                Bons de commande, OCR factures, saisie de rattrapage historique
              </p>
            </div>
          </div>

          {/* Quick Tab & Action Switcher */}
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            <div className="bg-white p-0.5 rounded-xl border border-[#D9DDD8] flex space-x-1">
              <button
                onClick={() => { setActiveTab('suppliers'); setCurrentSubTab('suppliers'); }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'suppliers' ? 'bg-[#252A27] text-white shadow-xs' : 'text-[#555D58] hover:text-[#252A27]'
                }`}
              >
                Fournisseurs ({suppliers.length})
              </button>
              <button
                onClick={() => { setActiveTab('orders'); setCurrentSubTab('orders'); }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'orders' ? 'bg-[#252A27] text-white shadow-xs' : 'text-[#555D58] hover:text-[#252A27]'
                }`}
              >
                Commandes ({purchaseOrders.length})
              </button>
              <button
                onClick={() => { setActiveTab('invoices'); setCurrentSubTab('invoices'); }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'invoices' ? 'bg-[#252A27] text-white shadow-xs' : 'text-[#555D58] hover:text-[#252A27]'
                }`}
              >
                Factures ({invoices.length})
              </button>
              <button
                onClick={() => { setActiveTab('mappings'); setCurrentSubTab('mappings'); }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  activeTab === 'mappings' ? 'bg-[#252A27] text-white shadow-xs' : 'text-[#555D58] hover:text-[#252A27]'
                }`}
              >
                <Link2 className="w-3 h-3" />
                <span>Correspondances ({productMappings.length})</span>
              </button>
            </div>

            {/* Context Action Buttons */}
            {activeTab === 'suppliers' && (
              <button
                onClick={openCreateSupplierModal}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-[#A4DEC2] hover:bg-[#8BCFAE] text-[#252A27] text-xs font-bold transition-colors shadow-2xs border border-[#8BCFAE]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nouveau Fournisseur</span>
              </button>
            )}

            {activeTab === 'orders' && (
              <button
                onClick={() => setIsNewPOModalOpen(true)}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-[#A4DEC2] hover:bg-[#8BCFAE] text-[#252A27] text-xs font-bold transition-colors shadow-2xs border border-[#8BCFAE]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Émettre Commande</span>
              </button>
            )}

            {activeTab === 'invoices' && (
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={openRetroInvoiceModal}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold transition-all border border-amber-300 shadow-2xs"
                  title="Saisir une facture historique papier ou ancien système"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Saisie Historique</span>
                </button>
                <button
                  onClick={() => setIsOcrModalOpen(true)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#A4DEC2] hover:bg-[#8BCFAE] text-[#252A27] text-xs font-bold transition-colors shadow-2xs border border-[#8BCFAE]"
                  title="Numérisation OCR 100% Locale et Déterministe"
                >
                  <FileText className="w-3.5 h-3.5 text-[#252A27]" />
                  <span>Scanner Facture (OCR)</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sub-search bar */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#D9DDD8]/60">
          <div className="relative w-72">
            <Search className="w-3.5 h-3.5 text-[#555D58] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher par nom, numéro, statut..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1 bg-white border border-[#D9DDD8] rounded-lg text-xs font-medium text-[#252A27] focus:outline-none focus:border-[#252A27]"
            />
          </div>

          <div className="flex items-center space-x-2 text-xs flex-wrap">
            <span className="text-[#555D58]">Restant à régler:</span>
            <span className="font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              {totalInvoicesDue.toFixed(3)} DT
            </span>
            {overdueInvoicesCount > 0 && (
              <button
                onClick={() => { setActiveTab('invoices'); setCurrentSubTab('invoices'); }}
                className="flex items-center space-x-1 font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 hover:bg-rose-100 transition-colors"
              >
                <AlertTriangle className="w-3 h-3" />
                <span>{overdueInvoicesCount} en retard</span>
              </button>
            )}
            {dueSoonInvoicesCount > 0 && (
              <button
                onClick={() => { setActiveTab('invoices'); setCurrentSubTab('invoices'); }}
                className="flex items-center space-x-1 font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 hover:bg-amber-100 transition-colors"
              >
                <AlertTriangle className="w-3 h-3" />
                <span>{dueSoonInvoicesCount} échéance proche</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {activeTab === 'mappings' ? (
        <ProductMappingsPanel
          mappings={productMappings}
          suppliers={suppliers}
          ingredients={ingredients}
          onUpdated={() => api.getProductMappings().then(setProductMappings)}
        />
      ) : (
      <>
      {/* Master-Detail Split Canvas */}
      <div className="flex-1 flex overflow-hidden">
        {/* Master List */}
        <div className="w-full lg:w-3/5 border-r border-[#D9DDD8] overflow-y-auto bg-white divide-y divide-[#ECEEEA]">
          {activeTab === 'suppliers' && (
            filteredSuppliers.length === 0 ? (
              <div className="p-10 text-center text-xs text-[#555D58]">Aucun fournisseur trouvé</div>
            ) : (
              filteredSuppliers.map(sup => {
                const isSelected = selectedSupplier?.id === sup.id;
                return (
                  <div
                    key={sup.id}
                    onClick={() => {
                      setSelectedSupplier(sup);
                      setCurrentRecordId(sup.id, { replace: true });
                    }}
                    className={`p-3 cursor-pointer transition-all flex items-center justify-between gap-3 ${
                      isSelected ? 'bg-[#ECEEEA] border-l-4 border-[#252A27]' : 'hover:bg-[#F7F7F5]'
                    }`}
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-[#F2F3F0] border border-[#D9DDD8] flex items-center justify-center shrink-0">
                        <Building className="w-4 h-4 text-[#252A27]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-bold text-xs sm:text-sm text-[#252A27] truncate">{sup.name}</h4>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#ECEEEA] text-[#555D58] border border-[#D9DDD8] shrink-0">
                            {sup.category}
                          </span>
                          {!sup.active && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                              Inactif
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#555D58] mt-0.5 truncate">
                          {sup.contactPerson || 'Sans contact'} &bull; {sup.phone || sup.email || 'Pas de coordonnées'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditSupplierModal(sup);
                        }}
                        className="p-1 rounded-lg hover:bg-[#D9DDD8] text-[#555D58] hover:text-[#252A27] transition-colors"
                        title="Modifier le fournisseur"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSupplier(sup);
                        }}
                        className="p-1 rounded-lg hover:bg-rose-100 text-[#555D58] hover:text-rose-700 transition-colors"
                        title="Désactiver le fournisseur"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )
          )}

          {activeTab === 'orders' && (
            filteredPOs.length === 0 ? (
              <div className="p-10 text-center text-xs text-[#555D58]">Aucun bon de commande</div>
            ) : (
              filteredPOs.map(po => {
                const isSelected = selectedPO?.id === po.id;
                const isReceived = po.status === 'received';
                const isCancelled = po.status === 'cancelled';
                return (
                  <div
                    key={po.id}
                    onClick={() => {
                      setSelectedPO(po);
                      setCurrentRecordId(po.id, { replace: true });
                    }}
                    className={`p-3 cursor-pointer transition-all flex items-center justify-between gap-3 ${
                      isSelected ? 'bg-[#ECEEEA] border-l-4 border-[#252A27]' : 'hover:bg-[#F7F7F5]'
                    }`}
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-[#F2F3F0] border border-[#D9DDD8] flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-[#252A27]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2 flex-wrap gap-1">
                          <h4 className="font-bold text-xs sm:text-sm text-[#252A27]">{po.orderNumber}</h4>
                          <span className="text-[10px] font-bold text-[#555D58]">&bull; {po.supplierName}</span>
                          <PoStatusBadge status={po.status} />
                        </div>
                        <p className="text-[11px] text-[#555D58] mt-0.5">
                          Prévue: {po.expectedDeliveryDate} &bull; {po.items?.length || 0} lignes d'articles
                          {po.receptions?.length > 0 ? ` • ${po.receptions.length} réception(s)` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 shrink-0">
                      <span className="font-mono font-bold text-xs text-[#252A27]">
                        {(po.totalAmount || 0).toFixed(3)} DT
                      </span>
                      {!isReceived && !isCancelled && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelPO(po);
                          }}
                          className="p-1 rounded-lg hover:bg-rose-100 text-[#555D58] hover:text-rose-700 transition-colors"
                          title="Annuler ce bon"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )
          )}

          {activeTab === 'invoices' && (
            filteredInvoices.length === 0 ? (
              <div className="p-10 text-center text-xs text-[#555D58]">Aucune facture trouvée</div>
            ) : (
              filteredInvoices.map(inv => {
                const isSelected = selectedInvoice?.id === inv.id;
                const attach = inv.attachmentUrl;
                return (
                  <div
                    key={inv.id}
                    onClick={() => {
                      setSelectedInvoice(inv);
                      setCurrentRecordId(inv.id, { replace: true });
                    }}
                    className={`p-3 cursor-pointer transition-all flex items-center justify-between gap-3 ${
                      isSelected ? 'bg-[#ECEEEA] border-l-4 border-[#252A27]' : 'hover:bg-[#F7F7F5]'
                    }`}
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-[#F2F3F0] border border-[#D9DDD8] flex items-center justify-center shrink-0">
                        <Receipt className="w-4 h-4 text-[#252A27]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2 flex-wrap gap-1">
                          <h4 className="font-bold text-xs sm:text-sm text-[#252A27]">{inv.invoiceNumber}</h4>
                          <span className="text-[10px] font-bold text-[#555D58]">&bull; {inv.supplierName}</span>
                          <SoftDeleteBadge isRetroactive={inv.isRetroactive} cancelled={inv.cancelled} cancelReason={inv.cancelReason} />
                          {!inv.cancelled && <DueDateBadge isOverdue={inv.isOverdue} isDueSoon={inv.isDueSoon} daysUntilDue={inv.daysUntilDue} />}
                          {attach && <AttachmentViewer url={attach} filename={inv.invoiceNumber} variant="button" />}
                        </div>
                        <p className="text-[11px] text-[#555D58] mt-0.5">
                          Date: {inv.invoiceDate} &bull; Échéance: {inv.dueDate}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 shrink-0">
                      <div className="text-right">
                        <span className="font-mono font-bold text-xs text-[#252A27] block">
                          {(inv.totalTTC || inv.totalAmount || 0).toFixed(3)} DT
                        </span>
                        <InvoiceStatusBadge status={inv.paymentStatus} />
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditInvoiceModal(inv);
                        }}
                        className="p-1 rounded-lg hover:bg-[#D9DDD8] text-[#555D58] hover:text-[#252A27] transition-colors"
                        title="Modifier la facture"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {!inv.cancelled && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelInvoice(inv);
                          }}
                          className="p-1 rounded-lg hover:bg-rose-100 text-[#555D58] hover:text-rose-700 transition-colors"
                          title="Annuler la facture"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )
          )}
        </div>

        {/* Detail Inspector (Right Side) */}
        <div className="hidden lg:flex w-2/5 flex-col bg-[#F2F3F0] overflow-y-auto p-4 space-y-4">
          {activeTab === 'suppliers' && (
            selectedSupplier ? (
              <div className="bg-white p-4 rounded-xl border border-[#D9DDD8] shadow-2xs space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#555D58] tracking-wider block">
                      Fiche Fournisseur
                    </span>
                    <h3 className="font-serif font-black text-base text-[#252A27]">
                      {selectedSupplier.name}
                    </h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openEditSupplierModal(selectedSupplier)}
                      className="p-1.5 rounded-lg bg-[#ECEEEA] hover:bg-[#D9DDD8] text-[#252A27] transition-colors"
                      title="Modifier ce fournisseur"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteSupplier(selectedSupplier)}
                      className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors"
                      title="Désactiver ce fournisseur"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <CopyLinkButton
                      view="suppliers"
                      subTab="suppliers"
                      id={selectedSupplier.id}
                      iconOnly
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#ECEEEA] text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#555D58]">Catégorie</span>
                    <p className="font-semibold text-[#252A27] mt-0.5">{selectedSupplier.category}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#555D58]">Conditions de paiement</span>
                    <p className="font-semibold text-[#252A27] mt-0.5">{selectedSupplier.paymentTerms}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#555D58]">Contact</span>
                    <p className="font-semibold text-[#252A27] mt-0.5">{selectedSupplier.contactPerson || 'Non renseigné'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#555D58]">Téléphone</span>
                    <p className="font-semibold text-[#252A27] mt-0.5">{selectedSupplier.phone || 'Non renseigné'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#ECEEEA] text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#555D58] flex items-center gap-1">
                      <MessageCircle className="w-2.5 h-2.5" /> WhatsApp
                    </span>
                    <p className="font-semibold text-[#252A27] mt-0.5">{selectedSupplier.whatsapp || 'Non renseigné'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#555D58]">Matricule Fiscal</span>
                    <p className="font-mono text-[#252A27] mt-0.5">{selectedSupplier.taxNumber || 'Non renseigné'}</p>
                  </div>
                </div>

                {selectedSupplier.email && (
                  <div className="pt-2 border-t border-[#ECEEEA] text-xs">
                    <span className="text-[10px] uppercase font-bold text-[#555D58]">Email commande</span>
                    <p className="font-mono text-[#252A27] mt-0.5">{selectedSupplier.email}</p>
                  </div>
                )}
                {selectedSupplier.address && (
                  <div className="pt-2 border-t border-[#ECEEEA] text-xs">
                    <span className="text-[10px] uppercase font-bold text-[#555D58]">Adresse</span>
                    <p className="text-[#252A27] mt-0.5">{selectedSupplier.address}</p>
                  </div>
                )}
                {selectedSupplier.notes && (
                  <div className="pt-2 border-t border-[#ECEEEA] text-xs">
                    <span className="text-[10px] uppercase font-bold text-[#555D58]">Notes</span>
                    <p className="text-[#252A27] mt-0.5">{selectedSupplier.notes}</p>
                  </div>
                )}

                {/* Historique des commandes/factures de ce fournisseur */}
                <div className="pt-2 border-t border-[#ECEEEA] text-xs">
                  <span className="text-[10px] uppercase font-bold text-[#555D58] block mb-1">Activité récente</span>
                  <p className="text-[#555D58]">
                    {safePurchaseOrders.filter(p => p.supplierId === selectedSupplier.id).length} bon(s) de commande &bull;{' '}
                    {invoices.filter(i => i.supplierId === selectedSupplier.id).length} facture(s)
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-[#555D58]">
                Sélectionnez un fournisseur pour voir les détails.
              </div>
            )
          )}

          {activeTab === 'orders' && (
            selectedPO ? (
              <div className="bg-white p-4 rounded-xl border border-[#D9DDD8] shadow-2xs space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] uppercase font-bold text-[#555D58] tracking-wider">
                        Bon de Commande
                      </span>
                      <PoStatusBadge status={selectedPO.status} />
                    </div>
                    <h3 className="font-mono font-bold text-base text-[#252A27]">
                      {selectedPO.orderNumber}
                    </h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-base text-[#252A27]">
                      {(selectedPO.totalAmount || 0).toFixed(3)} DT
                    </span>
                    <CopyLinkButton
                      view="suppliers"
                      subTab="orders"
                      id={selectedPO.id}
                      iconOnly
                    />
                  </div>
                </div>

                {selectedPO.cancelReason && (
                  <p className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2">
                    Annulé : {selectedPO.cancelReason}
                  </p>
                )}

                <div className="pt-2 border-t border-[#ECEEEA] text-xs space-y-1">
                  <p><span className="text-[#555D58]">Fournisseur:</span> <strong>{selectedPO.supplierName}</strong></p>
                  <p><span className="text-[#555D58]">Date prévue:</span> <strong>{selectedPO.expectedDeliveryDate}</strong></p>
                  {selectedPO.notes && <p><span className="text-[#555D58]">Notes:</span> <strong>{selectedPO.notes}</strong></p>}
                </div>

                <div className="pt-2 border-t border-[#ECEEEA] space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-[#555D58] block">Articles commandés</span>
                  <div className="divide-y divide-[#ECEEEA] text-xs">
                    {selectedPO.items?.map((item, idx) => {
                      const ingMatch = ingredients.find(i => i.id === item.ingredientId);
                      const received = item.receivedQuantity || 0;
                      const isLineComplete = received >= item.quantity;
                      return (
                        <div key={idx} className="py-1.5 flex items-center justify-between gap-2">
                          <div className="flex items-center space-x-2 min-w-0">
                            <ItemThumbnail
                              src={ingMatch?.imageUrl}
                              alt={item.itemName}
                              category={ingMatch?.category}
                              type="ingredient"
                              size="sm"
                              rounded="lg"
                            />
                            <div className="min-w-0">
                              <span className="truncate block">{item.itemName} × {item.quantity} {item.unit}</span>
                              {received > 0 && (
                                <span className={`text-[9px] font-bold ${isLineComplete ? 'text-emerald-700' : 'text-amber-800'}`}>
                                  Reçu : {received} / {item.quantity} {item.unit}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="font-mono font-bold shrink-0">{(item.totalCost || 0).toFixed(3)} DT</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {selectedPO.receptions?.length > 0 && (
                  <div className="pt-2 border-t border-[#ECEEEA] space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-[#555D58] block">Historique des réceptions</span>
                    <div className="divide-y divide-[#ECEEEA] text-xs">
                      {selectedPO.receptions.map(rcp => (
                        <div key={rcp.id} className="py-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#252A27]">{rcp.date} &bull; {ZONE_LABELS[rcp.zone]}</span>
                            <span className="text-[10px] text-[#555D58]">{rcp.performedBy}</span>
                          </div>
                          <p className="text-[10px] text-[#555D58]">
                            {rcp.items.map(i => `${i.itemName} (+${i.quantityReceived} ${i.unit})`).join(', ')}
                          </p>
                          {rcp.note && <p className="text-[10px] text-[#555D58] italic">"{rcp.note}"</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(selectedPO.status === 'draft' || selectedPO.status === 'sent' || selectedPO.status === 'partially_received') && (
                  <div className="pt-2 border-t border-[#ECEEEA] space-y-2">
                    {selectedPO.status === 'draft' && (
                      <button
                        onClick={() => handleSendPO(selectedPO)}
                        className="w-full py-2 rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-900 text-xs font-bold transition-colors shadow-2xs border border-sky-300 flex items-center justify-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Envoyer au Fournisseur</span>
                      </button>
                    )}
                    {(selectedPO.status === 'sent' || selectedPO.status === 'partially_received') && (
                      <button
                        onClick={() => openReceiveModal(selectedPO)}
                        className="w-full py-2 rounded-lg bg-[#A4DEC2] hover:bg-[#8BCFAE] text-[#252A27] text-xs font-bold transition-colors shadow-2xs border border-[#8BCFAE] flex items-center justify-center gap-1.5"
                      >
                        <PackageCheck className="w-3.5 h-3.5" />
                        <span>Réceptionner (total ou partiel)</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleCancelPO(selectedPO)}
                      className="w-full py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors border border-rose-200"
                    >
                      Annuler ce bon de commande
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-[#555D58]">
                Sélectionnez un bon de commande.
              </div>
            )
          )}

          {activeTab === 'invoices' && (
            selectedInvoice ? (
              <div className="bg-white p-4 rounded-xl border border-[#D9DDD8] shadow-2xs space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] uppercase font-bold text-[#555D58] tracking-wider">
                        Facture Fournisseur
                      </span>
                      <SoftDeleteBadge isRetroactive={selectedInvoice.isRetroactive} cancelled={selectedInvoice.cancelled} cancelReason={selectedInvoice.cancelReason} />
                      {!selectedInvoice.cancelled && <InvoiceStatusBadge status={selectedInvoice.paymentStatus} />}
                      {!selectedInvoice.cancelled && <DueDateBadge isOverdue={selectedInvoice.isOverdue} isDueSoon={selectedInvoice.isDueSoon} daysUntilDue={selectedInvoice.daysUntilDue} />}
                    </div>
                    <h3 className="font-mono font-bold text-base text-[#252A27]">
                      {selectedInvoice.invoiceNumber}
                    </h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-base text-[#252A27]">
                      {(selectedInvoice.totalTTC || selectedInvoice.totalAmount || 0).toFixed(3)} DT
                    </span>
                    <CopyLinkButton
                      view="suppliers"
                      subTab="invoices"
                      id={selectedInvoice.id}
                      iconOnly
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-[#ECEEEA] text-xs space-y-1">
                  <p><span className="text-[#555D58]">Fournisseur:</span> <strong>{selectedInvoice.supplierName}</strong></p>
                  {selectedInvoice.purchaseOrderId && (
                    <p><span className="text-[#555D58]">Bon de commande lié:</span> <strong>{purchaseOrders.find(p => p.id === selectedInvoice.purchaseOrderId)?.orderNumber || selectedInvoice.purchaseOrderId}</strong></p>
                  )}
                  <p><span className="text-[#555D58]">Date émission:</span> <strong>{selectedInvoice.invoiceDate}</strong></p>
                  <p><span className="text-[#555D58]">Échéance:</span> <strong>{selectedInvoice.dueDate}</strong></p>
                  <p><span className="text-[#555D58]">TVA:</span> <strong>{(selectedInvoice.taxAmount || 0).toFixed(3)} DT</strong></p>
                </div>

                {/* Suivi du règlement */}
                <div className="pt-2 border-t border-[#ECEEEA] text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[#555D58]">Réglé :</span>
                    <strong className="font-mono">{(selectedInvoice.paidAmount || 0).toFixed(3)} DT</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#555D58]">Reste à payer :</span>
                    <strong className="font-mono text-amber-800">
                      {Math.max(0, (selectedInvoice.totalTTC || selectedInvoice.totalAmount || 0) - (selectedInvoice.paidAmount || 0)).toFixed(3)} DT
                    </strong>
                  </div>
                  {selectedInvoice.payments?.length > 0 && (
                    <div className="pt-1.5 border-t border-[#ECEEEA] divide-y divide-[#ECEEEA]">
                      {selectedInvoice.payments.map(p => (
                        <div key={p.id} className="py-1 flex items-center justify-between">
                          <span className="text-[#555D58]">{p.date} &bull; {p.method} &bull; {p.performedBy}</span>
                          <span className="font-mono font-bold text-emerald-700">+{p.amount.toFixed(3)} DT</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Attachment */}
                {selectedInvoice.attachmentUrl && (
                  <div className="pt-2 border-t border-[#ECEEEA] flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-[#555D58]">Document joint</span>
                    <AttachmentViewer
                      url={selectedInvoice.attachmentUrl}
                      filename={selectedInvoice.invoiceNumber}
                      variant="badge"
                    />
                  </div>
                )}

                {/* Actions */}
                <div className="pt-2 border-t border-[#ECEEEA] space-y-2">
                  {selectedInvoice.paymentStatus !== 'paid' && !selectedInvoice.cancelled && (
                    <button
                      onClick={() => openPaymentModal(selectedInvoice)}
                      className="w-full py-2 rounded-lg bg-[#A4DEC2] hover:bg-[#8BCFAE] text-[#252A27] text-xs font-bold transition-colors shadow-2xs border border-[#8BCFAE] flex items-center justify-center gap-1.5"
                    >
                      <Wallet className="w-3.5 h-3.5" />
                      <span>Enregistrer un Paiement</span>
                    </button>
                  )}
                  <div className="flex space-x-2">
                    <button
                      onClick={() => openEditInvoiceModal(selectedInvoice)}
                      className="flex-1 py-1.5 rounded-lg bg-[#ECEEEA] hover:bg-[#D9DDD8] text-xs font-bold text-[#252A27] border border-[#D9DDD8] flex items-center justify-center space-x-1"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Modifier</span>
                    </button>
                    {!selectedInvoice.cancelled && (
                      <button
                        onClick={() => handleCancelInvoice(selectedInvoice)}
                        className="flex-1 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-xs font-bold text-rose-700 border border-rose-200 flex items-center justify-center space-x-1"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Annuler</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteInvoice(selectedInvoice)}
                      className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200"
                      title="Supprimer définitivement"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-[#555D58]">
                Sélectionnez une facture.
              </div>
            )
          )}
        </div>
      </div>
      </>
      )}

      {/* OCR MODAL */}
      <InvoiceOcrModal
        isOpen={isOcrModalOpen}
        onClose={() => setIsOcrModalOpen(false)}
        suppliers={suppliers}
        ingredients={ingredients}
        onSuccess={() => {
          loadData();
          triggerGlobalRefresh();
          refreshAlerts();
        }}
      />

      {/* NEW / EDIT SUPPLIER MODAL */}
      {isNewSupplierModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#F2F3F0] rounded-2xl p-5 max-w-md w-full shadow-2xl border border-[#C7CDC8] animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-[#D9DDD8]">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#ECEEEA] text-[#252A27] border border-[#D9DDD8] flex items-center justify-center">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#252A27]">
                    {editingSupplier ? 'Modifier le Fournisseur' : 'Nouveau Fournisseur'}
                  </h3>
                  <p className="text-[11px] text-[#555D58]">Partenaire d'approvisionnement</p>
                </div>
              </div>
              <button
                onClick={() => setIsNewSupplierModalOpen(false)}
                className="p-1 rounded-lg bg-[#ECEEEA] text-[#252A27] border border-[#D9DDD8]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#252A27]">Raison Sociale / Nom</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Torréfaction Belco Paris"
                  value={supplierFormData.name}
                  onChange={e => setSupplierFormData({ ...supplierFormData, name: e.target.value })}
                  className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-semibold text-[#252A27] focus:outline-none focus:border-[#252A27]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#252A27]">Catégorie</label>
                  <select
                    value={supplierFormData.category}
                    onChange={e => setSupplierFormData({ ...supplierFormData, category: e.target.value as any })}
                    className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-semibold text-[#252A27]"
                  >
                    <option value="coffee_beans">Café & Torréfaction</option>
                    <option value="dairy">Laits & Produits Frais</option>
                    <option value="beverages">Boissons & Sirops</option>
                    <option value="bakery">Pâtisserie & Boulangerie</option>
                    <option value="packaging">Emballages & Consommables</option>
                    <option value="maintenance">Maintenance Machines</option>
                    <option value="general">Autre</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#252A27]">Échéance Paiement</label>
                  <input
                    type="text"
                    value={supplierFormData.paymentTerms}
                    onChange={e => setSupplierFormData({ ...supplierFormData, paymentTerms: e.target.value })}
                    className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-semibold text-[#252A27]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#252A27]">Contact Référent</label>
                  <input
                    type="text"
                    placeholder="Nom du commercial"
                    value={supplierFormData.contactPerson}
                    onChange={e => setSupplierFormData({ ...supplierFormData, contactPerson: e.target.value })}
                    className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs text-[#252A27]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#252A27]">Téléphone</label>
                  <input
                    type="text"
                    placeholder="01 40 00 00 00"
                    value={supplierFormData.phone}
                    onChange={e => setSupplierFormData({ ...supplierFormData, phone: e.target.value })}
                    className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs text-[#252A27]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#252A27]">WhatsApp</label>
                  <input
                    type="text"
                    placeholder="+216 XX XXX XXX"
                    value={supplierFormData.whatsapp}
                    onChange={e => setSupplierFormData({ ...supplierFormData, whatsapp: e.target.value })}
                    className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs text-[#252A27]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#252A27]">Matricule Fiscal</label>
                  <input
                    type="text"
                    placeholder="Ex: 1234567A/A/M/000"
                    value={supplierFormData.taxNumber}
                    onChange={e => setSupplierFormData({ ...supplierFormData, taxNumber: e.target.value })}
                    className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-mono text-[#252A27]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#252A27]">Email Commande</label>
                <input
                  type="email"
                  placeholder="commandes@fournisseur.com"
                  value={supplierFormData.email}
                  onChange={e => setSupplierFormData({ ...supplierFormData, email: e.target.value })}
                  className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs text-[#252A27]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#252A27]">Adresse</label>
                <input
                  type="text"
                  placeholder="Adresse postale..."
                  value={supplierFormData.address}
                  onChange={e => setSupplierFormData({ ...supplierFormData, address: e.target.value })}
                  className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs text-[#252A27]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#252A27]">Notes</label>
                <input
                  type="text"
                  placeholder="Remarques internes..."
                  value={supplierFormData.notes || ''}
                  onChange={e => setSupplierFormData({ ...supplierFormData, notes: e.target.value })}
                  className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs text-[#252A27]"
                />
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsNewSupplierModalOpen(false)}
                  className="flex-1 py-2 rounded-lg bg-[#ECEEEA] text-xs font-bold text-[#252A27] border border-[#D9DDD8]"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-lg bg-[#A4DEC2] hover:bg-[#8BCFAE] text-[#252A27] text-xs font-bold border border-[#8BCFAE] transition-colors shadow-2xs"
                >
                  {editingSupplier ? 'Mettre à jour' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RETROACTIVE INVOICE MODAL */}
      {isRetroInvoiceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#F2F3F0] rounded-2xl p-5 max-w-lg w-full shadow-2xl border border-[#C7CDC8] animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-[#D9DDD8]">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center">
                  <History className="w-4 h-4 text-amber-800" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#252A27]">Saisie Facture Historique / Papier</h3>
                  <p className="text-[11px] text-[#555D58]">Rattrapage document ancien système</p>
                </div>
              </div>
              <button
                onClick={() => setIsRetroInvoiceModalOpen(false)}
                className="p-1 rounded-lg bg-[#ECEEEA] text-[#252A27] border border-[#D9DDD8]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleSaveRetroInvoice} className="space-y-3">
              <RetroactiveDocumentPanel
                value={retroFields}
                onChange={setRetroFields}
                showApplyToStock
                applyToStockLabel="Appliquer également au stock (entrée des matières premières associées)"
              />

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#252A27]">Fournisseur</label>
                  <select
                    value={retroInvoiceSupplierId}
                    onChange={e => { setRetroInvoiceSupplierId(e.target.value); setRetroInvoicePOId(''); }}
                    className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-semibold text-[#252A27]"
                  >
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#252A27]">N° Facture Fournisseur</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: FAC-2024-884"
                    value={retroInvoiceNumber}
                    onChange={e => setRetroInvoiceNumber(e.target.value)}
                    className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-bold text-[#252A27]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#252A27]">Bon de commande lié (optionnel)</label>
                <select
                  value={retroInvoicePOId}
                  onChange={e => setRetroInvoicePOId(e.target.value)}
                  className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-semibold text-[#252A27]"
                >
                  <option value="">Aucun — facture indépendante</option>
                  {purchaseOrders.filter(p => p.supplierId === retroInvoiceSupplierId && p.status !== 'cancelled').map(p => (
                    <option key={p.id} value={p.id}>{p.orderNumber} ({(p.totalAmount || 0).toFixed(3)} DT)</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#252A27]">Montant HT (DT)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={retroInvoiceSubtotal}
                    onChange={e => {
                      const ht = parseFloat(e.target.value) || 0;
                      const tva = Number((ht * DEFAULT_TVA_RATE / 100).toFixed(2));
                      setRetroInvoiceSubtotal(ht);
                      setRetroInvoiceTva(tva);
                      setRetroInvoiceTotal(Number((ht + tva).toFixed(2)));
                    }}
                    className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-bold text-[#252A27]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#252A27]">TVA (DT)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={retroInvoiceTva}
                    onChange={e => {
                      const tva = parseFloat(e.target.value) || 0;
                      setRetroInvoiceTva(tva);
                      setRetroInvoiceTotal(Number((retroInvoiceSubtotal + tva).toFixed(2)));
                    }}
                    className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-bold text-[#252A27]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#252A27]">Total TTC (DT)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={retroInvoiceTotal}
                    onChange={e => setRetroInvoiceTotal(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-bold text-[#252A27]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#252A27]">Date d'échéance de paiement</label>
                <input
                  type="date"
                  value={retroInvoiceDueDate}
                  onChange={e => setRetroInvoiceDueDate(e.target.value)}
                  className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs text-[#252A27]"
                />
              </div>

              <label className="flex items-center space-x-2 cursor-pointer p-2 bg-white rounded-lg border border-[#D9DDD8]">
                <input
                  type="checkbox"
                  checked={retroInvoiceAlreadyPaid}
                  onChange={e => setRetroInvoiceAlreadyPaid(e.target.checked)}
                  className="w-3.5 h-3.5"
                />
                <span className="text-[11px] font-bold text-[#252A27]">Cette facture a déjà été réglée intégralement</span>
              </label>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsRetroInvoiceModalOpen(false)}
                  className="flex-1 py-2 rounded-lg bg-[#ECEEEA] text-xs font-bold text-[#252A27] border border-[#D9DDD8]"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-lg bg-[#A4DEC2] hover:bg-[#8BCFAE] text-[#252A27] text-xs font-bold border border-[#8BCFAE] transition-colors shadow-2xs"
                >
                  Enregistrer Facture Historique
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT INVOICE MODAL */}
      {isEditInvoiceModalOpen && editingInvoice && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#F2F3F0] rounded-2xl p-5 max-w-md w-full shadow-2xl border border-[#C7CDC8] animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-[#D9DDD8]">
              <h3 className="font-bold text-sm text-[#252A27]">Modifier la Facture {editingInvoice.invoiceNumber}</h3>
              <button
                onClick={() => setIsEditInvoiceModalOpen(false)}
                className="p-1 rounded-lg bg-[#ECEEEA] text-[#252A27] border border-[#D9DDD8]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditInvoice} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#252A27]">N° de Facture</label>
                <input
                  type="text"
                  required
                  value={editInvoiceForm.invoiceNumber}
                  onChange={e => setEditInvoiceForm({ ...editInvoiceForm, invoiceNumber: e.target.value })}
                  className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-bold text-[#252A27]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#252A27]">Montant Total (DT)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editInvoiceForm.totalAmount}
                    onChange={e => setEditInvoiceForm({ ...editInvoiceForm, totalAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-bold text-[#252A27]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#252A27]">Date d'échéance</label>
                  <input
                    type="date"
                    value={editInvoiceForm.dueDate}
                    onChange={e => setEditInvoiceForm({ ...editInvoiceForm, dueDate: e.target.value })}
                    className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs text-[#252A27]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#252A27]">Statut de paiement</label>
                <select
                  value={editInvoiceForm.paymentStatus}
                  onChange={e => setEditInvoiceForm({ ...editInvoiceForm, paymentStatus: e.target.value as any })}
                  className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-semibold text-[#252A27]"
                >
                  <option value="unpaid">En attente de paiement</option>
                  <option value="paid">Payée</option>
                  <option value="partially_paid">Partiellement payée</option>
                </select>
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsEditInvoiceModalOpen(false)}
                  className="flex-1 py-2 rounded-lg bg-[#ECEEEA] text-xs font-bold text-[#252A27] border border-[#D9DDD8]"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-lg bg-[#A4DEC2] hover:bg-[#8BCFAE] text-[#252A27] text-xs font-bold border border-[#8BCFAE] transition-colors shadow-2xs"
                >
                  Mettre à jour
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW PO MODAL */}
      {isNewPOModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#F2F3F0] rounded-2xl p-5 max-w-lg w-full shadow-2xl border border-[#C7CDC8] animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-[#D9DDD8]">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#ECEEEA] text-[#252A27] border border-[#D9DDD8] flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#252A27]">Créer Bon de Commande</h3>
                  <p className="text-[11px] text-[#555D58]">Approvisionnement matières premières</p>
                </div>
              </div>
              <button
                onClick={() => { setIsNewPOModalOpen(false); setPriceHistoryIngredientId(null); }}
                className="p-1 rounded-lg bg-[#ECEEEA] text-[#252A27] border border-[#D9DDD8]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#252A27]">Fournisseur</label>
                  <select
                    value={newPO.supplierId}
                    onChange={e => setNewPO({ ...newPO, supplierId: e.target.value })}
                    className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-semibold text-[#252A27]"
                  >
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#252A27]">Date Livraison Souhaitée</label>
                  <input
                    type="date"
                    value={newPO.expectedDeliveryDate}
                    onChange={e => setNewPO({ ...newPO, expectedDeliveryDate: e.target.value })}
                    className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-semibold text-[#252A27]"
                  />
                </div>
              </div>

              {/* Items */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-bold text-[#252A27] uppercase">Lignes d'articles</label>
                  <button
                    type="button"
                    onClick={() => {
                      if (ingredients.length > 0) {
                        setNewPO({
                          ...newPO,
                          items: [...newPO.items, { ingredientId: ingredients[0].id, quantity: 5, unitPrice: ingredients[0].costPerUnit }]
                        });
                      }
                    }}
                    className="text-xs font-bold text-[#252A27] hover:underline"
                  >
                    + Ajouter une ligne
                  </button>
                </div>

                <div className="space-y-1.5">
                  {newPO.items.map((line, idx) => (
                    <div key={idx} className="p-2 bg-white rounded-lg border border-[#D9DDD8] space-y-1.5">
                      <div className="flex items-center gap-2">
                        <select
                          value={line.ingredientId}
                          onChange={e => {
                            const target = ingredients.find(i => i.id === e.target.value);
                            const copy = [...newPO.items];
                            copy[idx] = {
                              ...copy[idx],
                              ingredientId: e.target.value,
                              unitPrice: target?.costPerUnit || copy[idx].unitPrice
                            };
                            setNewPO({ ...newPO, items: copy });
                          }}
                          className="flex-1 p-1 bg-[#F7F7F5] border border-[#D9DDD8] rounded text-xs text-[#252A27]"
                        >
                          {ingredients.map(ing => (
                            <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min="1"
                          value={line.quantity}
                          onChange={e => {
                            const copy = [...newPO.items];
                            copy[idx].quantity = parseFloat(e.target.value) || 1;
                            setNewPO({ ...newPO, items: copy });
                          }}
                          className="w-16 p-1 bg-[#F7F7F5] border border-[#D9DDD8] rounded text-xs text-center font-bold text-[#252A27]"
                        />
                        <input
                          type="number"
                          step="0.01"
                          value={line.unitPrice}
                          onChange={e => {
                            const copy = [...newPO.items];
                            copy[idx].unitPrice = parseFloat(e.target.value) || 0;
                            setNewPO({ ...newPO, items: copy });
                          }}
                          className="w-20 p-1 bg-[#F7F7F5] border border-[#D9DDD8] rounded text-xs text-center font-bold text-[#252A27]"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (priceHistoryIngredientId === line.ingredientId) {
                              setPriceHistoryIngredientId(null);
                            } else {
                              loadPriceHistory(line.ingredientId);
                            }
                          }}
                          className="p-1 text-[#555D58] hover:text-[#252A27]"
                          title="Historique des prix d'achat (tous fournisseurs)"
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const copy = [...newPO.items];
                            copy.splice(idx, 1);
                            setNewPO({ ...newPO, items: copy });
                          }}
                          className="p-1 text-[#555D58] hover:text-rose-700"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {priceHistoryIngredientId === line.ingredientId && (
                        <div className="p-2 bg-[#F7F7F5] rounded-lg border border-[#ECEEEA] text-[10px] space-y-1">
                          <span className="font-bold text-[#555D58] block">Historique d'achat (tous fournisseurs)</span>
                          {priceHistoryLoading ? (
                            <span className="text-[#555D58]">Chargement...</span>
                          ) : priceHistory.length === 0 ? (
                            <span className="text-[#555D58]">Aucun achat enregistré pour cet article.</span>
                          ) : (
                            priceHistory.slice(0, 5).map((h, hIdx) => (
                              <div key={hIdx} className="flex items-center justify-between">
                                <span className="text-[#555D58]">
                                  {new Date(h.date).toLocaleDateString('fr-FR')} &bull; {h.supplierName || 'Fournisseur inconnu'}
                                </span>
                                <span className="font-mono font-bold text-[#252A27]">{h.unitCost.toFixed(3)} DT</span>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex space-x-2 border-t border-[#D9DDD8]">
                <button
                  type="button"
                  onClick={() => { setIsNewPOModalOpen(false); setPriceHistoryIngredientId(null); }}
                  className="flex-1 py-2 rounded-lg bg-[#ECEEEA] text-xs font-bold text-[#252A27] border border-[#D9DDD8]"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => handleCreatePO('draft')}
                  className="flex-1 py-2 rounded-lg bg-white hover:bg-[#ECEEEA] text-[#252A27] text-xs font-bold border border-[#D9DDD8] transition-colors"
                >
                  Enregistrer en Brouillon
                </button>
                <button
                  type="button"
                  onClick={() => handleCreatePO('sent')}
                  className="flex-1 py-2 rounded-lg bg-[#A4DEC2] hover:bg-[#8BCFAE] text-[#252A27] text-xs font-bold border border-[#8BCFAE] transition-colors shadow-2xs"
                >
                  Envoyer au Fournisseur
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RECEPTION MODAL (réception totale ou partielle d'un bon de commande) */}
      {receivingPO && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#F2F3F0] rounded-2xl p-5 max-w-lg w-full shadow-2xl border border-[#C7CDC8] animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-[#D9DDD8]">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#ECEEEA] text-[#252A27] border border-[#D9DDD8] flex items-center justify-center">
                  <PackageCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#252A27]">Réceptionner {receivingPO.orderNumber}</h3>
                  <p className="text-[11px] text-[#555D58]">Ajustez les quantités si la livraison est partielle</p>
                </div>
              </div>
              <button onClick={() => setReceivingPO(null)} className="p-1 rounded-lg bg-[#ECEEEA] text-[#252A27] border border-[#D9DDD8]">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReceive} className="flex-1 overflow-y-auto space-y-3 pr-1">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#252A27]">Zone de réception</label>
                <div className="grid grid-cols-2 gap-2">
                  {STOCK_ZONES.map(z => (
                    <button
                      key={z}
                      type="button"
                      onClick={() => setReceiveZone(z)}
                      className={`p-2 rounded-lg border text-xs font-bold transition-all ${
                        receiveZone === z ? 'bg-[#252A27] text-[#A4DEC2] border-[#252A27]' : 'bg-white text-[#252A27] border-[#D9DDD8]'
                      }`}
                    >
                      {ZONE_LABELS[z]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-[#252A27] uppercase block">Quantités reçues</span>
                {receivingPO.items.map((item, idx) => {
                  const already = item.receivedQuantity || 0;
                  return (
                    <div key={idx} className="p-2 bg-white rounded-lg border border-[#D9DDD8] flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-semibold text-[#252A27] truncate block">{item.itemName}</span>
                        <span className="text-[10px] text-[#555D58]">Commandé : {item.quantity} {item.unit} &bull; Déjà reçu : {already} {item.unit}</span>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={receiveLines[idx]?.quantityReceived ?? 0}
                        onChange={e => {
                          const copy = [...receiveLines];
                          copy[idx] = { ...copy[idx], quantityReceived: parseFloat(e.target.value) || 0 };
                          setReceiveLines(copy);
                        }}
                        className="w-20 p-1.5 bg-[#F7F7F5] border border-[#D9DDD8] rounded text-xs text-center font-bold text-[#252A27]"
                      />
                      <span className="text-[10px] text-[#555D58] w-8">{item.unit}</span>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#252A27]">Remarque (optionnel)</label>
                <input
                  type="text"
                  value={receiveNote}
                  onChange={e => setReceiveNote(e.target.value)}
                  className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs text-[#252A27]"
                />
              </div>

              <div className="pt-2 flex space-x-2 border-t border-[#D9DDD8]">
                <button type="button" onClick={() => setReceivingPO(null)} className="flex-1 py-2 rounded-lg bg-[#ECEEEA] text-xs font-bold text-[#252A27] border border-[#D9DDD8]">
                  Annuler
                </button>
                <button type="submit" className="flex-1 py-2 rounded-lg bg-[#A4DEC2] hover:bg-[#8BCFAE] text-[#252A27] text-xs font-bold border border-[#8BCFAE] transition-colors shadow-2xs">
                  Valider la Réception
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PAYMENT MODAL (règlement total ou partiel d'une facture) */}
      {payingInvoice && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#F2F3F0] rounded-2xl p-5 max-w-md w-full shadow-2xl border border-[#C7CDC8] animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-[#D9DDD8]">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#ECEEEA] text-[#252A27] border border-[#D9DDD8] flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#252A27]">Paiement — {payingInvoice.invoiceNumber}</h3>
                  <p className="text-[11px] text-[#555D58]">
                    Total {((payingInvoice.totalTTC || payingInvoice.totalAmount) || 0).toFixed(3)} DT &bull; Déjà réglé {(payingInvoice.paidAmount || 0).toFixed(3)} DT
                  </p>
                </div>
              </div>
              <button onClick={() => setPayingInvoice(null)} className="p-1 rounded-lg bg-[#ECEEEA] text-[#252A27] border border-[#D9DDD8]">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#252A27]">Montant réglé (DT)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-bold text-center text-[#252A27]"
                />
                <p className="text-[10px] text-[#555D58]">
                  Reste dû après ce paiement : {Math.max(0, ((payingInvoice.totalTTC || payingInvoice.totalAmount) || 0) - (payingInvoice.paidAmount || 0) - paymentAmount).toFixed(3)} DT
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#252A27]">Mode de paiement</label>
                <select
                  value={paymentMethodInput}
                  onChange={e => setPaymentMethodInput(e.target.value)}
                  className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-semibold text-[#252A27]"
                >
                  <option value="Virement bancaire">Virement bancaire</option>
                  <option value="Espèces">Espèces</option>
                  <option value="Chèque">Chèque</option>
                  <option value="Carte bancaire">Carte bancaire</option>
                  <option value="Traite">Traite</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#252A27]">Note (optionnel)</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={e => setPaymentNotes(e.target.value)}
                  className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs text-[#252A27]"
                />
              </div>

              <div className="pt-2 flex space-x-2">
                <button type="button" onClick={() => setPayingInvoice(null)} className="flex-1 py-2 rounded-lg bg-[#ECEEEA] text-xs font-bold text-[#252A27] border border-[#D9DDD8]">
                  Annuler
                </button>
                <button type="submit" className="flex-1 py-2 rounded-lg bg-[#A4DEC2] hover:bg-[#8BCFAE] text-[#252A27] text-xs font-bold border border-[#8BCFAE] transition-colors shadow-2xs">
                  Enregistrer le Paiement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GLOBAL CONFIRM DIALOG */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
        confirmLabel={confirmDialog.confirmLabel}
        reasonLabel={confirmDialog.reasonLabel}
        reasonRequired={confirmDialog.reasonRequired}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
