import fs from 'fs';
import path from 'path';
import { DatabaseSchema, User, Space, Table, PlanElement, Reservation, Category, Ingredient, TechnicalRecipe, Product, Order, Sale, StockMovement, StockLot, Supplier, SupplierInvoice, Expense, Shift, AttendanceRecord, LeaveRequest, PayrollRecord, SystemAlert, JournalEntry, CashRegisterSession } from '../types/index.js';

/** Paramètres applicatifs persistants (config, non-métier) */
export interface AppSettings {
  /**
   * Mode de calcul utilisé pour résoudre la valeur numérique d'une plage d'ingrédient en recette.
   * - 'max'    : borne haute (prudent — défaut recommandé)
   * - 'median' : valeur moyenne
   * - 'min'    : borne basse (optimiste)
   */
  recipeRangeCalcMode: 'max' | 'median' | 'min';
  /** Délai (jours) avant péremption utilisé pour alerter, quand un produit n'a pas de délai propre. */
  defaultExpiryAlertLeadDays: number;
}

const DEFAULT_APP_SETTINGS: AppSettings = {
  recipeRangeCalcMode: 'max',
  defaultExpiryAlertLeadDays: 5
};

const DB_FILE = path.resolve(process.cwd(), 'data', 'cafe_noir_db.json');

class DatabaseEngine {
  private data: DatabaseSchema;
  private isSaving = false;

  constructor() {
    this.data = this.loadOrSeed();
  }

  private loadOrSeed(): DatabaseSchema {
    const seed = this.getSeedData();
    try {
      const dir = path.dirname(DB_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed: DatabaseSchema = JSON.parse(raw);
        for (const key of Object.keys(seed) as (keyof DatabaseSchema)[]) {
          if (!parsed[key] || !Array.isArray(parsed[key])) {
            parsed[key] = seed[key] as any;
          }
        }
        this.migrateLegacyStockData(parsed);
        this.migrateLegacyPurchasingData(parsed);
        this.persist(parsed);
        return parsed;
      }
    } catch (err) {
      console.error('Error reading database file, resetting to seed data:', err);
    }

    this.persist(seed);
    return seed;
  }

  /**
   * Rétrocompatibilité : les fichiers `data/cafe_noir_db.json` générés avant l'introduction des
   * zones de stock n'ont pas de `stockByZone`/`zone` sur les enregistrements existants. On les
   * complète une fois pour toutes (tout l'existant est affecté à la Réserve principale, zone de
   * travail par défaut) plutôt que de forcer une réinitialisation des données.
   */
  private migrateLegacyStockData(parsed: DatabaseSchema): void {
    for (const ing of parsed.ingredients || []) {
      if (!ing.stockByZone) {
        ing.stockByZone = { reserve_principale: ing.currentStock || 0, depot: 0 };
      }
    }
    for (const mov of parsed.stockMovements || []) {
      if (!mov.zone) {
        mov.zone = 'reserve_principale';
      }
    }
    for (const waste of parsed.stockWastes || []) {
      if (!(waste as any).zone) {
        (waste as any).zone = 'reserve_principale';
      }
    }
  }

  /**
   * Rétrocompatibilité : les bons de commande / factures fournisseurs créés avant les réceptions
   * partielles et le suivi des paiements n'ont pas `receptions`/`receivedQuantity`/`paidAmount`/
   * `payments`. On les complète à partir de leur statut existant plutôt que de perdre l'historique.
   */
  private migrateLegacyPurchasingData(parsed: DatabaseSchema): void {
    for (const po of parsed.purchaseOrders || []) {
      if (!Array.isArray(po.receptions)) po.receptions = [];
      for (const item of po.items || []) {
        if (item.receivedQuantity === undefined) {
          item.receivedQuantity = po.status === 'received' ? item.quantity : 0;
        }
      }
    }
    for (const inv of parsed.supplierInvoices || []) {
      if (inv.paidAmount === undefined) {
        inv.paidAmount = inv.paymentStatus === 'paid' ? (inv.totalTTC || inv.totalAmount) : 0;
      }
      if (!Array.isArray(inv.payments)) inv.payments = [];
      if (inv.stockUpdated && !inv.stockZone) {
        inv.stockZone = 'reserve_principale';
      }
    }
  }

