import React, { useState, useEffect, useRef } from 'react';
import { useSystem } from '../../context/SystemContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Space, Table, Reservation, Order, PlanElement, TableStatus } from '../../types';
import { TableSummaryMetrics } from './TableSummaryMetrics';
import { TableFloorPlan } from './TableFloorPlan';
import { TableInspectorPanel } from './TableInspectorPanel';
import { TableListView } from './TableListView';
import { TableReservationsView } from './TableReservationsView';
import { TableHistoryView } from './TableHistoryView';
import { TableQRModal } from './TableQRModal';
import { SpaceManagerModal } from './SpaceManagerModal';
import { ReservationFormModal } from './ReservationFormModal';
import { TableEditModal } from './TableEditModal';
import { PendingQROrdersModal } from './PendingQROrdersModal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import {
  LayoutGrid,
  List,
  Calendar,
  Clock,
  Plus,
  QrCode,
  Layers,
  Sparkles,
  RefreshCw
} from 'lucide-react';

export const TablesView: React.FC = () => {
  const {
    globalVersion,
    triggerGlobalRefresh,
    setCurrentView,
    setActiveQrTableId,
    currentSubTab,
    setCurrentSubTab,
    currentAction,
    setCurrentAction,
    currentRecordId,
    setCurrentRecordId,
    showRouteNotification
  } = useSystem();
  const { currentUser } = useAuth();

  // Core Data States
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [planElements, setPlanElements] = useState<PlanElement[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const hasValidatedIdRef = useRef(false);

  // Active navigation & filters
  const [activeTab, setActiveTab] = useState<'plan' | 'list' | 'reservations' | 'history'>('plan');
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>('');
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [activeStatusFilter, setActiveStatusFilter] = useState<string>('all');

  // Modals
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [editingTableData, setEditingTableData] = useState<Partial<Table> | null>(null);

  const [isSpaceModalOpen, setIsSpaceModalOpen] = useState(false);

  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [editingReservationData, setEditingReservationData] = useState<Partial<Reservation> | null>(null);

  const [qrModalTable, setQrModalTable] = useState<Table | null>(null);
  const [isPendingOrdersModalOpen, setIsPendingOrdersModalOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });


  // Load all tables, spaces, plan elements, reservations, and orders
  const loadData = async () => {
    try {
      setLoading(true);
      const [sp, tb, pe, res, ords] = await Promise.all([
        api.getSpaces(),
        api.getTables(),
        api.getPlanElements(),
        api.getReservations(),
        api.getOrders()
      ]);

      setSpaces(sp);
      setTables(tb);
      setPlanElements(pe);
      setReservations(res);
      setOrders(ords);

      // Deep link ID handling
      if (currentRecordId) {
        const foundTable = tb.find(t => t.id === currentRecordId || t.number === currentRecordId);
        const foundRes = res.find(r => r.id === currentRecordId);

        if (foundTable) {
          setSelectedTableId(foundTable.id);
          setSelectedSpaceId(foundTable.spaceId);
        } else if (foundRes) {
          setActiveTab('reservations');
        } else if (!hasValidatedIdRef.current) {
          showRouteNotification(`La table ou réservation (ID: "${currentRecordId}") est introuvable.`, 'warning');
        }
        hasValidatedIdRef.current = true;
      } else {
        if (sp.length > 0 && !selectedSpaceId) {
          setSelectedSpaceId(sp[0].id);
        }
        if (tb.length > 0 && !selectedTableId) {
          setSelectedTableId(tb[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load tables management data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [globalVersion]);

  // Handle external navigation subTabs and actions
  useEffect(() => {
    if (currentSubTab === 'plan') setActiveTab('plan');
    else if (currentSubTab === 'list') setActiveTab('list');
    else if (currentSubTab === 'reservations') setActiveTab('reservations');
    else if (currentSubTab === 'history') setActiveTab('history');

    if (currentAction === 'new_table') {
      setEditingTableData({
        number: `${tables.length + 1}`,
        name: `Table ${tables.length + 1}`,
        capacity: 2,
        spaceId: selectedSpaceId || spaces[0]?.id || '',
        status: 'available',
        shape: 'square'
      });
      setIsTableModalOpen(true);
    } else if (currentAction === 'qr_modal' && tables.length > 0) {
      setQrModalTable(tables[0]);
    }
  }, [currentSubTab, currentAction]);

  // Pending QR Orders
  const pendingQrOrders = (orders || []).filter(o => o.status === 'pending_approval');

  // Active Space and Selected Table Objects
  const activeSpace = spaces.find(s => s.id === selectedSpaceId) || spaces[0];
  const selectedTable = tables.find(t => t.id === selectedTableId) || null;
  const selectedTableSpace = selectedTable ? spaces.find(s => s.id === selectedTable.spaceId) : undefined;

  // --- ACTIONS: TABLES ---
  const handleSaveTable = async (data: Partial<Table>) => {
    if (data.id) {
      await api.updateTable(data.id, data, currentUser?.name || 'Manager');
    } else {
      await api.createTable(data, currentUser?.name || 'Manager');
    }
    triggerGlobalRefresh();
    loadData();
  };

  const handleDuplicateTable = async (tableId: string) => {
    try {
      const duplicated = await api.duplicateTable(tableId, currentUser?.name || 'Manager');
      setSelectedTableId(duplicated.id);
      triggerGlobalRefresh();
      loadData();
    } catch (err) {
      console.error('Failed to duplicate table:', err);
    }
  };

  const handleDeleteTable = (tableId: string) => {
    const targetTable = tables.find(t => t.id === tableId);
    setConfirmDialog({
      isOpen: true,
      title: 'Supprimer la table',
      message: `Êtes-vous sûr de vouloir supprimer définitivement la table "${targetTable?.name || targetTable?.number || tableId}" ?`,
      onConfirm: async () => {
        try {
          await api.deleteTable(tableId, currentUser?.name || 'Manager');
          setTables(prev => prev.filter(t => t.id !== tableId));
          if (selectedTableId === tableId) {
            setSelectedTableId(null);
          }
          showRouteNotification(`Table supprimée avec succès`, 'success');
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
          triggerGlobalRefresh();
        } catch (err) {
          console.error('Failed to delete table:', err);
          showRouteNotification('Erreur lors de la suppression de la table', 'error');
        }
      }
    });
  };

  const handleUpdateTableStatus = async (tableId: string, status: TableStatus) => {
    try {
      await api.updateTable(tableId, { status }, currentUser?.name || 'Staff');
      triggerGlobalRefresh();
      loadData();
    } catch (err) {
      console.error('Failed to update table status:', err);
    }
  };

  const handleUpdateTableNotes = async (tableId: string, notes: string) => {
    try {
      await api.updateTable(tableId, { notes }, currentUser?.name || 'Staff');
      triggerGlobalRefresh();
      loadData();
    } catch (err) {
      console.error('Failed to update table notes:', err);
    }
  };

  const handleUpdateTablePositions = async (positions: { id: string; posX: number; posY: number; rotation?: number }[]) => {
    try {
      await api.updateTablePositions(positions, currentUser?.name || 'Manager');
      triggerGlobalRefresh();
    } catch (err) {
      console.error('Failed to save table positions:', err);
    }
  };

  // --- ACTIONS: PLAN ELEMENTS ---
  const handleAddPlanElement = async (spaceId: string, type: PlanElement['type']) => {
    try {
      let label = type === 'wall' ? 'Mur' : type === 'counter' ? 'Bar Comptoir' : type === 'door' ? 'Porte' : type === 'plant' ? 'Plante' : type === 'sofa' ? 'Banquette' : 'Décor';
      let width = type === 'wall' ? 120 : type === 'counter' ? 140 : type === 'plant' ? 36 : type === 'sofa' ? 90 : 60;
      let height = type === 'wall' ? 16 : type === 'counter' ? 44 : type === 'plant' ? 36 : type === 'sofa' ? 40 : 30;

      await api.createPlanElement({
        spaceId,
        type,
        label,
        posX: 100,
        posY: 100,
        width,
        height,
        rotation: 0
      }, currentUser?.name || 'Manager');
      triggerGlobalRefresh();
      loadData();
    } catch (err) {
      console.error('Failed to add plan element:', err);
    }
  };

  const handleUpdatePlanElementPositions = async (positions: { id: string; posX: number; posY: number; rotation?: number; width?: number; height?: number }[]) => {
    try {
      await api.updatePlanElementPositions(positions, currentUser?.name || 'Manager');
      triggerGlobalRefresh();
    } catch (err) {
      console.error('Failed to save plan element positions:', err);
    }
  };

  const handleDeletePlanElement = async (elementId: string) => {
    try {
      await api.deletePlanElement(elementId, currentUser?.name || 'Manager');
      triggerGlobalRefresh();
      loadData();
    } catch (err) {
      console.error('Failed to delete plan element:', err);
    }
  };

  // --- ACTIONS: SPACES ---
  const handleCreateSpace = async (name: string) => {
    const space = await api.createSpace({ name }, currentUser?.name || 'Admin');
    setSelectedSpaceId(space.id);
    triggerGlobalRefresh();
    loadData();
  };

  const handleUpdateSpace = async (id: string, name: string) => {
    await api.updateSpace(id, { name }, currentUser?.name || 'Admin');
    triggerGlobalRefresh();
    loadData();
  };

  const handleDeleteSpace = async (id: string) => {
    await api.deleteSpace(id, currentUser?.name || 'Admin');
    triggerGlobalRefresh();
    loadData();
  };

  const handleReorderSpaces = async (orderedIds: string[]) => {
    await api.reorderSpaces(orderedIds, currentUser?.name || 'Admin');
    triggerGlobalRefresh();
    loadData();
  };

  // --- ACTIONS: RESERVATIONS ---
  const handleSaveReservation = async (data: Partial<Reservation>) => {
    if (data.id) {
      await api.updateReservation(data.id, data, currentUser?.name || 'Staff');
    } else {
      await api.createReservation(data, currentUser?.name || 'Staff');
    }
    triggerGlobalRefresh();
    loadData();
  };

  const handleUpdateReservationStatus = async (reservationId: string, status: Reservation['status']) => {
    try {
      await api.updateReservation(reservationId, { status }, currentUser?.name || 'Staff');
      triggerGlobalRefresh();
      loadData();
    } catch (err) {
      console.error('Failed to update reservation status:', err);
    }
  };

  const handleDeleteReservation = (reservationId: string) => {
    const res = reservations.find(r => r.id === reservationId);
    setConfirmDialog({
      isOpen: true,
      title: 'Supprimer la réservation',
      message: `Voulez-vous supprimer définitivement la réservation de "${res?.customerName || 'ce client'}" ?`,
      onConfirm: async () => {
        try {
          await api.deleteReservation(reservationId, currentUser?.name || 'Admin');
          setReservations(prev => prev.filter(r => r.id !== reservationId));
          showRouteNotification('Réservation supprimée', 'success');
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
          triggerGlobalRefresh();
        } catch (err) {
          console.error('Failed to delete reservation:', err);
          showRouteNotification('Erreur lors de la suppression', 'error');
        }
      }
    });
  };

  const handleSeatReservation = async (reservationId: string) => {
    const res = reservations.find(r => r.id === reservationId);
    if (!res) return;
    try {
      // 1. Mark reservation as seated
      await api.updateReservation(reservationId, { status: 'seated' }, currentUser?.name || 'Staff');
      // 2. If table is assigned, mark table as occupied
      if (res.tableId) {
        await api.updateTable(res.tableId, { status: 'occupied' }, currentUser?.name || 'Staff');
      }
      triggerGlobalRefresh();
      loadData();
    } catch (err) {
      console.error('Failed to seat reservation:', err);
    }
  };

  // --- ACTIONS: QR ORDERS ---
  const handleAcceptQrOrder = async (orderId: string) => {
    try {
      const ord = orders.find(o => o.id === orderId);
      await api.acceptOrder(orderId, currentUser?.name || 'Barista');
      if (ord?.tableId) {
        await api.updateTable(ord.tableId, { status: 'occupied' }, currentUser?.name || 'Barista');
      }
      triggerGlobalRefresh();
      loadData();
    } catch (err) {
      console.error('Failed to accept QR order:', err);
    }
  };

  const handleRejectQrOrder = async (orderId: string) => {
    try {
      await api.rejectOrder(orderId, 'Refusée par le personnel de service', currentUser?.name || 'Manager');
      triggerGlobalRefresh();
      loadData();
    } catch (err) {
      console.error('Failed to reject QR order:', err);
    }
  };

  // Navigate to POS / Caisse
  const handleOpenPosForTable = (table?: Table, orderId?: string) => {
    setCurrentView('pos');
  };

  // Test QR Customer Session
  const handleTestClientSession = (tableId: string) => {
    setActiveQrTableId(tableId);
    setCurrentView('qr_customer_order');
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-10">
      {/* Top Header & Sub-Tabs Navigation */}
      <div className="bg-[#FFFFFF] rounded-2xl border border-[#D9DDD8] p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="font-bold text-lg text-[#252A27]">Gestion des Tables & Salles</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#252A27] text-[#A4DEC2] uppercase tracking-wider">
              Café Noir POS
            </span>
          </div>
          <p className="text-xs text-[#555D58] mt-0.5">
            Plan interactif, attribution des tables, commandes QR sans contact et réservations internes
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1.5 bg-[#F7F7F5] p-1 rounded-xl border border-[#D9DDD8]">
          <button
            onClick={() => {
              setActiveTab('plan');
              setCurrentSubTab('plan');
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === 'plan'
                ? 'bg-[#252A27] text-white shadow-2xs'
                : 'text-[#555D58] hover:text-[#252A27] hover:bg-[#ECEEEA]'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Plan de Salle</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('list');
              setCurrentSubTab('list');
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === 'list'
                ? 'bg-[#252A27] text-white shadow-2xs'
                : 'text-[#555D58] hover:text-[#252A27] hover:bg-[#ECEEEA]'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Vue Liste ({tables.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('reservations');
              setCurrentSubTab('reservations');
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === 'reservations'
                ? 'bg-[#252A27] text-white shadow-2xs'
                : 'text-[#555D58] hover:text-[#252A27] hover:bg-[#ECEEEA]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Réservations ({reservations.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('history');
              setCurrentSubTab('history');
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === 'history'
                ? 'bg-[#252A27] text-white shadow-2xs'
                : 'text-[#555D58] hover:text-[#252A27] hover:bg-[#ECEEEA]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Historique & Audit</span>
          </button>
        </div>

        {/* Global Quick Action */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setEditingTableData({
                number: `${tables.length + 1}`,
                name: `Table ${tables.length + 1}`,
                capacity: 2,
                spaceId: selectedSpaceId || spaces[0]?.id || '',
                status: 'available',
                shape: 'square'
              });
              setIsTableModalOpen(true);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-[#252A27] hover:bg-[#343B37] text-[#A4DEC2] text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ajouter Table</span>
          </button>
        </div>
      </div>

      {/* Table Summary Metrics KPIs */}
      <TableSummaryMetrics
        tables={tables}
        orders={orders}
        reservations={reservations}
        pendingQrOrders={pendingQrOrders}
        onOpenPendingOrders={() => setIsPendingOrdersModalOpen(true)}
        onFilterByStatus={status => setActiveStatusFilter(status)}
        activeStatusFilter={activeStatusFilter}
      />

      {/* MAIN TAB CONTENTS */}
      {activeTab === 'plan' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          {/* Interactive Floor Plan Area (2 cols on large screen) */}
          <div className="lg:col-span-2 space-y-4">
            <TableFloorPlan
              spaces={spaces}
              selectedSpaceId={selectedSpaceId || spaces[0]?.id || ''}
              onSelectSpace={setSelectedSpaceId}
              tables={tables}
              planElements={planElements}
              orders={orders}
              reservations={reservations}
              selectedTableId={selectedTableId}
              onSelectTable={tId => {
                setSelectedTableId(tId);
                if (tId) setCurrentRecordId(tId, { replace: true });
              }}
              onUpdateTablePositions={handleUpdateTablePositions}
              onUpdatePlanElementPositions={handleUpdatePlanElementPositions}
              onAddTable={spaceId => {
                setEditingTableData({
                  number: `${tables.length + 1}`,
                  name: `Table ${tables.length + 1}`,
                  capacity: 2,
                  spaceId,
                  status: 'available',
                  shape: 'square'
                });
                setIsTableModalOpen(true);
              }}
              onAddPlanElement={handleAddPlanElement}
              onDeletePlanElement={handleDeletePlanElement}
              onOpenSpaceManager={() => setIsSpaceModalOpen(true)}
              pendingQrOrders={pendingQrOrders}
              onOpenQrModal={table => setQrModalTable(table)}
            />
          </div>

          {/* Contextual Table Inspector Panel (1 col) */}
          <div className="lg:col-span-1">
            <TableInspectorPanel
              table={selectedTable}
              space={selectedTableSpace}
              spaces={spaces}
              orders={orders}
              reservations={reservations}
              onClose={() => setSelectedTableId(null)}
              onUpdateStatus={status => selectedTable && handleUpdateTableStatus(selectedTable.id, status)}
              onUpdateNotes={notes => selectedTable && handleUpdateTableNotes(selectedTable.id, notes)}
              onEditTable={() => {
                setEditingTableData(selectedTable);
                setIsTableModalOpen(true);
              }}
              onDuplicateTable={() => selectedTable && handleDuplicateTable(selectedTable.id)}
              onDeleteTable={() => selectedTable && handleDeleteTable(selectedTable.id)}
              onOpenQrModal={() => selectedTable && setQrModalTable(selectedTable)}
              onTestQrOrder={() => selectedTable && handleTestClientSession(selectedTable.id)}
              onOpenPosOrder={orderId => handleOpenPosForTable(selectedTable || undefined, orderId)}
              onSeatReservation={handleSeatReservation}
              onAcceptQrOrder={handleAcceptQrOrder}
              onRejectQrOrder={handleRejectQrOrder}
              onViewHistory={() => setActiveTab('history')}
            />
          </div>
        </div>
      )}

      {activeTab === 'list' && (
        <TableListView
          tables={tables}
          spaces={spaces}
          orders={orders}
          reservations={reservations}
          onSelectTable={tableId => {
            setSelectedTableId(tableId);
            setActiveTab('plan');
          }}
          onEditTable={table => {
            setEditingTableData(table);
            setIsTableModalOpen(true);
          }}
          onDuplicateTable={handleDuplicateTable}
          onDeleteTable={handleDeleteTable}
          onOpenQrModal={table => setQrModalTable(table)}
          onOpenPosOrder={(table, orderId) => handleOpenPosForTable(table, orderId)}
          onUpdateStatus={handleUpdateTableStatus}
          onViewHistory={tableId => {
            setSelectedTableId(tableId);
            setActiveTab('history');
          }}
          onAddTable={() => {
            setEditingTableData({
              number: `${tables.length + 1}`,
              name: `Table ${tables.length + 1}`,
              capacity: 2,
              spaceId: spaces[0]?.id || '',
              status: 'available',
              shape: 'square'
            });
            setIsTableModalOpen(true);
          }}
        />
      )}

      {activeTab === 'reservations' && (
        <TableReservationsView
          reservations={reservations}
          tables={tables}
          spaces={spaces}
          onCreateReservation={() => {
            setEditingReservationData(null);
            setIsReservationModalOpen(true);
          }}
          onEditReservation={res => {
            setEditingReservationData(res);
            setIsReservationModalOpen(true);
          }}
          onUpdateStatus={handleUpdateReservationStatus}
          onDeleteReservation={handleDeleteReservation}
          onSeatReservation={handleSeatReservation}
        />
      )}

      {activeTab === 'history' && (
        <TableHistoryView
          tables={tables}
          initialSelectedTableId={selectedTableId}
        />
      )}

      {/* MODALS */}
      {/* 1. Table Edit / Create Modal */}
      <TableEditModal
        isOpen={isTableModalOpen}
        onClose={() => setIsTableModalOpen(false)}
        spaces={spaces}
        initialData={editingTableData}
        onSave={handleSaveTable}
      />

      {/* 2. Spaces Manager Modal */}
      <SpaceManagerModal
        isOpen={isSpaceModalOpen}
        onClose={() => setIsSpaceModalOpen(false)}
        spaces={spaces}
        tables={tables}
        onCreateSpace={handleCreateSpace}
        onUpdateSpace={handleUpdateSpace}
        onDeleteSpace={handleDeleteSpace}
        onReorderSpaces={handleReorderSpaces}
      />

      {/* 3. Internal Reservation Form Modal */}
      <ReservationFormModal
        isOpen={isReservationModalOpen}
        onClose={() => setIsReservationModalOpen(false)}
        tables={tables}
        spaces={spaces}
        initialData={editingReservationData}
        onSave={handleSaveReservation}
      />

      {/* 4. Table QR Stand & Print Modal */}
      <TableQRModal
        isOpen={!!qrModalTable}
        onClose={() => setQrModalTable(null)}
        table={qrModalTable}
        space={spaces.find(s => s.id === qrModalTable?.spaceId)}
      />

      {/* 5. Pending QR Orders Review Modal */}
      <PendingQROrdersModal
        isOpen={isPendingOrdersModalOpen}
        onClose={() => setIsPendingOrdersModalOpen(false)}
        pendingOrders={pendingQrOrders}
        tables={tables}
        spaces={spaces}
        onAcceptOrder={handleAcceptQrOrder}
        onRejectOrder={handleRejectQrOrder}
      />

      {/* 6. Confirm Action Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant="danger"
        confirmLabel="Confirmer"
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
