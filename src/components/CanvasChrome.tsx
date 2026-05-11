import { BookOpen } from 'lucide-react';
import type { Case } from '../types/case';

interface Props {
  activeCase: Case;
  cases: Case[];
  activeIndex: number;
  onCaseChange: (index: number) => void;
  onMethodology: () => void;
}

export default function CanvasChrome({ activeCase, cases, activeIndex, onCaseChange, onMethodology }: Props) {
  return (
    <>
      <div className="pointer-events-none absolute left-8 top-7 z-30 max-w-[720px]">
        <p className="text-xs uppercase tracking-[.26em] text-zinc-500">{activeCase.subtitle}</p>
        <h2 className="mt-2 text-3xl font-semibold text-white">{activeCase.title}</h2>
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-zinc-400">{activeCase.goal}</p>
      </div>

      <div className="solid-tool-panel absolute bottom-8 left-8 z-40 max-w-[calc(100%-440px)] rounded-3xl p-3">
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
                  : 'border-white/10 bg-[#111518] text-zinc-400 hover:border-white/25 hover:bg-[#171d21]'
              }`}
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-white/10 bg-[#191f23] font-mono text-xs">
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
            className="flex min-w-[120px] items-center justify-center gap-2 rounded-2xl border border-amber-200/25 bg-[#211a0d] px-4 py-3 text-sm text-amber-50 transition hover:border-amber-200/45 hover:bg-[#2a2110]"
          >
            <BookOpen size={16} />
            方法论
          </button>
        </div>
      </div>
    </>
  );
}
