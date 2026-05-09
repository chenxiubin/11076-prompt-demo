import type { CaseNode } from '../types/case';

interface PositionedNode {
  node: CaseNode;
  x: number;
  y: number;
}

interface Props {
  positions: PositionedNode[];
  color: string;
  selectedNodeId: string;
}

export default function TimelineCurve({ positions, color, selectedNodeId }: Props) {
  const paths = positions.slice(0, -1).map((item, index) => {
    const next = positions[index + 1];
    const x1 = item.x + 145;
    const y1 = item.y + 90;
    const x2 = next.x + 24;
    const y2 = next.y + 90;
    const c1 = x1 + 96;
    const c2 = x2 - 96;
    return {
      id: `${item.node.id}-${next.node.id}`,
      active: item.node.id === selectedNodeId || next.node.id === selectedNodeId,
      d: `M ${x1} ${y1} C ${c1} ${y1}, ${c2} ${y2}, ${x2} ${y2}`,
    };
  });

  return (
    <svg className="pointer-events-none absolute inset-0 overflow-visible" width="2280" height="820" viewBox="0 0 2280 820">
      <defs>
        <linearGradient id="timeline-glow" x1="0%" x2="100%" y1="0%" y2="0%">
          <stop offset="0%" stopColor="rgba(255,255,255,.06)" />
          <stop offset="48%" stopColor={color} />
          <stop offset="100%" stopColor="rgba(255,255,255,.08)" />
        </linearGradient>
        <filter id="timeline-blur">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {paths.map((path) => (
        <g key={path.id}>
          <path d={path.d} stroke={path.active ? color : 'rgba(255,255,255,.14)'} strokeWidth={path.active ? 7 : 3} fill="none" filter="url(#timeline-blur)" opacity={path.active ? 0.64 : 0.4} />
          <path className="energy-flow" d={path.d} stroke="url(#timeline-glow)" strokeWidth={path.active ? 3.8 : 2.4} fill="none" strokeLinecap="round" />
        </g>
      ))}
    </svg>
  );
}
