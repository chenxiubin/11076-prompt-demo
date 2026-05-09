import { Expand } from 'lucide-react';
import type { CaseNode } from '../types/case';
import type { CSSProperties } from 'react';

interface Props {
  node: CaseNode;
  selected: boolean;
  color: string;
  onSelect: () => void;
  onPreview: () => void;
}

export default function ImageNode({ node, selected, color, onSelect, onPreview }: Props) {
  const isFinal = node.type === 'final';
  const isResult = node.type === 'result' || isFinal;

  return (
    <article
      className={`node-card group ${isResult ? 'w-[300px]' : 'w-[238px]'} ${isFinal ? 'final-node' : ''} ${selected ? 'is-selected' : ''}`}
      style={{ '--node-color': color } as CSSProperties}
      onClick={onSelect}
    >
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[.04]">
        <div className={`${isResult ? 'h-[250px]' : 'h-[184px]'} placeholder-grid relative grid place-items-center`}>
          <img
            src={node.image}
            alt={node.title}
            className="absolute inset-0 h-full w-full object-cover"
            onError={(event) => {
              event.currentTarget.style.opacity = '0';
            }}
          />
          <div className="px-5 text-center">
            <p className="text-xs uppercase tracking-[.22em] text-zinc-500">Image Placeholder</p>
            <p className="mt-2 break-all font-mono text-[11px] leading-5 text-zinc-400">{node.image}</p>
          </div>
        </div>
        {node.image && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onPreview();
            }}
            className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full border border-white/20 bg-black/50 text-white opacity-0 backdrop-blur transition group-hover:opacity-100"
            aria-label="预览大图"
          >
            <Expand size={16} />
          </button>
        )}
      </div>
      <h3 className="mt-4 text-sm font-semibold text-white">{node.title}</h3>
      {node.description && <p className="mt-2 text-xs leading-5 text-zinc-400">{node.description}</p>}
    </article>
  );
}
