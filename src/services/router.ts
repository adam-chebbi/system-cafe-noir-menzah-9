import { ViewMode } from '../types';

export interface RouteState {
  view: ViewMode;
  subTab?: string | null;
  action?: string | null;
  id?: string | null;
  tableId?: string | null;
}

// Canonical view mapping from URL parameter to ViewMode
const VIEW_PARAM_MAP: Record<string, ViewMode> = {
  dashboard: 'dashboard',
  pos: 'pos',
  orders: 'orders',
  kds: 'orders',
  tables: 'tables',
  reservations: 'tables',
  products: 'products',
  catalog: 'products',
  categories: 'products',
  ingredients: 'products',
  recipes: 'products',
  csv_import: 'products',
  stock: 'stock',
  stock_movements: 'stock',
  stock_wastes: 'stock',
  inventory_audit: 'stock',
  suppliers: 'suppliers',
  purchase_orders: 'suppliers',
  supplier_invoices: 'suppliers',
  ocr_invoice: 'suppliers',
  hr: 'hr',
  employees: 'hr',
  attendance: 'hr',
  planning: 'hr',
  shifts: 'hr',
  leaves: 'hr',
  payroll: 'hr',
  performance: 'hr',
  expenses: 'expenses',
  charges: 'expenses',
  reports: 'reports',
  finance: 'reports',
  journal: 'journal',
  logs: 'journal',
  alerts: 'journal',
  public: 'public_website',
  public_site: 'public_website',
  public_website: 'public_website',
  qr_order: 'qr_customer_order',
  qr_customer_order: 'qr_customer_order'
};

// Aliases mapping legacy or specific views to corresponding canonical view + subTab
const VIEW_ALIAS_DEFAULTS: Partial<Record<ViewMode, { view: ViewMode; subTab?: string; action?: string }>> = {
  reservations: { view: 'tables', subTab: 'reservations' },
  categories: { view: 'products', subTab: 'categories' },
  recipes: { view: 'products', subTab: 'recipes' },
  csv_import: { view: 'products', action: 'csv_modal' },
  stock_movements: { view: 'stock', subTab: 'movements' },
  stock_wastes: { view: 'stock', subTab: 'wastes' },
  inventory_audit: { view: 'stock', subTab: 'inventory' },
  purchase_orders: { view: 'suppliers', subTab: 'orders' },
  supplier_invoices: { view: 'suppliers', subTab: 'invoices' },
  ocr_invoice: { view: 'suppliers', action: 'ocr_modal' },
  employees: { view: 'hr', subTab: 'team' },
  attendance: { view: 'hr', subTab: 'attendance' },
  planning: { view: 'hr', subTab: 'shifts' },
  leaves: { view: 'hr', subTab: 'leaves' },
  payroll: { view: 'hr', subTab: 'payroll' },
  performance: { view: 'hr', subTab: 'performance' },
  alerts: { view: 'journal', subTab: 'admin' },
  public_site: { view: 'public_website' }
};

/**
 * Parses the current window.location (search + hash) into a normalized RouteState.
 * Supports query parameters (?view=...&tab=...&action=...&id=...)
 * while maintaining 100% backward compatibility with legacy hashes:
 * - #qr-table-<id>
 * - #qr-order?table=<id>
 * - #public / #public-site
 * - ?table=<id>
 */
