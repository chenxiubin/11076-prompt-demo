import type { CaseNode } from '../types/case';
import ImageNode from './ImageNode';
import PromptCard from './PromptCard';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { CSSProperties } from 'react';

interface Props {
  node: CaseNode;
  selected: boolean;
  color: string;
  onSelect: () => void;
  onPreview: () => void;
}

export default function CaseNodeCard({ node, selected, color, onSelect, onPreview }: Props) {
  if (node.type === 'prompt') {
    return <PromptCard node={node} selected={selected} color={color} onSelect={onSelect} />;
  }

  if (node.type === 'input' || node.type === 'result' || node.type === 'final') {
    return <ImageNode node={node} selected={selected} color={color} onSelect={onSelect} onPreview={onPreview} />;
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`node-card w-[250px] border-red-300/30 bg-red-500/10 text-left ${selected ? 'is-selected' : ''}`}
      style={{ '--node-color': color } as CSSProperties}
    >
      <div className="flex items-center gap-2 text-red-100">
        <AlertTriangle size={18} />
        <h3 className="text-sm font-semibold">{node.title}</h3>
      </div>
      <p className="mt-3 text-sm leading-6 text-red-100/75">{node.description}</p>
      <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-300/20 bg-black/20 px-3 py-2 text-xs text-red-100/80">
        <CheckCircle2 size={14} />
        暴露问题后再补约束
      </div>
    </button>
  );
}
