import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Product, Table } from '../../types';
import { useSystem } from '../../context/SystemContext';
import {
  Coffee,
  Calendar,
  Clock,
  MapPin,
  Phone,
  Mail,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  UtensilsCrossed,
  ShieldCheck,
  Award
} from 'lucide-react';

interface PublicWebsiteViewProps {
  onOpenStaffApp?: () => void;
  onOpenQrOrder?: (tableId?: string) => void;
}

export const PublicWebsiteView: React.FC<PublicWebsiteViewProps> = ({
  onOpenStaffApp,
  onOpenQrOrder
}) => {
  const { showRouteNotification } = useSystem();
  const [products, setProducts] = useState<Product[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Café & Boissons');
  const [categories, setCategories] = useState<string[]>([]);

  // Reservation form
  const [reservation, setReservation] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    reservationDate: new Date().toISOString().split('T')[0],
    reservationTime: '12:30',
    partySize: 2,
    tableId: '',
    notes: ''
  });
  const [reservationSuccess, setReservationSuccess] = useState(false);
  const [resLoading, setResLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [prodList, tableList] = await Promise.all([
          api.getProducts(),
          api.getTables()
        ]);
        const safeProds = Array.isArray(prodList) ? prodList.filter(p => p.available !== false) : [];
        const safeTables = Array.isArray(tableList) ? tableList : [];
        setProducts(safeProds);
        setTables(safeTables);

        const cats = Array.from(new Set(prodList.map((p: any) => p.category || p.categoryId || 'Café')));
        setCategories(cats);
        if (cats.length > 0) setSelectedCategory(cats[0]);
      } catch (err) {
        console.error('Failed to load public website data', err);
      }
    };
    load();
  }, []);

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reservation.customerName || !reservation.customerPhone) return;

    try {
      setResLoading(true);
      await api.createReservation({
        tableId: reservation.tableId || tables[0]?.id || '',
        customerName: reservation.customerName,
        customerPhone: reservation.customerPhone,
        customerEmail: reservation.customerEmail,
        reservationDate: reservation.reservationDate,
        reservationTime: reservation.reservationTime,
        guestsCount: Number(reservation.partySize) || 2,
        notes: reservation.notes
      }, 'Client Site Web');
      setReservationSuccess(true);
      showRouteNotification('Réservation confirmée avec succès !', 'success');
    } catch (err: any) {
      showRouteNotification(`Erreur: ${err.message}`, 'error');
    } finally {
      setResLoading(false);
    }
  };

  const filteredProducts = (products || []).filter(
    p => selectedCategory === 'all' || p.category === selectedCategory || p.categoryId === selectedCategory
  );

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#252A27] font-sans antialiased selection:bg-[#252A27] selection:text-white">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-[#F2F3F0]/95 backdrop-blur-md border-b border-[#D9DDD8] px-4 sm:px-8 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-[#252A27] text-[#A4DEC2] flex items-center justify-center shadow-2xs font-serif font-black text-xs">
              CN
            </div>
            <div>
              <span className="font-serif font-black text-base tracking-tight text-[#252A27] block">
                CAFÉ NOIR
              </span>
              <span className="text-[10px] tracking-widest uppercase font-bold text-[#555D58]">
                Maison de Torréfaction &bull; Paris 7e
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            <a
              href="#menu"
              className="text-xs font-bold text-[#555D58] hover:text-[#252A27] hidden sm:inline px-2 py-1"
            >
              La Carte
            </a>
            <a
              href="#reservation"
              className="text-xs font-bold text-[#555D58] hover:text-[#252A27] hidden sm:inline px-2 py-1"
            >
              Réserver
            </a>

            {onOpenQrOrder && (
              <button
                onClick={() => onOpenQrOrder()}
                className="px-3 py-1.5 rounded-lg bg-[#A4DEC2] hover:bg-[#8BCFAE] text-[#252A27] text-xs font-bold transition-all shadow-2xs flex items-center space-x-1.5 border border-[#8BCFAE]"
              >
                <UtensilsCrossed className="w-3.5 h-3.5" />
                <span>Commander à Table</span>
              </button>
            )}

            {onOpenStaffApp && (
              <button
                onClick={onOpenStaffApp}
                className="px-3 py-1.5 rounded-lg bg-[#ECEEEA] hover:bg-white text-[#252A27] text-xs font-bold transition-colors border border-[#D9DDD8]"
              >
                Espace Équipe
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-4 sm:px-8 pt-8 pb-12 max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl p-6 sm:p-10 border border-[#D9DDD8] shadow-2xs flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="max-w-xl space-y-4">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-md bg-[#F2F3F0] border border-[#D9DDD8] text-xs font-bold text-[#252A27]">
              <Sparkles className="w-3 h-3 text-[#252A27]" />
              <span>Cafés de spécialité 100% Arabica torréfiés sur place</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-serif font-black text-[#252A27] leading-tight">
              L'art de l'espresso parfait et de la pâtisserie d'auteur.
            </h1>

            <p className="text-xs sm:text-sm text-[#555D58] leading-relaxed">
              Niché au cœur du 7ème arrondissement, le Café Noir vous accueille tous les jours dans une atmosphère épurée et feutrée. Extractions manuelles V60, torréfaction artisanale et carte de saison.
            </p>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <a
                href="#menu"
                className="px-4 py-2 rounded-lg bg-[#252A27] text-[#A4DEC2] text-xs font-bold transition-all shadow-2xs flex items-center space-x-1.5 hover:bg-[#343B37]"
              >
                <span>Découvrir la Carte</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>

              <a
                href="#reservation"
                className="px-4 py-2 rounded-lg bg-[#ECEEEA] hover:bg-white text-[#252A27] text-xs font-bold transition-colors border border-[#D9DDD8]"
              >
                Réserver une Table
              </a>
            </div>
          </div>

          {/* Opening hours & highlight card */}
          <div className="w-full lg:w-80 bg-[#F2F3F0] rounded-xl p-5 border border-[#D9DDD8] space-y-4 shrink-0">
            <div className="flex items-center space-x-2 text-xs font-bold text-[#252A27]">
              <Clock className="w-4 h-4" />
              <span>HORAIRES D'OUVERTURE</span>
            </div>

            <div className="space-y-2 text-xs divide-y divide-[#D9DDD8]">
              <div className="flex justify-between pt-1">
                <span className="font-semibold text-[#555D58]">Lundi - Vendredi</span>
                <span className="font-mono font-bold text-[#252A27]">07h30 &ndash; 19h00</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="font-semibold text-[#555D58]">Samedi & Dimanche</span>
                <span className="font-mono font-bold text-[#252A27]">08h30 &ndash; 19h30</span>
              </div>
            </div>

            <div className="pt-2 border-t border-[#D9DDD8] space-y-1.5 text-xs text-[#555D58]">
              <p className="flex items-center space-x-2">
                <MapPin className="w-3.5 h-3.5 text-[#252A27] shrink-0" />
                <span>18 Rue Saint-Dominique, 75007 Paris</span>
              </p>
              <p className="flex items-center space-x-2">
                <Phone className="w-3.5 h-3.5 text-[#252A27] shrink-0" />
                <span>+33 1 42 68 90 00</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Menu Section */}
      <section id="menu" className="px-4 sm:px-8 py-8 max-w-6xl mx-auto space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#555D58]">
            CARTE & EXTRACTIONS
          </span>
          <h2 className="text-xl sm:text-2xl font-serif font-black text-[#252A27]">
            Nos Créations & Spécialités
          </h2>
          <p className="text-xs text-[#555D58]">
            Sélection méticuleuse de micro-lots éthiopiens, colombiens et guatémaltèques.
          </p>
        </div>

        {/* Category Selector */}
        <div className="flex justify-center items-center space-x-1.5 overflow-x-auto pb-1 no-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map(prod => {
            const price = prod.priceTTC || prod.price;
            return (
              <div
                key={prod.id}
                className="bg-white rounded-xl p-4 border border-[#D9DDD8] shadow-2xs hover:border-[#252A27] transition-all flex flex-col justify-between"
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
                  <p className="text-[11px] text-[#555D58] mt-1 leading-relaxed">
                    {prod.description || 'Extraction minutieuse réalisée par nos baristas.'}
                  </p>

                  {prod.tags && prod.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2.5">
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
              </div>
            );
          })}
        </div>
      </section>

      {/* Table Reservation Section */}
      <section id="reservation" className="px-4 sm:px-8 py-8 max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#D9DDD8] shadow-2xs">
          <div className="text-center max-w-md mx-auto space-y-1 mb-6">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#555D58]">
              RÉSERVATION DE TABLE
            </span>
            <h2 className="text-xl font-serif font-black text-[#252A27]">
              Réservez votre moment au Café Noir
            </h2>
            <p className="text-xs text-[#555D58]">
              Confirmation instantanée dans notre système de salle
            </p>
          </div>

          {reservationSuccess ? (
            <div className="p-6 bg-emerald-50 rounded-xl border border-emerald-200 text-center space-y-2.5 animate-in zoom-in-95">
              <CheckCircle2 className="w-8 h-8 text-emerald-700 mx-auto" />
              <h3 className="font-serif font-bold text-sm text-emerald-900">
                Réservation Confirmée avec Succès
              </h3>
              <p className="text-xs text-emerald-800">
                Merci {reservation.customerName}. Votre table pour {reservation.partySize} personne(s) est réservée pour le {reservation.reservationDate} à {reservation.reservationTime}.
              </p>
              <button
                onClick={() => setReservationSuccess(false)}
                className="mt-2 px-4 py-1.5 rounded-lg bg-[#252A27] text-[#A4DEC2] text-xs font-bold"
              >
                Nouvelle réservation
              </button>
            </div>
          ) : (
            <form onSubmit={handleCreateReservation} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#252A27]">Nom & Prénom</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Éléonore de Montmirail"
                    value={reservation.customerName}
                    onChange={e => setReservation({ ...reservation, customerName: e.target.value })}
                    className="w-full p-2 bg-[#F7F7F5] border border-[#D9DDD8] rounded-lg text-xs font-semibold text-[#252A27] focus:outline-none focus:border-[#252A27]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#252A27]">Téléphone de contact</label>
                  <input
                    type="tel"
                    required
                    placeholder="06 12 34 56 78"
                    value={reservation.customerPhone}
                    onChange={e => setReservation({ ...reservation, customerPhone: e.target.value })}
                    className="w-full p-2 bg-[#F7F7F5] border border-[#D9DDD8] rounded-lg text-xs font-semibold text-[#252A27] focus:outline-none focus:border-[#252A27]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#252A27]">Date souhaitée</label>
                  <input
                    type="date"
                    required
                    value={reservation.reservationDate}
                    onChange={e => setReservation({ ...reservation, reservationDate: e.target.value })}
                    className="w-full p-2 bg-[#F7F7F5] border border-[#D9DDD8] rounded-lg text-xs font-semibold text-[#252A27]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#252A27]">Heure</label>
                  <input
                    type="time"
                    required
                    value={reservation.reservationTime}
                    onChange={e => setReservation({ ...reservation, reservationTime: e.target.value })}
                    className="w-full p-2 bg-[#F7F7F5] border border-[#D9DDD8] rounded-lg text-xs font-semibold text-[#252A27]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#252A27]">Nombre de convives</label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    required
                    value={reservation.partySize}
                    onChange={e => setReservation({ ...reservation, partySize: parseInt(e.target.value) || 2 })}
                    className="w-full p-2 bg-[#F7F7F5] border border-[#D9DDD8] rounded-lg text-xs font-bold text-center text-[#252A27]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#252A27]">Table / Emplacement préféré</label>
                <select
                  value={reservation.tableId}
                  onChange={e => setReservation({ ...reservation, tableId: e.target.value })}
                  className="w-full p-2 bg-[#F7F7F5] border border-[#D9DDD8] rounded-lg text-xs font-semibold text-[#252A27]"
                >
                  {tables.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.zone || 'Salle'} - {t.capacity} places)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#252A27]">Demandes particulières</label>
                <input
                  type="text"
                  placeholder="Ex: Chaise haute pour enfant, table calme..."
                  value={reservation.notes}
                  onChange={e => setReservation({ ...reservation, notes: e.target.value })}
                  className="w-full p-2 bg-[#F7F7F5] border border-[#D9DDD8] rounded-lg text-xs text-[#252A27]"
                />
              </div>

              <button
                type="submit"
                disabled={resLoading}
                className="w-full py-2.5 rounded-lg bg-[#A4DEC2] hover:bg-[#8BCFAE] text-[#252A27] text-xs font-bold transition-all shadow-2xs border border-[#8BCFAE] mt-2"
              >
                {resLoading ? 'Confirmation...' : 'Confirmer la Réservation'}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#F2F3F0] border-t border-[#D9DDD8] py-8 px-4 sm:px-8 text-xs text-[#555D58]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <p className="font-serif font-bold text-xs text-[#252A27]">CAFÉ NOIR &bull; SYSTÈME</p>
            <p className="text-[11px] text-[#555D58] mt-0.5">18 Rue Saint-Dominique, 75007 Paris &bull; 01 42 68 90 00</p>
          </div>

          <div className="flex items-center space-x-4 text-[11px]">
            <span>&copy; {new Date().getFullYear()} Café Noir. Tous droits réservés.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
