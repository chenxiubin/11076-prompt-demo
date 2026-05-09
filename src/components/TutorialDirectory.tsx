import { BookOpen, ChevronLeft, ChevronRight, Layers3, Plus } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';

interface Props {
  activeView: 'case' | 'methodology';
  onTutorialSelect: () => void;
  onMethodology: () => void;
}

export default function TutorialDirectory({ activeView, onTutorialSelect, onMethodology }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`fixed left-0 top-1/2 z-40 flex -translate-y-1/2 items-center gap-2 rounded-r-2xl border border-l-0 border-cyan-200/25 bg-black/65 py-4 pl-2 pr-3 text-cyan-50 shadow-glow backdrop-blur-2xl transition hover:border-cyan-200/50 hover:bg-cyan-300/10 ${open ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
        aria-label="打开课程目录"
      >
        <ChevronRight size={18} />
        <span className="vertical-text text-[11px] tracking-[.22em]">课程目录</span>
      </button>

      {!open && (
        <div className="pointer-events-none fixed left-12 top-1/2 z-30 -translate-y-1/2 rounded-full border border-white/10 bg-black/42 px-3 py-1 text-[11px] text-zinc-400 backdrop-blur-xl">
          后续教程从这里进入
        </div>
      )}

      <AnimatePresence>
        {open && (
          <motion.aside
            className="fixed bottom-4 left-4 top-[84px] z-50 w-[320px] rounded-3xl border border-white/10 bg-black/62 p-4 shadow-2xl backdrop-blur-2xl"
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
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
                aria-label="收起课程目录"
              >
                <ChevronLeft size={18} />
              </button>
            </div>

            <nav className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  onTutorialSelect();
                  setOpen(false);
                }}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  activeView === 'case'
                    ? 'border-cyan-300/55 bg-cyan-300/12 text-white shadow-glow'
                    : 'border-white/10 bg-white/[.04] text-zinc-300 hover:border-white/25 hover:bg-white/[.07]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/7">
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
                  onMethodology();
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition ${
                  activeView === 'methodology'
                    ? 'border-amber-200/45 bg-amber-200/10 text-amber-50 shadow-gold'
                    : 'border-white/10 bg-white/[.035] text-zinc-400 hover:border-amber-200/30 hover:bg-amber-200/10'
                }`}
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/7">
                  <BookOpen size={18} />
                </span>
                <span>
                  <span className="block text-sm font-medium">提示词方法论</span>
                  <span className="mt-1 block text-xs text-zinc-500">公式、分类、复盘框架</span>
                </span>
              </button>

              <div className="rounded-2xl border border-dashed border-white/12 bg-white/[.025] p-4">
                <div className="flex items-center gap-3 text-zinc-400">
                  <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[.04]">
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
