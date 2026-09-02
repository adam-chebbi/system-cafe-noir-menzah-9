import { db } from '../db/database.js';
import QRCode from 'qrcode';
import { Space, Table, Reservation, PlanElement, TableHistoryItem } from '../types/index.js';

export class TableService {
  // -------------------------------------------------------------
  // SPACES
  // -------------------------------------------------------------
  public static getSpaces(): Space[] {
    return db.get('spaces').sort((a, b) => a.order - b.order);
  }

  public static createSpace(data: Omit<Space, 'id'>, performedBy: string): Space {
    const spaces = db.get('spaces');
    const newSpace: Space = {
      ...data,
      id: `sp_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      order: data.order || (spaces.length + 1)
    };
    spaces.push(newSpace);
    db.set('spaces', spaces);
    db.logAudit('Création Espace', 'tables', `Ajout de l'espace ${newSpace.name}`, performedBy);
    return newSpace;
  }

  public static updateSpace(id: string, updates: Partial<Space>, performedBy: string): Space {
    const spaces = db.get('spaces');
    const idx = spaces.findIndex(s => s.id === id);
    if (idx === -1) throw new Error('Espace non trouvé');
    spaces[idx] = { ...spaces[idx], ...updates };
    db.set('spaces', spaces);
    db.logAudit('Mise à jour Espace', 'tables', `Modification de l'espace ${spaces[idx].name}`, performedBy);
    return spaces[idx];
  }

  public static deleteSpace(id: string, performedBy: string): void {
    const spaces = db.get('spaces') || [];
    const tables = db.get('tables') || [];
    const planElements = db.get('planElements') || [];

    const space = spaces.find(s => s && s.id === id);
    if (!space) throw new Error('Espace non trouvé');

    const spaceTables = tables.filter(t => t && t.spaceId === id);
    if (spaceTables.some(t => t && (t.status === 'occupied' || t.status === 'billing'))) {
      throw new Error('Impossible de supprimer un espace contenant des tables actives ou occupées.');
    }

    // Remove tables and elements associated with this space
    db.set('tables', tables.filter(t => t && t.spaceId !== id));
    db.set('planElements', planElements.filter(pe => pe && pe.spaceId !== id));
    db.set('spaces', spaces.filter(s => s && s.id !== id));

    db.logAudit('Suppression Espace', 'tables', `Suppression de l'espace ${space.name} et de ses tables`, performedBy);
  }

  public static reorderSpaces(orderedIds: string[], performedBy: string): Space[] {
    const spaces = db.get('spaces');
    orderedIds.forEach((id, index) => {
      const sp = spaces.find(s => s.id === id);
      if (sp) sp.order = index + 1;
    });
    db.set('spaces', spaces);
    db.logAudit('Réorganisation Espaces', 'tables', 'Réorganisation de l\'ordre des espaces', performedBy);
    return spaces.sort((a, b) => a.order - b.order);
  }

  // -------------------------------------------------------------
  // TABLES
  // -------------------------------------------------------------
  public static async getTables(): Promise<Table[]> {
    const tables = db.get('tables');
    const orders = db.get('orders');
    const appUrl = process.env.APP_URL || '';

    let modified = false;
    for (const table of tables) {
      if (!table.qrCodeUrl) {
        const qrPayload = `${appUrl}/#qr-table-${table.id}`;
        try {
          table.qrCodeUrl = await QRCode.toDataURL(qrPayload, {
            margin: 2,
            width: 300,
            color: { dark: '#1E231F', light: '#FFFFFF' }
          });
          modified = true;
        } catch (err) {
          console.error(`Failed to generate QR for table ${table.number}:`, err);
        }
      }

      // Check if table has an active pending/accepted order and align currentOrderId
      const activeOrder = orders.find(
        o => o.tableId === table.id && 
        (o.status === 'accepted' || o.status === 'preparing' || o.status === 'ready' || o.status === 'served' || o.status === 'pending_approval')
      );

      if (activeOrder && table.currentOrderId !== activeOrder.id) {
        table.currentOrderId = activeOrder.id;
        if (activeOrder.status === 'pending_approval' && table.status === 'available') {
          table.status = 'waiting';
        } else if (activeOrder.status !== 'pending_approval' && table.status === 'available') {
          table.status = 'occupied';
        }
        modified = true;
      }
    }

    if (modified) {
      db.set('tables', tables);
    }

    return tables;
  }

  public static async createTable(data: Omit<Table, 'id' | 'qrCodeUrl'>, performedBy: string): Promise<Table> {
    const tables = db.get('tables');
    const id = `tbl_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const appUrl = process.env.APP_URL || '';
    const qrPayload = `${appUrl}/#qr-table-${id}`;

    const qrCodeUrl = await QRCode.toDataURL(qrPayload, {
      margin: 2,
      width: 300,
      color: { dark: '#1E231F', light: '#FFFFFF' }
    });

    const newTable: Table = {
      ...data,
      id,
      qrCodeUrl,
      shape: data.shape || 'circle',
      status: data.status || 'available',
      capacity: Number(data.capacity) || 2,
      posX: data.posX ?? 100,
      posY: data.posY ?? 100,
      width: data.width,
      height: data.height,
      rotation: data.rotation || 0,
      notes: data.notes || ''
    };
    tables.push(newTable);
    db.set('tables', tables);
    db.logAudit('Création Table', 'tables', `Ajout de ${newTable.name} (Capacité: ${newTable.capacity}, Forme: ${newTable.shape})`, performedBy);
    return newTable;
  }

  public static async duplicateTable(tableId: string, performedBy: string): Promise<Table> {
    const tables = db.get('tables');
    const source = tables.find(t => t.id === tableId);
    if (!source) throw new Error('Table source non trouvée');

    // Determine next unique number
    let nextNum = parseInt(source.number, 10);
    if (isNaN(nextNum)) {
      nextNum = tables.length + 1;
    } else {
      while (tables.some(t => t.number === String(nextNum + 1))) {
        nextNum++;
      }
      nextNum++;
    }

    const newNumStr = String(nextNum);
    const newName = `Table ${newNumStr}`;

    const newTableData: Omit<Table, 'id' | 'qrCodeUrl'> = {
      number: newNumStr,
      name: newName,
      spaceId: source.spaceId,
      capacity: source.capacity,
      status: 'available',
      posX: Math.min(600, source.posX + 40),
      posY: Math.min(500, source.posY + 40),
      shape: source.shape,
      width: source.width,
      height: source.height,
      rotation: source.rotation || 0,
      notes: source.notes ? `Copie de ${source.name} - ${source.notes}` : ''
    };

    return this.createTable(newTableData, performedBy);
  }

  public static updateTable(id: string, updates: Partial<Table>, performedBy: string): Table {
    const tables = db.get('tables');
    const idx = tables.findIndex(t => t.id === id);
    if (idx === -1) throw new Error('Table non trouvée');

    const prev = tables[idx];
    tables[idx] = { ...tables[idx], ...updates };
    db.set('tables', tables);

    const detailLog = updates.status && updates.status !== prev.status
      ? `Statut de ${tables[idx].name} : ${prev.status} ➔ ${updates.status}`
      : `Modification de ${tables[idx].name}`;

    db.logAudit('Mise à jour Table', 'tables', detailLog, performedBy, { tableId: id, updates });
    return tables[idx];
  }

  public static deleteTable(id: string, performedBy: string): void {
    const tables = db.get('tables') || [];
    const tbl = tables.find(t => t && t.id === id);
    if (!tbl) throw new Error('Table non trouvée');
    if (tbl.status === 'occupied' || tbl.status === 'billing') {
      throw new Error('Impossible de supprimer une table occupée ou en cours d\'encaissement.');
    }
    db.set('tables', tables.filter(t => t && t.id !== id));
    db.logAudit('Suppression Table', 'tables', `Suppression définitive de ${tbl.name}`, performedBy);
  }

  public static updatePositions(positions: { id: string; posX: number; posY: number; rotation?: number }[], performedBy: string): void {
    const tables = db.get('tables');
    for (const pos of positions) {
      const idx = tables.findIndex(t => t.id === pos.id);
      if (idx !== -1) {
        tables[idx].posX = pos.posX;
        tables[idx].posY = pos.posY;
        if (pos.rotation !== undefined) tables[idx].rotation = pos.rotation;
      }
    }
    db.set('tables', tables);
    db.logAudit('Plan de Salle', 'tables', `Mise à jour des positions de ${positions.length} table(s)`, performedBy);
  }

  // -------------------------------------------------------------
  // PLAN ELEMENTS (WALLS, DOORS, PLANTS, COUNTERS, ETC.)
  // -------------------------------------------------------------
  public static getPlanElements(spaceId?: string): PlanElement[] {
    const elements = db.get('planElements') || [];
    if (spaceId) {
      return elements.filter(pe => pe.spaceId === spaceId);
    }
    return elements;
  }

  public static createPlanElement(data: Omit<PlanElement, 'id'>, performedBy: string): PlanElement {
    const elements = db.get('planElements') || [];
    const newElement: PlanElement = {
      ...data,
      id: `pe_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      posX: data.posX ?? 50,
      posY: data.posY ?? 50,
      width: data.width || 60,
      height: data.height || 30,
      rotation: data.rotation || 0
    };
    elements.push(newElement);
    db.set('planElements', elements);
    db.logAudit('Élément de Plan', 'tables', `Ajout de l'élément [${newElement.type}] ${newElement.label || ''}`, performedBy);
    return newElement;
  }

  public static updatePlanElement(id: string, updates: Partial<PlanElement>, performedBy: string): PlanElement {
    const elements = db.get('planElements') || [];
    const idx = elements.findIndex(pe => pe.id === id);
    if (idx === -1) throw new Error('Élément de plan non trouvé');

    elements[idx] = { ...elements[idx], ...updates };
    db.set('planElements', elements);
    db.logAudit('Mise à jour Élément Plan', 'tables', `Modification de l'élément [${elements[idx].type}]`, performedBy);
    return elements[idx];
  }

  public static deletePlanElement(id: string, performedBy: string): void {
    const elements = db.get('planElements') || [];
    const target = elements.find(pe => pe && pe.id === id);
    if (!target) throw new Error('Élément de plan non trouvé');

    db.set('planElements', elements.filter(pe => pe && pe.id !== id));
    db.logAudit('Suppression Élément Plan', 'tables', `Suppression de l'élément [${target.type}] ${target.label || ''}`, performedBy);
  }

  public static updatePlanElementPositions(positions: { id: string; posX: number; posY: number; rotation?: number; width?: number; height?: number }[], performedBy: string): void {
    const elements = db.get('planElements') || [];
    for (const pos of positions) {
      const idx = elements.findIndex(pe => pe.id === pos.id);
      if (idx !== -1) {
        elements[idx].posX = pos.posX;
        elements[idx].posY = pos.posY;
        if (pos.rotation !== undefined) elements[idx].rotation = pos.rotation;
        if (pos.width !== undefined) elements[idx].width = pos.width;
        if (pos.height !== undefined) elements[idx].height = pos.height;
      }
    }
    db.set('planElements', elements);
    db.logAudit('Plan de Salle', 'tables', `Mise à jour des positions de ${positions.length} élément(s) de décor`, performedBy);
  }

  // -------------------------------------------------------------
  // TABLE HISTORY TIMELINE AGGREGATION
  // -------------------------------------------------------------
  public static getTableHistory(tableId?: string): TableHistoryItem[] {
    const tables = db.get('tables');
    const journal = db.get('journal') || [];
    const orders = db.get('orders') || [];
    const sales = db.get('sales') || [];
    const reservations = db.get('reservations') || [];

    const historyItems: TableHistoryItem[] = [];

    // 1. Audit journal entries related to tables or orders on this table
    for (const entry of journal) {
      if (tableId) {
        const isMatch = (entry.metadata && entry.metadata.tableId === tableId) ||
          entry.details.includes(`Table ${tables.find(t => t.id === tableId)?.number || '??'}`) ||
          entry.details.includes(tableId);
        if (!isMatch) continue;
      }

      let category: TableHistoryItem['category'] = 'status_change';
      if (entry.category === 'sales') category = 'sale';
      else if (entry.action.toLowerCase().includes('qr')) category = 'qr_order';
      else if (entry.action.toLowerCase().includes('commande')) category = 'order';
      else if (entry.action.toLowerCase().includes('réserv')) category = 'reservation';
      else if (entry.action.toLowerCase().includes('plan')) category = 'movement';

      const matchedTbl = tables.find(t => entry.metadata?.tableId === t.id || entry.details.includes(`Table ${t.number}`));

      historyItems.push({
        id: `th_${entry.id}`,
        tableId: matchedTbl?.id || tableId || '',
        tableNumber: matchedTbl?.number || (tableId ? tables.find(t => t.id === tableId)?.number || '' : 'Général'),
        action: entry.action,
        category,
        details: entry.details,
        performedBy: entry.performedBy,
        timestamp: entry.createdAt,
        metadata: entry.metadata
      });
    }

    // 2. Orders on this table
    for (const order of orders) {
      if (tableId && order.tableId !== tableId) continue;
      if (!order.tableId) continue;

      historyItems.push({
        id: `tho_${order.id}`,
        tableId: order.tableId,
        tableNumber: order.tableNumber || '',
        action: order.source === 'qr_table' ? 'Commande QR Client' : 'Commande Serveur POS',
        category: order.source === 'qr_table' ? 'qr_order' : 'order',
        details: `${order.orderNumber} - ${order.items.length} article(s) (${order.items.map(i => `${i.quantity}x ${i.productName}`).join(', ')}) - Statut: ${order.status}`,
        performedBy: order.serverUserName || order.customerName,
        amount: order.total,
        timestamp: order.createdAt,
        metadata: { orderId: order.id, status: order.status, total: order.total }
      });
    }

    // 3. Sales on this table
    for (const sale of sales) {
      const order = orders.find(o => o.id === sale.orderId);
      const targetTableId = order?.tableId;
      if (tableId && targetTableId !== tableId) continue;

      historyItems.push({
        id: `ths_${sale.id}`,
        tableId: targetTableId || tableId || '',
        tableNumber: sale.tableNumber || '',
        action: 'Encaissement & Paiement',
        category: 'sale',
        details: `Vente ${sale.saleNumber} - Montant: ${sale.totalAmount.toFixed(3)} DT (${sale.paymentMethod})`,
        performedBy: sale.cashierName,
        amount: sale.totalAmount,
        timestamp: sale.createdAt,
        metadata: { saleId: sale.id, paymentMethod: sale.paymentMethod }
      });
    }

    // 4. Reservations on this table
    for (const res of reservations) {
      if (tableId && res.tableId !== tableId) continue;

      const tbl = tables.find(t => t.id === res.tableId);
      historyItems.push({
        id: `thr_${res.id}`,
        tableId: res.tableId,
        tableNumber: tbl?.number || '',
        action: 'Réservation Client',
        category: 'reservation',
        details: `Réservation pour ${res.customerName} (${res.guestsCount} pers.) le ${res.reservationDate} à ${res.reservationTime} - Statut: ${res.status}`,
        performedBy: 'Administration',
        timestamp: res.createdAt,
        metadata: { reservationId: res.id, date: res.reservationDate, time: res.reservationTime }
      });
    }

    // Deduplicate and sort by timestamp descending
    const seen = new Set<string>();
    const uniqueHistory: TableHistoryItem[] = [];

    for (const item of historyItems) {
      const key = `${item.action}_${item.details}_${item.timestamp}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueHistory.push(item);
      }
    }

    return uniqueHistory.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // -------------------------------------------------------------
  // RESERVATIONS (ADMIN-ONLY INTERNAL SYSTEM)
  // -------------------------------------------------------------
  public static getReservations(): Reservation[] {
    return db.get('reservations').sort((a, b) => {
      const dateA = new Date(`${a.reservationDate}T${a.reservationTime}`).getTime();
      const dateB = new Date(`${b.reservationDate}T${b.reservationTime}`).getTime();
      return dateA - dateB;
    });
  }

  public static checkConflict(tableId: string, reservationDate: string, reservationTime: string, excludeReservationId?: string): { hasConflict: boolean; conflictingReservation?: Reservation } {
    const reservations = db.get('reservations');
    
    // Parse target time into minutes of day
    const [tHour, tMin] = reservationTime.split(':').map(Number);
    const targetMinutes = tHour * 60 + tMin;

    for (const res of reservations) {
      if (excludeReservationId && res.id === excludeReservationId) continue;
      if (res.tableId !== tableId) continue;
      if (res.reservationDate !== reservationDate) continue;
      if (res.status === 'cancelled' || res.status === 'completed') continue;

      const [rHour, rMin] = res.reservationTime.split(':').map(Number);
      const resMinutes = rHour * 60 + rMin;

      // Assume standard 90 minute dining window conflict
      if (Math.abs(targetMinutes - resMinutes) < 90) {
        return { hasConflict: true, conflictingReservation: res };
      }
    }

    return { hasConflict: false };
  }

  public static createReservation(data: Omit<Reservation, 'id' | 'createdAt'>, performedBy: string): Reservation {
    const reservations = db.get('reservations');
    const tables = db.get('tables');

    // Check for conflict
    const conflict = this.checkConflict(data.tableId, data.reservationDate, data.reservationTime);
    if (conflict.hasConflict && conflict.conflictingReservation) {
      throw new Error(`Conflit de réservation: la table est déjà réservée par ${conflict.conflictingReservation.customerName} à ${conflict.conflictingReservation.reservationTime}`);
    }

    const table = tables.find(t => t.id === data.tableId);

    const res: Reservation = {
      ...data,
      id: `res_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      spaceId: table?.spaceId || data.spaceId,
      createdAt: new Date().toISOString()
    };

    reservations.unshift(res);
    db.set('reservations', reservations);

    // If reservation is for today and confirmed, mark table as reserved if available
    const today = new Date().toISOString().split('T')[0];
    if (res.reservationDate === today && res.status === 'confirmed') {
      if (table && table.status === 'available') {
        table.status = 'reserved';
        db.set('tables', tables);
      }
    }

    db.logAudit('Réservation Créée', 'tables', `Réservation pour ${res.customerName} (${res.guestsCount} pers.) - Table ${table?.number || ''} le ${res.reservationDate} à ${res.reservationTime}`, performedBy, { reservationId: res.id, tableId: res.tableId });
    return res;
  }

  public static updateReservation(id: string, updates: Partial<Reservation>, performedBy: string): Reservation {
    const reservations = db.get('reservations');
    const tables = db.get('tables');
    const idx = reservations.findIndex(r => r.id === id);
    if (idx === -1) throw new Error('Réservation non trouvée');

    const prev = reservations[idx];

    // If changing table, date, or time, check conflict
    const targetTableId = updates.tableId || prev.tableId;
    const targetDate = updates.reservationDate || prev.reservationDate;
    const targetTime = updates.reservationTime || prev.reservationTime;

    if (
      (updates.tableId && updates.tableId !== prev.tableId) ||
      (updates.reservationDate && updates.reservationDate !== prev.reservationDate) ||
      (updates.reservationTime && updates.reservationTime !== prev.reservationTime)
    ) {
      const conflict = this.checkConflict(targetTableId, targetDate, targetTime, id);
      if (conflict.hasConflict && conflict.conflictingReservation) {
        throw new Error(`Conflit de réservation: la table est déjà réservée par ${conflict.conflictingReservation.customerName} à ${conflict.conflictingReservation.reservationTime}`);
      }
    }

    reservations[idx] = { ...reservations[idx], ...updates };
    const current = reservations[idx];

    // Handle status transitions:
    // If status became 'seated', mark table as 'occupied'
    const table = tables.find(t => t.id === current.tableId);
    if (table) {
      if (updates.status === 'seated') {
        table.status = 'occupied';
        db.set('tables', tables);
      } else if (updates.status === 'completed' || updates.status === 'cancelled') {
        if (table.status === 'reserved') {
          table.status = 'available';
          db.set('tables', tables);
        }
      }
    }

    db.set('reservations', reservations);
    db.logAudit('Mise à jour Réservation', 'tables', `Réservation ${current.customerName} (${current.reservationDate}) ➔ ${current.status}`, performedBy, { reservationId: id });
    return current;
  }

  public static deleteReservation(id: string, performedBy: string): void {
    const reservations = db.get('reservations') || [];
    const target = reservations.find(r => r && r.id === id);
    if (!target) throw new Error('Réservation non trouvée');

    // Free table if was reserved
    const tables = db.get('tables') || [];
    const tbl = tables.find(t => t && t.id === target.tableId);
    if (tbl && tbl.status === 'reserved') {
      tbl.status = 'available';
      db.set('tables', tables);
    }

    db.set('reservations', reservations.filter(r => r && r.id !== id));
    db.logAudit('Suppression Réservation', 'tables', `Suppression de la réservation de ${target.customerName}`, performedBy);
  }
}

