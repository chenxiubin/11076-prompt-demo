import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, SetStateAction, WheelEvent } from 'react';
import { motion } from 'framer-motion';
import { ImagePlus, Sparkles, Timer, Trash2 } from 'lucide-react';
import type { CanvasConnection, Case, CaseNode, NodeType } from '../types/case';
import TimelineCurve from './TimelineCurve';
import CaseNodeCard from './CaseNodeCard';
import CanvasControls from './CanvasControls';

interface Props {
  activeCase: Case;
  selectedNodeId: string;
  nodePositions: Record<string, { x: number; y: number }>;
  uploadedImages: Record<string, string>;
  customNodes: CaseNode[];
  connections: CanvasConnection[];
  deletedConnectionIds: string[];
  onNodePositionChange: Dispatch<SetStateAction<Record<string, { x: number; y: number }>>>;
  onNodeImageUpload: (nodeId: string, image: string) => void;
  onCustomNodeAdd: (type: Extract<NodeType, 'material' | 'generated' | 'timeline'>, position: { x: number; y: number }) => void;
  onCustomNodeUpdate: (nodeId: string, updates: Partial<CaseNode>) => void;
  onNodeDelete: (nodeId: string) => void;
  onConnectionAdd: (connection: CanvasConnection) => void;
  onConnectionDelete: (connectionId: string) => void;
  onSelectNode: (node: CaseNode) => void;
  onPreviewImage: (image: string) => void;
  onCaseDelta: (delta: number) => void;
}

interface ContextMenuState {
  screenX: number;
  screenY: number;
  viewportX: number;
  viewportY: number;
  canvasX: number;
  canvasY: number;
}

interface ConnectionDragState {
  from: string;
  fromSide: 'left' | 'right';
  x: number;
  y: number;
}

const width = 4400;
const height = 1600;
const minScale = 0.48;
const maxScale = 2;

const getDefaultPosition = (node: CaseNode, index: number) => ({
  x: 980 + index * 245,
  y: 560 + Math.sin(index * 0.95) * 150 + (node.type === 'problem' ? 50 : 0),
});

const clampScale = (value: number) => Math.min(maxScale, Math.max(minScale, value));