  private getSeedPlanElements(): PlanElement[] {
    return [
      // Salle Principale elements
      { id: 'pe_bar_main', spaceId: 'sp_salle', type: 'counter', label: 'Comptoir Bar Espresso', posX: 30, posY: 30, width: 220, height: 42, rotation: 0, color: '#4A3319' },
      { id: 'pe_bar_station', spaceId: 'sp_salle', type: 'bar_station', label: 'Machine La Marzocco & Moulin', posX: 260, posY: 30, width: 100, height: 42, rotation: 0, color: '#C5A059' },
      { id: 'pe_door_salle', spaceId: 'sp_salle', type: 'door', label: 'Entrée Principale', posX: 380, posY: 450, width: 75, height: 20, rotation: 0, color: '#2B422F' },
      { id: 'pe_wall_divider', spaceId: 'sp_salle', type: 'wall', label: 'Séparation Acoustique', posX: 310, posY: 100, width: 10, height: 160, rotation: 0, color: '#1E231F' },
      { id: 'pe_plant_1', spaceId: 'sp_salle', type: 'plant', label: 'Monstera Deliciosa', posX: 460, posY: 35, width: 36, height: 36, rotation: 0, color: '#4A5B4D' },
      { id: 'pe_window_rue', spaceId: 'sp_salle', type: 'window', label: 'Baie Vitrée Rue', posX: 20, posY: 460, width: 260, height: 14, rotation: 0, color: '#7E6347' },
      { id: 'pe_sofa_salle', spaceId: 'sp_salle', type: 'sofa', label: 'Banquette Cuir Caramel', posX: 340, posY: 360, width: 150, height: 48, rotation: 0, color: '#C5A059' },

      // Terrasse elements
      { id: 'pe_terrasse_awning', spaceId: 'sp_terrasse', type: 'divider', label: 'Store Banne & Chauffage', posX: 40, posY: 20, width: 380, height: 16, rotation: 0, color: '#C5A059' },
      { id: 'pe_terrasse_plants', spaceId: 'sp_terrasse', type: 'plant', label: 'Bacs Végétaux Lauriers', posX: 20, posY: 400, width: 280, height: 26, rotation: 0, color: '#2B422F' },
      { id: 'pe_terrasse_access', spaceId: 'sp_terrasse', type: 'door', label: 'Accès Salle', posX: 420, posY: 220, width: 60, height: 18, rotation: 90, color: '#7E6347' },

      // Lounge elements
      { id: 'pe_lounge_bar', spaceId: 'sp_lounge', type: 'counter', label: 'Comptoir Signature & Vins', posX: 30, posY: 30, width: 240, height: 50, rotation: 0, color: '#7E6347' },
      { id: 'pe_lounge_sofa1', spaceId: 'sp_lounge', type: 'sofa', label: 'Fauteuils Club Cuir', posX: 40, posY: 280, width: 180, height: 55, rotation: 0, color: '#4A3319' },
      { id: 'pe_lounge_plant', spaceId: 'sp_lounge', type: 'plant', label: 'Ficus Lyrata', posX: 340, posY: 35, width: 40, height: 40, rotation: 0, color: '#2B422F' },

      // Mezzanine elements
      { id: 'pe_mezz_divider', spaceId: 'sp_mezzanine', type: 'divider', label: 'Garde-corps Verre & Métal', posX: 30, posY: 420, width: 360, height: 14, rotation: 0, color: '#4A5B4D' },
      { id: 'pe_mezz_library', spaceId: 'sp_mezzanine', type: 'wall', label: 'Bibliothèque & Coworking', posX: 30, posY: 30, width: 240, height: 30, rotation: 0, color: '#7E6347' }
    ];
  }

  private getSeedReservations(): Reservation[] {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    return [
      {
        id: 'res_1',
        customerName: 'Alexandre Dumas',
        customerPhone: '+33 6 12 34 56 78',
        customerEmail: 'a.dumas@email.com',
        tableId: 'tbl_5',
        spaceId: 'sp_salle',
        guestsCount: 6,
        reservationDate: today,
        reservationTime: '12:30',
        status: 'confirmed',
        notes: 'Déjeuner professionnel, besoin de calme et de prises.',
        createdAt: new Date().toISOString()
      },
      {
        id: 'res_2',
        customerName: 'Sophie Marceau',
        customerPhone: '+33 6 98 76 54 32',
        customerEmail: 'sophie.m@cinema.fr',
        tableId: 'tbl_12',
        spaceId: 'sp_lounge',
        guestsCount: 4,
        reservationDate: today,
        reservationTime: '19:00',
        status: 'confirmed',
        notes: 'Table près des fauteuils club, dégustation café & cocktails.',
        createdAt: new Date().toISOString()
      },
      {
        id: 'res_3',
        customerName: 'Jean Reno',
        customerPhone: '+33 6 55 44 33 22',
        customerEmail: 'j.reno@pro.com',
        tableId: 'tbl_8',
        spaceId: 'sp_terrasse',
        guestsCount: 4,
        reservationDate: tomorrow,
        reservationTime: '13:00',
        status: 'pending',
        notes: 'Terrasse couverte si possible.',
        createdAt: new Date().toISOString()
      }
    ];
  }

  public get<K extends keyof DatabaseSchema>(collection: K): DatabaseSchema[K] {
    if (!this.data[collection]) {
      this.data[collection] = [] as any;
    }
    return this.data[collection];
  }

  public set<K extends keyof DatabaseSchema>(collection: K, items: DatabaseSchema[K]): void {
    this.data[collection] = items;
    this.persist(this.data);
  }

  public transaction<T>(callback: (db: DatabaseEngine) => T): T {
    // Atomic operation wrapper
    try {
      const result = callback(this);
      this.persist(this.data);
      return result;
    } catch (err) {
      console.error('Transaction rollback due to error:', err);
      // Reload clean state on fatal failure
      this.data = this.loadOrSeed();
      throw err;
    }
  }

