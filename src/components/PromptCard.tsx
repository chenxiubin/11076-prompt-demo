import type { CSSProperties } from 'react';
import type { CaseNode, HighlightType } from '../types/case';

interface Props {
  node: CaseNode;
  selected: boolean;
  color: string;
  onSelect: () => void;
}

const label: Record<HighlightType, string> = {
  added: '新增',
  modified: '修改',
  risk: '风险',
  errorFix: '纠错',
  model: '模型',
  ratio: '比例',
};

export default function PromptCard({ node, selected, color, onSelect }: Props) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`node-card w-[310px] text-left ${selected ? 'is-selected' : ''}`}
      style={{ '--node-color': color } as CSSProperties}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-white">{node.title}</h3>
        <span className="rounded-full bg-cyan-300/10 px-2 py-1 font-mono text-[10px] text-cyan-100">PROMPT</span>
      </div>
      <p className="mt-4 max-h-[116px] overflow-hidden rounded-xl border border-white/10 bg-black/35 p-3 font-mono text-xs leading-5 text-zinc-300">
        {node.prompt}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {node.highlights?.map((item) => (
          <span key={`${item.text}-${item.type}`} className={`highlight-token ${item.type}`}>
            {label[item.type]} / {item.text}
          </span>
        ))}
      </div>
    </button>
  );
}