export default function InfiniteCanvas({
  activeCase,
  selectedNodeId,
  nodePositions,
  uploadedImages,
  customNodes,
  connections,
  deletedConnectionIds,
  onNodePositionChange,
  onNodeImageUpload,
  onCustomNodeAdd,
  onCustomNodeUpdate,
  onNodeDelete,
  onConnectionAdd,
  onConnectionDelete,
  onSelectNode,
  onPreviewImage,
  onCaseDelta,
}: Props) {
  const [scale, setScale] = useState(0.72);
  const [offset, setOffset] = useState({ x: 300, y: 30 });
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [connectionDrag, setConnectionDrag] = useState<ConnectionDragState | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [nodeSizes, setNodeSizes] = useState<Record<string, { width: number; height: number }>>({});
  const canvasRef = useRef<HTMLElement | null>(null);
  const dragRef = useRef({ x: 0, y: 0, ox: 0, oy: 0, dragging: false, middle: false });
  const nodeDragRef = useRef({ id: '', x: 0, y: 0, ox: 0, oy: 0, dragging: false, moved: false });
  const connectionDragRef = useRef<ConnectionDragState | null>(null);
  const scaleRef = useRef(scale);
  const offsetRef = useRef(offset);
  const wheelLock = useRef(0);

  const positions = useMemo(
    () =>
      [...activeCase.nodes, ...customNodes].map((caseNode, index) => {
        const node = uploadedImages[caseNode.id] ? { ...caseNode, image: uploadedImages[caseNode.id] } : caseNode;
        return {
          node,
          ...(nodePositions[caseNode.id] ?? getDefaultPosition(node, index)),
        };
      }),
    [activeCase.nodes, customNodes, nodePositions, uploadedImages],
  );
  const positionsRef = useRef(positions);
  const visiblePositions = positions;
  const firstGeneratedNode = customNodes.find((node) => node.type === 'generated');

  useEffect(() => {
    scaleRef.current = scale;
    offsetRef.current = offset;
    positionsRef.current = positions;
  }, [offset, positions, scale]);

  useEffect(() => {
    setScale(0.72);
    setOffset({ x: 300, y: 30 });
    setContextMenu(null);
    setConnectionDrag(null);
    setSelectedConnectionId(null);
    connectionDragRef.current = null;
  }, [activeCase.id]);

  useEffect(() => {
    onNodePositionChange((current) => {
      const next = { ...current };
      let changed = false;
      [...activeCase.nodes, ...customNodes].forEach((node, index) => {
        if (!next[node.id]) {
          next[node.id] = getDefaultPosition(node, index);
          changed = true;
        }
      });
      return changed ? next : current;
    });
  }, [activeCase.id, activeCase.nodes.length, customNodes, onNodePositionChange]);

  const toCanvasPoint = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    const currentScale = scaleRef.current;
    const currentOffset = offsetRef.current;
    if (!rect) return { x: width / 2, y: height / 2 };

    return {
      x: (clientX - (rect.left + rect.width / 2)) / currentScale + width / 2 - currentOffset.x,
      y: (clientY - (rect.top + rect.height / 2)) / currentScale + height / 2 - currentOffset.y,
    };
  }, []);

  const openContextMenu = (clientX: number, clientY: number) => {
    const point = toCanvasPoint(clientX, clientY);
    const rect = canvasRef.current?.getBoundingClientRect();
    setContextMenu({
      screenX: rect ? clientX - rect.left : clientX,
      screenY: rect ? clientY - rect.top : clientY,
      viewportX: clientX,
      viewportY: clientY,
      canvasX: point.x,
      canvasY: point.y,
    });
  };

  const eventIsInsideCanvas = (event: Pick<MouseEvent, 'clientX' | 'clientY'>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return false;
    return event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
  };

  useEffect(() => {
    const handleMove = (event: MouseEvent) => {
      if (!nodeDragRef.current.dragging) return;
      const dx = (event.clientX - nodeDragRef.current.x) / scaleRef.current;
      const dy = (event.clientY - nodeDragRef.current.y) / scaleRef.current;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        nodeDragRef.current.moved = true;
      }
      onNodePositionChange((current) => ({
        ...current,
        [nodeDragRef.current.id]: {
          x: nodeDragRef.current.ox + dx,
          y: nodeDragRef.current.oy + dy,
        },
      }));
    };

    const handleUp = () => {
      nodeDragRef.current.dragging = false;
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [onNodePositionChange]);

  useEffect(() => {
    const finishConnection = (targetNodeId: string | null, targetSide: 'left' | 'right' = 'left') => {
      const drag = connectionDragRef.current;
      if (!drag) return;

      if (targetNodeId && targetNodeId !== drag.from) {
        const source = positionsRef.current.find((item) => item.node.id === drag.from)?.node;
        const target = positionsRef.current.find((item) => item.node.id === targetNodeId)?.node;
        const sourceIsGenerated = source ? ['generated', 'result', 'final'].includes(source.type) : false;
        const targetIsGenerated = target ? ['generated', 'result', 'final'].includes(target.type) : false;
        const isPromptConnection = Boolean(source && target) && ((source?.type === 'prompt' && targetIsGenerated) || (target?.type === 'prompt' && sourceIsGenerated));

        onConnectionAdd({
          id: `${drag.from}-${targetNodeId}-${Date.now()}`,
          from: drag.from,
          to: targetNodeId,
          fromSide: drag.fromSide,
          toSide: targetSide,
          kind: isPromptConnection ? 'prompt' : 'timeline',
        });
      }

      connectionDragRef.current = null;
      setConnectionDrag(null);
    };

    const handleMove = (event: MouseEvent) => {
      const drag = connectionDragRef.current;
      if (!drag) return;
      setConnectionDrag({ ...drag, ...toCanvasPoint(event.clientX, event.clientY) });
    };

    const handleUp = (event: MouseEvent) => {
      if (!connectionDragRef.current) return;
      const target = event.target as HTMLElement | null;
      const handle = target?.closest<HTMLElement>('[data-connection-handle="true"]');
      finishConnection(handle?.dataset.nodeId ?? null, handle?.dataset.side === 'right' ? 'right' : 'left');
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [onConnectionAdd]);

  const zoom = (delta: number) => {
    setScale((value) => clampScale(value * (1 + delta)));
  };

  const setZoomByStep = (direction: 1 | -1) => {
    setScale((value) => clampScale(Number((value + direction * 0.15).toFixed(2))));
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleNativeWheel = (event: globalThis.WheelEvent) => {
      if (!eventIsInsideCanvas(event)) return;
      const deltaY = event.deltaY;

      if (event.ctrlKey) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        const wheelZoomDelta = Math.max(-0.16, Math.min(0.16, -deltaY * 0.0016));
        zoom(wheelZoomDelta);
        return;
      }

      if (Math.abs(deltaY) < 24) return;
      const now = Date.now();
      if (now - wheelLock.current < 650) return;
      wheelLock.current = now;
      onCaseDelta(deltaY > 0 ? 1 : -1);
    };

    document.addEventListener('wheel', handleNativeWheel, { passive: false, capture: true });
    window.addEventListener('wheel', handleNativeWheel, { passive: false, capture: true });
    return () => {
      document.removeEventListener('wheel', handleNativeWheel, true);
      window.removeEventListener('wheel', handleNativeWheel, true);
    };
  }, [onCaseDelta]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleNativeContextMenu = (event: MouseEvent) => {
      if (!eventIsInsideCanvas(event)) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      openContextMenu(event.clientX, event.clientY);
    };

    const handleRightButtonFallback = (event: MouseEvent) => {
      if (event.button !== 2 || !eventIsInsideCanvas(event)) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      openContextMenu(event.clientX, event.clientY);
    };

    const stopPluginDragHooks = (event: Event) => {
      const target = event.target as Node | null;
      if (!target || !canvas.contains(target)) return;
      event.preventDefault();
      event.stopPropagation();
      if ('stopImmediatePropagation' in event) {
        event.stopImmediatePropagation();
      }
    };

    const startMiddlePan = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (event.button !== 1 || !target || !canvas.contains(target)) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      dragRef.current = {
        x: event.clientX,
        y: event.clientY,
        ox: offsetRef.current.x,
        oy: offsetRef.current.y,
        dragging: true,
        middle: true,
      };
      nodeDragRef.current.dragging = false;
      setContextMenu(null);
    };

    const moveMiddlePan = (event: MouseEvent) => {
      if (!dragRef.current.dragging || !dragRef.current.middle) return;
      event.preventDefault();
      setOffset({
        x: dragRef.current.ox + event.clientX - dragRef.current.x,
        y: dragRef.current.oy + event.clientY - dragRef.current.y,
      });
    };

    const endMiddlePan = (event: MouseEvent) => {
      if (event.button !== 1 && dragRef.current.middle) return;
      if (dragRef.current.middle) {
        event.preventDefault();
      }
      dragRef.current.dragging = false;
      dragRef.current.middle = false;
    };

    const blockAuxClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (event.button !== 1 || !target || !canvas.contains(target)) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    };

    document.addEventListener('contextmenu', handleNativeContextMenu, true);
    document.addEventListener('mouseup', handleRightButtonFallback, true);
    document.addEventListener('pointerup', handleRightButtonFallback, true);
    document.addEventListener('mousedown', startMiddlePan, true);
    document.addEventListener('mousemove', moveMiddlePan, true);
    document.addEventListener('mouseup', endMiddlePan, true);
    document.addEventListener('auxclick', blockAuxClick, true);
    document.addEventListener('dragstart', stopPluginDragHooks, true);
    document.addEventListener('dragenter', stopPluginDragHooks, true);
    document.addEventListener('dragover', stopPluginDragHooks, true);
    document.addEventListener('drop', stopPluginDragHooks, true);
    return () => {
      document.removeEventListener('contextmenu', handleNativeContextMenu, true);
      document.removeEventListener('mouseup', handleRightButtonFallback, true);
      document.removeEventListener('pointerup', handleRightButtonFallback, true);
      document.removeEventListener('mousedown', startMiddlePan, true);
      document.removeEventListener('mousemove', moveMiddlePan, true);
      document.removeEventListener('mouseup', endMiddlePan, true);
      document.removeEventListener('auxclick', blockAuxClick, true);
      document.removeEventListener('dragstart', stopPluginDragHooks, true);
      document.removeEventListener('dragenter', stopPluginDragHooks, true);
      document.removeEventListener('dragover', stopPluginDragHooks, true);
      document.removeEventListener('drop', stopPluginDragHooks, true);
    };
  }, []);

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (event.ctrlKey) {
      event.preventDefault();
    }
  };

  const addCustomNode = (type: Extract<NodeType, 'material' | 'generated' | 'timeline'>) => {
    onCustomNodeAdd(type, {
      x: (contextMenu?.canvasX ?? width / 2 - offset.x / scale) - 140,
      y: contextMenu?.canvasY ?? height / 2 - offset.y / scale,
    });
    setContextMenu(null);
  };

  const addCustomNodeAtCenter = (type: Extract<NodeType, 'material' | 'generated' | 'timeline'>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    const clientX = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const clientY = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
    const point = toCanvasPoint(clientX, clientY);
    onCustomNodeAdd(type, {
      x: point.x - 140,
      y: point.y - 20,
    });
    setContextMenu(null);
  };

  const runToolbarAction = (event: ReactPointerEvent<HTMLButtonElement>, action: () => void) => {
    event.preventDefault();
    event.stopPropagation();
    action();
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (event.key !== 'Delete' && event.key !== 'Backspace') return;

      if (selectedConnectionId) {
        event.preventDefault();
        onConnectionDelete(selectedConnectionId);
        setSelectedConnectionId(null);
        return;
      }

      if (selectedNodeId) {
        event.preventDefault();
        onNodeDelete(selectedNodeId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onConnectionDelete, onNodeDelete, selectedConnectionId, selectedNodeId]);

  const startConnectionDrag = (event: ReactMouseEvent<HTMLElement>, node: CaseNode, fromSide: 'left' | 'right') => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const drag = { from: node.id, fromSide, ...toCanvasPoint(event.clientX, event.clientY) };
    connectionDragRef.current = drag;
    setConnectionDrag(drag);
    dragRef.current.dragging = false;
    dragRef.current.middle = false;
    nodeDragRef.current.dragging = false;
  };

  return (
    <section
      ref={canvasRef}
      className="relative h-full overflow-hidden rounded-3xl border border-white/10 bg-black/25 shadow-2xl backdrop-blur-xl"
      onWheel={handleWheel}
      onAuxClick={(event) => event.preventDefault()}
      onDragStart={(event) => event.preventDefault()}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => event.preventDefault()}
      onSelectCapture={(event) => event.preventDefault()}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        openContextMenu(event.clientX, event.clientY);
      }}
      onMouseDown={(event) => {
        if (event.button === 0) setContextMenu(null);
      }}
    >
      <div className="absolute right-8 top-7 z-40 flex items-center gap-2 border border-white/10 bg-black/[.72] p-2 shadow-2xl backdrop-blur-2xl">
        <button
          type="button"
          onPointerDown={(event) => runToolbarAction(event, () => addCustomNodeAtCenter('material'))}
          className="flex items-center gap-2 border border-white/10 bg-white/[.05] px-3 py-2 text-xs text-zinc-100 transition hover:border-white/25 hover:bg-white/[.09]"
        >
          <ImagePlus size={14} />
          素材
        </button>
        <button
          type="button"
          onPointerDown={(event) => runToolbarAction(event, () => addCustomNodeAtCenter('generated'))}
          className="flex items-center gap-2 border border-white/10 bg-white/[.05] px-3 py-2 text-xs text-zinc-100 transition hover:border-white/25 hover:bg-white/[.09]"
        >
          <Sparkles size={14} />
          AI生图
        </button>
        <button
          type="button"
          onPointerDown={(event) => runToolbarAction(event, () => addCustomNodeAtCenter('timeline'))}
          className="flex items-center gap-2 border border-white/10 bg-white/[.05] px-3 py-2 text-xs text-zinc-100 transition hover:border-white/25 hover:bg-white/[.09]"
        >
          <Timer size={14} />
          时间线
        </button>
      </div>

      {contextMenu && (
        <div
          className="fixed z-[9999] flex items-center gap-2 border border-white/10 bg-black/[.86] p-2 shadow-2xl backdrop-blur-2xl"
          style={{
            left: Math.max(8, Math.min(contextMenu.viewportX, window.innerWidth - 340)),
            top: Math.max(8, Math.min(contextMenu.viewportY, window.innerHeight - 70)),
          }}
          onMouseDown={(event) => event.stopPropagation()}
          onContextMenu={(event) => event.preventDefault()}
        >
          <button type="button" onPointerDown={(event) => runToolbarAction(event, () => addCustomNode('material'))} className="flex items-center gap-2 border border-white/10 bg-white/[.05] px-4 py-2.5 text-sm text-zinc-100 transition hover:border-white/25 hover:bg-white/[.09]">
            <ImagePlus size={16} />
            素材
          </button>
          <button type="button" onPointerDown={(event) => runToolbarAction(event, () => addCustomNode('generated'))} className="flex items-center gap-2 border border-white/10 bg-white/[.05] px-4 py-2.5 text-sm text-zinc-100 transition hover:border-white/25 hover:bg-white/[.09]">
            <Sparkles size={16} />
            AI生图
          </button>
          <button type="button" onPointerDown={(event) => runToolbarAction(event, () => addCustomNode('timeline'))} className="flex items-center gap-2 border border-white/10 bg-white/[.05] px-4 py-2.5 text-sm text-zinc-100 transition hover:border-white/25 hover:bg-white/[.09]">
            <Timer size={16} />
            时间线
          </button>
        </div>
      )}

      <div
        className="absolute inset-0 cursor-grab select-none active:cursor-grabbing"
        onMouseDown={(event) => {
          if (event.button !== 0) return;
          dragRef.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y, dragging: true, middle: false };
        }}
        onMouseMove={(event) => {
          if (!dragRef.current.dragging || dragRef.current.middle) return;
          setOffset({
            x: dragRef.current.ox + event.clientX - dragRef.current.x,
            y: dragRef.current.oy + event.clientY - dragRef.current.y,
          });
        }}
        onMouseUp={() => {
          dragRef.current.dragging = false;
          dragRef.current.middle = false;
        }}
        onMouseLeave={() => {
          if (!dragRef.current.middle) {
            dragRef.current.dragging = false;
          }
        }}
      >
        <motion.div
          className="absolute left-1/2 top-1/2 origin-center"
          animate={{ x: -width / 2 + offset.x, y: -height / 2 + offset.y, scale }}
          transition={{
            x: { type: 'tween', duration: dragRef.current.dragging ? 0 : 0.18, ease: 'easeOut' },
            y: { type: 'tween', duration: dragRef.current.dragging ? 0 : 0.18, ease: 'easeOut' },
            scale: { type: 'tween', duration: 0.12, ease: 'easeOut' },
          }}
          style={{ width, height, willChange: 'transform' }}
        >
          <TimelineCurve
            positions={visiblePositions}
            connections={connections}
            deletedConnectionIds={deletedConnectionIds}
            previewConnection={connectionDrag}
            color={activeCase.themeColor}
            selectedNodeId={selectedNodeId}
            selectedConnectionId={selectedConnectionId}
            connectionSourceId={connectionDrag?.from ?? null}
            onConnectionSelect={(connectionId) => setSelectedConnectionId(connectionId)}
            nodeSizes={nodeSizes}
          />
          {visiblePositions.map(({ node, x, y }, index) => (
            <motion.div
              key={node.id}
              className={`canvas-node absolute cursor-move touch-none ${selectedNodeId === node.id ? 'is-selected' : ''}`}
              style={{ left: x, top: y }}
              initial={{ opacity: 0, y: 38, scale: 0.88 }}
              animate={{ opacity: 1, y: 0, scale: selectedNodeId === node.id ? 1.045 : 1 }}
              transition={{ delay: Math.min(index * 0.04, 0.28), type: 'spring', stiffness: 180, damping: 21 }}
              onMouseDown={(event) => {
                if (event.button !== 0) return;
                const target = event.target as HTMLElement;
                event.stopPropagation();
                if (target.closest('button, input, label, textarea, select, a, [data-connection-handle="true"]')) return;
                nodeDragRef.current = { id: node.id, x: event.clientX, y: event.clientY, ox: x, oy: y, dragging: true, moved: false };
              }}
            >
              {!['input', 'result', 'final', 'material', 'generated'].includes(node.type) && (
                <span
                  data-connection-handle="true"
                  data-node-id={node.id}
                  data-side="left"
                  className="connection-dot connection-dot-left"
                  onMouseDown={(event) => startConnectionDrag(event, node, 'left')}
                  title="拖出时间线"
                />
              )}
              <CaseNodeCard
                node={node}
                selected={selectedNodeId === node.id}
                color={activeCase.themeColor}
                onSelect={() => {
                  if (nodeDragRef.current.moved) {
                    nodeDragRef.current.moved = false;
                    return;
                  }
                  setSelectedConnectionId(null);
                  onSelectNode(node);
                }}
                onPreview={() => node.image && onPreviewImage(node.image)}
                onImageUpload={(image) => {
                  onNodeImageUpload(node.id, image);
                  onSelectNode({ ...node, image });
                }}
                onPromptChange={(prompt) => onCustomNodeUpdate(node.id, { prompt })}
                promptCompareBase={node.type === 'generated' && firstGeneratedNode && firstGeneratedNode.id !== node.id ? firstGeneratedNode.prompt ?? '' : undefined}
                onConnectionStart={(event, side) => startConnectionDrag(event, node, side)}
                onNodeSizeChange={(nodeId, size) => {
                  setNodeSizes((current) => {
                    const previous = current[nodeId];
                    if (previous?.width === size.width && previous.height === size.height) return current;
                    return { ...current, [nodeId]: size };
                  });
                }}
              />
              <button
                type="button"
                className="node-delete-btn"
                title="删除卡片"
                onMouseDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setSelectedConnectionId(null);
                  onNodeDelete(node.id);
                }}
              >
                <Trash2 size={14} />
              </button>
              {!['input', 'result', 'final', 'material', 'generated'].includes(node.type) && (
                <span
                  data-connection-handle="true"
                  data-node-id={node.id}
                  data-side="right"
                  className="connection-dot connection-dot-right"
                  onMouseDown={(event) => startConnectionDrag(event, node, 'right')}
                  title="拖出时间线"
                />
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>

      <CanvasControls
        scale={scale}
        onZoomIn={() => setZoomByStep(1)}
        onZoomOut={() => setZoomByStep(-1)}
        onCenter={() => setOffset({ x: 300, y: 30 })}
        onFit={() => {
          setScale(0.5);
          setOffset({ x: 180, y: 0 });
        }}
      />
    </section>
  );
}
