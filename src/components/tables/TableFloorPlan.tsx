import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Space, Table, PlanElement, Order, Reservation, TableStatus } from '../../types';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Move,
  Plus,
  Edit3,
  Check,
  RotateCw,
  Trash2,
  Sparkles,
  Coffee,
  Users,
  Grid,
  Eye,
  Sliders,
  Layers,
  ChevronRight,
  Receipt,
  Clock,
  AlertCircle,
  HelpCircle,
  Undo2,
  Save
} from 'lucide-react';

interface TableFloorPlanProps {
  spaces: Space[];
  selectedSpaceId: string;
  onSelectSpace: (spaceId: string) => void;
  tables: Table[];
  planElements: PlanElement[];
  orders: Order[];
  reservations: Reservation[];
  selectedTableId: string | null;
  onSelectTable: (tableId: string) => void;
  onUpdateTablePositions: (positions: { id: string; posX: number; posY: number; rotation?: number }[]) => Promise<void>;
  onUpdatePlanElementPositions: (positions: { id: string; posX: number; posY: number; rotation?: number; width?: number; height?: number }[]) => Promise<void>;
  onAddTable: (spaceId: string) => void;
  onAddPlanElement: (spaceId: string, type: PlanElement['type']) => void;
  onDeletePlanElement: (elementId: string) => void;
  onOpenSpaceManager: () => void;
  pendingQrOrders: Order[];
  onOpenQrModal: (table: Table) => void;
}

