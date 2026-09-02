import { db } from '../db/database.js';
import { Sale, CashRegisterSession, CashMovement, ClosingRegisterPayload, StockMovement, Expense } from '../types/index.js';

export class SalesService {
  public static getSales(filter?: {
    search?: string;
    paymentMethod?: string;
    cashierId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Sale[] {
    let sales = db.get('sales') || [];

    if (filter?.search) {
      const q = filter.search.toLowerCase();
      sales = sales.filter(s =>
        (s.saleNumber && s.saleNumber.toLowerCase().includes(q)) ||
        (s.cashierName && s.cashierName.toLowerCase().includes(q)) ||
        (s.tableNumber && s.tableNumber.toLowerCase().includes(q)) ||
        (s.itemsSummary && s.itemsSummary.some(i => i.name && i.name.toLowerCase().includes(q)))
      );
    }

    if (filter?.paymentMethod && filter.paymentMethod !== 'all') {
      sales = sales.filter(s => s.paymentMethod === filter.paymentMethod);
    }

    if (filter?.cashierId && filter.cashierId !== 'all') {
      sales = sales.filter(s => s.cashierId === filter.cashierId);
    }

    if (filter?.startDate) {
      sales = sales.filter(s => new Date(s.createdAt) >= new Date(filter.startDate!));
    }

    if (filter?.endDate) {
      const end = new Date(filter.endDate);
      end.setHours(23, 59, 59, 999);
      sales = sales.filter(s => new Date(s.createdAt) <= end);
    }

    sales.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (filter?.limit && filter.limit > 0) {
      sales = sales.slice(0, filter.limit);
    }

    return sales;
  }

  public static getSaleById(id: string): Sale | undefined {
    return (db.get('sales') || []).find(s => s.id === id);
  }

  /**
   * Manual Sales Entry (Double-validated sales from external POS or past period)
   */
  public static createManualSale(data: {
    createdAt?: string;
    tableNumber?: string;
    items: {
      productId?: string;
      productName: string;
      unitPrice: number;
      quantity: number;
      tvaRate?: number;
    }[];
    discount?: number;
    discountReason?: string;
    paymentMethod: 'cash' | 'card' | 'contactless' | 'qr_pay' | 'voucher' | 'split';
    splitDetails?: { method: string; amount: number }[];
    amountReceived?: number;
    changeGiven?: number;
    cashierId: string;
    cashierName: string;
    notes?: string;
    source?: 'manual' | 'import';
  }): Sale {
    const sales = db.get('sales') || [];
    const products = db.get('products') || [];
    const registers = db.get('cashRegisters') || [];

    if (!data.items || data.items.length === 0) {
      throw new Error('Au moins une ligne de produit est requise pour enregistrer une vente.');
    }

    let subtotal = 0;
    let totalTva = 0;
    const itemsSummary: { name: string; quantity: number; unitPrice?: number; total: number }[] = [];
    const tvaMap: Record<number, { base: number; tax: number }> = {};

    for (const item of data.items) {
      const product = item.productId ? products.find(p => p.id === item.productId) : null;
      const rate = item.tvaRate ?? (product ? product.tvaRate : 7);
      const unitPrice = item.unitPrice;
      const quantity = Math.max(1, item.quantity);
      const lineTotal = Number((unitPrice * quantity).toFixed(2));

      const base = Number((lineTotal / (1 + rate / 100)).toFixed(2));
      const tax = Number((lineTotal - base).toFixed(2));

      subtotal += base;
      totalTva += tax;

      if (!tvaMap[rate]) {
        tvaMap[rate] = { base: 0, tax: 0 };
      }
      tvaMap[rate].base += base;
      tvaMap[rate].tax += tax;

      itemsSummary.push({
        name: item.productName || (product ? product.name : 'Article divers'),
        quantity,
        unitPrice,
        total: lineTotal
      });
    }

    const discount = Math.max(0, data.discount || 0);
    const rawTotal = subtotal + totalTva;
    const totalAmount = Math.max(0, Number((rawTotal - discount).toFixed(2)));

    const tvaBreakdown = Object.keys(tvaMap).map(rateStr => {
      const rate = parseFloat(rateStr);
      return {
        rate,
        base: Number(tvaMap[rate].base.toFixed(2)),
        tax: Number(tvaMap[rate].tax.toFixed(2))
      };
    });

    const saleNumber = `VNT-MAN-${new Date().getFullYear()}-${String(sales.length + 1).padStart(4, '0')}`;
    const saleDate = data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString();

    const newSale: Sale = {
      id: `sal_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      saleNumber,
      tableNumber: data.tableNumber || 'Saisie manuelle',
      source: data.source || 'manual',
      subtotal: Number(subtotal.toFixed(2)),
      tvaBreakdown,
      totalTva: Number(totalTva.toFixed(2)),
      discount,
      totalAmount,
      paymentMethod: data.paymentMethod,
      splitDetails: data.splitDetails,
      amountReceived: data.amountReceived,
      changeGiven: data.changeGiven,
      cashierId: data.cashierId,
      cashierName: data.cashierName,
      notes: data.notes,
      itemsSummary,
      createdAt: saleDate
    };

    sales.unshift(newSale);
    db.set('sales', sales);

    // If sale date is today and cash register is active, update active register
    const isToday = new Date(saleDate).toDateString() === new Date().toDateString();
    const activeRegister = registers.find(r => r.status === 'open');
    if (activeRegister && isToday) {
      if (data.paymentMethod === 'cash') {
        activeRegister.totalSalesCash += totalAmount;
        activeRegister.expectedClosingCash += totalAmount;
      } else if (data.paymentMethod === 'card' || data.paymentMethod === 'contactless') {
        activeRegister.totalSalesCard += totalAmount;
      } else {
        activeRegister.totalSalesOther += totalAmount;
      }
      activeRegister.totalSalesAmount += totalAmount;
      db.set('cashRegisters', registers);
    }

    db.logAudit(
      'Saisie Manuelle Vente',
      'sales',
      `Vente manuelle ${saleNumber} (${totalAmount.toFixed(3)} DT - ${data.paymentMethod}) validée par ${data.cashierName}`,
      data.cashierName,
      { saleId: newSale.id }
    );

    return newSale;
  }

  /**
   * Import historical sales batch (from CSV)
   */
  public static importSalesBatch(
    salesList: {
      date?: string;
      tableNumber?: string;
      items: { productName: string; unitPrice: number; quantity: number; tvaRate?: number }[];
      paymentMethod?: string;
      cashierName?: string;
      notes?: string;
    }[],
    performedBy = 'Admin'
  ): { importedCount: number; totalAmount: number; errors: string[] } {
    let importedCount = 0;
    let totalAmount = 0;
    const errors: string[] = [];

    for (let i = 0; i < salesList.length; i++) {
      const row = salesList[i];
      try {
        if (!row.items || row.items.length === 0) {
          errors.push(`Ligne ${i + 1}: aucun article spécifié.`);
          continue;
        }

        const method = (['cash', 'card', 'contactless', 'qr_pay', 'voucher'].includes(row.paymentMethod || '')
          ? row.paymentMethod
          : 'card') as any;

        const sale = this.createManualSale({
          createdAt: row.date,
          tableNumber: row.tableNumber,
          items: row.items,
          paymentMethod: method,
          cashierId: 'usr_import',
          cashierName: row.cashierName || performedBy,
          notes: row.notes || 'Import CSV historique',
          source: 'import'
        });

        importedCount++;
        totalAmount += sale.totalAmount;
      } catch (err: any) {
        errors.push(`Ligne ${i + 1}: ${err.message}`);
      }
    }

    db.logAudit(
      'Import Ventes Historiques',
      'sales',
      `${importedCount} ventes historiques importées (${totalAmount.toFixed(3)} DT) par ${performedBy}`,
      performedBy
    );

    return { importedCount, totalAmount: Number(totalAmount.toFixed(2)), errors };
  }

  /**
   * Cancel or refund a sale with reason and audit log
   */
  public static cancelSale(saleId: string, reason: string, performedBy: string): Sale {
    const sales = db.get('sales') || [];
    const idx = sales.findIndex(s => s.id === saleId);
    if (idx === -1) throw new Error('Vente introuvable.');

    const sale = sales[idx];
    sale.notes = `[ANNULÉE le ${new Date().toLocaleDateString('fr-FR')} par ${performedBy} - Motif: ${reason}] ${sale.notes || ''}`;

    sales[idx] = sale;
    db.set('sales', sales);

    db.logAudit(
      'Annulation Vente',
      'sales',
      `Vente ${sale.saleNumber} (${sale.totalAmount.toFixed(3)} DT) annulée par ${performedBy}. Motif: ${reason}`,
      performedBy,
      { saleId }
    );

    return sale;
  }

  // -------------------------------------------------------------
  // CASH REGISTER SESSIONS & MOVEMENTS
  // -------------------------------------------------------------
  public static getActiveRegister(): CashRegisterSession | undefined {
    return (db.get('cashRegisters') || []).find(r => r.status === 'open');
  }

  public static getAllSessions(): CashRegisterSession[] {
    return (db.get('cashRegisters') || []).sort(
      (a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime()
    );
  }

  public static openRegister(cashierId: string, cashierName: string, openingCash: number): CashRegisterSession {
    const registers = db.get('cashRegisters') || [];
    const existing = registers.find(r => r.status === 'open');
    if (existing) {
      throw new Error('Une session de caisse est déjà ouverte.');
    }

    const session: CashRegisterSession = {
      id: `reg_${Date.now()}`,
      cashierId,
      cashierName,
      openedAt: new Date().toISOString(),
      openingCash,
      expectedClosingCash: openingCash,
      totalSalesCash: 0,
      totalSalesCard: 0,
      totalSalesOther: 0,
      totalSalesAmount: 0,
      totalDeposits: 0,
      totalWithdrawals: 0,
      totalExpenses: 0,
      movements: [],
      status: 'open'
    };

    registers.unshift(session);
    db.set('cashRegisters', registers);

    db.logAudit(
      'Ouverture Caisse',
      'finance',
      `Ouverture de caisse par ${cashierName} (Fond initial: ${openingCash.toFixed(3)} DT)`,
      cashierName
    );

    return session;
  }

  public static addCashMovement(
    sessionId: string,
    movementData: {
      type: 'deposit' | 'withdrawal' | 'expense';
      amount: number;
      reason: string;
      performedBy: string;
      notes?: string;
    }
  ): { session: CashRegisterSession; movement: CashMovement } {
    const registers = db.get('cashRegisters') || [];
    const movements = db.get('cashMovements') || [];

    const idx = registers.findIndex(r => r.id === sessionId);
    if (idx === -1) throw new Error('Session de caisse non trouvée.');

    const session = registers[idx];
    if (session.status === 'closed') {
      throw new Error('Impossible d\'ajouter un mouvement à une session clôturée.');
    }

    const amount = Number(parseFloat(String(movementData.amount)).toFixed(2));
    if (isNaN(amount) || amount <= 0) {
      throw new Error('Le montant du mouvement doit être strictement positif.');
    }

    const movement: CashMovement = {
      id: `mov_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      sessionId,
      type: movementData.type,
      amount,
      reason: movementData.reason,
      performedBy: movementData.performedBy,
      notes: movementData.notes,
      createdAt: new Date().toISOString()
    };

    movements.unshift(movement);
    db.set('cashMovements', movements);

    if (!session.movements) session.movements = [];
    session.movements.push(movement);

    if (movementData.type === 'deposit') {
      session.totalDeposits = Number(((session.totalDeposits || 0) + amount).toFixed(2));
      session.expectedClosingCash = Number((session.expectedClosingCash + amount).toFixed(2));
    } else if (movementData.type === 'withdrawal') {
      session.totalWithdrawals = Number(((session.totalWithdrawals || 0) + amount).toFixed(2));
      session.expectedClosingCash = Number((session.expectedClosingCash - amount).toFixed(2));
    } else if (movementData.type === 'expense') {
      session.totalExpenses = Number(((session.totalExpenses || 0) + amount).toFixed(2));
      session.expectedClosingCash = Number((session.expectedClosingCash - amount).toFixed(2));
    }

    registers[idx] = session;
    db.set('cashRegisters', registers);

    const typeLabels = {
      deposit: 'Apport de fond',
      withdrawal: 'Retrait d\'espèces',
      expense: 'Dépense directe / Caisse'
    };

    db.logAudit(
      `Mouvement Caisse (${typeLabels[movementData.type]})`,
      'finance',
      `${typeLabels[movementData.type]} de ${amount.toFixed(3)} DT par ${movementData.performedBy}. Motif: ${movementData.reason}`,
      movementData.performedBy,
      { movementId: movement.id }
    );

    return { session, movement };
  }

  public static closeRegister(
    sessionId: string,
    actualClosingCash: number,
    notes?: string,
    performedBy = 'Caissier',
    payload?: Partial<ClosingRegisterPayload>
  ): CashRegisterSession {
    const registers = db.get('cashRegisters') || [];
    const idx = registers.findIndex(r => r.id === sessionId);
    if (idx === -1) throw new Error('Session de caisse non trouvée.');

    const session = registers[idx];
    if (session.status === 'closed') throw new Error('La session est déjà clôturée.');

    // 1. Enregistrer les dépenses directes ajoutées lors de la clôture
    if (payload?.newExpenses && payload.newExpenses.length > 0) {
      const expenses = db.get('expenses') || [];
      const movements = db.get('cashMovements') || [];

      for (const expData of payload.newExpenses) {
        if (!expData.amount || expData.amount <= 0) continue;
        const expNumber = `DEP-${new Date().getFullYear()}-${String(expenses.length + 1).padStart(3, '0')}`;
        const newExpense: Expense = {
          id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          expenseNumber: expNumber,
          category: (expData.category as any) || 'supplies',
          title: expData.title || 'Dépense caisse de clôture',
          amount: Number(expData.amount.toFixed(3)),
          tvaAmount: 0,
          date: new Date().toISOString().split('T')[0],
          paymentMethod: 'cash',
          paymentStatus: 'paid',
          approvedBy: performedBy,
          createdAt: new Date().toISOString()
        };
        expenses.unshift(newExpense);

        // Mouvement de caisse correspondant
        const mov: CashMovement = {
          id: `mov_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          sessionId,
          type: 'expense',
          amount: newExpense.amount,
          reason: `Dépense clôture: ${newExpense.title}`,
          performedBy,
          createdAt: new Date().toISOString()
        };
        movements.unshift(mov);
        if (!session.movements) session.movements = [];
        session.movements.push(mov);

        session.totalExpenses = Number(((session.totalExpenses || 0) + newExpense.amount).toFixed(3));
        session.expectedClosingCash = Number((session.expectedClosingCash - newExpense.amount).toFixed(3));
      }
      db.set('expenses', expenses);
      db.set('cashMovements', movements);
    }

    // 2. Enregistrer les ajustements de stock sur les ingrédients vérifiés
    if (payload?.checkedStocks && payload.checkedStocks.length > 0) {
      const ingredients = db.get('ingredients') || [];
      const stockMovements = db.get('stockMovements') || [];

      for (const item of payload.checkedStocks) {
        const ingIndex = ingredients.findIndex(i => i.id === item.ingredientId);
        if (ingIndex !== -1) {
          const ing = ingredients[ingIndex];
          const previousStock = ing.currentStock;
          ing.currentStock = item.countedStock;
          ing.updatedAt = new Date().toISOString();

          if (item.difference !== 0) {
            const movement: StockMovement = {
              id: `sm_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
              ingredientId: ing.id,
              ingredientName: ing.name,
              type: 'adjustment_inventory',
              quantity: item.difference,
              unit: ing.unit,
              previousStock,
              newStock: item.countedStock,
              unitCost: ing.costPerUnit,
              totalValue: Math.abs(item.differenceValue),
              referenceDoc: `CLOTURE-${session.id}`,
              reason: `Contrôle stock clôture caisse ${session.cashierName}${item.notes ? ` : ${item.notes}` : ''}`,
              performedBy,
              createdAt: new Date().toISOString()
            };
            stockMovements.unshift(movement);
          }
        }
      }
      db.set('ingredients', ingredients);
      db.set('stockMovements', stockMovements);
    }

    // 3. Mettre à jour les totaux de clôture
    const finalActualCash = Number(actualClosingCash.toFixed(3));
    session.actualClosingCash = finalActualCash;
    session.cashDifference = Number((finalActualCash - session.expectedClosingCash).toFixed(3));
    session.closedAt = new Date().toISOString();
    session.status = 'closed';
    session.notes = notes || payload?.closingNotes;

    // 4. Enrichir la session avec les détails de fin de service tunisiens
    if (payload?.cashDenominations) {
      session.cashDenominations = payload.cashDenominations;
    }
    if (payload?.mealVouchers) {
      session.mealVouchers = payload.mealVouchers;
      session.totalVouchersCount = payload.totalVouchersCount || payload.mealVouchers.reduce((sum, v) => sum + v.count, 0);
      session.totalVouchersAmount = payload.totalVouchersAmount || payload.mealVouchers.reduce((sum, v) => sum + v.subtotal, 0);
    }
    if (payload?.checkedStocks) {
      session.checkedStocks = payload.checkedStocks;
    }
    if (payload?.justificationNotes) {
      session.justificationNotes = payload.justificationNotes;
    }

    registers[idx] = session;
    db.set('cashRegisters', registers);

    // 5. Journal d'audit complet
    const vouchersInfo = session.totalVouchersAmount ? ` + ${session.totalVouchersCount} Tickets Resto (${session.totalVouchersAmount.toFixed(3)} DT)` : '';
    const diffText = session.cashDifference !== 0 ? ` [Écart: ${session.cashDifference > 0 ? '+' : ''}${session.cashDifference.toFixed(3)} DT${session.justificationNotes ? ` - Motif: ${session.justificationNotes}` : ''}]` : ' [Écart: 0.000 DT (Parfait)]';

    db.logAudit(
      'Clôture Caisse (Z)',
      'finance',
      `Clôture Z par ${performedBy} (Espèces: ${session.actualClosingCash.toFixed(3)} DT / Attendu: ${session.expectedClosingCash.toFixed(3)} DT${vouchersInfo}${diffText})`,
      performedBy,
      { sessionId: session.id, cashDifference: session.cashDifference, checkedStocksCount: payload?.checkedStocks?.length || 0 }
    );

    return session;
  }
}

