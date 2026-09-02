import React, { useState, useEffect, useRef } from 'react';
import { useSystem } from '../../context/SystemContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Supplier, PurchaseOrder, SupplierInvoice, Ingredient } from '../../types';
import { InvoiceOcrModal } from './InvoiceOcrModal';
import { CopyLinkButton } from '../common/CopyLinkButton';
import { ItemThumbnail } from '../common/ItemThumbnail';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { AttachmentViewer, AttachmentUpload } from '../common/AttachmentViewer';
import { SoftDeleteBadge } from '../common/SoftDeleteBadge';
import { RetroactiveDocumentPanel, emptyRetroactiveFields, RetroactiveFields } from '../common/RetroactiveDocumentPanel';
import {
  Truck,
  Plus,
  Sparkles,
  FileText,
  DollarSign,
  CheckCircle2,
  Clock,
  Phone,
  Mail,
  Building,
  Calendar,
  X,
  Send,
  AlertCircle,
  Search,
  Check,
  ChevronRight,
  History,
  Edit2,
  Trash2,
  Ban,
  Receipt
} from 'lucide-react';

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
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [activeTab, setActiveTab] = useState<'suppliers' | 'orders' | 'invoices'>('suppliers');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<SupplierInvoice | null>(null);
  const hasValidatedIdRef = useRef(false);

  // Modals
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  const [isNewSupplierModalOpen, setIsNewSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierFormData, setSupplierFormData] = useState<Partial<Supplier>>({
    name: '',
    category: 'coffee_beans' as any,
    contactPerson: '',
    email: '',
    phone: '',
    paymentTerms: '30 jours',
    address: ''
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

  // Retroactive Invoice Modal
  const [isRetroInvoiceModalOpen, setIsRetroInvoiceModalOpen] = useState(false);
  const [retroInvoiceSupplierId, setRetroInvoiceSupplierId] = useState('');
  const [retroInvoiceNumber, setRetroInvoiceNumber] = useState('');
  const [retroInvoiceDueDate, setRetroInvoiceDueDate] = useState('');
  const [retroInvoiceSubtotal, setRetroInvoiceSubtotal] = useState(0);
  const [retroInvoiceTva, setRetroInvoiceTva] = useState(0);
  const [retroInvoiceTotal, setRetroInvoiceTotal] = useState(0);
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
    paymentMethod: 'Virement SEPA'
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

    if (currentAction === 'ocr_modal') setIsOcrModalOpen(true);
    else if (currentAction === 'new_supplier') openCreateSupplierModal();
    else if (currentAction === 'new_po') setIsNewPOModalOpen(true);
    else if (currentAction === 'retro-invoice') openRetroInvoiceModal();
  }, [currentSubTab, currentAction]);

  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sups, pos, invs, ings] = await Promise.all([
        api.getSuppliers(),
        api.getPurchaseOrders(),
        api.getSupplierInvoices(),
        api.getIngredients()
      ]);
      setSuppliers(sups);
      setPurchaseOrders(pos);
      setInvoices(invs);
      setIngredients(ings);

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
      email: '',
      phone: '',
      paymentTerms: '30 jours',
      address: ''
    });
    setIsNewSupplierModalOpen(true);
  };

  const openEditSupplierModal = (sup: Supplier) => {
    setEditingSupplier(sup);
    setSupplierFormData({
      name: sup.name,
      category: sup.category,
      contactPerson: sup.contactPerson || '',
      email: sup.email || '',
      phone: sup.phone || '',
      paymentTerms: sup.paymentTerms || '30 jours',
      address: sup.address || ''
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
          email: supplierFormData.email || '',
          phone: supplierFormData.phone || '',
          paymentTerms: supplierFormData.paymentTerms || '30 jours',
          address: supplierFormData.address || '',
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
  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
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
          totalCost: Number((item.quantity * item.unitPrice).toFixed(2))
        };
      });

      const totalAmount = poItems.reduce((sum, i) => sum + i.totalCost, 0);

      const created = await api.createPurchaseOrder({
        supplierId: newPO.supplierId,
        supplierName: sup ? sup.name : 'Fournisseur',
        orderNumber: `PO-${Date.now().toString().slice(-6)}`,
        expectedDeliveryDate: newPO.expectedDeliveryDate,
        status: 'sent',
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
      showRouteNotification('Bon de commande créé avec succès', 'success');
      triggerGlobalRefresh();
      refreshAlerts();
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

  const handleReceivePO = async (poId: string) => {
    try {
      await api.receivePurchaseOrder(poId, currentUser?.name || 'Réceptionniste');
      setPurchaseOrders(prev => prev.map(p => p.id === poId ? { ...p, status: 'received' } : p));
      showRouteNotification('Réception validée et stock mis à jour', 'success');
      triggerGlobalRefresh();
      refreshAlerts();
    } catch (err: any) {
      showRouteNotification(`Erreur: ${err.message}`, 'error');
    }
  };

  // Invoice Handlers
  const openRetroInvoiceModal = () => {
    setRetroInvoiceSupplierId(suppliers.length > 0 ? suppliers[0].id : '');
    setRetroInvoiceNumber('');
    setRetroInvoiceDueDate(new Date().toISOString().split('T')[0]);
    setRetroInvoiceSubtotal(100);
    setRetroInvoiceTva(20);
    setRetroInvoiceTotal(120);
    setRetroFields(emptyRetroactiveFields());
    setIsRetroInvoiceModalOpen(true);
  };

  const handleSaveRetroInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!retroInvoiceNumber || !retroInvoiceSupplierId) return;

    try {
      const sup = suppliers.find(s => s.id === retroInvoiceSupplierId);
      const finalDocDate = retroFields.documentDate || new Date().toISOString().split('T')[0];

      const created = await api.createSupplierInvoice({
        invoiceNumber: retroInvoiceNumber,
        supplierId: retroInvoiceSupplierId,
        supplierName: sup ? sup.name : 'Fournisseur',
        invoiceDate: finalDocDate,
        dueDate: retroInvoiceDueDate || finalDocDate,
        subtotal: Number(retroInvoiceSubtotal) || 0,
        taxAmount: Number(retroInvoiceTva) || 0,
        totalAmount: Number(retroInvoiceTotal) || 0,
        paymentStatus: 'paid',
        paymentDate: finalDocDate,
        paymentMethod: 'Virement SEPA',
        attachmentUrl: retroFields.attachmentUrl || undefined,
        ocrProcessed: false,
        stockUpdated: retroFields.applyToStock,
        isRetroactive: true,
        documentDate: finalDocDate,
        retroNotes: retroFields.notes || undefined,
        items: []
      }, currentUser?.name || 'Admin');

      setInvoices(prev => [created, ...prev]);
      setSelectedInvoice(created);
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
      paymentMethod: inv.paymentMethod || 'Virement SEPA'
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

  const handlePayInvoice = async (invoiceId: string) => {
    try {
      await api.paySupplierInvoice(invoiceId, 'Virement SEPA', currentUser?.name || 'Comptable');
      setInvoices(prev => prev.map(i => i.id === invoiceId ? { ...i, paymentStatus: 'paid' } : i));
      showRouteNotification('Facture marquée comme payée', 'success');
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

  const totalInvoicesDue = safeInvoices
    .filter(i => i.paymentStatus !== 'paid' && !i.cancelled)
    .reduce((sum, i) => sum + (i.totalTTC || i.totalAmount || 0), 0);

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

          <div className="flex items-center space-x-3 text-xs">
            <span className="text-[#555D58]">Factures à régler:</span>
            <span className="font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              {totalInvoicesDue.toFixed(3)} DT
            </span>
          </div>
        </div>
      </div>

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
                          <SoftDeleteBadge status={po.status} cancelReason={po.cancelReason} />
                        </div>
                        <p className="text-[11px] text-[#555D58] mt-0.5">
                          Prévue: {po.expectedDeliveryDate} &bull; {po.items?.length || 0} lignes d'articles
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
                const isPaid = inv.paymentStatus === 'paid';
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
                        <span className={`text-[9px] font-bold ${isPaid ? 'text-emerald-700' : 'text-amber-800'}`}>
                          {isPaid ? 'Payée' : 'En attente'}
                        </span>
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
                      <SoftDeleteBadge status={selectedPO.status} cancelReason={selectedPO.cancelReason} />
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

                <div className="pt-2 border-t border-[#ECEEEA] text-xs space-y-1">
                  <p><span className="text-[#555D58]">Fournisseur:</span> <strong>{selectedPO.supplierName}</strong></p>
                  <p><span className="text-[#555D58]">Date prévue:</span> <strong>{selectedPO.expectedDeliveryDate}</strong></p>
                  <p><span className="text-[#555D58]">Statut:</span> <strong className="uppercase">{selectedPO.status}</strong></p>
                </div>

                <div className="pt-2 border-t border-[#ECEEEA] space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-[#555D58] block">Articles commandés</span>
                  <div className="divide-y divide-[#ECEEEA] text-xs">
                    {selectedPO.items?.map((item, idx) => {
                      const ingMatch = ingredients.find(i => i.id === item.ingredientId);
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
                            <span className="truncate">{item.itemName} × {item.quantity} {item.unit}</span>
                          </div>
                          <span className="font-mono font-bold shrink-0">{(item.totalCost || 0).toFixed(3)} DT</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {selectedPO.status !== 'received' && selectedPO.status !== 'cancelled' && (
                  <div className="pt-2 border-t border-[#ECEEEA] space-y-2">
                    <button
                      onClick={() => handleReceivePO(selectedPO.id)}
                      className="w-full py-2 rounded-lg bg-[#A4DEC2] hover:bg-[#8BCFAE] text-[#252A27] text-xs font-bold transition-colors shadow-2xs border border-[#8BCFAE]"
                    >
                      Valider la réception (Entrée en stock)
                    </button>
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
                  <p><span className="text-[#555D58]">Date émission:</span> <strong>{selectedInvoice.invoiceDate}</strong></p>
                  <p><span className="text-[#555D58]">Échéance:</span> <strong>{selectedInvoice.dueDate}</strong></p>
                  <p><span className="text-[#555D58]">TVA:</span> <strong>{(selectedInvoice.taxAmount || 0).toFixed(3)} DT</strong></p>
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
                      onClick={() => handlePayInvoice(selectedInvoice.id)}
                      className="w-full py-2 rounded-lg bg-[#A4DEC2] hover:bg-[#8BCFAE] text-[#252A27] text-xs font-bold transition-colors shadow-2xs border border-[#8BCFAE]"
                    >
                      Marquer comme Payée (Virement SEPA)
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
                    onChange={e => setRetroInvoiceSupplierId(e.target.value)}
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

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#252A27]">Montant HT (DT)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={retroInvoiceSubtotal}
                    onChange={e => {
                      const ht = parseFloat(e.target.value) || 0;
                      const tva = Number((ht * 0.1).toFixed(2));
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
                onClick={() => setIsNewPOModalOpen(false)}
                className="p-1 rounded-lg bg-[#ECEEEA] text-[#252A27] border border-[#D9DDD8]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleCreatePO} className="flex-1 overflow-y-auto space-y-3 pr-1">
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
                    <div key={idx} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-[#D9DDD8]">
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
                          const copy = [...newPO.items];
                          copy.splice(idx, 1);
                          setNewPO({ ...newPO, items: copy });
                        }}
                        className="p-1 text-[#555D58] hover:text-rose-700"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex space-x-2 border-t border-[#D9DDD8]">
                <button
                  type="button"
                  onClick={() => setIsNewPOModalOpen(false)}
                  className="flex-1 py-2 rounded-lg bg-[#ECEEEA] text-xs font-bold text-[#252A27] border border-[#D9DDD8]"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-lg bg-[#A4DEC2] hover:bg-[#8BCFAE] text-[#252A27] text-xs font-bold border border-[#8BCFAE] transition-colors shadow-2xs"
                >
                  Émettre Bon de Commande
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
