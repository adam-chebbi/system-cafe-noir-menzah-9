import React, { useState, useEffect, useRef } from 'react';
import {
  Product,
  Category,
  Table,
  Order,
  User,
  Sale
} from '../../types';
import { api } from '../../services/api';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Coffee,
  UtensilsCrossed,
  ShoppingBag,
  Send,
  CreditCard,
  X,
  Percent,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight,
  Check,
  LayoutGrid,
  Users,
  Info,
  ChevronRight,
  Sparkle,
  Flame,
  CupSoda
} from 'lucide-react';
import { FastPaymentModal } from './FastPaymentModal';
import { ReceiptModal } from './ReceiptModal';
import { useSystem } from '../../context/SystemContext';

interface CartItem {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  options: { optionName: string; choiceName: string; priceModifier: number }[];
  notes?: string;
  totalPrice: number;
}

interface POSTactileScreenProps {
  categories: Category[];
  products: Product[];
  tables: Table[];
  activeOrders: Order[];
  currentUser: User | null;
  onOrderLaunched: (order: Order) => void;
  onOrderPaid: (sale: Sale) => void;
  loadedOrder: Order | null;
  onClearLoadedOrder: () => void;
}

export const POSTactileScreen: React.FC<POSTactileScreenProps> = ({
  categories,
  products,
  tables,
  activeOrders,
  currentUser,
  onOrderLaunched,
  onOrderPaid,
  loadedOrder,
  onClearLoadedOrder
}) => {
  const { showRouteNotification } = useSystem();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const searchInputRef = useRef<HTMLInputElement>(null);


  // Cart state
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway'>('dine_in');
  const [customerName, setCustomerName] = useState<string>('Client Comptoir');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState<string>('');
  const [specialNotes, setSpecialNotes] = useState<string>('');

  // Editing existing order tracker
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

  // Modals state
  const [isTableModalOpen, setIsTableModalOpen] = useState<boolean>(false);
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<{ optionName: string; choiceName: string; priceModifier: number }[]>([]);
  const [productNote, setProductNote] = useState<string>('');

  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState<boolean>(false);
  const [customDiscountVal, setCustomDiscountVal] = useState<string>('');

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // Live timer for active editing order
  const [now, setNow] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2' || (e.key === '/' && (e.target as HTMLElement).tagName !== 'INPUT')) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (orderType === 'dine_in') setIsTableModalOpen(true);
      } else if (e.key === 'F8') {
        e.preventDefault();
        setIsDiscountModalOpen(true);
      } else if (e.key === 'Escape') {
        setIsTableModalOpen(false);
        setCustomizingProduct(null);
        setIsDiscountModalOpen(false);
        setIsPaymentModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [orderType]);

  // Load order when requested externally
  useEffect(() => {
    if (loadedOrder) {
      setEditingOrderId(loadedOrder.id);
      setSelectedTableId(loadedOrder.tableId || '');
      setOrderType(loadedOrder.source === 'takeaway' ? 'takeaway' : 'dine_in');
      setCustomerName(loadedOrder.customerName || 'Client');
      setDiscountAmount(loadedOrder.discountAmount || 0);
      setDiscountReason(loadedOrder.discountReason || '');
      setSpecialNotes(loadedOrder.specialNotes || '');

      setCartItems(
        (loadedOrder.items || []).map(item => ({
          productId: item.productId,
          productName: item.productName,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          options: item.options || [],
          notes: item.notes || '',
          totalPrice: item.totalPrice
        }))
      );
    }
  }, [loadedOrder]);

  const safeProducts = Array.isArray(products) ? products : [];
  const safeCategories = Array.isArray(categories) ? categories : [];
  const safeTables = Array.isArray(tables) ? tables : [];
  const q = (searchQuery || '').toLowerCase();

  const filteredProducts = safeProducts.filter(p => {
    const matchesCat = selectedCategory === 'all' || p.categoryId === selectedCategory;
    const matchesSearch =
      (p.name || '').toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q));
    return matchesCat && matchesSearch && p.available !== false;
  });

  // Check if chosen table has an active order
  const existingTableOrder = selectedTableId
    ? activeOrders.find(
        o => o.tableId === selectedTableId && ['accepted', 'preparing', 'ready', 'served'].includes(o.status)
      )
    : null;

  // Active editing order details
  const activeLoadedOrderObj = editingOrderId ? activeOrders.find(o => o.id === editingOrderId) : null;
  const selectedTableObj = safeTables.find(t => t.id === selectedTableId);

  // Cart quantity map for instant badge overlay on product cards
  const cartQuantityMap = cartItems.reduce<Record<string, number>>((acc, item) => {
    acc[item.productId] = (acc[item.productId] || 0) + item.quantity;
    return acc;
  }, {});

  // Product Tap
  const handleProductTap = (product: Product) => {
    if (product.options && product.options.length > 0) {
      setCustomizingProduct(product);
      setSelectedOptions([]);
      setProductNote('');
    } else {
      addToCart(product, [], '');
    }
  };

  const addToCart = (
    product: Product,
    options: { optionName: string; choiceName: string; priceModifier: number }[],
    notes: string
  ) => {
    let unitPrice = product.price;
    for (const opt of options) {
      unitPrice += opt.priceModifier;
    }
    unitPrice = Number(unitPrice.toFixed(2));

    const existingIndex = cartItems.findIndex(
      i =>
        i.productId === product.id &&
        JSON.stringify(i.options) === JSON.stringify(options) &&
        i.notes === notes
    );

    if (existingIndex !== -1) {
      const updated = [...cartItems];
      updated[existingIndex].quantity += 1;
      updated[existingIndex].totalPrice = Number(
        (updated[existingIndex].quantity * updated[existingIndex].unitPrice).toFixed(2)
      );
      setCartItems(updated);
    } else {
      setCartItems([
        ...cartItems,
        {
          productId: product.id,
          productName: product.name,
          unitPrice,
          quantity: 1,
          options,
          notes,
          totalPrice: unitPrice
        }
      ]);
    }
  };

  const updateQuantity = (index: number, delta: number) => {
    const updated = [...cartItems];
    const newQty = updated[index].quantity + delta;
    if (newQty <= 0) {
      updated.splice(index, 1);
    } else {
      updated[index].quantity = newQty;
      updated[index].totalPrice = Number((newQty * updated[index].unitPrice).toFixed(2));
    }
    setCartItems(updated);
  };

  const clearCart = () => {
    setCartItems([]);
    setSelectedTableId('');
    setOrderType('dine_in');
    setCustomerName('Client Comptoir');
    setDiscountAmount(0);
    setDiscountReason('');
    setSpecialNotes('');
    setEditingOrderId(null);
    onClearLoadedOrder();
  };

  // Calculations
  const rawSubtotal = cartItems.reduce((sum, i) => sum + i.totalPrice, 0);
  const finalTotal = Math.max(0, Number((rawSubtotal - discountAmount).toFixed(2)));
  const tvaEstimate = Number((finalTotal * 0.10).toFixed(2));
  const subtotalHT = Number((finalTotal - tvaEstimate).toFixed(2));

  // Elapsed timer string for active order
  const calculateElapsed = (startTime?: string) => {
    if (!startTime) return '00:00';
    const diff = Math.max(0, Math.floor((now.getTime() - new Date(startTime).getTime()) / 1000));
    const m = Math.floor(diff / 60);
    const s = diff % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // 1. Action: "Lancer la commande"
  const handleLaunchOrder = async () => {
    if (cartItems.length === 0) return;
    if (orderType === 'dine_in' && !selectedTableId) {
      setIsTableModalOpen(true);
      return;
    }

    setLoading(true);
    try {
      if (editingOrderId) {
        const updated = await api.updateOrderItems(
          editingOrderId,
          cartItems.map(i => ({
            productId: i.productId,
            quantity: i.quantity,
            options: i.options,
            notes: i.notes
          })),
          discountAmount,
          discountReason,
          currentUser?.name || 'Caissier'
        );
        onOrderLaunched(updated);
      } else {
        const orderPayload = {
          tableId: orderType === 'dine_in' ? selectedTableId : undefined,
          customerName: orderType === 'takeaway' ? customerName || 'À emporter' : undefined,
          serverUserId: currentUser?.id || 'usr_staff',
          serverUserName: currentUser?.name || 'Caissier',
          source: orderType === 'takeaway' ? ('takeaway' as const) : ('pos' as const),
          items: cartItems.map(i => ({
            productId: i.productId,
            quantity: i.quantity,
            options: i.options,
            notes: i.notes
          })),
          discountAmount,
          discountReason,
          specialNotes
        };

        const createdOrder = await api.createPOSOrder(orderPayload);
        const launched = await api.launchOrder(createdOrder.id, currentUser?.name || 'Caissier');
        onOrderLaunched(launched);
      }

      clearCart();
      showRouteNotification('Commande envoyée en cuisine / KDS avec succès', 'success');
    } catch (err: any) {
      showRouteNotification(`Erreur lors du lancement de la commande: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // 2. Action: "Encaisser Directement"
  const handleProcessPayment = async (paymentData: any) => {
    if (cartItems.length === 0) return;
    setLoading(true);
    try {
      let orderIdToPay = editingOrderId;

      if (!orderIdToPay) {
        const orderPayload = {
          tableId: orderType === 'dine_in' ? selectedTableId : undefined,
          customerName: orderType === 'takeaway' ? customerName || 'À emporter' : undefined,
          serverUserId: currentUser?.id || 'usr_staff',
          serverUserName: currentUser?.name || 'Caissier',
          source: orderType === 'takeaway' ? ('takeaway' as const) : ('pos' as const),
          items: cartItems.map(i => ({
            productId: i.productId,
            quantity: i.quantity,
            options: i.options,
            notes: i.notes
          })),
          discountAmount,
          discountReason,
          specialNotes
        };

        const createdOrder = await api.createPOSOrder(orderPayload);
        orderIdToPay = createdOrder.id;
      }

      const paymentPayload = {
        ...paymentData,
        cashierId: currentUser?.id || 'usr_staff',
        cashierName: currentUser?.name || 'Caissier'
      };

      const payResult = await api.payOrder(orderIdToPay, paymentPayload);

      setLastSale(payResult.sale);
      setIsPaymentModalOpen(false);
      setIsReceiptModalOpen(true);
      clearCart();
      showRouteNotification(`Vente #${payResult.sale.saleNumber} encaissée avec succès`, 'success');
      onOrderPaid(payResult.sale);
    } catch (err: any) {
      showRouteNotification(`Erreur lors de l'encaissement: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };


  // Load existing table order into current cart
  const handleLoadExistingTableOrder = (ord: Order) => {
    setEditingOrderId(ord.id);
    setSelectedTableId(ord.tableId || '');
    setOrderType(ord.source === 'takeaway' ? 'takeaway' : 'dine_in');
    setCustomerName(ord.customerName || 'Client');
    setDiscountAmount(ord.discountAmount || 0);
    setDiscountReason(ord.discountReason || '');
    setSpecialNotes(ord.specialNotes || '');

    setCartItems(
      (ord.items || []).map(item => ({
        productId: item.productId,
        productName: item.productName,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        options: item.options || [],
        notes: item.notes || '',
        totalPrice: item.totalPrice
      }))
    );
  };

  return (
    <div className="h-full flex flex-col lg:flex-row bg-[#F7F7F5] overflow-hidden select-none">
      {/* LEFT SECTION: Search, Category Bar & Visual Products Grid */}
      <div className="flex-1 flex flex-col h-full overflow-hidden border-r border-[#D9DDD8]">
        {/* Top Controls Bar */}
        <div className="px-3.5 py-2.5 bg-[#F2F3F0] border-b border-[#D9DDD8] flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#555D58] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Rechercher produit (F2)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-white border border-[#D9DDD8] rounded-xl text-xs font-semibold text-[#252A27] placeholder-[#555D58]/60 focus:outline-none focus:border-[#252A27] focus:ring-1 focus:ring-[#252A27] shadow-2xs transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#555D58] hover:text-[#252A27] rounded-md"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2 text-xs font-bold text-[#555D58]">
            <span className="hidden sm:inline px-2.5 py-1 bg-white border border-[#D9DDD8] rounded-lg shadow-2xs">
              {filteredProducts.length} produit(s)
            </span>
          </div>
        </div>

        {/* Category Selector Tabs */}
        <div className="px-3 py-2 bg-[#ECEEEA] border-b border-[#D9DDD8] overflow-x-auto flex items-center space-x-1.5 no-scrollbar">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 shadow-2xs ${
              selectedCategory === 'all'
                ? 'bg-[#252A27] text-[#A4DEC2]'
                : 'bg-white text-[#252A27] hover:bg-[#D9DDD8] border border-[#D9DDD8]'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Tous ({safeProducts.length})</span>
          </button>

          {safeCategories.map(cat => {
            const count = safeProducts.filter(p => p.categoryId === cat.id).length;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 shadow-2xs ${
                  isSelected
                    ? 'bg-[#252A27] text-[#A4DEC2]'
                    : 'bg-white text-[#252A27] hover:bg-[#D9DDD8] border border-[#D9DDD8]'
                }`}
              >
                <span>{cat.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-[#343B37] text-[#A4DEC2]' : 'bg-[#ECEEEA] text-[#555D58]'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Visual Products Touch Grid */}
        <div className="flex-1 overflow-y-auto p-3.5 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 content-start">
          {filteredProducts.map(product => {
            const inCartQty = cartQuantityMap[product.id] || 0;
            return (
              <div
                key={product.id}
                onClick={() => handleProductTap(product)}
                className="bg-white rounded-2xl border border-[#D9DDD8] hover:border-[#252A27] p-3 flex flex-col justify-between cursor-pointer active:scale-[0.97] transition-all shadow-2xs hover:shadow-xs group min-h-[145px] relative overflow-hidden"
              >
                {/* Cart quantity badge overlay */}
                {inCartQty > 0 && (
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-[#252A27] text-[#A4DEC2] text-xs font-black shadow-xs z-10 border border-[#A4DEC2]/30 flex items-center space-x-0.5">
                    <span>x{inCartQty}</span>
                  </div>
                )}

                {/* Product Header / Imagery */}
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2">
                    <div className="w-9 h-9 rounded-xl bg-[#F7F7F5] border border-[#D9DDD8] flex items-center justify-center text-[#252A27] shrink-0 group-hover:bg-[#252A27] group-hover:text-[#A4DEC2] transition-colors">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover rounded-xl"
                          onError={e => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Coffee className="w-4 h-4" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 pr-6">
                      <h4 className="font-bold text-xs sm:text-sm text-[#252A27] line-clamp-2 leading-tight">
                        {product.name}
                      </h4>
                    </div>
                  </div>

                  {product.description && (
                    <p className="text-[11px] text-[#555D58] line-clamp-2 leading-tight">
                      {product.description}
                    </p>
                  )}

                  {product.options && product.options.length > 0 && (
                    <span className="inline-block text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200">
                      Options disponibles
                    </span>
                  )}
                </div>

                {/* Product Bottom Details */}
                <div className="flex items-center justify-between pt-2 border-t border-[#ECEEEA] mt-2">
                  <span className="text-sm sm:text-base font-serif font-black text-[#252A27]">
                    {product.price.toFixed(3)} DT
                  </span>
                  <div className="w-7 h-7 rounded-xl bg-[#F2F3F0] group-hover:bg-[#252A27] group-hover:text-[#A4DEC2] text-[#252A27] flex items-center justify-center transition-colors border border-[#D9DDD8] shadow-2xs">
                    <Plus className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT SECTION: Sticky High-Density Order Ticket & Actions */}
      <div className="w-full lg:w-96 xl:w-[420px] bg-[#F2F3F0] flex flex-col h-full shadow-lg z-10 border-l border-[#D9DDD8]">
        {/* Header Destination & Mode Selection */}
        <div className="p-3.5 border-b border-[#D9DDD8] space-y-2.5 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-xs text-[#252A27] uppercase tracking-wider">
                {editingOrderId ? 'Commande Active' : 'Nouveau Ticket'}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#252A27] text-[11px] font-black text-[#A4DEC2]">
                {cartItems.reduce((sum, i) => sum + i.quantity, 0)} art.
              </span>
            </div>

            {/* Mode Switcher: Sur Place vs À Emporter */}
            <div className="flex bg-[#ECEEEA] p-0.5 rounded-xl border border-[#D9DDD8]">
              <button
                type="button"
                onClick={() => setOrderType('dine_in')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center space-x-1.5 ${
                  orderType === 'dine_in' ? 'bg-[#252A27] text-[#A4DEC2] shadow-2xs' : 'text-[#555D58] hover:text-[#252A27]'
                }`}
              >
                <UtensilsCrossed className="w-3.5 h-3.5" />
                <span>Sur Place</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setOrderType('takeaway');
                  setSelectedTableId('');
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center space-x-1.5 ${
                  orderType === 'takeaway' ? 'bg-[#252A27] text-[#A4DEC2] shadow-2xs' : 'text-[#555D58] hover:text-[#252A27]'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>À Emporter</span>
              </button>
            </div>
          </div>

          {/* Table / Customer Details & Timer */}
          {orderType === 'dine_in' ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setIsTableModalOpen(true)}
                  className="flex-1 py-2 px-3 bg-[#F7F7F5] hover:bg-[#ECEEEA] border border-[#D9DDD8] rounded-xl text-xs font-bold text-[#252A27] flex items-center justify-between transition-colors shadow-2xs"
                >
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <span>
                      {selectedTableObj
                        ? `Table ${selectedTableObj.number} (${selectedTableObj.capacity} pers.)`
                        : 'Choisir une table (F4)...'}
                    </span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-[#555D58]" />
                </button>
              </div>

              {/* Active Table Order notice if table already has an active order */}
              {existingTableOrder && !editingOrderId && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900 flex justify-between items-center animate-in fade-in">
                  <div>
                    <span className="font-bold">Table occupée : </span>
                    <span>{existingTableOrder.orderNumber} ({existingTableOrder.total.toFixed(3)} DT)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleLoadExistingTableOrder(existingTableOrder)}
                    className="px-2.5 py-1 rounded-lg bg-[#252A27] text-[#A4DEC2] font-black text-[11px] hover:bg-[#343B37] transition-colors"
                  >
                    Reprendre
                  </button>
                </div>
              )}

              {/* Active Timer Pill if order is currently being edited */}
              {activeLoadedOrderObj && (
                <div className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-[#ECEEEA] border border-[#D9DDD8]">
                  <span className="font-bold text-[#555D58]">Temps écoulé :</span>
                  <div className="flex items-center space-x-1 font-mono font-bold text-[#252A27]">
                    <Clock className="w-3.5 h-3.5 text-emerald-700" />
                    <span>{calculateElapsed(activeLoadedOrderObj.launchedAt || activeLoadedOrderObj.createdAt)}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-[#555D58] whitespace-nowrap">Client :</span>
              <input
                type="text"
                placeholder="Nom ou référence à emporter..."
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-[#F7F7F5] border border-[#D9DDD8] rounded-xl text-xs font-bold text-[#252A27] focus:outline-none focus:border-[#252A27]"
              />
            </div>
          )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-[#555D58] space-y-2 py-12">
              <div className="w-12 h-12 rounded-2xl bg-[#ECEEEA] border border-[#D9DDD8] flex items-center justify-center text-[#555D58]">
                <Coffee className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-[#252A27]">Ticket de commande vide</p>
              <p className="text-xs text-[#555D58]">Sélectionnez des articles à gauche pour commencer</p>
            </div>
          ) : (
            cartItems.map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-white border border-[#D9DDD8] flex flex-col space-y-2 shadow-2xs hover:border-[#252A27] transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-2">
                    <p className="text-xs font-bold text-[#252A27]">{item.productName}</p>
                    {item.options.length > 0 && (
                      <p className="text-[11px] text-[#555D58] font-medium mt-0.5">
                        {item.options.map(o => o.choiceName).join(', ')}
                      </p>
                    )}
                    {item.notes && (
                      <p className="text-[11px] text-amber-800 font-medium italic mt-0.5">"{item.notes}"</p>
                    )}
                  </div>
                  <span className="text-xs font-black text-[#252A27] font-serif">
                    {item.totalPrice.toFixed(3)} DT
                  </span>
                </div>

                {/* Tactile Quantity Controls */}
                <div className="flex items-center justify-between pt-2 border-t border-[#ECEEEA]">
                  <span className="text-[11px] text-[#555D58] font-medium">
                    {item.unitPrice.toFixed(2)} DT / u
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => updateQuantity(idx, -1)}
                      className="w-7 h-7 rounded-lg bg-[#ECEEEA] border border-[#D9DDD8] flex items-center justify-center text-[#252A27] hover:bg-[#D9DDD8] active:scale-90 transition-all"
                    >
                      {item.quantity === 1 ? <Trash2 className="w-3.5 h-3.5 text-rose-700" /> : <Minus className="w-3.5 h-3.5" />}
                    </button>
                    <span className="text-xs font-black text-[#252A27] w-6 text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(idx, 1)}
                      className="w-7 h-7 rounded-lg bg-[#ECEEEA] border border-[#D9DDD8] flex items-center justify-center text-[#252A27] hover:bg-[#D9DDD8] active:scale-90 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Totals & Action Buttons */}
        <div className="p-3.5 border-t border-[#D9DDD8] bg-white space-y-2.5">
          {/* Subtotals Breakdown */}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-[#555D58]">
              <span>Sous-total HT :</span>
              <span className="font-semibold">{subtotalHT.toFixed(3)} DT</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-rose-700 font-semibold">
                <span>Remise ({discountReason || 'Remise'}) :</span>
                <span>-{discountAmount.toFixed(3)} DT</span>
              </div>
            )}
            <div className="flex justify-between text-[11px] text-[#555D58]">
              <span>TVA estimée (10%) :</span>
              <span>{tvaEstimate.toFixed(3)} DT</span>
            </div>
            <div className="flex justify-between text-sm font-black text-[#252A27] pt-1.5 border-t border-[#D9DDD8]">
              <span className="text-xs font-bold uppercase tracking-wider">TOTAL TTC :</span>
              <span className="text-[#252A27] text-lg font-serif font-black">{finalTotal.toFixed(3)} DT</span>
            </div>
          </div>

          {/* Quick discount button */}
          <div className="flex justify-between items-center text-xs">
            <button
              type="button"
              onClick={() => setIsDiscountModalOpen(true)}
              className="text-[#555D58] hover:text-[#252A27] flex items-center space-x-1 font-bold text-[11px]"
            >
              <Percent className="w-3.5 h-3.5" />
              <span>{discountAmount > 0 ? `Remise (-${discountAmount.toFixed(3)} DT)` : 'Remise (F8)'}</span>
            </button>

            {cartItems.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="text-rose-700 hover:text-rose-900 text-[11px] font-bold"
              >
                Vider le ticket
              </button>
            )}
          </div>

          {/* Core Buttons: "Lancer" + "Encaisser" */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              id="btn-pos-launch"
              onClick={handleLaunchOrder}
              disabled={cartItems.length === 0 || loading}
              className="py-3 rounded-xl bg-[#252A27] hover:bg-[#343B37] text-[#A4DEC2] text-xs font-black transition-all shadow-xs disabled:opacity-40 flex items-center justify-center space-x-1.5 active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{editingOrderId ? 'Mettre à Jour' : 'Lancer Commande'}</span>
            </button>

            <button
              type="button"
              id="btn-pos-direct-pay"
              onClick={() => setIsPaymentModalOpen(true)}
              disabled={cartItems.length === 0 || loading}
              className="py-3 rounded-xl bg-[#A4DEC2] hover:bg-[#8BCFAE] text-[#252A27] text-xs font-black transition-all shadow-xs border border-[#8BCFAE] disabled:opacity-40 flex items-center justify-center space-x-1.5 active:scale-95"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Encaisser ({finalTotal.toFixed(3)} DT)</span>
            </button>
          </div>
        </div>
      </div>

      {/* TACTILE TABLE SELECTOR MODAL */}
      {isTableModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#F2F3F0] rounded-2xl p-5 sm:p-6 max-w-2xl w-full shadow-2xl border border-[#C7CDC8] animate-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#D9DDD8]">
              <div>
                <h3 className="font-bold text-sm text-[#252A27]">Sélection Tactile de la Table</h3>
                <p className="text-[11px] text-[#555D58]">Choisissez une table pour associer la commande</p>
              </div>
              <button
                onClick={() => setIsTableModalOpen(false)}
                className="p-1 rounded-lg bg-[#ECEEEA] text-[#555D58] hover:text-[#252A27] border border-[#D9DDD8]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {safeTables.map(tbl => {
                const isSelected = selectedTableId === tbl.id;
                const isOccupied = tbl.status === 'occupied';
                const isBilling = tbl.status === 'billing';
                const isReserved = tbl.status === 'reserved';

                let statusBadge = 'Libre';
                let statusBg = 'bg-emerald-50 text-emerald-800 border-emerald-300';
                if (isOccupied) {
                  statusBadge = 'Occupée';
                  statusBg = 'bg-amber-100 text-amber-900 border-amber-300';
                } else if (isBilling) {
                  statusBadge = 'Addition';
                  statusBg = 'bg-blue-100 text-blue-900 border-blue-300';
                } else if (isReserved) {
                  statusBadge = 'Réservée';
                  statusBg = 'bg-purple-100 text-purple-900 border-purple-300';
                }

                return (
                  <button
                    key={tbl.id}
                    type="button"
                    onClick={() => {
                      setSelectedTableId(tbl.id);
                      setIsTableModalOpen(false);
                    }}
                    className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all active:scale-95 shadow-2xs ${
                      isSelected
                        ? 'bg-[#252A27] text-[#A4DEC2] border-[#252A27] ring-2 ring-[#A4DEC2]'
                        : 'bg-white text-[#252A27] border-[#D9DDD8] hover:border-[#252A27]'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-sm">Table {tbl.number}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md border ${statusBg}`}>
                          {statusBadge}
                        </span>
                      </div>
                      <span className="text-[11px] opacity-75 flex items-center space-x-1">
                        <Users className="w-3 h-3 inline mr-1" />
                        {tbl.capacity} places
                      </span>
                    </div>

                    {tbl.notes && (
                      <p className="text-[10px] italic mt-2 opacity-60 truncate">"{tbl.notes}"</p>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-[#D9DDD8] text-right">
              <button
                type="button"
                onClick={() => setIsTableModalOpen(false)}
                className="px-4 py-2 bg-[#ECEEEA] text-xs font-bold text-[#252A27] rounded-xl hover:bg-[#D9DDD8]"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOMIZE PRODUCT MODAL */}
      {customizingProduct && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#F2F3F0] rounded-2xl p-5 max-w-md w-full shadow-2xl border border-[#C7CDC8] animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#D9DDD8]">
              <div>
                <h3 className="font-bold text-sm text-[#252A27]">{customizingProduct.name}</h3>
                <p className="text-[11px] text-[#555D58]">Options et personnalisation</p>
              </div>
              <button
                onClick={() => setCustomizingProduct(null)}
                className="p-1 rounded-lg bg-[#ECEEEA] text-[#555D58] hover:text-[#252A27] border border-[#D9DDD8]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
              {customizingProduct.options?.map(opt => (
                <div key={opt.name} className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#252A27] uppercase tracking-wider">
                    {opt.name}
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(opt.choices || []).map(choice => {
                      const isSelected = (selectedOptions || []).some(
                        o => o.optionName === opt.name && o.choiceName === choice.name
                      );
                      return (
                        <button
                          key={choice.name}
                          type="button"
                          onClick={() => {
                            const withoutThis = (selectedOptions || []).filter(o => o.optionName !== opt.name);
                            if (opt.type === 'single') {
                              setSelectedOptions([
                                ...withoutThis,
                                {
                                  optionName: opt.name,
                                  choiceName: choice.name,
                                  priceModifier: choice.priceModifier
                                }
                              ]);
                            }
                          }}
                          className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                            isSelected
                              ? 'bg-[#252A27] text-[#A4DEC2] border-[#252A27] shadow-2xs'
                              : 'bg-white text-[#252A27] border-[#D9DDD8] hover:bg-[#ECEEEA]'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span>{choice.name}</span>
                            {choice.priceModifier > 0 && (
                              <span className="text-[10px] opacity-80">
                                +{choice.priceModifier.toFixed(3)} DT
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="space-y-1 pt-1">
                <label className="text-[11px] font-bold text-[#252A27]">Instructions Barista / Cuisine</label>
                <input
                  type="text"
                  placeholder="Ex: Sans sucre, bien chaud, lait d'avoine..."
                  value={productNote}
                  onChange={e => setProductNote(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#D9DDD8] rounded-xl text-xs text-[#252A27] focus:outline-none focus:border-[#252A27]"
                />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#D9DDD8] flex space-x-2">
              <button
                onClick={() => setCustomizingProduct(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#ECEEEA] text-xs font-bold text-[#252A27] border border-[#D9DDD8]"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  addToCart(customizingProduct, selectedOptions, productNote);
                  setCustomizingProduct(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#A4DEC2] hover:bg-[#8BCFAE] text-[#252A27] text-xs font-bold border border-[#8BCFAE] shadow-xs"
              >
                Ajouter au Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DISCOUNT MODAL */}
      {isDiscountModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#F2F3F0] rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-[#C7CDC8] animate-in zoom-in-95 duration-150">
            <h3 className="font-bold text-sm text-[#252A27] mb-1">Appliquer une Remise</h3>
            <p className="text-xs text-[#555D58] mb-3">Sous-total actuel : {rawSubtotal.toFixed(3)} DT</p>

            <div className="space-y-3 mb-4">
              <div className="grid grid-cols-4 gap-1.5">
                {[5, 10, 20, 50].map(pct => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => {
                      const discountVal = Number(((rawSubtotal * pct) / 100).toFixed(2));
                      setDiscountAmount(discountVal);
                      setDiscountReason(`Remise ${pct}%`);
                      setIsDiscountModalOpen(false);
                    }}
                    className="py-2.5 bg-white border border-[#D9DDD8] rounded-xl text-xs font-bold text-[#252A27] hover:bg-[#ECEEEA]"
                  >
                    -{pct}%
                  </button>
                ))}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#252A27]">Montant fixe en Dinars (DT) :</label>
                <input
                  type="number"
                  step="0.5"
                  value={customDiscountVal}
                  onChange={e => setCustomDiscountVal(e.target.value)}
                  placeholder="0.00"
                  className="w-full p-2.5 bg-white border border-[#D9DDD8] rounded-xl text-xs font-bold text-[#252A27]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#252A27]">Motif de la remise :</label>
                <input
                  type="text"
                  placeholder="Ex: Geste commercial, personnel..."
                  value={discountReason}
                  onChange={e => setDiscountReason(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#D9DDD8] rounded-xl text-xs text-[#252A27]"
                />
              </div>
            </div>

            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => {
                  setDiscountAmount(0);
                  setDiscountReason('');
                  setIsDiscountModalOpen(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#ECEEEA] text-xs font-bold text-rose-700 border border-[#D9DDD8]"
              >
                Supprimer
              </button>
              <button
                type="button"
                onClick={() => {
                  if (customDiscountVal) {
                    setDiscountAmount(parseFloat(customDiscountVal) || 0);
                  }
                  setIsDiscountModalOpen(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#252A27] text-[#A4DEC2] text-xs font-bold"
              >
                Appliquer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAST PAYMENT MODAL */}
      {isPaymentModalOpen && (
        <FastPaymentModal
          isOpen={true}
          onClose={() => setIsPaymentModalOpen(false)}
          totalAmount={finalTotal}
          subtotal={subtotalHT}
          tvaAmount={tvaEstimate}
          discountAmount={discountAmount}
          tableNumber={selectedTableObj ? String(selectedTableObj.number) : undefined}
          orderType={orderType}
          currentUser={currentUser}
          onConfirmPayment={handleProcessPayment}
          loading={loading}
        />
      )}

      {/* RECEIPT MODAL */}
      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        sale={lastSale}
      />
    </div>
  );
};
