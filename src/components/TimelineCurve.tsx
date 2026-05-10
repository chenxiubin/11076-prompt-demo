import type { CanvasConnection, CaseNode } from '../types/case';

interface PositionedNode {
  node: CaseNode;
  x: number;
  y: number;
}

interface Props {
  positions: PositionedNode[];
  connections?: CanvasConnection[];
  deletedConnectionIds?: string[];
  previewConnection?: { from: string; fromSide?: 'left' | 'right'; x: number; y: number } | null;
  color: string;
  selectedNodeId: string;
  selectedConnectionId?: string | null;
  connectionSourceId?: string | null;
  onConnectionSelect?: (connectionId: string) => void;
  nodeSizes?: Record<string, { width: number; height: number }>;
}

const getNodeAnchor = (
  item: PositionedNode,
  side: 'left' | 'right',
  nodeSizes: Props['nodeSizes'] = {},
) => {
  const isPrompt = item.node.type === 'prompt';
  const isTimeline = item.node.type === 'timeline';
  const measuredSize = nodeSizes[item.node.id];
  const width = measuredSize?.width ?? (isPrompt ? 310 : isTimeline ? 210 : 280);
  const height = measuredSize?.height ?? (isPrompt ? 145 : isTimeline ? 88 : 170);
  return {
    x: item.x + (side === 'right' ? width : 0),
    y: item.y + height / 2,
  };
};

export default function TimelineCurve({
  positions,
  connections = [],
  deletedConnectionIds = [],
  previewConnection,
  color,
  selectedNodeId,
  selectedConnectionId,
  connectionSourceId,
  onConnectionSelect,
  nodeSizes = {},
}: Props) {
  const deletedConnectionIdSet = new Set(deletedConnectionIds);
  const defaultPositions = positions.filter((item) => !item.node.custom);
  const automaticPaths = defaultPositions.slice(0, -1).flatMap((item, index) => {
    const next = defaultPositions[index + 1];
    const id = `${item.node.id}-${next.node.id}`;
    if (deletedConnectionIdSet.has(id)) return [];

    const from = getNodeAnchor(item, 'right', nodeSizes);
    const to = getNodeAnchor(next, 'left', nodeSizes);
    const c1 = from.x + 96;
    const c2 = to.x - 96;
    return [{
      id,
      active: item.node.id === selectedNodeId || next.node.id === selectedNodeId || id === selectedConnectionId,
      kind: 'timeline',
      selectable: true,
      d: `M ${from.x} ${from.y} C ${c1} ${from.y}, ${c2} ${to.y}, ${to.x} ${to.y}`,
    }];
  });

  const customPaths = connections.flatMap((connection) => {
    if (deletedConnectionIdSet.has(connection.id)) return [];
    const fromItem = positions.find((item) => item.node.id === connection.from);
    const toItem = positions.find((item) => item.node.id === connection.to);
    if (!fromItem || !toItem) return [];
    const from = getNodeAnchor(fromItem, connection.fromSide ?? 'right', nodeSizes);
    const to = getNodeAnchor(toItem, connection.toSide ?? 'left', nodeSizes);
    const c1 = from.x + Math.max(80, Math.abs(to.x - from.x) * 0.28);
    const c2 = to.x - Math.max(80, Math.abs(to.x - from.x) * 0.28);
    return [{
      id: connection.id,
      active: connection.from === selectedNodeId || connection.to === selectedNodeId || connection.from === connectionSourceId || connection.id === selectedConnectionId,
      kind: connection.kind ?? 'timeline',
      selectable: true,
      d: `M ${from.x} ${from.y} C ${c1} ${from.y}, ${c2} ${to.y}, ${to.x} ${to.y}`,
    }];
  });

  const previewPaths = previewConnection ? positions.flatMap((item) => {
    if (item.node.id !== previewConnection.from) return [];
    const from = getNodeAnchor(item, previewConnection.fromSide ?? 'right', nodeSizes);
    const c1 = from.x + Math.max(80, Math.abs(previewConnection.x - from.x) * 0.28);
    const c2 = previewConnection.x - Math.max(80, Math.abs(previewConnection.x - from.x) * 0.28);
    return [{
      id: `preview-${previewConnection.from}`,
      active: true,
      kind: 'preview',
      selectable: false,
      d: `M ${from.x} ${from.y} C ${c1} ${from.y}, ${c2} ${previewConnection.y}, ${previewConnection.x} ${previewConnection.y}`,
    }];
  }) : [];

  const paths = [...automaticPaths, ...customPaths, ...previewPaths];

  return (
    <svg className="absolute inset-0 overflow-visible" width="4400" height="1600" viewBox="0 0 4400 1600">
      <defs>
        <linearGradient id="timeline-glow" x1="0%" x2="100%" y1="0%" y2="0%">
          <stop offset="0%" stopColor="rgba(148,163,184,.28)" />
          <stop offset="50%" stopColor="rgba(203,213,225,.66)" />
          <stop offset="100%" stopColor="rgba(148,163,184,.28)" />
        </linearGradient>
        <linearGradient id="timeline-chase" x1="0%" x2="100%" y1="0%" y2="0%">
          <stop offset="0%" stopColor="rgba(56,189,248,0)" />
          <stop offset="45%" stopColor="rgba(96,165,250,.95)" />
          <stop offset="100%" stopColor="rgba(147,197,253,0)" />
        </linearGradient>
        <filter id="timeline-blur" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0.15 0 0 0 0 0.55 0 0 0 0 1 0 0 0 1 0" result="blueBlur" />
          <feMerge>
            <feMergeNode in="blueBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {paths.map((path) => (
        <g key={path.id} className={path.selectable ? 'timeline-path-group' : 'pointer-events-none'}>
          {path.selectable && (
            <path
              d={path.d}
              stroke="transparent"
              strokeWidth={16}
              fill="none"
              strokeLinecap="round"
              className="timeline-hit-path"
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onConnectionSelect?.(path.id);
              }}
            />
          )}
          <path d={path.d} stroke={path.kind === 'preview' ? 'rgba(96,165,250,.55)' : path.id === selectedConnectionId ? color : 'rgba(226,232,240,.34)'} strokeWidth={path.kind === 'preview' ? 5.2 : path.id === selectedConnectionId ? 3.2 : 2.2} fill="none" opacity={path.kind === 'preview' ? 0.48 : 0.82} filter={path.kind === 'preview' ? 'url(#timeline-blur)' : undefined} className="pointer-events-none" />
          <path d={path.d} stroke="url(#timeline-glow)" strokeWidth={path.kind === 'preview' ? 2.4 : 1.4} fill="none" strokeLinecap="round" opacity={path.kind === 'preview' ? 0.95 : 0.92} className="pointer-events-none" />
          <path className="timeline-chase pointer-events-none" d={path.d} stroke={path.kind === 'prompt' ? 'rgba(245, 197, 92, .95)' : 'url(#timeline-chase)'} strokeWidth={path.kind === 'preview' ? 4.2 : 3.2} fill="none" strokeLinecap="round" filter="url(#timeline-blur)" opacity={path.kind === 'preview' ? 1 : 0.92} />
        </g>
      ))}
    </svg>
  );
}
