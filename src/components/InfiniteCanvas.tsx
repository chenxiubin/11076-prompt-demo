import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Play, Square } from 'lucide-react';
import type { Case, CaseNode } from '../types/case';
import TimelineCurve from './TimelineCurve';
import CaseNodeCard from './CaseNodeCard';
import CanvasControls from './CanvasControls';
import PresentationMode from './PresentationMode';

interface Props {
  activeCase: Case;
  cases: Case[];
  activeIndex: number;
  selectedNodeId: string;
  isPresentation: boolean;
  onSelectNode: (node: CaseNode) => void;
  onPreviewImage: (image: string) => void;
  onCaseDelta: (delta: number) => void;
  onCaseChange: (index: number) => void;
  onMethodology: () => void;
  onPresentationToggle: () => void;
  onPresentationEnd: () => void;
}

const width = 2280;
const height = 820;

export default function InfiniteCanvas({
  activeCase,
  cases,
  activeIndex,
  selectedNodeId,
  isPresentation,
  onSelectNode,
  onPreviewImage,
  onCaseDelta,
  onCaseChange,
  onMethodology,
  onPresentationToggle,
  onPresentationEnd,
}: Props) {
  const [scale, setScale] = useState(0.86);
  const [offset, setOffset] = useState({ x: 34, y: 38 });
  const [visibleStep, setVisibleStep] = useState(activeCase.nodes.length - 1);
  const [playing, setPlaying] = useState(true);
  const canvasRef = useRef<HTMLElement | null>(null);
  const dragRef = useRef({ x: 0, y: 0, ox: 0, oy: 0, dragging: false });
  const wheelLock = useRef(0);

  useEffect(() => {
    setVisibleStep(isPresentation ? 0 : activeCase.nodes.length - 1);
    setPlaying(true);
    setScale(0.86);
    setOffset({ x: 34, y: 38 });
  }, [activeCase, isPresentation]);

  useEffect(() => {
    if (!isPresentation || !playing) return;
    if (visibleStep >= activeCase.nodes.length - 1) return;
    const timer = window.setTimeout(() => setVisibleStep((step) => step + 1), 1300);
    return () => window.clearTimeout(timer);
  }, [activeCase.nodes.length, isPresentation, playing, visibleStep]);

  const positions = useMemo(
    () =>
      activeCase.nodes.map((node, index) => ({
        node,
        x: 140 + index * 245,
        y: 270 + Math.sin(index * 0.95) * 150 + (node.type === 'problem' ? 50 : 0),
      })),
    [activeCase],
  );

  const visiblePositions = isPresentation ? positions.slice(0, visibleStep + 1) : positions;

  const zoom = (delta: number) => {
    setScale((value) => Math.min(1.35, Math.max(0.48, Number((value + delta).toFixed(2)))));
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (event: WheelEvent) => {
      const deltaY = event.deltaY;

      // Use a non-passive native listener so Ctrl + wheel zooms only the canvas,
      // instead of triggering the browser's page zoom.
      if (event.ctrlKey) {
        event.preventDefault();
        event.stopPropagation();
        zoom(deltaY > 0 ? -0.06 : 0.06);
        return;
      }

      if (Math.abs(deltaY) < 24) return;
      const now = Date.now();
      if (now - wheelLock.current < 650) return;
      wheelLock.current = now;
      onCaseDelta(deltaY > 0 ? 1 : -1);
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [onCaseDelta]);

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (event.ctrlKey) {
      event.preventDefault();
      return;
    }
  };

  return (
    <section ref={canvasRef} className="relative h-full overflow-hidden rounded-3xl border border-white/10 bg-black/25 shadow-2xl backdrop-blur-xl" onWheel={handleWheel}>
      <div className="absolute left-8 top-7 z-20 max-w-[720px]">
        <p className="text-xs uppercase tracking-[.26em] text-zinc-500">{activeCase.subtitle}</p>
        <h2 className="mt-2 text-3xl font-semibold text-white">{activeCase.title}</h2>
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-zinc-400">{activeCase.goal}</p>
      </div>
      <button
        type="button"
        onClick={onPresentationToggle}
        className="absolute right-8 top-7 z-30 flex items-center gap-2 rounded-full border border-cyan-200/25 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-50 shadow-glow backdrop-blur-2xl transition hover:border-cyan-200/60 hover:bg-cyan-300/20"
      >
        {isPresentation ? <Square size={16} /> : <Play size={16} />}
        {isPresentation ? '退出演示' : '演示模式'}
      </button>

      <div
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        onMouseDown={(event) => {
          dragRef.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y, dragging: true };
        }}
        onMouseMove={(event) => {
          if (!dragRef.current.dragging) return;
          setOffset({
            x: dragRef.current.ox + event.clientX - dragRef.current.x,
            y: dragRef.current.oy + event.clientY - dragRef.current.y,
          });
        }}
        onMouseUp={() => {
          dragRef.current.dragging = false;
        }}
        onMouseLeave={() => {
          dragRef.current.dragging = false;
        }}
      >
        <motion.div
          className="absolute left-1/2 top-1/2 origin-center"
          animate={{ x: -width / 2 + offset.x, y: -height / 2 + offset.y, scale }}
          transition={{ type: 'spring', stiffness: 120, damping: 24 }}
          style={{ width, height }}
        >
          <TimelineCurve positions={visiblePositions} color={activeCase.themeColor} selectedNodeId={selectedNodeId} />
          {visiblePositions.map(({ node, x, y }, index) => (
            <motion.div
              key={node.id}
              className="absolute"
              style={{ left: x, top: y }}
              initial={{ opacity: 0, y: 38, scale: 0.88 }}
              animate={{ opacity: 1, y: 0, scale: selectedNodeId === node.id ? 1.045 : 1 }}
              transition={{ delay: Math.min(index * 0.04, 0.28), type: 'spring', stiffness: 180, damping: 21 }}
            >
              <CaseNodeCard
                node={node}
                selected={selectedNodeId === node.id}
                color={activeCase.themeColor}
                onSelect={() => onSelectNode(node)}
                onPreview={() => node.image && onPreviewImage(node.image)}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>

      <div className="absolute bottom-8 left-8 z-30 max-w-[calc(100%-440px)] rounded-3xl border border-white/10 bg-black/48 p-3 shadow-2xl backdrop-blur-2xl">
        <div className="mb-2 flex items-center gap-3 px-1">
          <span className="text-[11px] uppercase tracking-[.26em] text-zinc-500">Tutorial Steps</span>
          <span className="h-px flex-1 bg-white/10" />
          <span className="text-xs text-zinc-400">办公礼品产品替换场景重构教程</span>
        </div>
        <div className="flex items-stretch gap-2">
          {cases.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onCaseChange(index)}
              className={`group flex min-w-[190px] items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                index === activeIndex
                  ? 'border-cyan-300/55 bg-cyan-300/12 text-white shadow-glow'
                  : 'border-white/10 bg-white/[.035] text-zinc-400 hover:border-white/25 hover:bg-white/[.07]'
              }`}
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/7 font-mono text-xs">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{item.title}</span>
                <span className="mt-1 block truncate text-[11px] text-zinc-500">{item.categoryTags.slice(0, 2).join(' / ')}</span>
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={onMethodology}
            className="flex min-w-[120px] items-center justify-center gap-2 rounded-2xl border border-amber-200/25 bg-amber-200/8 px-4 py-3 text-sm text-amber-50 transition hover:border-amber-200/45 hover:bg-amber-200/14"
          >
            <BookOpen size={16} />
            方法论
          </button>
        </div>
      </div>

      <CanvasControls
        scale={scale}
        onZoomIn={() => zoom(0.08)}
        onZoomOut={() => zoom(-0.08)}
        onCenter={() => setOffset({ x: 34, y: 38 })}
        onFit={() => {
          setScale(0.66);
          setOffset({ x: -92, y: 12 });
        }}
      />
      {isPresentation && (
        <PresentationMode
          playing={playing}
          current={visibleStep + 1}
          total={activeCase.nodes.length}
          onPause={() => setPlaying(false)}
          onPlay={() => setPlaying(true)}
          onExit={onPresentationEnd}
        />
      )}
    </section>
  );
}
