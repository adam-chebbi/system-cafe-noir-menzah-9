import React, { useState, useEffect, useRef } from 'react';
import { useSystem } from '../../context/SystemContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Product, Category, TechnicalRecipe } from '../../types';
import { formatApproxQuantity } from '../../utils/unitConversion';
import { TechnicalRecipeModal } from './TechnicalRecipeModal';
import { CsvImportModal } from './CsvImportModal';
import { CopyLinkButton } from '../common/CopyLinkButton';
import { ItemThumbnail } from '../common/ItemThumbnail';
import { ImageInputControl } from '../common/ImageInputControl';
import { ConfirmDialog } from '../common/ConfirmDialog';
import {
  Coffee,
  Plus,
  Search,
  FileSpreadsheet,
  FileText,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  X,
  Layers,
  UtensilsCrossed,
  Tag,
  Download,
  Percent,
  Check,
  ChevronRight
} from 'lucide-react';

export const ProductsView: React.FC = () => {
  const {
    globalVersion,
    currentSubTab,
    currentAction,
    currentRecordId,
    setCurrentRecordId,
    showRouteNotification
  } = useSystem();
  const { currentUser } = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [recipes, setRecipes] = useState<TechnicalRecipe[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // Modals
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [selectedProductForRecipe, setSelectedProductForRecipe] = useState<Product | null>(null);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const hasValidatedIdRef = useRef(false);


  useEffect(() => {
    if (currentAction === 'new_product') {
      setEditingProduct({
        name: '',
        price: 3.5,
        costPrice: 1.0,
        categoryId: categories[0]?.id || 'cat-1',
        active: true,
        available: true,
        allergens: []
      });
    } else if (currentAction === 'csv_modal') {
      setIsCsvModalOpen(true);
    } else if (currentAction === 'category_modal') {
      setIsCategoryModalOpen(true);
    }
  }, [currentAction, categories]);

  useEffect(() => {
    if (currentSubTab === 'recipes' && products.length > 0 && !selectedProductForRecipe) {
      setSelectedProductForRecipe(products[0]);
    }
  }, [currentSubTab, products]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cats, prods, recs] = await Promise.all([
        api.getCategories(),
        api.getProducts(),
        api.getRecipes()
      ]);
      setCategories(cats);
      setProducts(prods);
      setRecipes(recs);

      // Deep link ID handling
      if (currentRecordId && prods.length > 0) {
        const found = prods.find(p => p.id === currentRecordId);
        if (found) {
          setSelectedProductId(found.id);
        } else if (!hasValidatedIdRef.current) {
          showRouteNotification(`Le produit demandé (ID: "${currentRecordId}") est introuvable.`, 'warning');
          setSelectedProductId(prods[0].id);
          setCurrentRecordId(prods[0].id, { replace: true });
        }
        hasValidatedIdRef.current = true;
      } else if (!selectedProductId && prods.length > 0) {
        setSelectedProductId(prods[0].id);
      }
    } catch (err) {
      console.error('Failed to load products data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [globalVersion]);

  // Sync selection when currentRecordId changes from URL
  useEffect(() => {
    if (currentRecordId && products.length > 0) {
      const found = products.find(p => p.id === currentRecordId);
      if (found) {
        setSelectedProductId(found.id);
      }
    }
  }, [currentRecordId, products]);

  // Filter products
  const safeProducts = Array.isArray(products) ? products : [];
  const safeCategories = Array.isArray(categories) ? categories : [];
  const safeRecipes = Array.isArray(recipes) ? recipes : [];

  const filteredProducts = safeProducts.filter(p => {
    const matchesCat = selectedCategory === 'all' || p.categoryId === selectedCategory;
    const matchesSearch =
      (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const selectedProduct = safeProducts.find(p => p.id === selectedProductId) || filteredProducts[0] || null;
  const selectedProductRecipe = safeRecipes.find(r => r.productId === selectedProduct?.id);

  // Save Product
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editingProduct.name || !editingProduct.categoryId) return;

    try {
      if (editingProduct.id) {
        const updated = await api.updateProduct(editingProduct.id, editingProduct, currentUser?.name || 'Admin');
        setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
        showRouteNotification(`Produit "${editingProduct.name}" mis à jour`, 'success');
      } else {
        const created = await api.createProduct(
          {
            name: editingProduct.name,
            categoryId: editingProduct.categoryId,
            price: Number(editingProduct.price) || 0,
            tvaRate: Number(editingProduct.tvaRate) || 10,
            imageUrl: editingProduct.imageUrl,
            description: editingProduct.description || '',
            available: editingProduct.available !== false,
            preparationStation: (editingProduct as any).station || editingProduct.preparationStation || 'bar',
            isSpecialty: editingProduct.isSpecialty || false,
            hasRecipe: editingProduct.hasRecipe || false,
            options: editingProduct.options || []
          },
          currentUser?.name || 'Admin'
        );
        setProducts(prev => [created, ...prev]);
        setSelectedProductId(created.id);
        showRouteNotification(`Produit "${editingProduct.name}" créé avec succès`, 'success');
      }
      setEditingProduct(null);
    } catch (err: any) {
      showRouteNotification(`Erreur: ${err.message}`, 'error');
    }
  };

  // Delete Product
  const handleConfirmDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      await api.deleteProduct(productToDelete.id, currentUser?.name || 'Admin');
      setProducts(prev => prev.filter(p => p.id !== productToDelete.id));
      if (selectedProductId === productToDelete.id) setSelectedProductId(null);
      showRouteNotification(`Produit "${productToDelete.name}" supprimé`, 'success');
      setProductToDelete(null);
    } catch (err: any) {
      showRouteNotification(`Erreur: ${err.message}`, 'error');
    }
  };

  // Toggle Availability
  const handleToggleAvailable = async (product: Product) => {
    try {
      const nextAvailable = !product.available;
      await api.updateProduct(product.id, { available: nextAvailable }, currentUser?.name || 'Staff');
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, available: nextAvailable } : p));
      showRouteNotification(`Disponibilité de "${product.name}" : ${nextAvailable ? 'En stock' : 'Épuisé'}`, 'info');
    } catch (err: any) {
      showRouteNotification(`Erreur: ${err.message}`, 'error');
    }
  };

  // Create Category
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName) return;
    try {
      const created = await api.createCategory(
        {
          name: newCategoryName,
          slug: newCategoryName.toLowerCase().replace(/\s+/g, '-'),
          order: categories.length + 1,
          active: true
        },
        currentUser?.name || 'Admin'
      );
      setCategories(prev => [...prev, created]);
      setNewCategoryName('');
      setIsCategoryModalOpen(false);
      showRouteNotification(`Catégorie "${newCategoryName}" créée`, 'success');
    } catch (err: any) {
      showRouteNotification(`Erreur: ${err.message}`, 'error');
    }
  };

  // Export CSV
  const handleExportCsv = async () => {
    try {
      const csvStr = await api.exportProductsCsv();
      const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `catalogue_cafe_noir_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showRouteNotification('Catalogue exporté en CSV avec succès', 'success');
    } catch (err: any) {
      showRouteNotification(`Erreur: ${err.message}`, 'error');
    }
  };


  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col bg-[#F7F7F5] overflow-hidden">
      {/* Top Action Header */}
      <div className="bg-[#F2F3F0] px-4 py-2.5 border-b border-[#D9DDD8] flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-[#ECEEEA] text-[#252A27] border border-[#D9DDD8] flex items-center justify-center">
            <Coffee className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-black text-[#252A27]">Catalogue & Fiches Techniques</h1>
            <p className="text-[10px] text-[#555D58]">{products.length} articles référencés &bull; {categories.length} catégories</p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-[#ECEEEA] text-xs font-bold text-[#252A27] border border-[#D9DDD8] hover:bg-white transition-colors"
          >
            <Layers className="w-3.5 h-3.5 text-[#555D58]" />
            <span className="hidden sm:inline">Catégories</span>
          </button>

          <button
            onClick={() => setIsCsvModalOpen(true)}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-[#ECEEEA] text-xs font-bold text-[#252A27] border border-[#D9DDD8] hover:bg-white transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#555D58]" />
            <span className="hidden sm:inline">Import</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-[#ECEEEA] text-xs font-bold text-[#252A27] border border-[#D9DDD8] hover:bg-white transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#555D58]" />
            <span className="hidden sm:inline">Export</span>
          </button>

          <button
            id="btn-add-product"
            onClick={() =>
              setEditingProduct({
                name: '',
                categoryId: categories[0]?.id || '',
                price: 4.5,
                tvaRate: 10,
                description: '',
                available: true,
                station: 'bar',
                isSpecialty: false
              })
            }
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-[#A4DEC2] text-[#252A27] text-xs font-bold border border-[#8BCFAE] hover:bg-[#8BCFAE] transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nouveau</span>
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white px-4 py-2 border-b border-[#D9DDD8] flex items-center gap-2 shrink-0 overflow-x-auto">
        <div className="relative min-w-[200px] max-w-xs">
          <Search className="w-3.5 h-3.5 text-[#555D58] absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Recherche produit..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1 bg-[#F7F7F5] border border-[#D9DDD8] rounded-lg text-xs text-[#252A27] focus:outline-none focus:border-[#252A27]"
          />
        </div>

        <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold whitespace-nowrap transition-colors border ${
              selectedCategory === 'all'
                ? 'bg-[#252A27] text-white border-[#252A27]'
                : 'bg-[#F2F3F0] text-[#555D58] border-[#D9DDD8] hover:bg-[#ECEEEA]'
            }`}
          >
            Tous ({products.length})
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold whitespace-nowrap transition-colors border ${
                selectedCategory === cat.id
                  ? 'bg-[#252A27] text-white border-[#252A27]'
                  : 'bg-[#F2F3F0] text-[#555D58] border-[#D9DDD8] hover:bg-[#ECEEEA]'
              }`}
            >
              {cat.name} ({safeProducts.filter(p => p.categoryId === cat.id).length})
            </button>
          ))}
        </div>
      </div>

      {/* Master-Detail Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane / Master Product List */}
        <div className="w-full lg:w-7/12 xl:w-1/2 border-r border-[#D9DDD8] overflow-y-auto bg-white divide-y divide-[#ECEEEA]">
          {filteredProducts.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#555D58]">
              Aucun produit ne correspond aux filtres sélectionnés.
            </div>
          ) : (
            filteredProducts.map(product => {
              const cat = categories.find(c => c.id === product.categoryId);
              const hasRecipe = recipes.some(r => r.productId === product.id);
              const isSelected = selectedProduct?.id === product.id;

              return (
                <div
                  key={product.id}
                  onClick={() => {
                    setSelectedProductId(product.id);
                    setCurrentRecordId(product.id, { replace: true });
                  }}
                  className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                    isSelected ? 'bg-[#ECEEEA]' : 'hover:bg-[#F7F7F5]'
                  }`}
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0 pr-2">
                    <ItemThumbnail
                      src={product.imageUrl}
                      alt={product.name}
                      category={cat?.name}
                      size="md"
                      rounded="xl"
                      showBadge={product.available}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-xs text-[#252A27] truncate">{product.name}</span>
                        {product.isSpecialty && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#A4DEC2] text-[#252A27]">
                            Signature
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-[10px] text-[#555D58] mt-0.5">
                        <span>{cat?.name || 'Catégorie'}</span>
                        <span>&bull;</span>
                        <span>{product.station === 'kitchen' ? 'Cuisine' : 'Bar'}</span>
                        <span>&bull;</span>
                        <span className={hasRecipe ? 'text-emerald-800 font-bold' : 'text-[#555D58]'}>
                          {hasRecipe ? 'Fiche OK' : 'Sans fiche'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0">
                    <span className="font-mono font-bold text-xs text-[#252A27]">
                      {product.price.toFixed(3)} DT
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-[#555D58]" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Pane / Detail Inspector */}
        <div className="hidden lg:flex flex-col lg:w-5/12 xl:w-1/2 bg-[#F2F3F0] overflow-y-auto">
          {selectedProduct ? (
            <div className="p-4 space-y-4">
              {/* Product Header Card */}
              <div className="bg-white p-4 rounded-xl border border-[#D9DDD8] shadow-2xs space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    <ItemThumbnail
                      src={selectedProduct.imageUrl}
                      alt={selectedProduct.name}
                      category={categories.find(c => c.id === selectedProduct.categoryId)?.name}
                      size="lg"
                      rounded="xl"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#555D58]">
                          {categories.find(c => c.id === selectedProduct.categoryId)?.name}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#ECEEEA] text-[#252A27] border border-[#D9DDD8]">
                          Poste {selectedProduct.station === 'kitchen' ? 'Cuisine' : 'Bar'}
                        </span>
                      </div>
                      <h2 className="font-serif font-black text-lg text-[#252A27] mt-0.5 truncate">
                        {selectedProduct.name}
                      </h2>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-serif font-extrabold text-xl text-[#252A27]">
                      {selectedProduct.price.toFixed(3)} DT
                    </div>
                    <span className="text-[10px] text-[#555D58]">TVA {selectedProduct.tvaRate || 10}% incluse</span>
                  </div>
                </div>

                {selectedProduct.description && (
                  <p className="text-xs text-[#555D58] bg-[#F7F7F5] p-2.5 rounded-lg border border-[#D9DDD8]">
                    {selectedProduct.description}
                  </p>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-[#D9DDD8]">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleToggleAvailable(selectedProduct)}
                      className={`px-2.5 py-1 rounded-md text-xs font-bold flex items-center space-x-1.5 border transition-colors ${
                        selectedProduct.available
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}
                    >
                      {selectedProduct.available ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>En vente</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Masqué</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setEditingProduct(selectedProduct)}
                      className="px-2.5 py-1 rounded-md bg-[#ECEEEA] text-[#252A27] text-xs font-bold border border-[#D9DDD8] flex items-center space-x-1 hover:bg-white"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Modifier</span>
                    </button>

                    <CopyLinkButton
                      view="products"
                      id={selectedProduct.id}
                      size="sm"
                    />
                  </div>

                  <button
                    onClick={() => setProductToDelete(selectedProduct)}
                    className="p-1.5 rounded-md text-rose-800 hover:bg-rose-50 border border-transparent hover:border-rose-200"
                    title="Supprimer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Technical Recipe / Margin Card */}
              <div className="bg-white p-4 rounded-xl border border-[#D9DDD8] shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-[#252A27]" />
                    <h3 className="font-bold text-xs text-[#252A27]">Fiche Technique & Coûts</h3>
                  </div>

                  <button
                    onClick={() => setSelectedProductForRecipe(selectedProduct)}
                    className="px-2.5 py-1 rounded-md bg-[#A4DEC2] text-[#252A27] text-xs font-bold border border-[#8BCFAE] hover:bg-[#8BCFAE] flex items-center space-x-1 shadow-2xs"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>{selectedProductRecipe ? 'Ajuster Fiche' : 'Créer Fiche'}</span>
                  </button>
                </div>

                {selectedProductRecipe ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-2.5 rounded-lg bg-[#F7F7F5] border border-[#D9DDD8]">
                        <span className="text-[9px] font-bold text-[#555D58] uppercase block">Coût Matière</span>
                        <span className="font-mono font-bold text-xs text-[#252A27]">
                          {(selectedProductRecipe.totalIngredientsCost || 0).toFixed(3)} DT
                        </span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-[#F7F7F5] border border-[#D9DDD8]">
                        <span className="text-[9px] font-bold text-[#555D58] uppercase block">Marge Brute</span>
                        <span className="font-mono font-bold text-xs text-emerald-800">
                          {(selectedProduct.price - (selectedProductRecipe.totalIngredientsCost || 0)).toFixed(3)} DT
                        </span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-[#F7F7F5] border border-[#D9DDD8]">
                        <span className="text-[9px] font-bold text-[#555D58] uppercase block">Taux Marge</span>
                        <span className="font-mono font-bold text-xs text-emerald-800">
                          {selectedProductRecipe.targetMarginPercentage || 75}%
                        </span>
                      </div>
                    </div>

                    {/* Ingredients list summary */}
                    <div className="border border-[#D9DDD8] rounded-lg overflow-hidden divide-y divide-[#ECEEEA]">
                      <div className="px-2.5 py-1.5 bg-[#F7F7F5] text-[10px] font-bold text-[#555D58] flex justify-between">
                        <span>Ingrédient</span>
                        <span>Dosage & Coût</span>
                      </div>
                      {selectedProductRecipe.ingredients?.map((ing, idx) => (
                        <div key={idx} className="px-2.5 py-1.5 text-xs flex items-center justify-between">
                          <span className="font-semibold text-[#252A27]">{ing.ingredientName}</span>
                          <span className="font-mono text-[11px] text-[#555D58]">
                            {ing.displayQuantity || formatApproxQuantity(ing.quantityMin ?? ing.quantity, ing.quantityMax, ing.recipeUnit || ing.unit)} &bull; {ing.totalCost.toFixed(3)} DT
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-center rounded-lg bg-[#F7F7F5] border border-[#D9DDD8] text-xs text-[#555D58]">
                    Aucune fiche technique liée. Créez-en une pour déduire automatiquement les ingrédients du stock lors des ventes POS & QR.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center p-8 text-xs text-[#555D58]">
              Sélectionnez un produit pour afficher sa fiche détaillée.
            </div>
          )}
        </div>
      </div>

      {/* CREATE / EDIT PRODUCT MODAL */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#F2F3F0] rounded-2xl p-5 max-w-lg w-full shadow-2xl border border-[#C7CDC8] max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-[#D9DDD8]">
              <h3 className="font-bold text-sm text-[#252A27]">
                {editingProduct.id ? 'Modifier le Produit' : 'Créer un Produit'}
              </h3>
              <button
                onClick={() => setEditingProduct(null)}
                className="p-1 rounded-lg bg-[#ECEEEA] text-[#252A27] border border-[#D9DDD8]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#252A27]">Nom de l'article</label>
                <input
                  type="text"
                  required
                  value={editingProduct.name || ''}
                  onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  placeholder="Ex: Flat White Double Shot"
                  className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-semibold text-[#252A27] focus:outline-none focus:border-[#252A27]"
                />
              </div>

              {/* Photo / Illustration with live preview & presets */}
              <ImageInputControl
                value={editingProduct.imageUrl || ''}
                onChange={url => setEditingProduct({ ...editingProduct, imageUrl: url })}
                category={categories.find(c => c.id === editingProduct.categoryId)?.name}
                type="product"
                label="Photo / Visuel du Produit"
                helperText="Affichée sur la caisse tactile POS, le menu client QR et la carte"
              />

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#252A27]">Catégorie</label>
                  <select
                    value={editingProduct.categoryId || ''}
                    onChange={e => setEditingProduct({ ...editingProduct, categoryId: e.target.value })}
                    className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-semibold text-[#252A27]"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#252A27]">Poste de préparation</label>
                  <select
                    value={editingProduct.station || 'bar'}
                    onChange={e => setEditingProduct({ ...editingProduct, station: e.target.value as any })}
                    className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-semibold text-[#252A27]"
                  >
                    <option value="bar">Bar & Boissons</option>
                    <option value="kitchen">Cuisine & Brunch</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#252A27]">Prix de Vente TTC (DT)</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    required
                    value={editingProduct.price || 0}
                    onChange={e => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-bold text-[#252A27]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#252A27]">Taux de TVA (%)</label>
                  <select
                    value={editingProduct.tvaRate || 10}
                    onChange={e => setEditingProduct({ ...editingProduct, tvaRate: parseFloat(e.target.value) || 10 })}
                    className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-semibold text-[#252A27]"
                  >
                    <option value="10">10 % (Restauration sur place)</option>
                    <option value="5.5">5.5 % (Alimentaire emporté)</option>
                    <option value="20">20 % (Alcool & dérivés)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#252A27]">Description publique (Menu QR & Site)</label>
                <textarea
                  rows={2}
                  value={editingProduct.description || ''}
                  onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  placeholder="Ex: Double espresso d'Éthiopie Yirgacheffe avec micromousse de lait bio..."
                  className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs text-[#252A27]"
                />
              </div>

              <div className="flex items-center space-x-4 pt-1">
                <label className="flex items-center space-x-2 text-xs font-semibold text-[#252A27] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProduct.available !== false}
                    onChange={e => setEditingProduct({ ...editingProduct, available: e.target.checked })}
                    className="rounded text-[#252A27]"
                  />
                  <span>Disponible à la vente</span>
                </label>

                <label className="flex items-center space-x-2 text-xs font-semibold text-[#252A27] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProduct.isSpecialty || false}
                    onChange={e => setEditingProduct({ ...editingProduct, isSpecialty: e.target.checked })}
                    className="rounded text-[#252A27]"
                  />
                  <span>Spécialité / Signature</span>
                </label>
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="flex-1 py-2 rounded-lg bg-[#ECEEEA] text-xs font-bold text-[#252A27] border border-[#D9DDD8]"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-lg bg-[#A4DEC2] text-[#252A27] text-xs font-bold border border-[#8BCFAE] hover:bg-[#8BCFAE] transition-colors shadow-2xs"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CATEGORIES MODAL */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#F2F3F0] rounded-2xl p-5 max-w-md w-full shadow-2xl border border-[#C7CDC8] animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-[#D9DDD8]">
              <h3 className="font-bold text-sm text-[#252A27]">Gestion des Catégories</h3>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1 rounded-lg bg-[#ECEEEA] text-[#252A27] border border-[#D9DDD8]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              <form onSubmit={handleCreateCategory} className="space-y-2">
                <input
                  type="text"
                  required
                  placeholder="Nom de la catégorie (ex: Vins Naturels)"
                  value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)}
                  className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-semibold text-[#252A27]"
                />
                <button
                  type="submit"
                  className="w-full py-2 rounded-lg bg-[#A4DEC2] text-[#252A27] text-xs font-bold border border-[#8BCFAE] hover:bg-[#8BCFAE] shadow-2xs"
                >
                  Ajouter la catégorie
                </button>
              </form>

              <div className="divide-y divide-[#ECEEEA] max-h-60 overflow-y-auto border border-[#D9DDD8] rounded-xl bg-white">
                {safeCategories.map(c => (
                  <div key={c.id} className="p-2.5 flex items-center justify-between text-xs">
                    <span className="font-bold text-[#252A27]">{c.name}</span>
                    <span className="text-[#555D58]">
                      {safeProducts.filter(p => p.categoryId === c.id).length} articles
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TECHNICAL RECIPE MODAL */}
      <TechnicalRecipeModal
        isOpen={!!selectedProductForRecipe}
        onClose={() => setSelectedProductForRecipe(null)}
        product={selectedProductForRecipe}
        onSaved={loadData}
      />

      {/* CSV IMPORT MODAL */}
      <CsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onSuccess={loadData}
      />

      {/* CONFIRM DELETE MODAL */}
      <ConfirmDialog
        isOpen={!!productToDelete}
        title="Supprimer le produit"
        message={`Voulez-vous supprimer définitivement "${productToDelete?.name}" ? Cette action retirera le produit du catalogue et de la caisse tactile.`}
        variant="danger"
        confirmLabel="Supprimer"
        onConfirm={handleConfirmDeleteProduct}
        onCancel={() => setProductToDelete(null)}
      />
    </div>
  );
};

