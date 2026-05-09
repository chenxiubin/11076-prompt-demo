import { ChevronRight, FileText, Sparkles } from 'lucide-react';
import { useState } from 'react';
import type { CaseNode, HighlightType } from '../types/case';

interface Props {
  node: CaseNode;
}

const styleMap: Record<HighlightType, string> = {
  added: 'border-emerald-300/30 bg-emerald-300/10 text-emerald-100',
  modified: 'border-sky-300/30 bg-sky-300/10 text-sky-100',
  risk: 'border-orange-300/30 bg-orange-300/10 text-orange-100',
  errorFix: 'border-red-300/40 bg-red-300/10 text-red-100',
  model: 'border-violet-300/30 bg-violet-300/10 text-violet-100',
  ratio: 'border-amber-300/40 bg-amber-300/10 text-amber-100',
};

export default function AnalysisPanel({ node }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const analysis = node.analysis;

  return (
    <aside className={`relative z-20 h-full shrink-0 rounded-3xl border border-white/10 bg-black/40 shadow-2xl backdrop-blur-2xl transition-all ${collapsed ? 'w-[58px]' : 'w-[360px]'}`}>
      <button
        type="button"
        onClick={() => setCollapsed((value) => !value)}
        className="absolute -left-4 top-8 grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-black/70 text-zinc-300"
        aria-label="收起提示词解析面板"
      >
        <ChevronRight className={collapsed ? 'rotate-180 transition' : 'transition'} size={16} />
      </button>
      {collapsed ? (
        <div className="grid h-full place-items-center">
          <span className="vertical-text text-xs uppercase tracking-[.24em] text-zinc-500">Analysis</span>
        </div>
      ) : (
        <div className="flex h-full flex-col p-5">
          <div className="mb-5">
            <p className="flex items-center gap-2 text-xs uppercase tracking-[.24em] text-cyan-200/70"><Sparkles size={14} /> Prompt Analysis</p>
            <h2 className="mt-3 text-xl font-semibold text-white">{node.title}</h2>
            <p className="mt-2 text-xs text-zinc-500">点击 Prompt 节点后，这里会同步展示本轮拆解。</p>
          </div>

          <div className="thin-scroll flex-1 space-y-4 overflow-y-auto pr-1">
            {node.prompt ? (
              <section className="rounded-2xl border border-white/10 bg-white/[.04] p-4">
                <p className="mb-3 flex items-center gap-2 text-xs text-zinc-400"><FileText size={14} /> 完整提示词</p>
                <p className="font-mono text-xs leading-6 text-zinc-200">{node.prompt}</p>
              </section>
            ) : (
              <section className="rounded-2xl border border-white/10 bg-white/[.04] p-4 text-sm leading-6 text-zinc-400">
                当前节点是图片或问题节点。选择任意 Prompt 卡片，可以查看目标、关键词、约束和下一步建议。
              </section>
            )}

            {node.highlights && (
              <section>
                <h3 className="panel-title">差异高亮</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {node.highlights.map((item) => (
                    <span key={`${item.text}-${item.type}`} className={`rounded-full border px-2.5 py-1 text-[11px] ${styleMap[item.type]}`}>
                      {item.text}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {analysis && (
              <>
                <section>
                  <h3 className="panel-title">本轮目标</h3>
                  <p className="panel-body">{analysis.objective}</p>
                </section>
                <section>
                  <h3 className="panel-title">关键词分类</h3>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {analysis.keywordBreakdown.map((item) => (
                      <span key={item} className="rounded-xl border border-white/10 bg-white/[.04] px-3 py-2 text-xs text-zinc-300">{item}</span>
                    ))}
                  </div>
                </section>
                <section>
                  <h3 className="panel-title">新增约束</h3>
                  <ul className="mt-3 space-y-2">
                    {analysis.addedConstraints.map((item) => (
                      <li key={item} className="rounded-xl border border-emerald-200/15 bg-emerald-300/5 px-3 py-2 text-xs text-emerald-100/85">{item}</li>
                    ))}
                  </ul>
                </section>
                <section>
                  <h3 className="panel-title">结果评价</h3>
                  <p className="panel-body">{analysis.resultReview}</p>
                </section>
                <section>
                  <h3 className="panel-title">下一步优化建议</h3>
                  <p className="panel-body">{analysis.nextSuggestion}</p>
                </section>
              </>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
