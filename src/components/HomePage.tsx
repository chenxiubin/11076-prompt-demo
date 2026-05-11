import { ArrowRight, Image, Network, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import type { AppView } from '../types/view';

interface Props {
  onNavigate: (view: AppView) => void;
}

const modules: Array<{
  view: AppView;
  title: string;
  subtitle: string;
  description: string;
  status: string;
  icon: typeof Image;
  tone: string;
}> = [
  {
    view: 'retouch',
    title: '修图平台',
    subtitle: '白底抠图 / 裁切构图 / 商品图输出',
    description: '承接谷联视觉部产品白底修图平台，面向商品图裁切、白底预览、模式化修图与 PNG 输出。',
    status: '已接入',
    icon: Image,
    tone: 'from-emerald-300/18 to-cyan-300/8',
  },
  {
    view: 'methodology',
    title: 'AI 提示词宝典',
    subtitle: 'Nano Banana / 电商视觉 / 模板方法论',
    description: '整理 Gemini Nano Banana 电商视觉入门教程，包含官方模型介绍、图文步骤、提示词公式、模板、品类实操和问题修正。',
    status: '教程中',
    icon: Sparkles,
    tone: 'from-cyan-300/18 to-violet-300/8',
  },
  {
    view: 'draw',
    title: 'AI 绘图平台',
    subtitle: '无限画布 / Agent 编排 / 多轮生成',
    description: '后续面向 AI 绘图 Agent 工作流：素材节点、提示词节点、模型节点和结果节点自动协作。',
    status: '规划中',
    icon: Network,
    tone: 'from-amber-300/18 to-fuchsia-300/8',
  },
];

export default function HomePage({ onNavigate }: Props) {
  return (
    <section className="home-shell h-full w-full overflow-hidden rounded-3xl p-8">
      <div className="mx-auto flex h-full max-w-7xl flex-col">
        <motion.div
          className="flex items-start justify-between gap-8"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="max-w-3xl">
            <div className="flex items-center gap-4">
              <img src="/assets/GuLianLOGO.png" alt="谷联" className="h-14 w-14 object-contain" />
              <div>
                <p className="text-xs uppercase tracking-[.32em] text-cyan-200/70">Gulian Visual AI Workspace</p>
                <h1 className="mt-2 text-4xl font-semibold tracking-tight text-white">谷联视觉部 AI 工具工作台</h1>
              </div>
            </div>
            <p className="mt-6 text-base leading-8 text-zinc-400">
              把白底修图、提示词教学和 AI 绘图 Agent 统一到一个视觉系统里。这里是入口层，进入不同板块后保持同一套深色、实色工具面板和课程演示语言。
            </p>
          </div>
          <div className="hidden min-w-[280px] rounded-3xl border border-white/10 bg-[#0b0f12] p-5 shadow-2xl lg:block">
            <p className="text-xs uppercase tracking-[.24em] text-zinc-500">Current Build</p>
            <p className="mt-3 text-2xl font-semibold text-white">3 个核心板块</p>
            <p className="mt-2 text-sm leading-6 text-zinc-500">修图生产、课程沉淀、生成工作流会逐步汇入这里。</p>
          </div>
        </motion.div>

        <div className="mt-10 grid flex-1 grid-cols-1 gap-5 lg:grid-cols-3">
          {modules.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.button
                key={item.title}
                type="button"
                onClick={() => onNavigate(item.view)}
                className="home-module-card group relative overflow-hidden rounded-3xl border border-white/10 bg-[#0b0f12] p-6 text-left shadow-2xl transition hover:-translate-y-1 hover:border-cyan-200/35"
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 + 0.12, duration: 0.46 }}
              >
                <div className={`absolute inset-x-0 top-0 h-32 bg-gradient-to-br ${item.tone}`} />
                <div className="relative z-10 flex h-full flex-col">
                  <div className="flex items-start justify-between">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-[#12181c] text-cyan-100">
                      <Icon size={22} />
                    </span>
                    <span className="rounded-full border border-white/10 bg-[#11161a] px-3 py-1 text-xs text-zinc-400">{item.status}</span>
                  </div>
                  <div className="mt-12">
                    <p className="text-xs uppercase tracking-[.22em] text-zinc-500">{item.subtitle}</p>
                    <h2 className="mt-3 text-2xl font-semibold text-white">{item.title}</h2>
                    <p className="mt-4 min-h-[96px] text-sm leading-7 text-zinc-400">{item.description}</p>
                  </div>
                  <div className="mt-auto flex items-center justify-between border-t border-white/10 pt-5">
                    <span className="text-sm font-medium text-cyan-100">进入板块</span>
                    <span className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-[#141a1e] text-zinc-200 transition group-hover:border-cyan-200/40 group-hover:text-cyan-100">
                      <ArrowRight size={18} />
                    </span>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
