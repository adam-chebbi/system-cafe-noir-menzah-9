import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Product, Table, Order } from '../../types';
import { useSystem } from '../../context/SystemContext';
import {
  Coffee,
  ShoppingBag,
  Plus,
  Minus,
  CheckCircle2,
  Clock,
  MapPin,
  ArrowLeft,
  X,
  Phone,
  UtensilsCrossed,
  Sparkles,
  ChevronRight
} from 'lucide-react';

interface QrTableOrderViewProps {
  tableId?: string;
  onBackToApp?: () => void;
}

export const QrTableOrderView: React.FC<QrTableOrderViewProps> = ({ tableId, onBackToApp }) => {
  const { showRouteNotification } = useSystem();
  const [products, setProducts] = useState<Product[]>([]);
  const [table, setTable] = useState<Table | null>(null);

  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<{ product: Product; quantity: number; selectedModifiers: string[] }[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const initData = async () => {
      try {
        setLoading(true);
        const [prods, cats, tbls] = await Promise.all([
          api.getProducts(),
          api.getCategories(),
          api.getTables()
        ]);
        const safeProds = Array.isArray(prods) ? prods : [];
        const safeCats = Array.isArray(cats) ? cats : [];
        const safeTbls = Array.isArray(tbls) ? tbls : [];
        setProducts(safeProds.filter(p => p.available !== false));
        setCategories(safeCats);

        if (tableId) {
          const matched = safeTbls.find(t => t.id === tableId || t.number === tableId);
          if (matched) setTable(matched);
          else if (safeTbls.length > 0) setTable(safeTbls[0]);
        } else if (safeTbls.length > 0) {
          setTable(safeTbls[0]);
        }
      } catch (err) {
        console.error('Error loading QR menu:', err);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, [tableId]);

  // Real-time tracking of placed order
  useEffect(() => {
    if (!activeOrder) return;
    const interval = setInterval(async () => {
      try {
        const order = await api.getOrderById(activeOrder.id);
        if (order) setActiveOrder(order);
      } catch (err) {
        console.error('Error tracking order:', err);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [activeOrder?.id]);

  const handleAddToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1, selectedModifiers: [] }];
    });
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === productId);
      if (existing && existing.quantity > 1) {
        return prev.map(item =>
          item.product.id === productId ? { ...item, quantity: item.quantity - 1 } : item
        );
      }
      return prev.filter(item => item.product.id !== productId);
    });
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.product.priceTTC || item.product.price) * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handlePlaceOrder = async () => {
    if (cart.length === 0 || !table) return;

    try {
      setSubmitting(true);
      const items = cart.map(c => ({
        productId: c.product.id,
        productName: c.product.name,
        quantity: c.quantity,
        unitPrice: c.product.price,
        totalPrice: c.product.price * c.quantity,
        station: c.product.preparationStation || 'bar',
        options: [],
        notes: ''
      }));

      const newOrder = await api.createQROrder({
        tableId: table.id,
        tableNumber: table.number || table.name,
        customerName: customerName || 'Client Table',
        specialNotes: customerNotes,
        items
      });

      setActiveOrder(newOrder);
      setCart([]);
      setIsCartOpen(false);
      showRouteNotification('Votre commande a été transmise au bar & cuisine !', 'success');
    } catch (err: any) {
      showRouteNotification(`Erreur: ${err.message}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = (products || []).filter(
    p => selectedCategory === 'all' || p.category === selectedCategory || p.categoryId === selectedCategory
  );

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#252A27] font-sans pb-24">
      {/* Top Banner */}
      <header className="bg-[#F2F3F0] sticky top-0 z-30 border-b border-[#D9DDD8] px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {onBackToApp && (
              <button
                onClick={onBackToApp}
                className="p-2 rounded-lg bg-[#ECEEEA] hover:bg-white text-[#252A27] text-xs font-bold flex items-center space-x-1 transition-colors border border-[#D9DDD8]"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Système Café</span>
              </button>
            )}
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-serif font-black text-base text-[#252A27]">
                  CAFÉ NOIR
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-[#A4DEC2] text-[#252A27] border border-[#8BCFAE]">
                  Commande Table
                </span>
              </div>
              {table && (
                <p className="text-[11px] text-[#555D58] font-medium">
                  {table.name} &bull; {table.zone || 'Salle'}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={() => setIsCartOpen(true)}
            className="relative px-3 py-1.5 rounded-lg bg-[#252A27] text-[#A4DEC2] text-xs font-bold flex items-center space-x-1.5 shadow-2xs hover:bg-[#343B37] transition-all"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Panier</span>
            {cartCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#A4DEC2] text-[#252A27] font-bold text-[10px] flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Active Order Tracker (If order placed) */}
      {activeOrder && (
        <div className="max-w-2xl mx-auto p-4 animate-in slide-in-from-top-3">
          <div className="bg-white rounded-xl p-4 border border-[#D9DDD8] shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#ECEEEA]">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-xs text-[#252A27]">
                    Commande #{activeOrder.orderNumber}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                      activeOrder.status === 'pending'
                        ? 'bg-amber-50 text-amber-900 border-amber-200'
                        : activeOrder.status === 'in_preparation'
                        ? 'bg-blue-50 text-blue-900 border-blue-200'
                        : activeOrder.status === 'ready'
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                        : 'bg-zinc-100 text-[#555D58] border-[#D9DDD8]'
                    }`}
                  >
                    {activeOrder.status === 'pending'
                      ? 'Reçue en caisse'
                      : activeOrder.status === 'in_preparation'
                      ? 'En préparation par le barista'
                      : activeOrder.status === 'ready'
                      ? 'Prête à être servie'
                      : 'Servie à votre table'}
                  </span>
                </div>
                <p className="text-[11px] text-[#555D58] mt-0.5">
                  {table?.name} &bull; Total : {activeOrder.totalTTC?.toFixed(3)} DT
                </p>
              </div>

              <button
                onClick={() => setActiveOrder(null)}
                className="text-xs font-bold text-[#555D58] hover:underline"
              >
                Nouvelle commande
              </button>
            </div>

            <div className="flex items-center justify-around text-center text-xs pt-1">
              <div className={`space-y-1 ${activeOrder.status ? 'text-[#252A27] font-bold' : 'text-[#555D58]'}`}>
                <Clock className="w-4 h-4 mx-auto text-[#252A27]" />
                <span className="text-[11px]">1. Reçue</span>
              </div>
              <div className="w-8 h-px bg-[#D9DDD8]" />
              <div className={`space-y-1 ${['in_preparation', 'ready', 'served'].includes(activeOrder.status) ? 'text-[#252A27] font-bold' : 'text-[#555D58]'}`}>
                <Coffee className="w-4 h-4 mx-auto text-[#252A27]" />
                <span className="text-[11px]">2. En prépa</span>
              </div>
              <div className="w-8 h-px bg-[#D9DDD8]" />
              <div className={`space-y-1 ${['ready', 'served'].includes(activeOrder.status) ? 'text-emerald-800 font-bold' : 'text-[#555D58]'}`}>
                <CheckCircle2 className="w-4 h-4 mx-auto text-emerald-700" />
                <span className="text-[11px]">3. Service Table</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Intro */}
        <div className="text-center py-2">
          <h1 className="text-xl font-serif font-black text-[#252A27]">
            Carte des Boissons & Gourmandises
          </h1>
          <p className="text-xs text-[#555D58] mt-0.5">
            Sélectionnez vos articles pour commande directe à table
          </p>
        </div>

        {/* Category Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
              selectedCategory === 'all'
                ? 'bg-[#252A27] text-white'
                : 'bg-white text-[#555D58] hover:bg-[#ECEEEA] border border-[#D9DDD8]'
            }`}
          >
            Tous les Produits
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-[#252A27] text-white'
                  : 'bg-white text-[#555D58] hover:bg-[#ECEEEA] border border-[#D9DDD8]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredProducts.map(prod => {
            const inCart = cart.find(c => c.product.id === prod.id);
            const price = prod.priceTTC || prod.price;
            return (
              <div
                key={prod.id}
                className="bg-white rounded-xl p-3.5 border border-[#D9DDD8] flex flex-col justify-between shadow-2xs hover:border-[#252A27] transition-all"
              >
                <div>
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] font-bold uppercase text-[#555D58] tracking-wider">
                      {prod.category}
                    </span>
                    <span className="font-serif font-bold text-sm text-[#252A27]">
                      {price.toFixed(3)} DT
                    </span>
                  </div>

                  <h3 className="font-bold text-xs text-[#252A27]">{prod.name}</h3>
                  <p className="text-[11px] text-[#555D58] mt-0.5 line-clamp-2">
                    {prod.description || 'Préparé avec soin par notre chef barista.'}
                  </p>

                  {/* Dietary tags */}
                  {prod.tags && prod.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {prod.tags.map(t => (
                        <span
                          key={t}
                          className="text-[9px] font-semibold px-1.5 py-0.2 rounded-md bg-[#F2F3F0] text-[#555D58] border border-[#D9DDD8]"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-2.5 mt-2.5 border-t border-[#ECEEEA] flex items-center justify-between">
                  <span className="text-[10px] text-[#555D58]">TVA {prod.tvaRate}% incluse</span>

                  {inCart ? (
                    <div className="flex items-center space-x-1.5 bg-[#F2F3F0] p-0.5 rounded-lg border border-[#D9DDD8]">
                      <button
                        onClick={() => handleRemoveFromCart(prod.id)}
                        className="w-6 h-6 rounded-md bg-white text-[#252A27] font-bold flex items-center justify-center border border-[#D9DDD8]"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-bold text-xs px-1.5 text-[#252A27]">{inCart.quantity}</span>
                      <button
                        onClick={() => handleAddToCart(prod)}
                        className="w-6 h-6 rounded-md bg-[#A4DEC2] text-[#252A27] font-bold flex items-center justify-center border border-[#8BCFAE]"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleAddToCart(prod)}
                      className="px-3 py-1.5 rounded-lg bg-[#A4DEC2] hover:bg-[#8BCFAE] text-[#252A27] text-xs font-bold flex items-center space-x-1 shadow-2xs transition-colors border border-[#8BCFAE]"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Ajouter</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Floating Bottom Cart Bar */}
      {cartCount > 0 && !isCartOpen && (
        <div className="fixed bottom-4 inset-x-4 max-w-md mx-auto z-40 animate-in slide-in-from-bottom-3">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-[#252A27] text-white p-3 rounded-xl shadow-xl flex items-center justify-between border border-[#191E1A]"
          >
            <div className="flex items-center space-x-2.5">
              <span className="w-7 h-7 rounded-lg bg-[#A4DEC2] text-[#252A27] font-bold text-xs flex items-center justify-center">
                {cartCount}
              </span>
              <div className="text-left">
                <p className="font-bold text-xs text-white">Voir ma commande</p>
                <p className="text-[10px] text-[#A4DEC2]">{table?.name}</p>
              </div>
            </div>
            <span className="font-mono font-bold text-sm text-[#A4DEC2]">{cartTotal.toFixed(3)} DT</span>
          </button>
        </div>
      )}

      {/* Cart Drawer / Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#F2F3F0] rounded-t-2xl sm:rounded-2xl p-5 max-w-md w-full shadow-2xl border border-[#C7CDC8] max-h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-150">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#D9DDD8]">
              <div>
                <h3 className="font-serif font-black text-sm text-[#252A27]">Mon Panier</h3>
                <p className="text-[11px] text-[#555D58]">{table?.name}</p>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1 rounded-lg bg-[#ECEEEA] text-[#252A27] border border-[#D9DDD8]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto py-2.5 divide-y divide-[#D9DDD8]">
              {cart.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#555D58]">
                  Votre panier est vide
                </div>
              ) : (
                cart.map(item => {
                  const price = item.product.priceTTC || item.product.price;
                  return (
                    <div key={item.product.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-xs text-[#252A27]">{item.product.name}</h4>
                        <p className="text-[11px] text-[#555D58]">
                          {price.toFixed(3)} DT &times; {item.quantity}
                        </p>
                      </div>

                      <div className="flex items-center space-x-1.5 bg-white p-0.5 rounded-lg border border-[#D9DDD8]">
                        <button
                          onClick={() => handleRemoveFromCart(item.product.id)}
                          className="w-5 h-5 rounded bg-[#F2F3F0] flex items-center justify-center text-xs font-bold text-[#252A27]"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-bold text-xs px-1.5 text-[#252A27]">{item.quantity}</span>
                        <button
                          onClick={() => handleAddToCart(item.product)}
                          className="w-5 h-5 rounded bg-[#A4DEC2] text-[#252A27] flex items-center justify-center text-xs font-bold"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Customer info & Notes */}
            {cart.length > 0 && (
              <div className="space-y-2.5 pt-2.5 border-t border-[#D9DDD8]">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#252A27]">Votre Prénom (optionnel)</label>
                  <input
                    type="text"
                    placeholder="Pour l'annonce à table..."
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-semibold text-[#252A27]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#252A27]">Instructions au Barista</label>
                  <input
                    type="text"
                    placeholder="Ex: Bien chaud, sans sucre, eau gazeuse..."
                    value={customerNotes}
                    onChange={e => setCustomerNotes(e.target.value)}
                    className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs text-[#252A27]"
                  />
                </div>

                <div className="flex justify-between items-center py-1.5 text-xs font-bold border-t border-[#D9DDD8]">
                  <span className="text-[#555D58]">Total à Régler</span>
                  <span className="font-mono text-sm text-[#252A27]">{cartTotal.toFixed(3)} DT</span>
                </div>

                <button
                  onClick={handlePlaceOrder}
                  disabled={submitting}
                  className="w-full py-2.5 rounded-lg bg-[#A4DEC2] hover:bg-[#8BCFAE] text-[#252A27] text-xs font-bold transition-all shadow-2xs flex items-center justify-center space-x-1.5 border border-[#8BCFAE]"
                >
                  <UtensilsCrossed className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Envoi en cours...' : 'Envoyer la Commande au Barista'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
