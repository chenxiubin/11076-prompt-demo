import { Pause, Play, X } from 'lucide-react';

interface Props {
  playing: boolean;
  current: number;
  total: number;
  onPause: () => void;
  onPlay: () => void;
  onExit: () => void;
}

export default function PresentationMode({ playing, current, total, onPause, onPlay, onExit }: Props) {
  return (
    <div className="absolute left-1/2 top-7 z-30 flex -translate-x-1/2 items-center gap-3 rounded-full border border-cyan-200/20 bg-black/60 px-4 py-2 shadow-glow backdrop-blur-2xl">
      <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-300" />
      <span className="font-mono text-xs text-cyan-100">{String(current).padStart(2, '0')} / {String(total).padStart(2, '0')}</span>
      <button type="button" onClick={playing ? onPause : onPlay} className="control-btn h-8 w-8">
        {playing ? <Pause size={14} /> : <Play size={14} />}
      </button>
      <button type="button" onClick={onExit} className="control-btn h-8 w-8">
        <X size={14} />
      </button>
    </div>
  );
}
