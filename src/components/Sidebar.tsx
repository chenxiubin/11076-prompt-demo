import { BookOpen, ChevronsLeft, ChevronsRight, FlaskConical } from 'lucide-react';
import { useState } from 'react';
import type { Case } from '../types/case';

interface Props {
  cases: Case[];
  activeIndex: number;
  activeView: 'case' | 'methodology';
  onCaseChange: (index: number) => void;
  onMethodology: () => void;
}

export default function Sidebar({ cases, activeIndex, activeView, onCaseChange, onMethodology }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`fixed bottom-4 left-4 top-[84px] z-30 rounded-2xl border border-white/10 bg-black/35 p-3 shadow-2xl backdrop-blur-2xl transition-all ${collapsed ? 'w-[72px]' : 'w-[292px]'}`}>
      <div className="mb-3 flex items-center justify-between">
        {!collapsed && <span className="text-xs uppercase tracking-[.24em] text-zinc-500">Case Index</span>}
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
          aria-label="切换目录宽度"
        >
          {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
        </button>
      </div>
      <nav className="space-y-2">
        {cases.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onCaseChange(index)}
            className={`group flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
              activeView === 'case' && index === activeIndex ? 'border-cyan-300/50 bg-cyan-300/10 text-white shadow-glow' : 'border-white/8 bg-white/[.035] text-zinc-400 hover:border-white/18 hover:bg-white/[.07]'
            }`}
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/7 font-mono text-xs">{String(index + 1).padStart(2, '0')}</span>
            {!collapsed && (
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{item.title}</span>
                <span className="mt-1 flex flex-wrap gap-1">
                  {item.categoryTags.slice(0, 2).map((tag) => (
                    <span key={tag} className="rounded-full bg-white/7 px-2 py-0.5 text-[10px] text-zinc-400">{tag}</span>
                  ))}
                </span>
              </span>
            )}
          </button>
        ))}
        <button
          type="button"
          onClick={onMethodology}
          className={`group flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
            activeView === 'methodology' ? 'border-amber-200/40 bg-amber-200/10 text-amber-50 shadow-gold' : 'border-white/8 bg-white/[.035] text-zinc-400 hover:border-amber-200/30 hover:bg-amber-200/10'
          }`}
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/7"><BookOpen size={16} /></span>
          {!collapsed && <span className="text-sm font-medium">提示词方法论</span>}
        </button>
        <button className="group flex w-full items-center gap-3 rounded-xl border border-white/8 bg-white/[.035] p-3 text-left text-zinc-400">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/7"><FlaskConical size={16} /></span>
          {!collapsed && <span className="text-sm font-medium">05 后续课程案例占位</span>}
        </button>
      </nav>
    </aside>
  );
}
