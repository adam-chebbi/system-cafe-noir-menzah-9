import { db } from '../db/database.js';
import { Expense } from '../types/index.js';

export class ExpenseService {
  public static getExpenses(): Expense[] {
    const expenses = db.get('expenses') || [];
    return expenses.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  }

  public static createExpense(data: Omit<Expense, 'id' | 'expenseNumber' | 'createdAt'>, performedBy: string): Expense {
    const expenses = db.get('expenses') || [];
    const expenseNumber = `DEP-${new Date().getFullYear()}-${String(expenses.length + 1).padStart(3, '0')}`;
    const newExpense: Expense = {
      ...data,
      id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      expenseNumber,
      createdAt: new Date().toISOString()
    };
    expenses.unshift(newExpense);
    db.set('expenses', expenses);
    db.logAudit('Enregistrement Dépense', 'finance', `Dépense ${expenseNumber} (${newExpense.title} - ${newExpense.amount.toFixed(3)} DT)`, performedBy);
    return newExpense;
  }

  public static updateExpense(id: string, updates: Partial<Expense>, performedBy: string): Expense {
    const expenses = db.get('expenses') || [];
    const idx = expenses.findIndex(e => e && e.id === id);
    if (idx === -1) throw new Error('Dépense non trouvée');
    expenses[idx] = { ...expenses[idx], ...updates };
    db.set('expenses', expenses);
    db.logAudit('Mise à jour Dépense', 'finance', `Modification dépense ${expenses[idx].expenseNumber}`, performedBy);
    return expenses[idx];
  }

  public static deleteExpense(id: string, performedBy: string): void {
    const expenses = db.get('expenses') || [];
    const exp = expenses.find(e => e && e.id === id);
    if (!exp) throw new Error('Dépense non trouvée');
    db.set('expenses', expenses.filter(e => e && e.id !== id));
    db.logAudit('Suppression Dépense', 'finance', `Suppression de la dépense ${exp.expenseNumber}`, performedBy);
  }
}