export function parseCurrentUrl(): RouteState {
  if (typeof window === 'undefined') {
    return { view: 'dashboard' };
  }

  const searchParams = new URLSearchParams(window.location.search);
  const hash = window.location.hash || '';

  // 1. Backward Compatibility: Legacy QR table hash formats (#qr-table-xyz or #qr-order?table=xyz)
  if (hash.startsWith('#qr-table-')) {
    const tableId = hash.replace('#qr-table-', '').trim();
    return {
      view: 'qr_customer_order',
      tableId: tableId || null,
      id: tableId || null
    };
  }

  if (hash.startsWith('#qr-order')) {
    const hashQuery = hash.split('?')[1] || '';
    const hashParams = new URLSearchParams(hashQuery);
    const tableId = hashParams.get('table') || null;
    return {
      view: 'qr_customer_order',
      tableId,
      id: tableId
    };
  }

  // 2. Backward Compatibility: Legacy public site hashes (#public, #public-site)
  if (hash === '#public' || hash === '#public-site') {
    return { view: 'public_website' };
  }

  // 3. Backward Compatibility: Direct ?table=xyz parameter
  const rawTableParam = searchParams.get('table');
  const rawViewParam = searchParams.get('view') || searchParams.get('module');

  if (!rawViewParam && rawTableParam) {
    return {
      view: 'qr_customer_order',
      tableId: rawTableParam,
      id: rawTableParam
    };
  }

  // 4. Canonical Query Parameters parsing
  const mappedView = rawViewParam ? VIEW_PARAM_MAP[rawViewParam.toLowerCase()] || 'dashboard' : 'dashboard';
  const subTab = searchParams.get('tab') || searchParams.get('subTab') || null;
  const action = searchParams.get('action') || null;
  const id = searchParams.get('id') || null;
  const tableId = searchParams.get('table') || null;

  return {
    view: mappedView,
    subTab,
    action,
    id,
    tableId: tableId || (mappedView === 'qr_customer_order' ? id : null)
  };
}

/**
 * Builds a clean canonical query string URL from RouteState parameters.
 * Does not include empty or null parameters.
 */
export function buildUrl(state: Partial<RouteState>, fullOrigin = false): string {
  const params = new URLSearchParams();

  let targetView = state.view || 'dashboard';
  let targetSubTab = state.subTab;
  let targetAction = state.action;

  // If the view is an alias, normalize to canonical view + subTab
  if (VIEW_ALIAS_DEFAULTS[targetView]) {
    const def = VIEW_ALIAS_DEFAULTS[targetView]!;
    targetView = def.view;
    if (!targetSubTab && def.subTab) targetSubTab = def.subTab;
    if (!targetAction && def.action) targetAction = def.action;
  }

  // Canonical param name for view
  if (targetView === 'public_website') {
    params.set('view', 'public');
  } else if (targetView === 'qr_customer_order') {
    params.set('view', 'qr_order');
  } else if (targetView !== 'dashboard' || targetSubTab || targetAction || state.id) {
    params.set('view', targetView);
  }

  if (targetSubTab) {
    params.set('tab', targetSubTab);
  }

  if (targetAction) {
    params.set('action', targetAction);
  }

  if (state.id) {
    params.set('id', state.id);
  }

  if (state.tableId) {
    params.set('table', state.tableId);
  }

  const queryString = params.toString();
  const path = queryString ? `/?${queryString}` : '/';

  if (fullOrigin && typeof window !== 'undefined') {
    return `${window.location.origin}${path}`;
  }

  return path;
}

/**
 * Updates the browser URL history without reloading the page.
 */
export function pushRoute(state: RouteState): void {
  if (typeof window === 'undefined') return;
  const newUrl = buildUrl(state);
  const currentPath = `${window.location.pathname}${window.location.search}`;

  if (newUrl !== currentPath) {
    window.history.pushState(state, '', newUrl);
  }
}

/**
 * Replaces the current browser history entry without reloading the page.
 */
export function replaceRoute(state: RouteState): void {
  if (typeof window === 'undefined') return;
  const newUrl = buildUrl(state);
  window.history.replaceState(state, '', newUrl);
}

/**
 * Copies a functional deep-link to the clipboard with robust fallbacks.
 */
export async function copyLinkToClipboard(state: Partial<RouteState>): Promise<boolean> {
  const fullUrl = buildUrl(state, true);
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(fullUrl);
      return true;
    } else {
      // Fallback for non-https / localhost environments
      const textArea = document.createElement('textarea');
      textArea.value = fullUrl;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    }
  } catch (err) {
    console.error('Failed to copy URL to clipboard:', err);
    return false;
  }
}
