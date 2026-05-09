import type { Case } from '../types/case';

interface Props {
  activeCase: Case;
}

export default function TopBar({ activeCase }: Props) {
  return (
    <header className="fixed left-0 right-0 top-0 z-40 border-b border-white/10 bg-black/45 px-6 py-3 backdrop-blur-2xl">
      <div className="flex items-center gap-5">
        <div className="flex min-w-[300px] items-center gap-3">
          <span className="h-9 w-9 rounded-xl border border-cyan-300/40 bg-cyan-300/10 shadow-glow" />
          <div>
            <h1 className="text-base font-semibold tracking-wide">办公礼品产品替换场景重构教程</h1>
            <p className="text-xs text-zinc-500">AI 电商视觉提示词演化实验室</p>
          </div>
        </div>
        <div className="min-w-0 flex-1 border-l border-white/10 pl-5">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="truncate text-sm font-medium text-white">{activeCase.title}</h2>
            {activeCase.modelTags.map((tag) => (
              <span key={tag} className="rounded-full border border-violet-300/30 bg-violet-400/10 px-2.5 py-1 text-[11px] text-violet-100">
                {tag}
              </span>
            ))}
            <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2.5 py-1 text-[11px] text-amber-100">{activeCase.difficulty}</span>
          </div>
          <p className="mt-1 line-clamp-1 text-xs text-zinc-400">{activeCase.goal}</p>
        </div>
      </div>
    </header>
  );
}
