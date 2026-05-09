import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { methodology } from '../data/cases';

interface Props {
  onBack: () => void;
}

export default function MethodologyPage({ onBack }: Props) {
  return (
    <section className="h-full flex-1 overflow-hidden rounded-3xl border border-white/10 bg-black/30 p-10 shadow-2xl backdrop-blur-xl">
      <button
        type="button"
        onClick={onBack}
        className="absolute left-8 top-7 z-20 flex items-center gap-2 rounded-full border border-white/10 bg-white/[.04] px-4 py-2 text-sm text-zinc-200 backdrop-blur-xl transition hover:border-cyan-200/35 hover:bg-cyan-300/10"
      >
        <ArrowLeft size={16} />
        返回教程画布
      </button>
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="mx-auto flex h-full max-w-6xl flex-col justify-center">
        <p className="text-xs uppercase tracking-[.3em] text-amber-200/70">Prompt Methodology</p>
        <h2 className="mt-4 text-5xl font-semibold text-white">{methodology.title}</h2>
        <div className="mt-8 rounded-3xl border border-amber-200/20 bg-amber-200/8 p-8 shadow-gold">
          <p className="text-sm text-amber-100/70">公式</p>
          <p className="mt-3 text-3xl font-semibold leading-relaxed text-amber-50">{methodology.formula}</p>
        </div>
        <div className="mt-8 grid grid-cols-3 gap-4">
          {methodology.sections.map(([title, body], index) => (
            <motion.article
              key={title}
              className="rounded-3xl border border-white/10 bg-white/[.045] p-6 backdrop-blur-xl"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06 }}
            >
              <span className="font-mono text-xs text-zinc-500">{String(index + 1).padStart(2, '0')}</span>
              <h3 className="mt-4 text-xl font-semibold text-white">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-zinc-400">{body}</p>
            </motion.article>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
