import { ChevronLeft, ChevronRight, FileImage, GitCompare, Save, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import type { CaseNode, NodeType } from '../types/case';

interface Props {
  node: CaseNode | null;
  allNodes: CaseNode[];
  savedAt: string | null;
  onNodeUpdate: (nodeId: string, updates: Partial<CaseNode>) => void;
  onImageUpload: (nodeId: string, image: string) => void;
  onSave: () => void;
}

interface DiffResult {
  prefix: string;
  changed: string;
  suffix: string;
}

const nodeTypeOptions: Array<{ value: NodeType; label: string }> = [
  { value: 'material', label: '素材' },
  { value: 'generated', label: 'AI生图' },
  { value: 'timeline', label: '时间线' },
  { value: 'prompt', label: 'Prompt' },
];

const getPromptDiff = (base: string, current: string): DiffResult | null => {
  if (base === current) return null;
  if (!base) return { prefix: '', changed: current || '当前提示词为空', suffix: '' };
  if (!current) return { prefix: '', changed: `缺少：${base}`, suffix: '' };

  let prefixLength = 0;
  while (prefixLength < base.length && prefixLength < current.length && base[prefixLength] === current[prefixLength]) {
    prefixLength += 1;
  }

  let suffixLength = 0;
  while (
    suffixLength < base.length - prefixLength &&
    suffixLength < current.length - prefixLength &&
    base[base.length - 1 - suffixLength] === current[current.length - 1 - suffixLength]
  ) {
    suffixLength += 1;
  }

  return {
    prefix: current.slice(0, prefixLength),
    changed: current.slice(prefixLength, current.length - suffixLength) || '仅有删减内容',
    suffix: current.slice(current.length - suffixLength),
  };
};

export default function AnalysisPanel({ node, allNodes, savedAt, onNodeUpdate, onImageUpload, onSave }: Props) {
  const [collapsed, setCollapsed] = useState(true);
  const [compareNodeId, setCompareNodeId] = useState('');
  const [comparePrompt, setComparePrompt] = useState('');
  const [diff, setDiff] = useState<DiffResult | null>(null);
  const prompt = node?.prompt ?? '';

  const promptNodes = useMemo(
    () => allNodes.filter((item) => item.id !== node?.id && item.prompt),
    [allNodes, node?.id],
  );

  useEffect(() => {
    setDiff(null);
    setCompareNodeId('');
    setComparePrompt('');
  }, [node?.id]);

  const handleImageFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !node) return;

    const reader = new FileReader();
    reader.onload = () => {
      const image = String(reader.result ?? '');
      onImageUpload(node.id, image);
      onNodeUpdate(node.id, { image });
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleCompareNodeChange = (value: string) => {
    setCompareNodeId(value);
    const targetPrompt = allNodes.find((item) => item.id === value)?.prompt ?? '';
    setComparePrompt(targetPrompt);
    setDiff(null);
  };

  return (
    <>
      <AnimatePresence>
        {collapsed && (
          <motion.button
            type="button"
            onClick={() => setCollapsed(false)}
            className="fixed right-0 top-1/2 z-40 flex -translate-y-1/2 items-center gap-2 rounded-l-2xl border border-r-0 border-cyan-200/25 bg-[#070b0d] py-4 pl-3 pr-2 text-cyan-50 shadow-glow transition hover:border-cyan-200/50 hover:bg-[#0b1417]"
            aria-label="打开卡片属性栏"
            initial={{ x: 54, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 54, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
          >
            <span className="vertical-text text-[11px] tracking-[.22em]">属性栏</span>
            <ChevronLeft size={18} />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!collapsed && (
          <motion.aside
            data-canvas-wheel-lock="true"
            className="solid-tool-panel fixed bottom-4 right-4 top-[84px] z-50 w-[380px] rounded-3xl"
            onWheel={(event) => event.stopPropagation()}
            initial={{ x: 410, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 410, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 240, damping: 28 }}
          >
      <button
        type="button"
        onClick={() => setCollapsed(true)}
        className="absolute -left-4 top-8 grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-black/70 text-zinc-300"
        aria-label="收起卡片属性栏"
      >
        <ChevronRight size={16} />
      </button>
        <div className="flex h-full flex-col p-5">
          <div className="mb-5">
            <p className="flex items-center gap-2 text-xs uppercase tracking-[.24em] text-cyan-200/70">
              <Sparkles size={14} /> Card Properties
            </p>
            <h2 className="mt-3 text-xl font-semibold text-white">卡片属性栏</h2>
            <p className="mt-2 text-xs leading-5 text-zinc-500">管理员编辑权限已开启。选中画布卡片后，可以在这里修改并保存页面状态。</p>
          </div>

          <div className="thin-scroll flex-1 space-y-4 overflow-y-auto pr-1">
            {!node ? (
              <section className="rounded-2xl border border-white/10 bg-white/[.04] p-4 text-sm leading-6 text-zinc-400">
                当前未选中卡片。请从画布右上角新建卡片，或点击已有卡片后编辑属性。
              </section>
            ) : (
              <>
                <section className="property-section">
                  <label className="property-label">卡片名称</label>
                  <input
                    value={node.title}
                    onChange={(event) => onNodeUpdate(node.id, { title: event.target.value })}
                    className="property-input"
                  />
                </section>

                <section className="property-section">
                  <label className="property-label">卡片类型</label>
                  <select
                    value={node.type}
                    onChange={(event) => onNodeUpdate(node.id, { type: event.target.value as NodeType })}
                    className="property-input"
                  >
                    {nodeTypeOptions.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </section>

                <section className="property-section">
                  <label className="property-upload">
                    <FileImage size={15} />
                    上传图片
                    <input type="file" accept="image/*" className="sr-only" onChange={handleImageFile} />
                  </label>
                  {node.image && <img src={node.image} alt={node.title} className="property-preview" draggable={false} />}
                </section>

                <section className="property-section">
                  <label className="property-label">提示词</label>
                  <textarea
                    value={prompt}
                    onChange={(event) => onNodeUpdate(node.id, { prompt: event.target.value })}
                    className="property-textarea"
                    placeholder="填写或编辑当前卡片的提示词"
                  />
                </section>

                <section className="property-section">
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-cyan-100">
                    <GitCompare size={14} />
                    手动提示词比对
                  </div>
                  <select
                    value={compareNodeId}
                    onChange={(event) => handleCompareNodeChange(event.target.value)}
                    className="property-input"
                  >
                    <option value="">选择一张已有卡片，或直接粘贴文本</option>
                    {promptNodes.map((item) => (
                      <option key={item.id} value={item.id}>{item.title}</option>
                    ))}
                  </select>
                  <textarea
                    value={comparePrompt}
                    onChange={(event) => {
                      setComparePrompt(event.target.value);
                      setCompareNodeId('');
                      setDiff(null);
                    }}
                    className="property-textarea mt-2"
                    placeholder="粘贴要对比的提示词"
                  />
                  <button
                    type="button"
                    className="property-action"
                    onClick={() => setDiff(getPromptDiff(comparePrompt, prompt))}
                  >
                    标记不同之处
                  </button>
                  {diff && (
                    <div className="property-diff">
                      <p className="property-diff-title">差异部分</p>
                      <p className="property-diff-text">
                        {diff.prefix}
                        <mark>{diff.changed}</mark>
                        {diff.suffix}
                      </p>
                      <p className="property-diff-chip">{diff.changed}</p>
                    </div>
                  )}
                </section>
              </>
            )}
          </div>

          <div className="mt-4 border-t border-white/10 pt-4">
            <button type="button" onClick={onSave} className="property-save">
              <Save size={16} />
              保存页面状态
            </button>
            {savedAt && <p className="mt-2 text-xs text-emerald-100/70">已保存：{savedAt}</p>}
          </div>
        </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
