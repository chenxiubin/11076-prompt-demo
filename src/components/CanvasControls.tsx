import { Maximize2, Minus, Plus, RotateCcw, Scan } from 'lucide-react';

interface Props {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onCenter: () => void;
  onFit: () => void;
}

export default function CanvasControls({ scale, onZoomIn, onZoomOut, onCenter, onFit }: Props) {
  return (
    <div className="absolute bottom-8 right-8 z-30 flex flex-col items-end gap-2">
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/50 p-2 backdrop-blur-2xl">
        <button title="缩小" onClick={onZoomOut} className="control-btn" type="button"><Minus size={16} /></button>
        <span className="w-14 text-center font-mono text-xs text-zinc-300">{Math.round(scale * 100)}%</span>
        <button title="放大" onClick={onZoomIn} className="control-btn" type="button"><Plus size={16} /></button>
        <span className="mx-1 h-7 w-px bg-white/10" />
        <button title="回到中心" onClick={onCenter} className="control-btn" type="button"><RotateCcw size={16} /></button>
        <button title="显示全部节点" onClick={onFit} className="control-btn" type="button"><Maximize2 size={16} /></button>
        <button title="画布扫描" className="control-btn text-cyan-100" type="button"><Scan size={16} /></button>
      </div>
      <p className="rounded-full border border-white/8 bg-black/40 px-3 py-1 text-[11px] text-zinc-500 backdrop-blur-xl">
        Ctrl + 滚轮缩放 · 拖动画布平移 · 普通滚轮切换案例
      </p>
    </div>
  );
}