export const TableFloorPlan: React.FC<TableFloorPlanProps> = ({
  spaces,
  selectedSpaceId,
  onSelectSpace,
  tables,
  planElements,
  orders,
  reservations,
  selectedTableId,
  onSelectTable,
  onUpdateTablePositions,
  onUpdatePlanElementPositions,
  onAddTable,
  onAddPlanElement,
  onDeletePlanElement,
  onOpenSpaceManager,
  pendingQrOrders,
  onOpenQrModal
}) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showChairs, setShowChairs] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // Local positions while dragging
  const [localTablePositions, setLocalTablePositions] = useState<Record<string, { x: number; y: number; rotation?: number }>>({});
  const [localElementPositions, setLocalElementPositions] = useState<Record<string, { x: number; y: number; width?: number; height?: number; rotation?: number }>>({});

  const [draggingItem, setDraggingItem] = useState<{
    type: 'table' | 'element';
    id: string;
    startX: number;
    startY: number;
    initialPosX: number;
    initialPosY: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Sync incoming table and element positions to local state
  useEffect(() => {
    const tPos: Record<string, { x: number; y: number; rotation?: number }> = {};
    (tables || []).forEach(t => {
      tPos[t.id] = { x: t.posX, y: t.posY, rotation: t.rotation || 0 };
    });
    setLocalTablePositions(tPos);

    const elPos: Record<string, { x: number; y: number; width?: number; height?: number; rotation?: number }> = {};
    (planElements || []).forEach(pe => {
      elPos[pe.id] = { x: pe.posX, y: pe.posY, width: pe.width, height: pe.height, rotation: pe.rotation || 0 };
    });
    setLocalElementPositions(elPos);
  }, [tables, planElements]);

  const safeSpaces = Array.isArray(spaces) ? spaces : [];
  const safeTables = Array.isArray(tables) ? tables : [];
  const safeElements = Array.isArray(planElements) ? planElements : [];

  const activeSpace = safeSpaces.find(s => s.id === selectedSpaceId) || safeSpaces[0];
  const activeTables = safeTables.filter(t => t.spaceId === (activeSpace?.id || ''));
  const activeElements = safeElements.filter(pe => pe.spaceId === (activeSpace?.id || ''));

  // Snapping helper
  const snap = useCallback((val: number, gridSize = 10) => {
    return snapToGrid ? Math.round(val / gridSize) * gridSize : val;
  }, [snapToGrid]);

  // Handle Drag Start
  const handlePointerDown = (
    e: React.PointerEvent,
    type: 'table' | 'element',
    id: string,
    initialX: number,
    initialY: number
  ) => {
    if (!isEditMode) {
      if (type === 'table') {
        onSelectTable(id);
      }
      return;
    }

    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    if (type === 'table') {
      onSelectTable(id);
      setSelectedElementId(null);
    } else {
      setSelectedElementId(id);
    }

    setDraggingItem({
      type,
      id,
      startX: e.clientX,
      startY: e.clientY,
      initialPosX: initialX,
      initialPosY: initialY
    });
  };

  // Handle Pointer Move
  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
      return;
    }

    if (!draggingItem || !isEditMode) return;

    const dx = (e.clientX - draggingItem.startX) / zoom;
    const dy = (e.clientY - draggingItem.startY) / zoom;

    const newX = Math.max(10, Math.min(850, snap(draggingItem.initialPosX + dx)));
    const newY = Math.max(10, Math.min(650, snap(draggingItem.initialPosY + dy)));

    if (draggingItem.type === 'table') {
      setLocalTablePositions(prev => ({
        ...prev,
        [draggingItem.id]: {
          ...(prev[draggingItem.id] || { x: 0, y: 0 }),
          x: newX,
          y: newY
        }
      }));
    } else {
      setLocalElementPositions(prev => ({
        ...prev,
        [draggingItem.id]: {
          ...(prev[draggingItem.id] || { x: 0, y: 0 }),
          x: newX,
          y: newY
        }
      }));
    }

    setHasUnsavedChanges(true);
  };

  // Handle Pointer Up
  const handlePointerUp = (e: React.PointerEvent) => {
    if (isPanning) {
      setIsPanning(false);
    }
    if (draggingItem) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (_) {}
      setDraggingItem(null);
    }
  };

  // Save changes to backend
  const handleSaveChanges = async () => {
    try {
      const tableUpdates = activeTables.map(t => ({
        id: t.id,
        posX: localTablePositions[t.id]?.x ?? t.posX,
        posY: localTablePositions[t.id]?.y ?? t.posY,
        rotation: localTablePositions[t.id]?.rotation ?? t.rotation ?? 0
      }));

      const elementUpdates = activeElements.map(pe => ({
        id: pe.id,
        posX: localElementPositions[pe.id]?.x ?? pe.posX,
        posY: localElementPositions[pe.id]?.y ?? pe.posY,
        width: localElementPositions[pe.id]?.width ?? pe.width,
        height: localElementPositions[pe.id]?.height ?? pe.height,
        rotation: localElementPositions[pe.id]?.rotation ?? pe.rotation ?? 0
      }));

      await Promise.all([
        onUpdateTablePositions(tableUpdates),
        onUpdatePlanElementPositions(elementUpdates)
      ]);

      setHasUnsavedChanges(false);
    } catch (err) {
      console.error('Failed to save layout:', err);
    }
  };

  // Rotate Table or Element
  const handleRotate = (type: 'table' | 'element', id: string) => {
    if (type === 'table') {
      const curr = (localTablePositions[id]?.rotation || 0) + 45;
      setLocalTablePositions(prev => ({
        ...prev,
        [id]: { ...(prev[id] || { x: 0, y: 0 }), rotation: curr % 360 }
      }));
    } else {
      const curr = (localElementPositions[id]?.rotation || 0) + 45;
      setLocalElementPositions(prev => ({
        ...prev,
        [id]: { ...(prev[id] || { x: 0, y: 0 }), rotation: curr % 360 }
      }));
    }
    setHasUnsavedChanges(true);
  };

  // Render Table Chairs around perimeter
  const renderChairs = (capacity: number, shape: string, size: { width: number; height: number }, status: TableStatus) => {
    if (!showChairs) return null;
    const chairs = [];
    const count = Math.max(1, capacity);
    const chairSize = 10;
    const chairColor = status === 'occupied' ? '#D97706' : status === 'billing' ? '#2563EB' : status === 'reserved' ? '#7C3AED' : '#555D58';

    if (shape === 'circle') {
      const radius = size.width / 2 + 7;
      for (let i = 0; i < count; i++) {
        const angle = (i * 2 * Math.PI) / count;
        const cx = size.width / 2 + radius * Math.cos(angle) - chairSize / 2;
        const cy = size.height / 2 + radius * Math.sin(angle) - chairSize / 2;
        chairs.push(
          <div
            key={i}
            className="absolute rounded-full border border-black/15 shadow-2xs transition-all pointer-events-none"
            style={{
              width: `${chairSize}px`,
              height: `${chairSize}px`,
              left: `${cx}px`,
              top: `${cy}px`,
              backgroundColor: chairColor,
              opacity: 0.85
            }}
          />
        );
      }
    } else if (shape === 'square' || shape === 'rectangle' || shape === 'oval') {
      // Distribute chairs top/bottom or sides
      const perSide = Math.ceil(count / 2);
      for (let i = 0; i < count; i++) {
        const isTop = i < perSide;
        const sideIndex = isTop ? i : i - perSide;
        const sideTotal = isTop ? perSide : count - perSide;
        const step = size.width / (sideTotal + 1);
        const x = step * (sideIndex + 1) - chairSize / 2;
        const y = isTop ? -chairSize - 3 : size.height + 3;

        chairs.push(
          <div
            key={i}
            className="absolute rounded-xs border border-black/15 shadow-2xs transition-all pointer-events-none"
            style={{
              width: `${chairSize + 2}px`,
              height: `${chairSize - 2}px`,
              left: `${x}px`,
              top: `${y}px`,
              backgroundColor: chairColor,
              opacity: 0.85
            }}
          />
        );
      }
    }

    return chairs;
  };

  return (
    <div className="bg-[#FFFFFF] rounded-2xl border border-[#D9DDD8] shadow-xs overflow-hidden flex flex-col">
      {/* Space Selector & Plan Toolbar */}
      <div className="p-3.5 border-b border-[#D9DDD8] bg-[#F7F7F5] flex flex-wrap items-center justify-between gap-3">
        {/* Space navigation pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {safeSpaces.map(sp => {
            const spTables = safeTables.filter(t => t.spaceId === sp.id);
            const spOccupied = spTables.filter(t => t.status === 'occupied' || t.status === 'billing' || t.status === 'waiting');
            const isSelected = sp.id === activeSpace?.id;

            return (
              <button
                key={sp.id}
                onClick={() => onSelectSpace(sp.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 shrink-0 ${
                  isSelected
                    ? 'bg-[#252A27] text-white shadow-xs'
                    : 'bg-[#ECEEEA] text-[#555D58] hover:text-[#252A27] hover:bg-[#E3E6E2]'
                }`}
              >
                <span>{sp.name}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-black/5 text-[#555D58]'
                  }`}
                >
                  {spOccupied.length > 0 ? `${spOccupied.length}/${spTables.length}` : spTables.length}
                </span>
              </button>
            );
          })}

          <button
            onClick={onOpenSpaceManager}
            className="p-1.5 rounded-xl bg-[#ECEEEA] text-[#555D58] hover:text-[#252A27] hover:bg-[#E3E6E2] transition-colors text-xs font-medium flex items-center space-x-1 shrink-0"
            title="Gérer les Espaces & Zones"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="text-[11px] hidden sm:inline">Espaces</span>
          </button>
        </div>

        {/* View Controls & Edit Mode Toggle */}
        <div className="flex items-center space-x-2">
          {/* Zoom controls */}
          <div className="flex items-center bg-[#ECEEEA] rounded-xl p-0.5 border border-[#D9DDD8]">
            <button
              onClick={() => setZoom(z => Math.max(0.6, z - 0.1))}
              className="p-1 rounded-lg text-[#555D58] hover:text-[#252A27] hover:bg-white transition-colors"
              title="Zoom Arrière"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 text-[11px] font-bold text-[#252A27] min-w-10 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(z => Math.min(1.6, z + 0.1))}
              className="p-1 rounded-lg text-[#555D58] hover:text-[#252A27] hover:bg-white transition-colors"
              title="Zoom Avant"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
              className="p-1 rounded-lg text-[#555D58] hover:text-[#252A27] hover:bg-white transition-colors ml-0.5"
              title="Réinitialiser Vue (100%)"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Display toggles */}
          <button
            onClick={() => setShowGrid(g => !g)}
            className={`p-1.5 rounded-xl border text-xs font-medium transition-colors ${
              showGrid ? 'bg-[#252A27] text-white border-[#252A27]' : 'bg-[#ECEEEA] text-[#555D58] border-[#D9DDD8]'
            }`}
            title="Afficher la Grille"
          >
            <Grid className="w-3.5 h-3.5" />
          </button>

          {/* Save Layout Button if unsaved changes */}
          {hasUnsavedChanges && (
            <button
              onClick={handleSaveChanges}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 animate-pulse"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Enregistrer Plan</span>
            </button>
          )}

          {/* Edit Mode Toggle */}
          <button
            onClick={() => {
              if (isEditMode && hasUnsavedChanges) {
                handleSaveChanges();
              }
              setIsEditMode(m => !m);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
              isEditMode
                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs'
                : 'bg-[#ECEEEA] hover:bg-[#E3E6E2] text-[#252A27] border border-[#D9DDD8]'
            }`}
          >
            {isEditMode ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Terminer Édition</span>
              </>
            ) : (
              <>
                <Edit3 className="w-3.5 h-3.5" />
                <span>Modifier Disposition</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Edit Mode Architectural Toolbox Banner */}
      {isEditMode && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2.5 animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-bold text-amber-950 uppercase tracking-wider">
              Mode Édition : {activeSpace?.name}
            </span>
            <span className="text-[11px] text-amber-800 hidden sm:inline">
              &bull; Glissez-déposez les tables et éléments décoratifs
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {/* Add Table */}
            <button
              onClick={() => onAddTable(activeSpace?.id || '')}
              className="px-2.5 py-1 rounded-lg bg-[#252A27] text-white text-[11px] font-bold hover:bg-[#343B37] transition-colors flex items-center space-x-1 shadow-2xs"
            >
              <Plus className="w-3 h-3" />
              <span>Table</span>
            </button>

            {/* Add Decor Elements */}
            <button
              onClick={() => onAddPlanElement(activeSpace?.id || '', 'wall')}
              className="px-2 py-1 rounded-lg bg-white hover:bg-amber-50 text-[#252A27] border border-[#D9DDD8] text-[11px] font-medium transition-colors"
            >
              + Mur
            </button>
            <button
              onClick={() => onAddPlanElement(activeSpace?.id || '', 'counter')}
              className="px-2 py-1 rounded-lg bg-white hover:bg-amber-50 text-[#252A27] border border-[#D9DDD8] text-[11px] font-medium transition-colors"
            >
              + Bar / Comptoir
            </button>
            <button
              onClick={() => onAddPlanElement(activeSpace?.id || '', 'door')}
              className="px-2 py-1 rounded-lg bg-white hover:bg-amber-50 text-[#252A27] border border-[#D9DDD8] text-[11px] font-medium transition-colors"
            >
              + Porte
            </button>
            <button
              onClick={() => onAddPlanElement(activeSpace?.id || '', 'plant')}
              className="px-2 py-1 rounded-lg bg-white hover:bg-amber-50 text-[#252A27] border border-[#D9DDD8] text-[11px] font-medium transition-colors"
            >
              + Plante
            </button>
            <button
              onClick={() => onAddPlanElement(activeSpace?.id || '', 'sofa')}
              className="px-2 py-1 rounded-lg bg-white hover:bg-amber-50 text-[#252A27] border border-[#D9DDD8] text-[11px] font-medium transition-colors"
            >
              + Canapé / Banquette
            </button>
          </div>
        </div>
      )}

      {/* Main Interactive Floor Canvas Area */}
      <div
        ref={containerRef}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative w-full h-[520px] sm:h-[580px] bg-[#FBFBFA] overflow-hidden select-none cursor-default"
        style={{
          backgroundImage: showGrid
            ? 'radial-gradient(#C7CDC8 1.2px, transparent 1.2px)'
            : 'none',
          backgroundSize: '20px 20px'
        }}
      >
        {/* Scaled & Panned Floor Surface */}
        <div
          className="absolute inset-0 transition-transform origin-top-left"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            width: '900px',
            height: '700px'
          }}
        >
          {/* Architectural Wall boundary representation */}
          <div className="absolute inset-4 rounded-3xl border-2 border-[#D9DDD8] bg-white/40 pointer-events-none" />

          {/* 1. PLAN ELEMENTS RENDERING (Walls, doors, windows, plants, bars) */}
          {activeElements.map(pe => {
            const posX = localElementPositions[pe.id]?.x ?? pe.posX;
            const posY = localElementPositions[pe.id]?.y ?? pe.posY;
            const width = localElementPositions[pe.id]?.width ?? pe.width ?? 60;
            const height = localElementPositions[pe.id]?.height ?? pe.height ?? 30;
            const rotation = localElementPositions[pe.id]?.rotation ?? pe.rotation ?? 0;
            const isSelected = selectedElementId === pe.id;

            let bgColor = '#4A3319';
            let borderColor = '#252A27';
            let label = pe.label || pe.type;

            if (pe.type === 'wall') {
              bgColor = '#252A27';
              borderColor = '#1E231F';
            } else if (pe.type === 'plant') {
              bgColor = '#2B422F';
              borderColor = '#4A5B4D';
            } else if (pe.type === 'counter' || pe.type === 'bar_station') {
              bgColor = '#7E6347';
              borderColor = '#4A3319';
            } else if (pe.type === 'door') {
              bgColor = '#ECEEEA';
              borderColor = '#2B422F';
            } else if (pe.type === 'window') {
              bgColor = '#E0F2FE';
              borderColor = '#0284C7';
            } else if (pe.type === 'sofa') {
              bgColor = '#C5A059';
              borderColor = '#7E6347';
            }

            return (
              <div
                key={pe.id}
                onPointerDown={e => handlePointerDown(e, 'element', pe.id, posX, posY)}
                className={`absolute transition-shadow duration-100 flex items-center justify-center ${
                  isEditMode ? 'cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-amber-500' : 'pointer-events-none'
                } ${isSelected && isEditMode ? 'ring-2 ring-amber-500 ring-offset-2' : ''}`}
                style={{
                  left: `${posX}px`,
                  top: `${posY}px`,
                  width: `${width}px`,
                  height: `${height}px`,
                  transform: `rotate(${rotation}deg)`,
                  backgroundColor: pe.type === 'plant' ? 'transparent' : bgColor,
                  borderRadius: pe.type === 'plant' ? '9999px' : pe.type === 'sofa' ? '12px' : '6px',
                  border: `1.5px solid ${borderColor}`,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.06)'
                }}
              >
                {/* Visual Icon / Motif */}
                {pe.type === 'plant' ? (
                  <div className="w-full h-full rounded-full bg-emerald-800/80 border-2 border-emerald-950 flex items-center justify-center text-white shadow-xs">
                    <span className="text-[10px] font-bold">🌿</span>
                  </div>
                ) : pe.type === 'door' ? (
                  <div className="w-full h-full flex items-center justify-between px-1 text-[9px] font-bold text-[#2B422F]">
                    <span>◖</span>
                    <span className="truncate">{pe.label || 'Porte'}</span>
                    <span>◗</span>
                  </div>
                ) : (
                  <span className="text-[9px] font-bold text-white/90 px-1 truncate pointer-events-none">
                    {pe.label || pe.type.toUpperCase()}
                  </span>
                )}

                {/* Edit Controls for Element */}
                {isEditMode && isSelected && (
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex items-center space-x-1 bg-[#252A27] text-white p-1 rounded-lg shadow-md z-30 pointer-events-auto">
                    <button
                      onClick={e => { e.stopPropagation(); handleRotate('element', pe.id); }}
                      className="p-1 hover:bg-white/20 rounded"
                      title="Tourner 45°"
                    >
                      <RotateCw className="w-3 h-3 text-[#A4DEC2]" />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); onDeletePlanElement(pe.id); }}
                      className="p-1 hover:bg-red-500/30 text-red-400 rounded"
                      title="Supprimer Élément"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* 2. TABLES RENDERING */}
          {activeTables.map(table => {
            const posX = localTablePositions[table.id]?.x ?? table.posX;
            const posY = localTablePositions[table.id]?.y ?? table.posY;
            const rotation = localTablePositions[table.id]?.rotation ?? table.rotation ?? 0;
            const isSelected = selectedTableId === table.id;

            // Dimensions based on shape & capacity
            let width = 64;
            let height = 64;
            if (table.shape === 'rectangle' || table.capacity >= 6) {
              width = 96;
              height = 58;
            } else if (table.shape === 'oval') {
              width = 90;
              height = 60;
            } else if (table.capacity === 2) {
              width = 54;
              height = 54;
            }

            // Status Styling
            let statusBg = 'bg-[#FFFFFF]';
            let statusBorder = 'border-[#252A27]';
            let statusTextColor = 'text-[#252A27]';
            let badgeBg = 'bg-emerald-600 text-white';
            let statusLabel = 'Libre';

            if (table.status === 'occupied') {
              statusBg = 'bg-amber-50';
              statusBorder = 'border-amber-600';
              statusTextColor = 'text-amber-950';
              badgeBg = 'bg-amber-600 text-white';
              statusLabel = 'Occupée';
            } else if (table.status === 'billing') {
              statusBg = 'bg-blue-50';
              statusBorder = 'border-blue-600';
              statusTextColor = 'text-blue-950';
              badgeBg = 'bg-blue-600 text-white';
              statusLabel = 'Addition';
            } else if (table.status === 'reserved') {
              statusBg = 'bg-purple-50';
              statusBorder = 'border-purple-600';
              statusTextColor = 'text-purple-950';
              badgeBg = 'bg-purple-600 text-white';
              statusLabel = 'Réservée';
            } else if (table.status === 'waiting') {
              statusBg = 'bg-amber-100';
              statusBorder = 'border-amber-500';
              statusTextColor = 'text-amber-900';
              badgeBg = 'bg-amber-500 text-white animate-pulse';
              statusLabel = 'QR Attente';
            }

            // Check if there is an active order
            const activeOrder = orders.find(
              o => o.tableId === table.id &&
              (o.status === 'accepted' || o.status === 'preparing' || o.status === 'ready' || o.status === 'served' || o.status === 'pending_approval')
            );

            // Check if there is an active reservation
            const tableRes = reservations.find(
              r => r.tableId === table.id && r.status === 'confirmed'
            );

            // Shape border radius
            const borderRadius = table.shape === 'circle' ? '9999px' : table.shape === 'oval' ? '28px' : '12px';

            return (
              <div
                key={table.id}
                onPointerDown={e => handlePointerDown(e, 'table', table.id, posX, posY)}
                onClick={() => onSelectTable(table.id)}
                className={`absolute transition-transform select-none ${
                  isEditMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer hover:scale-105'
                } ${isSelected ? 'z-20' : 'z-10'}`}
                style={{
                  left: `${posX}px`,
                  top: `${posY}px`,
                  width: `${width}px`,
                  height: `${height}px`,
                  transform: `rotate(${rotation}deg)`
                }}
              >
                {/* Visual Chairs */}
                {renderChairs(table.capacity, table.shape, { width, height }, table.status)}

                {/* Table Core Top Surface */}
                <div
                  className={`w-full h-full ${statusBg} border-2 ${statusBorder} flex flex-col items-center justify-center p-1 relative shadow-sm transition-all ${
                    isSelected ? 'ring-3 ring-[#252A27] ring-offset-2 shadow-md' : ''
                  }`}
                  style={{ borderRadius }}
                >
                  {/* Table Number Display */}
                  <div className="flex items-center space-x-0.5">
                    <span className="text-[9px] font-bold text-[#555D58] uppercase">T</span>
                    <span className={`text-sm font-extrabold ${statusTextColor}`}>
                      {table.number}
                    </span>
                  </div>

                  {/* Table Capacity & Status Pill */}
                  <div className="flex items-center space-x-1 mt-0.5">
                    <span className="text-[9px] font-bold text-[#555D58] flex items-center">
                      <Users className="w-2.5 h-2.5 mr-0.5" />
                      {table.capacity}
                    </span>

                    {/* QR Order Alert icon if waiting */}
                    {table.status === 'waiting' && (
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    )}
                  </div>

                  {/* Order Total / Reservation Time Pill if occupied/reserved */}
                  {activeOrder && (
                    <div className="absolute -bottom-2 px-1.5 py-0.2 rounded-md bg-[#252A27] text-[#A4DEC2] text-[9px] font-bold shadow-xs whitespace-nowrap">
                      {activeOrder.total.toFixed(3)} DT
                    </div>
                  )}

                  {tableRes && !activeOrder && (
                    <div className="absolute -bottom-2 px-1.5 py-0.2 rounded-md bg-purple-700 text-white text-[9px] font-bold shadow-xs whitespace-nowrap">
                      {tableRes.reservationTime}
                    </div>
                  )}
                </div>

                {/* Table Contextual Actions in Edit Mode */}
                {isEditMode && isSelected && (
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex items-center space-x-1 bg-[#252A27] text-white p-1 rounded-lg shadow-md z-30">
                    <button
                      onClick={e => { e.stopPropagation(); handleRotate('table', table.id); }}
                      className="p-1 hover:bg-white/20 rounded"
                      title="Tourner la table 45°"
                    >
                      <RotateCw className="w-3 h-3 text-[#A4DEC2]" />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); onOpenQrModal(table); }}
                      className="p-1 hover:bg-white/20 rounded text-[#A4DEC2]"
                      title="Voir Chevalet QR"
                    >
                      <Layers className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Floating Legend / Quick Guide Overlay */}
        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-xs p-2 rounded-xl border border-[#D9DDD8] shadow-xs text-[10px] space-y-1 z-20 pointer-events-none hidden sm:block">
          <div className="flex items-center space-x-3 text-[#555D58] font-medium">
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
              <span>Libre</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
              <span>Occupée</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
              <span>Addition</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block"></span>
              <span>Réservée</span>
            </span>
          </div>
        </div>

        {/* Floating Selection Badge */}
        {selectedTableId && (
          <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-[#D9DDD8] shadow-xs flex items-center space-x-2 z-20">
            <span className="w-2 h-2 rounded-full bg-[#252A27]"></span>
            <span className="text-xs font-bold text-[#252A27]">
              {tables.find(t => t.id === selectedTableId)?.name || 'Table'} sélectionnée
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
