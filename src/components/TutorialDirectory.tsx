import { BookOpen, ChevronLeft, ChevronRight, ImageIcon, Layers3, Plus } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import type { AppView } from '../types/view';

interface Props {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
}

export default function TutorialDirectory({ activeView, onNavigate }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`fixed left-0 top-1/2 z-40 flex h-[92px] w-9 -translate-y-1/2 flex-col items-center justify-center gap-1 rounded-r-xl border border-l-0 border-cyan-200/20 bg-[#070b0d]/95 text-cyan-50/90 shadow-[0_0_18px_rgba(34,211,238,.16)] transition hover:w-10 hover:border-cyan-200/45 hover:bg-[#0b1417] ${open ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
        aria-label="打开课程目录"
      >
        <ChevronRight size={14} />
        <span className="vertical-text text-[11px] font-medium tracking-[.12em]">课程目录</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.aside
            className="solid-tool-panel fixed bottom-4 left-4 top-[84px] z-50 w-[320px] rounded-3xl p-4"
            initial={{ x: -340, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -340, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 240, damping: 28 }}
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[.28em] text-zinc-500">Course Directory</p>
                <h2 className="mt-2 text-lg font-semibold text-white">课程目录导航</h2>
                <p className="mt-1 text-xs leading-5 text-zinc-500">当前课程与后续更新会集中放在这里。</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-[#151a1d] text-zinc-300 hover:bg-[#1c2327]"
                aria-label="收起课程目录"
              >
                <ChevronLeft size={18} />
              </button>
            </div>

            <nav className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  onNavigate('case');
                  setOpen(false);
                }}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  activeView === 'case'
                    ? 'border-cyan-300/55 bg-[#0a2429] text-white shadow-glow'
                    : 'border-white/10 bg-[#111518] text-zinc-300 hover:border-white/25 hover:bg-[#171d21]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-[#191f23]">
                    <Layers3 size={18} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">办公礼品产品替换场景重构教程</span>
                    <span className="mt-1 block text-xs text-zinc-500">4 个步骤 · 产品替换 / 场景重构</span>
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  onNavigate('geminiBasic');
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition ${
                  activeView === 'geminiBasic'
                    ? 'border-cyan-200/50 bg-[#0b2427] text-cyan-50 shadow-glow'
                    : 'border-white/10 bg-[#111518] text-zinc-400 hover:border-cyan-200/30 hover:bg-[#101b1e]'
                }`}
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-[#191f23]">
                  <ImageIcon size={18} />
                </span>
                <span>
                  <span className="block text-sm font-medium">Gemini 网页版基础操作流程</span>
                  <span className="mt-1 block text-xs text-zinc-500">打开网页 / 生成 / 编辑 / 下载</span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onNavigate('methodology');
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition ${
                  activeView === 'methodology'
                    ? 'border-amber-200/45 bg-[#2a2110] text-amber-50 shadow-gold'
                    : 'border-white/10 bg-[#111518] text-zinc-400 hover:border-amber-200/30 hover:bg-[#1b1710]'
                }`}
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-[#191f23]">
                  <BookOpen size={18} />
                </span>
                <span>
                  <span className="block text-sm font-medium">提示词方法论</span>
                  <span className="mt-1 block text-xs text-zinc-500">公式、分类、复盘框架</span>
                </span>
              </button>

              <div className="rounded-2xl border border-dashed border-white/12 bg-[#101417] p-4">
                <div className="flex items-center gap-3 text-zinc-400">
                  <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-[#191f23]">
                    <Plus size={18} />
                  </span>
                  <div>
                    <p className="text-sm font-medium">后续课程更新入口</p>
                    <p className="mt-1 text-xs text-zinc-500">新的教程会继续添加到这个目录。</p>
                  </div>
                </div>
              </div>
            </nav>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