  public persist(dataToSave: DatabaseSchema = this.data): void {
    if (this.isSaving) return;
    this.isSaving = true;
    try {
      const dir = path.dirname(DB_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const tempPath = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(dataToSave, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_FILE);
    } catch (err) {
      console.error('Failed to write database atomically:', err);
    } finally {
      this.isSaving = false;
    }
  }

  public logAudit(action: string, category: JournalEntry['category'], details: string, performedBy: string, metadata?: Record<string, any>) {
    const entry: JournalEntry = {
      id: `JRN-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      action,
      category,
      details,
      performedBy,
      metadata,
      createdAt: new Date().toISOString()
    };
    this.data.journal.unshift(entry);
    if (this.data.journal.length > 500) {
      this.data.journal = this.data.journal.slice(0, 500);
    }
    this.persist(this.data);
    return entry;
  }

  public createAlert(type: SystemAlert['type'], title: string, message: string, severity: SystemAlert['severity'], linkUrl?: string, metadata?: Record<string, any>) {
    const alert: SystemAlert = {
      id: `ALT-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type,
      title,
      message,
      severity,
      read: false,
      linkUrl,
      metadata,
      createdAt: new Date().toISOString()
    };
    this.data.alerts.unshift(alert);
    if (this.data.alerts.length > 200) {
      this.data.alerts = this.data.alerts.slice(0, 200);
    }
    this.persist(this.data);
    return alert;
  }

  // ── App Settings (stored in a separate config file, not part of DatabaseSchema) ──

  private settingsFilePath = path.join(process.cwd(), 'data', 'app_settings.json');

  public getSettings(): AppSettings {
    try {
      if (fs.existsSync(this.settingsFilePath)) {
        const raw = fs.readFileSync(this.settingsFilePath, 'utf-8');
        return { ...DEFAULT_APP_SETTINGS, ...JSON.parse(raw) };
      }
    } catch (_) {}
    return { ...DEFAULT_APP_SETTINGS };
  }

  public setSettings(updates: Partial<AppSettings>): AppSettings {
    const current = this.getSettings();
    const updated: AppSettings = { ...current, ...updates };
    try {
      const dir = path.dirname(this.settingsFilePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.settingsFilePath, JSON.stringify(updated, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist app settings:', err);
    }
    return updated;
  }

  private getSeedData(): DatabaseSchema {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const users: User[] = [
      {
        id: 'usr_admin',
        name: 'Adam Mansour',
        email: 'adam@café-noir.fr',
        role: 'admin',
        pin: '1234',
        phone: '+33 6 12 34 56 78',
        hourlyRate: 28.5,
        active: true,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        createdAt: '2025-01-01T08:00:00Z'
      },
      {
        id: 'usr_victor',
        name: 'Victor Noir',
        email: 'victor@café-noir.fr',
        role: 'admin',
        pin: '0000',
        phone: '+33 6 11 22 33 44',
        hourlyRate: 30.0,
        active: true,
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
        createdAt: '2025-01-01T08:00:00Z'
      },
      {
        id: 'usr_manager',
        name: 'Camille Laurent',
        email: 'camille@café-noir.fr',
        role: 'manager',
        pin: '2025',
        phone: '+33 6 98 76 54 32',
        hourlyRate: 22.0,
        active: true,
        avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
        createdAt: '2025-01-05T08:00:00Z'
      },
      {
        id: 'usr_sarah',
        name: 'Sarah Alami',
        email: 'sarah@café-noir.fr',
        role: 'barista',
        pin: '5678',
        phone: '+33 6 55 44 33 22',
        hourlyRate: 18.0,
        active: true,
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
        createdAt: '2025-01-10T08:00:00Z'
      },
      {
        id: 'usr_julien',
        name: 'Julien Moreau',
        email: 'julien@café-noir.fr',
        role: 'cook',
        pin: '4321',
        phone: '+33 6 77 88 99 00',
        hourlyRate: 19.5,
        active: true,
        avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
        createdAt: '2025-01-15T08:00:00Z'
      },
      {
        id: 'usr_barista',
        name: 'Lucas Morel',
        email: 'lucas@café-noir.fr',
        role: 'barista',
        pin: '1111',
        phone: '+33 6 45 67 89 01',
        hourlyRate: 16.5,
        active: true,
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        createdAt: '2025-02-01T08:00:00Z'
      },
      {
        id: 'usr_server',
        name: 'Sophie Dubois',
        email: 'sophie@café-noir.fr',
        role: 'server',
        pin: '2222',
        phone: '+33 6 33 22 11 00',
        hourlyRate: 15.5,
        active: true,
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
        createdAt: '2025-02-10T08:00:00Z'
      }
    ];

    const spaces: Space[] = [
      { id: 'sp_salle', name: 'Salle Principale', description: 'Ambiance chaleureuse bois & laiton', color: '#2B422F', order: 1 },
      { id: 'sp_terrasse', name: 'Terrasse Extérieure', description: 'Vue sur place arborée, chauffée', color: '#C5A059', order: 2 },
      { id: 'sp_lounge', name: 'Lounge & Bar', description: 'Fauteuils club & comptoir signature', color: '#7E6347', order: 3 },
      { id: 'sp_mezzanine', name: 'Mezzanine Calme', description: 'Espace coworking & lecture', color: '#4A5B4D', order: 4 }
    ];

    const tables: Table[] = [
      { id: 'tbl_1', number: '1', name: 'Table 1', spaceId: 'sp_salle', capacity: 2, status: 'available', posX: 100, posY: 80, shape: 'circle' },
      { id: 'tbl_2', number: '2', name: 'Table 2', spaceId: 'sp_salle', capacity: 2, status: 'available', posX: 220, posY: 80, shape: 'circle' },
      { id: 'tbl_3', number: '3', name: 'Table 3', spaceId: 'sp_salle', capacity: 4, status: 'occupied', posX: 100, posY: 200, shape: 'square' },
      { id: 'tbl_4', number: '4', name: 'Table 4', spaceId: 'sp_salle', capacity: 4, status: 'available', posX: 220, posY: 200, shape: 'square' },
      { id: 'tbl_5', number: '5', name: 'Grande Table 5', spaceId: 'sp_salle', capacity: 6, status: 'reserved', posX: 360, posY: 140, shape: 'rectangle' },
      
      { id: 'tbl_7', number: '7', name: 'Table 7 (Terrasse)', spaceId: 'sp_terrasse', capacity: 2, status: 'occupied', posX: 100, posY: 90, shape: 'circle' },
      { id: 'tbl_8', number: '8', name: 'Table 8 (Terrasse)', spaceId: 'sp_terrasse', capacity: 4, status: 'available', posX: 220, posY: 90, shape: 'square' },
      { id: 'tbl_9', number: '9', name: 'Table 9 (Terrasse)', spaceId: 'sp_terrasse', capacity: 4, status: 'available', posX: 340, posY: 90, shape: 'square' },

      { id: 'tbl_12', number: '12', name: 'Club Lounge A', spaceId: 'sp_lounge', capacity: 4, status: 'available', posX: 120, posY: 100, shape: 'square' },
      { id: 'tbl_14', number: '14', name: 'Comptoir Bar 1', spaceId: 'sp_lounge', capacity: 2, status: 'available', posX: 280, posY: 100, shape: 'circle' },
      { id: 'tbl_15', number: '15', name: 'Mezzanine 1', spaceId: 'sp_mezzanine', capacity: 4, status: 'available', posX: 150, posY: 120, shape: 'rectangle' }
    ];

    const categories: Category[] = [
      { id: 'cat_coffee', name: 'Cafés Spécialité', slug: 'cafes', icon: 'Coffee', order: 1, color: '#4A3319', active: true },
      { id: 'cat_signature', name: 'Boissons Signatures', slug: 'signatures', icon: 'Sparkles', order: 2, color: '#2B422F', active: true },
      { id: 'cat_cold', name: 'Cold Brew & Glacés', slug: 'cold-drinks', icon: 'Snowflake', order: 3, color: '#3A5A60', active: true },
      { id: 'cat_tea', name: 'Thés & Infusions Bio', slug: 'thes', icon: 'Leaf', order: 4, color: '#5A7545', active: true },
      { id: 'cat_bakery', name: 'Pâtisseries & Viennoiseries', slug: 'patisseries', icon: 'CakeSlice', order: 5, color: '#C5A059', active: true },
      { id: 'cat_savory', name: 'Brunch & Toast Salé', slug: 'sale', icon: 'Utensils', order: 6, color: '#8A5338', active: true }
    ];

    const suppliers: Supplier[] = [
      {
        id: 'sup_terres_cafe',
        name: 'Torréfaction Terres de Café',
        contactPerson: 'Antoine Netien',
        email: 'commandes@terresdecafe.com',
        phone: '+33 1 42 33 00 11',
        address: '14 Rue Rambuteau, 75003 Paris',
        taxNumber: 'FR78945612300',
        category: 'coffee_beans',
        paymentTerms: '30 jours fin de mois',
        active: true,
        notes: 'Fournisseur exclusif de grains de spécialité Yirgacheffe & Bourbon Rouge.',
        createdAt: '2025-01-01T00:00:00Z'
      },
      {
        id: 'sup_laiterie_normande',
        name: 'Laiterie Bio de Normandie',
        contactPerson: 'Marc Vasseur',
        email: 'contact@laiterie-bio-normandie.fr',
        phone: '+33 2 31 44 55 66',
        address: 'Route des Prés, 14000 Caen',
        taxNumber: 'FR12345678901',
        category: 'dairy',
        paymentTerms: 'Virement à réception',
        active: true,
        notes: 'Lait entier microfiltré et boisson avoine barista Oatly.',
        createdAt: '2025-01-01T00:00:00Z'
      },
      {
        id: 'sup_moulins_viron',
        name: 'Moulins Viron & Pâtisserie Fine',
        contactPerson: 'Hélène Viron',
        email: 'ventes@moulinsviron.com',
        phone: '+33 1 45 67 89 10',
        address: 'Zone Artisanale, 77000 Melun',
        category: 'bakery',
        paymentTerms: '15 jours',
        active: true,
        notes: 'Farines bio T65, beurre AOP Charentes-Poitou et viennoiseries pur beurre.',
        createdAt: '2025-01-01T00:00:00Z'
      }
    ];

    const ingredients: Ingredient[] = [
      { id: 'ing_ethiopia_beans', name: 'Grains Éthiopie Yirgacheffe (Bio)', unit: 'kg', stockByZone: { reserve_principale: 9.5, depot: 5.0 }, currentStock: 14.5, minStockThreshold: 5.0, targetStock: 20, costPerUnit: 24.5, supplierId: 'sup_terres_cafe', category: 'coffee', imageUrl: 'https://images.unsplash.com/photo-1587734195503-904fca47e0e9?w=400&auto=format&fit=crop&q=80', trackLots: true, updatedAt: '2025-08-30T10:00:00Z' },
      { id: 'ing_colombia_beans', name: 'Grains Colombie Supremo Huila', unit: 'kg', stockByZone: { reserve_principale: 10.0, depot: 8.0 }, currentStock: 18.0, minStockThreshold: 6.0, targetStock: 24, costPerUnit: 19.8, supplierId: 'sup_terres_cafe', category: 'coffee', imageUrl: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&auto=format&fit=crop&q=80', trackLots: true, updatedAt: '2025-08-30T10:00:00Z' },
      { id: 'ing_whole_milk', name: 'Lait Entier Bio Microfiltré', unit: 'L', stockByZone: { reserve_principale: 15.0, depot: 20.0 }, currentStock: 35.0, minStockThreshold: 15.0, targetStock: 40, costPerUnit: 1.45, supplierId: 'sup_laiterie_normande', category: 'milk_dairy', imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&auto=format&fit=crop&q=80', trackLots: true, expiryAlertLeadDays: 3, updatedAt: '2025-08-30T10:00:00Z' },
      { id: 'ing_oat_milk', name: 'Boisson Avoine Oatly Barista', unit: 'L', stockByZone: { reserve_principale: 12.0, depot: 10.0 }, currentStock: 22.0, minStockThreshold: 10.0, targetStock: 25, costPerUnit: 2.10, supplierId: 'sup_laiterie_normande', category: 'milk_dairy', imageUrl: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400&auto=format&fit=crop&q=80', trackLots: true, expiryAlertLeadDays: 7, updatedAt: '2025-08-30T10:00:00Z' },
      { id: 'ing_madagascar_vanilla', name: 'Sirop Vanille Bourbon Artisanale', unit: 'cl', stockByZone: { reserve_principale: 80, depot: 100 }, currentStock: 180, minStockThreshold: 50, targetStock: 200, costPerUnit: 0.12, category: 'syrup', imageUrl: 'https://images.unsplash.com/photo-1598514982205-f36b96d1e8d4?w=400&auto=format&fit=crop&q=80', updatedAt: '2025-08-30T10:00:00Z' },
      { id: 'ing_caramel_salted', name: 'Caramel Beurre Salé Guérande', unit: 'g', stockByZone: { reserve_principale: 1500, depot: 1000 }, currentStock: 2500, minStockThreshold: 800, targetStock: 3000, costPerUnit: 0.018, category: 'syrup', imageUrl: 'https://images.unsplash.com/photo-1589733955941-5eeaf752f6dd?w=400&auto=format&fit=crop&q=80', updatedAt: '2025-08-30T10:00:00Z' },
      { id: 'ing_matcha_uji', name: 'Matcha Cérémonial Uji Kyoto', unit: 'g', stockByZone: { reserve_principale: 250, depot: 200 }, currentStock: 450, minStockThreshold: 150, targetStock: 500, costPerUnit: 0.28, category: 'beverage', imageUrl: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=400&auto=format&fit=crop&q=80', updatedAt: '2025-08-30T10:00:00Z' },
      { id: 'ing_croissant_dough', name: 'Croissants Pur Beurre Surgelés AOP', unit: 'unit', stockByZone: { reserve_principale: 28, depot: 20 }, currentStock: 48, minStockThreshold: 20, targetStock: 60, costPerUnit: 0.65, supplierId: 'sup_moulins_viron', category: 'bakery', imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&auto=format&fit=crop&q=80', trackLots: true, expiryAlertLeadDays: 10, updatedAt: '2025-08-30T10:00:00Z' },
      { id: 'ing_cookie_chocolate', name: 'Pâte Cookie Chocolat Fleur de Sel', unit: 'unit', stockByZone: { reserve_principale: 20, depot: 16 }, currentStock: 36, minStockThreshold: 15, targetStock: 40, costPerUnit: 0.95, category: 'bakery', imageUrl: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=400&auto=format&fit=crop&q=80', updatedAt: '2025-08-30T10:00:00Z' },
      { id: 'ing_avocado_fresh', name: 'Avocats Hass Mûrs à Point', unit: 'unit', stockByZone: { reserve_principale: 12, depot: 0 }, currentStock: 12, minStockThreshold: 10, targetStock: 20, costPerUnit: 1.10, category: 'fresh', imageUrl: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=400&auto=format&fit=crop&q=80', trackLots: true, expiryAlertLeadDays: 2, updatedAt: '2025-08-30T10:00:00Z' },
      { id: 'ing_sourdough_bread', name: 'Pain de Campagne Levain Naturel', unit: 'unit', stockByZone: { reserve_principale: 8, depot: 0 }, currentStock: 8, minStockThreshold: 4, targetStock: 12, costPerUnit: 3.20, category: 'fresh', imageUrl: 'https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?w=400&auto=format&fit=crop&q=80', trackLots: true, expiryAlertLeadDays: 1, updatedAt: '2025-08-30T10:00:00Z' }
    ];

    const recipes: TechnicalRecipe[] = [
      {
        id: 'rec_espresso',
        productId: 'prod_espresso',
        productName: 'Espresso Single Origin',
        portionYield: 1,
        preparationTimeMinutes: 1,
        ingredients: [
          {
            ingredientId: 'ing_ethiopia_beans',
            ingredientName: 'Grains Éthiopie Yirgacheffe (Bio)',
            quantityMin: 18,
            recipeUnit: 'g',
            quantity: 0.018,
            unit: 'kg',
            unitCost: 24.5,
            totalCost: 0.441,
            displayQuantity: '≈18 g'
          }
        ],
        totalIngredientsCost: 0.44,
        suggestedSellingPrice: 2.80,
        targetMarginPercentage: 84.2,
        allergens: [],
        preparationSteps: [
          'Moudre 18.0g de café avec distribution WDT',
          'Tasser à 15kg avec tamper nivelant',
          'Extraction 27 secondes pour 36g en tasse à 93°C'
        ],
        updatedAt: '2025-08-30T10:00:00Z'
      },
      {
        id: 'rec_flat_white',
        productId: 'prod_flat_white',
        productName: 'Flat White Velouté',
        portionYield: 1,
        preparationTimeMinutes: 3,
        ingredients: [
          {
            ingredientId: 'ing_ethiopia_beans',
            ingredientName: 'Grains Éthiopie Yirgacheffe (Bio)',
            quantityMin: 18,
            recipeUnit: 'g',
            quantity: 0.018,
            unit: 'kg',
            unitCost: 24.5,
            totalCost: 0.441,
            displayQuantity: '≈18 g'
          },
          {
            ingredientId: 'ing_whole_milk',
            ingredientName: 'Lait Entier Bio Microfiltré',
            quantityMin: 150,
            quantityMax: 160,
            recipeUnit: 'ml',
            quantity: 0.16,
            unit: 'L',
            unitCost: 1.45,
            totalCost: 0.232,
            displayQuantity: '≈150–160 mL'
          }
        ],
        totalIngredientsCost: 0.67,
        suggestedSellingPrice: 5.20,
        targetMarginPercentage: 87.1,
        allergens: ['Lait / Lactose'],
        preparationSteps: [
          'Extraire un double ristretto (18g in / 30g out)',
          'Texturer le lait à 60°C avec micro-mousse soyeuse',
          'Verser avec motif Latte Art tulipe ou rosette'
        ],
        updatedAt: '2025-08-30T10:00:00Z'
      },
      {
        id: 'rec_iced_latte_noir',
        productId: 'prod_iced_latte_noir',
        productName: 'Iced Latte Vanille Noire',
        portionYield: 1,
        preparationTimeMinutes: 3,
        ingredients: [
          {
            ingredientId: 'ing_colombia_beans',
            ingredientName: 'Grains Colombie Supremo Huila',
            quantityMin: 19,
            recipeUnit: 'g',
            quantity: 0.019,
            unit: 'kg',
            unitCost: 19.8,
            totalCost: 0.376,
            displayQuantity: '≈19 g'
          },
          {
            ingredientId: 'ing_oat_milk',
            ingredientName: 'Boisson Avoine Oatly Barista',
            quantityMin: 160,
            quantityMax: 180,
            recipeUnit: 'ml',
            quantity: 0.18,
            unit: 'L',
            unitCost: 2.10,
            totalCost: 0.378,
            displayQuantity: '≈160–180 mL'
          },
          {
            ingredientId: 'ing_madagascar_vanilla',
            ingredientName: 'Sirop Vanille Bourbon Artisanale',
            quantityMin: 2,
            recipeUnit: 'cl',
            quantity: 2,
            unit: 'cl',
            unitCost: 0.12,
            totalCost: 0.240,
            displayQuantity: '≈2 cL'
          }
        ],
        totalIngredientsCost: 0.99,
        suggestedSellingPrice: 6.50,
        targetMarginPercentage: 84.7,
        allergens: ['Avoine / Gluten'],
        preparationSteps: [
          'Ajouter 2cl de sirop vanille au fond du verre haut',
          'Remplir de glaçons pleins et verser 180ml de lait avoine',
          'Faire couler doucement le double espresso sur le dessus (effet étagé)'
        ],
        updatedAt: '2025-08-30T10:00:00Z'
      }
    ];

    const products: Product[] = [
      {
        id: 'prod_espresso',
        name: 'Espresso Single Origin',
        categoryId: 'cat_coffee',
        description: 'Éthiopie Yirgacheffe, notes d’agrumes bergamote et jasmin.',
        price: 2.80,
        tvaRate: 10,
        imageUrl: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=400&auto=format&fit=crop&q=80',
        available: true,
        isPopular: true,
        hasRecipe: true,
        options: [
          {
            id: 'opt_origin',
            name: 'Origine du Grain',
            type: 'single',
            choices: [
              { id: 'ch_ethiopia', name: 'Éthiopie Yirgacheffe (Floral)', priceModifier: 0 },
              { id: 'ch_colombia', name: 'Colombie Huila (Chocolaté)', priceModifier: 0 }
            ]
          }
        ],
        preparationStation: 'bar',
        createdAt: '2025-01-01T00:00:00Z'
      },
      {
        id: 'prod_flat_white',
        name: 'Flat White Velouté',
        categoryId: 'cat_coffee',
        description: 'Double ristretto intense et micro-mousse soyeuse de lait bio.',
        price: 5.20,
        tvaRate: 10,
        imageUrl: 'https://images.unsplash.com/photo-1577968897966-3d4325b36b61?w=400&auto=format&fit=crop&q=80',
        available: true,
        isPopular: true,
        hasRecipe: true,
        options: [
          {
            id: 'opt_milk',
            name: 'Choix du Lait',
            type: 'single',
            choices: [
              { id: 'ch_cow', name: 'Lait Entier Bio', priceModifier: 0 },
              { id: 'ch_oat', name: 'Lait d’Avoine Barista (+0.600 DT)', priceModifier: 0.60 }
            ]
          },
          {
            id: 'opt_extra_shot',
            name: 'Extra Shot',
            type: 'single',
            choices: [
              { id: 'ch_no_extra', name: 'Standard (Double)', priceModifier: 0 },
              { id: 'ch_yes_extra', name: 'Triple Shot (+1.000 DT)', priceModifier: 1.00 }
            ]
          }
        ],
        preparationStation: 'bar',
        createdAt: '2025-01-01T00:00:00Z'
      },
      {
        id: 'prod_iced_latte_noir',
        name: 'Iced Latte Vanille Noire',
        categoryId: 'cat_signature',
        description: 'Double espresso sur lit de lait d’avoine glacé et vanille de Madagascar.',
        price: 6.50,
        tvaRate: 10,
        imageUrl: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=400&auto=format&fit=crop&q=80',
        available: true,
        isSpecialty: true,
        isPopular: true,
        hasRecipe: true,
        options: [
          {
            id: 'opt_sweetness',
            name: 'Degré de Sucrosité',
            type: 'single',
            choices: [
              { id: 'ch_normal', name: 'Normal (2cl Vanille)', priceModifier: 0 },
              { id: 'ch_less', name: 'Léger (1cl Vanille)', priceModifier: 0 },
              { id: 'ch_none', name: 'Sans Sucre', priceModifier: 0 }
            ]
          }
        ],
        preparationStation: 'bar',
        createdAt: '2025-01-01T00:00:00Z'
      },
      {
        id: 'prod_matcha_latte',
        name: 'Matcha Cérémonial Uji',
        categoryId: 'cat_signature',
        description: 'Pur matcha japonais biologique fouetté au chasen et lait d’avoine émulsionné.',
        price: 6.00,
        tvaRate: 10,
        imageUrl: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=400&auto=format&fit=crop&q=80',
        available: true,
        isSpecialty: true,
        hasRecipe: false,
        options: [
          {
            id: 'opt_temp',
            name: 'Température',
            type: 'single',
            choices: [
              { id: 'ch_hot', name: 'Chaud réconfortant', priceModifier: 0 },
              { id: 'ch_iced', name: 'Glacé frappé', priceModifier: 0.30 }
            ]
          }
        ],
        preparationStation: 'bar',
        createdAt: '2025-01-01T00:00:00Z'
      },
      {
        id: 'prod_croissant_aop',
        name: 'Croissant Pur Beurre AOP',
        categoryId: 'cat_bakery',
        description: 'Feuilletage croustillant doré au four chaque matin, beurre de Charentes.',
        price: 2.20,
        tvaRate: 10,
        imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&auto=format&fit=crop&q=80',
        available: true,
        isPopular: true,
        hasRecipe: false,
        options: [],
        preparationStation: 'counter',
        createdAt: '2025-01-01T00:00:00Z'
      },
      {
        id: 'prod_avocado_toast',
        name: 'Avocado Toast & Dukkah',
        categoryId: 'cat_savory',
        description: 'Pain au levain grillé, écrasé d’avocat citronné, mélange d’épices dukkah et grenade.',
        price: 11.50,
        tvaRate: 10,
        imageUrl: 'https://images.unsplash.com/photo-1588137378633-dea1336ce1e2?w=400&auto=format&fit=crop&q=80',
        available: true,
        isPopular: true,
        hasRecipe: false,
        options: [
          {
            id: 'opt_poached_egg',
            name: 'Option Œuf Bio',
            type: 'single',
            choices: [
              { id: 'ch_no_egg', name: 'Sans œuf', priceModifier: 0 },
              { id: 'ch_egg', name: 'Œuf Parfait Mollet (+2.000 DT)', priceModifier: 2.00 }
            ]
          }
        ],
        preparationStation: 'kitchen',
        createdAt: '2025-01-01T00:00:00Z'
      }
    ];

    const orders: Order[] = [
      {
        id: 'ord_1001',
        orderNumber: 'CMD-1001',
        source: 'qr_table',
        tableId: 'tbl_7',
        tableNumber: '7',
        spaceName: 'Terrasse Extérieure',
        sessionId: 'sess_tbl7_live',
        customerName: 'Claire B.',
        items: [
          {
            id: 'item_1',
            productId: 'prod_flat_white',
            productName: 'Flat White Velouté',
            unitPrice: 5.80,
            quantity: 2,
            options: [{ optionName: 'Choix du Lait', choiceName: 'Lait d’Avoine Barista (+0.600 DT)', priceModifier: 0.60 }],
            station: 'bar',
            totalPrice: 11.60,
            status: 'pending'
          },
          {
            id: 'item_2',
            productId: 'prod_croissant_aop',
            productName: 'Croissant Pur Beurre AOP',
            unitPrice: 2.20,
            quantity: 2,
            options: [],
            station: 'counter',
            totalPrice: 4.40,
            status: 'pending'
          }
        ],
        subtotal: 14.55,
        tvaAmount: 1.45,
        discountAmount: 0,
        total: 16.00,
        status: 'pending_approval',
        paymentStatus: 'unpaid',
        specialNotes: 'Bien chaud svp, nous sommes en terrasse',
        stockDeducted: false,
        createdAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 3 * 60 * 1000).toISOString()
      },
      {
        id: 'ord_1000',
        orderNumber: 'CMD-1000',
        source: 'pos',
        tableId: 'tbl_3',
        tableNumber: '3',
        spaceName: 'Salle Principale',
        serverUserId: 'usr_server',
        serverUserName: 'Sophie Dubois',
        items: [
          {
            id: 'item_3',
            productId: 'prod_avocado_toast',
            productName: 'Avocado Toast & Dukkah',
            unitPrice: 13.50,
            quantity: 1,
            options: [{ optionName: 'Option Œuf Bio', choiceName: 'Œuf Parfait Mollet (+2.000 DT)', priceModifier: 2.00 }],
            station: 'kitchen',
            totalPrice: 13.50,
            status: 'preparing'
          },
          {
            id: 'item_4',
            productId: 'prod_iced_latte_noir',
            productName: 'Iced Latte Vanille Noire',
            unitPrice: 6.50,
            quantity: 1,
            options: [{ optionName: 'Degré de Sucrosité', choiceName: 'Normal (2cl Vanille)', priceModifier: 0 }],
            station: 'bar',
            totalPrice: 6.50,
            status: 'ready'
          }
        ],
        subtotal: 18.18,
        tvaAmount: 1.82,
        discountAmount: 0,
        total: 20.00,
        status: 'preparing',
        paymentStatus: 'unpaid',
        stockDeducted: true,
        createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString()
      }
    ];

    const sales: Sale[] = [
      {
        id: 'sal_501',
        saleNumber: 'VNT-2025-0501',
        tableNumber: '1',
        subtotal: 10.91,
        tvaBreakdown: [{ rate: 10, base: 10.91, tax: 1.09 }],
        totalTva: 1.09,
        discount: 0,
        totalAmount: 12.00,
        paymentMethod: 'contactless',
        cashierId: 'usr_manager',
        cashierName: 'Camille Laurent',
        itemsSummary: [
          { name: 'Flat White Velouté', quantity: 2, total: 10.40 },
          { name: 'Espresso Single Origin', quantity: 1, total: 2.80 }
        ],
        createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString()
      },
      {
        id: 'sal_502',
        saleNumber: 'VNT-2025-0502',
        tableNumber: 'Emporter',
        subtotal: 23.64,
        tvaBreakdown: [{ rate: 10, base: 23.64, tax: 2.36 }],
        totalTva: 2.36,
        discount: 0,
        totalAmount: 26.00,
        paymentMethod: 'card',
        cashierId: 'usr_admin',
        cashierName: 'Adam Mansour',
        itemsSummary: [
          { name: 'Avocado Toast & Dukkah', quantity: 2, total: 23.00 },
          { name: 'Croissant Pur Beurre AOP', quantity: 1, total: 2.20 }
        ],
        createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString()
      }
    ];

    const stockMovements: StockMovement[] = [
      {
        id: 'sm_1',
        ingredientId: 'ing_ethiopia_beans',
        ingredientName: 'Grains Éthiopie Yirgacheffe (Bio)',
        type: 'in_reception',
        zone: 'depot',
        quantity: 10,
        unit: 'kg',
        previousStock: 0,
        newStock: 5.0,
        unitCost: 24.5,
        totalValue: 245.0,
        origin: 'Terres de Café (fournisseur)',
        destination: 'Dépôt',
        referenceDoc: 'FAC-2025-081',
        reason: 'Livraison hebdomadaire café vert torréfié',
        performedBy: 'Adam Mansour',
        createdAt: '2025-08-29T14:30:00Z'
      }
    ];

    const stockLots: StockLot[] = [
      {
        id: 'lot_milk_1',
        ingredientId: 'ing_whole_milk',
        ingredientName: 'Lait Entier Bio Microfiltré',
        zone: 'reserve_principale',
        lotNumber: 'LOT-LAIT-0830',
        expirationDate: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
        quantity: 15.0,
        unit: 'L',
        status: 'active',
        receivedBy: 'Adam Mansour',
        createdAt: '2025-08-30T08:00:00Z'
      }
    ];

    const expenses: Expense[] = [
      {
        id: 'exp_1',
        expenseNumber: 'DEP-2025-01',
        category: 'rent',
        title: 'Loyer Commercial Août 2025',
        amount: 2800.0,
        tvaAmount: 0,
        date: `${todayStr}`,
        paymentMethod: 'bank_transfer',
        paymentStatus: 'paid',
        approvedBy: 'Adam Mansour',
        createdAt: new Date().toISOString()
      },
      {
        id: 'exp_2',
        expenseNumber: 'DEP-2025-02',
        category: 'utilities',
        title: 'Facture Électricité & Climatisation',
        amount: 420.50,
        tvaAmount: 84.10,
        date: `${todayStr}`,
        paymentMethod: 'direct_debit',
        paymentStatus: 'paid',
        approvedBy: 'Adam Mansour',
        createdAt: new Date().toISOString()
      }
    ];

    const shifts: Shift[] = [
      {
        id: 'sh_1',
        employeeId: 'usr_barista',
        employeeName: 'Lucas Morel',
        role: 'Barista Principal',
        date: todayStr,
        startTime: '07:30',
        endTime: '15:30',
        breakMinutes: 30,
        status: 'in_progress',
        notes: 'Ouverture du bar et calibration moulin espresso'
      },
      {
        id: 'sh_2',
        employeeId: 'usr_server',
        employeeName: 'Sophie Dubois',
        role: 'Service Salle & Terrasse',
        date: todayStr,
        startTime: '10:00',
        endTime: '18:00',
        breakMinutes: 45,
        status: 'in_progress',
        notes: 'Service midi & gestion commandes QR terrasse'
      }
    ];

    const attendances: AttendanceRecord[] = [
      {
        id: 'att_1',
        employeeId: 'usr_barista',
        employeeName: 'Lucas Morel',
        date: todayStr,
        clockInTime: `${todayStr}T07:28:00Z`,
        breakMinutes: 30,
        totalHoursWorked: 5.5,
        status: 'active'
      },
      {
        id: 'att_2',
        employeeId: 'usr_server',
        employeeName: 'Sophie Dubois',
        date: todayStr,
        clockInTime: `${todayStr}T09:55:00Z`,
        breakMinutes: 0,
        totalHoursWorked: 3.0,
        status: 'active'
      }
    ];

    const leaves: LeaveRequest[] = [];
    const payrolls: PayrollRecord[] = [];

    const alerts: SystemAlert[] = [
      {
        id: 'alt_qr_1001',
        type: 'new_qr_order',
        title: 'Nouvelle Commande QR - Table 7',
        message: '2x Flat White Velouté + 2x Croissant Pur Beurre (16.000 DT) en attente d’acceptation.',
        severity: 'warning',
        read: false,
        linkUrl: '/orders',
        metadata: { orderId: 'ord_1001', tableNumber: '7' },
        createdAt: new Date(Date.now() - 3 * 60 * 1000).toISOString()
      },
      {
        id: 'alt_stock_1',
        type: 'low_stock',
        title: 'Seuil Critique Stock : Pain de Campagne',
        message: 'Stock actuel: 8 unités (Seuil minimal: 4 unités). Réapprovisionnement suggéré.',
        severity: 'info',
        read: false,
        linkUrl: '/stock',
        createdAt: new Date(Date.now() - 120 * 60 * 1000).toISOString()
      }
    ];

    const journal: JournalEntry[] = [
      {
        id: 'jrn_init',
        action: 'Démarrage Système',
        category: 'admin',
        details: 'Initialisation de la base de données opérationnelle Café Noir Système.',
        performedBy: 'Système',
        createdAt: new Date().toISOString()
      },
      {
        id: 'jrn_order_qr',
        action: 'Commande QR Reçue',
        category: 'orders',
        details: 'Commande CMD-1001 soumise depuis le QR code de la Table 7.',
        performedBy: 'Client QR (Table 7)',
        createdAt: new Date(Date.now() - 3 * 60 * 1000).toISOString()
      }
    ];

    const cashRegisters: CashRegisterSession[] = [
      {
        id: 'reg_today',
        cashierId: 'usr_admin',
        cashierName: 'Adam Mansour',
        openedAt: `${todayStr}T07:15:00Z`,
        openingCash: 250.00,
        expectedClosingCash: 250.00,
        totalSalesCash: 0,
        totalSalesCard: 38.00,
        totalSalesOther: 0,
        totalSalesAmount: 38.00,
        status: 'open',
        notes: 'Fond de caisse vérifié le matin'
      }
    ];

    return {
      users,
      spaces,
      tables,
      planElements: this.getSeedPlanElements(),
      reservations: this.getSeedReservations(),
      categories,
      ingredients,
      recipes,
      products,
      orders,
      sales,
      stockMovements,
      stockWastes: [],
      inventoryAudits: [],
      stockLots,
      suppliers,
      purchaseOrders: [],
      supplierInvoices: [],
      productLabelMappings: [],
      expenses,
      shifts,
      attendances,
      leaves,
      payrolls,
      alerts,
      journal,
      cashRegisters,
      cashMovements: []
    };
  }
}

export const db = new DatabaseEngine();
