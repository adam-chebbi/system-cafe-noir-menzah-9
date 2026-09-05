import { db } from '../db/database.js';
import { Expense, ExpenseCategory } from '../types/index.js';
import { summarizeChanges } from '../utils/audit.js';

const EXPENSE_TRACKED_FIELDS = [
  { key: 'title', label: 'Intitulé' },
  { key: 'amount', label: 'Montant', format: (v: number) => `${v.toFixed(3)} DT` },
  { key: 'category', label: 'Catégorie' },
  { key: 'paymentStatus', label: 'Statut', format: (v: string) => (v === 'paid' ? 'Payée' : 'En attente') }
];

export class ExpenseService {
  public static getExpenses(): Expense[] {
    const expenses = db.get('expenses') || [];
    return expenses.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  }

  /**
   * Numérotation basée sur le plus grand numéro déjà attribué cette année (jamais sur la longueur du
   * tableau) : une suppression n'entraîne donc jamais de doublon de numéro par la suite.
   */
  public static nextExpenseNumber(expenses: Expense[]): string {
    const year = new Date().getFullYear();
    const prefix = `DEP-${year}-`;
    let maxSeq = 0;
    for (const e of expenses) {
      if (e.expenseNumber && e.expenseNumber.startsWith(prefix)) {
        const seq = parseInt(e.expenseNumber.slice(prefix.length), 10);
        if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
      }
    }
    return `${prefix}${String(maxSeq + 1).padStart(3, '0')}`;
  }

  public static createExpense(data: Omit<Expense, 'id' | 'expenseNumber' | 'createdAt' | 'approvedBy'>, performedBy: string): Expense {
    const expenses = db.get('expenses') || [];
    const expenseNumber = this.nextExpenseNumber(expenses);

    const newExpense: Expense = {
      ...data,
      id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      expenseNumber,
      approvedBy: performedBy,
      createdAt: new Date().toISOString()
    };

    // Une dépense marquée récurrente sans groupe (nouvelle récurrence) reçoit un identifiant de
    // groupe stable, réutilisé par chaque renouvellement manuel ultérieur (voir §recurrenceGroupId).
    if (newExpense.isRecurring && !newExpense.recurrenceGroupId) {
      newExpense.recurrenceGroupId = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    }
    if (newExpense.isRecurring && newExpense.recurrenceActive === undefined) {
      newExpense.recurrenceActive = true;
    }

    expenses.unshift(newExpense);
    db.set('expenses', expenses);
    db.logAudit('Enregistrement Dépense', 'finance', `Dépense ${expenseNumber} (${newExpense.title} - ${newExpense.amount.toFixed(3)} DT)`, performedBy);
    return newExpense;
  }

  public static updateExpense(id: string, updates: Partial<Expense>, performedBy: string): Expense {
    const expenses = db.get('expenses') || [];
    const idx = expenses.findIndex(e => e && e.id === id);
    if (idx === -1) throw new Error('Dépense non trouvée');
    const before = expenses[idx];
    expenses[idx] = { ...before, ...updates };
    db.set('expenses', expenses);
    const changes = summarizeChanges(before, expenses[idx], EXPENSE_TRACKED_FIELDS);
    db.logAudit('Mise à jour Dépense', 'finance', `Modification dépense ${expenses[idx].expenseNumber}`, performedBy, changes);
    return expenses[idx];
  }

  public static deleteExpense(id: string, performedBy: string): void {
    const expenses = db.get('expenses') || [];
    const exp = expenses.find(e => e && e.id === id);
    if (!exp) throw new Error('Dépense non trouvée');
    db.set('expenses', expenses.filter(e => e && e.id !== id));
    db.logAudit('Suppression Dépense', 'finance', `Suppression de la dépense ${exp.expenseNumber}`, performedBy);
  }

  // ── Catégories de dépenses (adaptables par l'administrateur) ──

  public static getExpenseCategories(): ExpenseCategory[] {
    return db.get('expenseCategories') || [];
  }

  public static createExpenseCategory(name: string, performedBy: string): ExpenseCategory {
    const trimmed = (name || '').trim();
    if (!trimmed) throw new Error('Le nom de la catégorie est requis.');

    const categories = db.get('expenseCategories') || [];
    if (categories.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) {
      throw new Error(`La catégorie "${trimmed}" existe déjà.`);
    }

    const created: ExpenseCategory = {
      id: `expcat_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: trimmed,
      active: true,
      createdBy: performedBy,
      createdAt: new Date().toISOString()
    };
    categories.push(created);
    db.set('expenseCategories', categories);
    db.logAudit('Création Catégorie Dépense', 'finance', `Nouvelle catégorie de dépense : ${trimmed}`, performedBy);
    return created;
  }

  public static updateExpenseCategory(id: string, updates: { name?: string; active?: boolean }, performedBy: string): ExpenseCategory {
    const categories = db.get('expenseCategories') || [];
    const idx = categories.findIndex(c => c.id === id);
    if (idx === -1) throw new Error('Catégorie non trouvée');

    if (updates.name !== undefined) {
      const trimmed = updates.name.trim();
      if (!trimmed) throw new Error('Le nom de la catégorie est requis.');
      if (categories.some(c => c.id !== id && c.name.toLowerCase() === trimmed.toLowerCase())) {
        throw new Error(`La catégorie "${trimmed}" existe déjà.`);
      }
      updates = { ...updates, name: trimmed };
    }

    categories[idx] = { ...categories[idx], ...updates };
    db.set('expenseCategories', categories);
    db.logAudit('Modification Catégorie Dépense', 'finance', `Catégorie "${categories[idx].name}" modifiée`, performedBy);
    return categories[idx];
  }

  /** Supprime définitivement une catégorie inutilisée ; sinon, invite à la désactiver pour préserver l'historique. */
  public static deleteExpenseCategory(id: string, performedBy: string): void {
    const categories = db.get('expenseCategories') || [];
    const cat = categories.find(c => c.id === id);
    if (!cat) throw new Error('Catégorie non trouvée');

    const expenses = db.get('expenses') || [];
    const usageCount = expenses.filter(e => e.category === id).length;
    if (usageCount > 0) {
      throw new Error(`Impossible de supprimer : ${usageCount} dépense(s) utilisent encore "${cat.name}". Désactivez-la plutôt pour la retirer des nouvelles saisies tout en gardant l'historique.`);
    }

    db.set('expenseCategories', categories.filter(c => c.id !== id));
    db.logAudit('Suppression Catégorie Dépense', 'finance', `Suppression de la catégorie "${cat.name}"`, performedBy);
  }
}
