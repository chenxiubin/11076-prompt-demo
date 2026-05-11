import { useState } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clipboard,
  Copy,
  ExternalLink,
  ImageIcon,
  Layers3,
  Lightbulb,
  Sparkles,
  Wand2,
} from 'lucide-react';
import {
  categories,
  compactPrompt,
  controlKnobs,
  fixes,
  guideCases,
  imageLayers,
  officialNanoCards,
  promptFormula,
  scalist,
  templates,
} from '../data/promptGuide';

interface Props {
  onBack: () => void;
}

const chapters = [
  ['intro', '课程导读'],
  ['visual', '看图理解'],
  ['basic', '基础理论'],
  ['workflow', '生成流程'],
  ['formula', '提示词公式'],
  ['scalist', 'SCALIST'],
  ['templates', '模板工具箱'],
  ['fixes', '问题修正'],
  ['cases', '实战案例'],
];

const generatedAssets = {
  hero: '/assets/prompt-guide/generated/hero-visual.png',
  control: '/assets/prompt-guide/generated/control-panel-visual.png',
  workflow: '/assets/prompt-guide/generated/workflow-visual.png',
  layerCase: '/assets/prompt-guide/generated/six-layer-real-case.png',
};

const beginnerConcepts = [
  {
    title: '提示词是什么？',
    body: '提示词不是关键词堆砌，而是给 AI 的拍摄说明书：拍什么、保留什么、改什么、怎么打光、输出什么比例。',
    simple: '把 AI 当成摄影师，你要把需求讲清楚。',
  },
  {
    title: '为什么产品会变形？',
    body: '因为模型会“重画”画面。如果没有明确说产品结构、Logo、文字和比例不能变，它就可能自由发挥。',
    simple: '先锁产品，再改背景。',
  },
  {
    title: '为什么要多轮修改？',
    body: 'AI 图像生成有随机性。第一轮看方向，第二轮补约束，第三轮修错误，最后整理成完整提示词重新生成。',
    simple: '抽卡不可怕，关键是会复盘。',
  },
  {
    title: '为什么重要文字要后期排版？',
    body: 'AI 可以生成氛围和产品视觉，但促销标题、卖点文字、品牌规范最好在 PS / Figma 里完成，稳定性更高。',
    simple: 'AI 做画面，设计软件做准字。',
  },
];

export default function MethodologyPage({ onBack }: Props) {
  const [copied, setCopied] = useState('');

  const copyPrompt = async (label: string, text: string) => {
    await navigator.clipboard?.writeText(text);
    setCopied(label);
    window.setTimeout(() => setCopied(''), 1400);
  };

  return (
    <section className="flex h-full flex-1 overflow-hidden rounded-3xl border border-white/10 bg-[#05080a] shadow-2xl">
      <aside className="hidden w-[260px] shrink-0 border-r border-white/10 bg-[#070b0d] p-5 xl:block">
        <button
          type="button"
          onClick={onBack}
          className="mb-6 flex items-center gap-2 rounded-full border border-white/10 bg-[#11171b] px-4 py-2 text-sm text-zinc-200 transition hover:border-cyan-200/35 hover:text-cyan-100"
        >
          <ArrowLeft size={16} />
          返回教程画布
        </button>
        <p className="text-xs uppercase tracking-[.28em] text-cyan-200/60">Prompt Guide</p>
        <h2 className="mt-3 text-xl font-semibold leading-7 text-white">AI 提示词宝典</h2>
        <p className="mt-2 text-xs leading-5 text-zinc-500">面向小白的电商视觉 AI 入门课</p>
        <nav className="mt-7 space-y-1">
          {chapters.map(([id, title], index) => (
            <a
              key={id}
              href={`#${id}`}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-zinc-400 transition hover:bg-[#11171b] hover:text-cyan-100"
            >
              <span className="font-mono text-[11px] text-zinc-600">{String(index + 1).padStart(2, '0')}</span>
              {title}
            </a>
          ))}
        </nav>
      </aside>

      <div className="thin-scroll min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
          <section id="intro" className="scroll-mt-8">
            <motion.header
              className="grid overflow-hidden rounded-3xl border border-cyan-200/14 bg-[#081014] lg:grid-cols-[1fr_1.08fr]"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="p-8 lg:p-10">
                <p className="text-xs font-semibold uppercase tracking-[.34em] text-cyan-100/70">Gemini Nano Banana Course</p>
                <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white lg:text-6xl">
                  AI 提示词宝典
                </h1>
                <p className="mt-5 text-lg leading-8 text-zinc-300">
                  这版按“小白先看懂，再学会写”的顺序重整：先用配图理解 AI 作图逻辑，再学习提示词公式、模板和问题修正。
                </p>
                <div className="mt-7 grid gap-3 sm:grid-cols-2">
                  {['产品不能乱变', '场景可以重构', '提示词要分层', '结果要会复盘'].map((item) => (
                    <div key={item} className="rounded-2xl border border-white/10 bg-[#0b0f12] px-4 py-3 text-sm text-cyan-50">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative min-h-[360px] overflow-hidden border-t border-white/10 bg-black lg:border-l lg:border-t-0">
                <img src={generatedAssets.hero} alt="AI 电商视觉课程配图" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#081014] via-transparent to-transparent lg:bg-gradient-to-l" />
              </div>
            </motion.header>
          </section>

          <GuideSection id="visual" eyebrow="Visual First" title="先看图：AI 电商图到底在控制什么" icon={<ImageIcon size={20} />}>
            <article className="overflow-hidden rounded-3xl border border-white/10 bg-[#0b0f12]">
              <img
                src={generatedAssets.control}
                alt="提示词控制面板示意图"
                className="max-h-[560px] w-full bg-black object-contain"
              />
              <div className="border-t border-white/10 p-5">
                <h3 className="text-2xl font-semibold text-white">提示词像一个控制面板</h3>
                <p className="mt-2 max-w-4xl text-sm leading-7 text-zinc-400">
                  图里的旋钮代表约束和要求，预览代表最终画面。你写得越清楚，模型越知道哪些地方能改，哪些地方不能碰。
                </p>
                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  {controlKnobs.map((item, index) => (
                    <motion.article
                      key={item.title}
                      className="rounded-2xl border border-white/10 bg-[#07090b] p-4"
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.04 }}
                    >
                      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-white/8">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-emerald-300"
                          initial={{ width: 0 }}
                          whileInView={{ width: `${item.value}%` }}
                          viewport={{ once: true }}
                        />
                      </div>
                      <h4 className="text-base font-semibold text-white">{item.title}</h4>
                      <p className="mt-2 min-h-[48px] text-xs leading-5 text-zinc-500">{item.body}</p>
                      <p className="mt-3 rounded-xl border border-cyan-200/12 bg-cyan-300/8 p-3 text-xs leading-5 text-cyan-50">{item.example}</p>
                    </motion.article>
                  ))}
                </div>
              </div>
            </article>
          </GuideSection>

          <GuideSection id="basic" eyebrow="Basic Theory" title="小白必须先懂的 4 个基础概念" icon={<Lightbulb size={20} />}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {beginnerConcepts.map((item, index) => (
                <motion.article
                  key={item.title}
                  className="rounded-2xl border border-white/10 bg-[#0b0f12] p-5"
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ delay: index * 0.05 }}
                >
                  <span className="font-mono text-xs text-cyan-200/50">{String(index + 1).padStart(2, '0')}</span>
                  <h3 className="mt-4 text-lg font-semibold text-white">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-zinc-400">{item.body}</p>
                  <p className="mt-4 rounded-xl border border-amber-200/16 bg-amber-300/8 p-3 text-xs leading-5 text-amber-50">{item.simple}</p>
                </motion.article>
              ))}
            </div>

            <div className="mt-5 grid gap-5 xl:grid-cols-[.95fr_1.05fr]">
              <div className="xl:col-span-2 rounded-3xl border border-white/10 bg-[#0b0f12] p-5">
                <h3 className="text-xl font-semibold text-white">一张电商图可以拆成 6 个可控区域</h3>
                <p className="mt-3 text-sm leading-7 text-zinc-400">
                  写提示词时不要只说“变高级”，而是逐项告诉 AI：产品别动、文字别乱、材质真实、背景换哪里、光影怎么打、最后输出什么比例。
                </p>
                <div className="mt-5 overflow-hidden rounded-3xl border border-white/10 bg-[#07090b]">
                  <img
                    src={generatedAssets.layerCase}
                    alt="办公礼品电商视觉案例图"
                    className="max-h-[620px] w-full object-contain"
                  />
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {imageLayers.map((layer) => (
                    <div key={layer.title} className="rounded-2xl border bg-[#07090b] p-4" style={{ borderColor: `${layer.color}55` }}>
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: layer.color }} />
                        <p className="text-sm font-semibold text-white">{layer.title}</p>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-zinc-500">{layer.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </GuideSection>

          <GuideSection id="workflow" eyebrow="Workflow" title="从原始图到最终图：一眼看懂完整流程" icon={<Layers3 size={20} />}>
            <VisualPanel
              image={generatedAssets.workflow}
              title="上传图片 → 写提示词 → 生成 → 找问题 → 补约束 → 出终稿"
              body="这张图对应你课程里的完整演化过程。重点不是让学生背模板，而是让他们知道每一轮为什么要改提示词。"
            />
          </GuideSection>

          <GuideSection id="formula" eyebrow="Formula" title="先学公式，再复制模板" icon={<Wand2 size={20} />}>
            <div className="rounded-3xl border border-amber-200/18 bg-[#141006] p-6 shadow-gold">
              <p className="text-sm text-amber-100/70">万能公式</p>
              <p className="mt-3 text-2xl font-semibold leading-relaxed text-amber-50">{promptFormula.formula}</p>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <CopyCard title="可替换模板" text={promptFormula.template} copied={copied} onCopy={copyPrompt} />
              <CopyCard title="填写示例" text={promptFormula.example} copied={copied} onCopy={copyPrompt} />
            </div>
          </GuideSection>

          <GuideSection id="scalist" eyebrow="SCALIST" title="SCALIST：把提示词拆成 7 个检查点" icon={<BookOpen size={20} />}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
              {scalist.map((item, index) => (
                <article key={`${item.key}-${item.title}`} className="rounded-2xl border border-white/10 bg-[#0b0f12] p-4">
                  <span className="grid h-10 w-10 place-items-center rounded-xl border border-cyan-200/20 bg-cyan-300/10 font-mono text-cyan-100">
                    {item.key}
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-white">{item.title}</h3>
                  <p className="mt-3 min-h-[72px] text-xs leading-6 text-zinc-500">{item.body}</p>
                  <p className="mt-3 rounded-xl border border-white/10 bg-[#07090b] p-3 text-xs leading-6 text-zinc-300">{item.example}</p>
                  <span className="mt-3 block font-mono text-[10px] text-zinc-600">STEP {index + 1}</span>
                </article>
              ))}
            </div>
          </GuideSection>

          <GuideSection id="templates" eyebrow="Templates" title="常用电商场景提示词模板" icon={<Clipboard size={20} />}>
            <div className="grid gap-4 lg:grid-cols-2">
              {templates.map((item) => (
                <CopyCard key={item.title} title={item.title} subtitle={`适合：${item.fit}`} text={item.prompt} copied={copied} onCopy={copyPrompt} />
              ))}
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-4">
              {categories.map((item) => (
                <article key={item.title} className="rounded-2xl border border-white/10 bg-[#0b0f12] p-5">
                  <h3 className="text-xl font-semibold text-white">{item.title}</h3>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.focus.map((tag) => (
                      <span key={tag} className="rounded-full border border-white/10 bg-[#11171b] px-3 py-1 text-xs text-zinc-300">
                        {tag}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </GuideSection>

          <GuideSection id="fixes" eyebrow="Troubleshooting" title="常见问题与修正提示词" icon={<CheckCircle2 size={20} />}>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {fixes.map(([title, text]) => (
                <article key={title} className="rounded-2xl border border-red-300/12 bg-[#120b0b] p-5">
                  <h3 className="text-base font-semibold text-red-100">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-zinc-300">{text}</p>
                </article>
              ))}
            </div>
          </GuideSection>

          <GuideSection id="cases" eyebrow="Practice" title="实战案例与万能精简版" icon={<Sparkles size={20} />}>
            <div className="grid gap-4 lg:grid-cols-2">
              {guideCases.map((item) => (
                <article key={item.title} className="rounded-2xl border border-white/10 bg-[#0b0f12] p-5">
                  <h3 className="text-xl font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm text-cyan-100/70">目标：{item.goal}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.problem.map((problem) => (
                      <span key={problem} className="rounded-full border border-red-300/16 bg-red-400/8 px-3 py-1 text-xs text-red-100">
                        {problem}
                      </span>
                    ))}
                  </div>
                  <p className="mt-4 text-sm leading-7 text-zinc-400">{item.prompt}</p>
                </article>
              ))}
            </div>
            <div className="mt-4">
              <CopyCard title="最常用精简提示词" text={compactPrompt} copied={copied} onCopy={copyPrompt} />
            </div>
          </GuideSection>

          <GuideSection id="official" eyebrow="Reference" title="官方模型补充说明" icon={<ExternalLink size={20} />}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {officialNanoCards.map((card) => (
                <article key={card.title} className="rounded-2xl border border-white/10 bg-[#0b0f12] p-5">
                  <p className="text-xs uppercase tracking-[.22em] text-cyan-200/60">{card.tag}</p>
                  <h3 className="mt-3 text-xl font-semibold text-white">{card.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-zinc-400">{card.body}</p>
                </article>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-3 text-sm">
              <SourceLink href="https://gemini.google/overview/image-generation/" label="Gemini 图片生成官方页" />
              <SourceLink href="https://blog.google/innovation-and-ai/technology/ai/nano-banana-2/" label="Google Nano Banana 2 官方博客" />
            </div>
          </GuideSection>

        </div>
      </div>
    </section>
  );
}

function GuideSection({
  id,
  eyebrow,
  title,
  icon,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-8 py-8">
      <div className="mb-5 flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl border border-cyan-200/18 bg-cyan-300/10 text-cyan-100">
          {icon}
        </span>
        <div>
          <p className="text-xs uppercase tracking-[.26em] text-cyan-200/50">{eyebrow}</p>
          <h2 className="mt-1 text-2xl font-semibold text-white">{title}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}

function VisualPanel({ image, title, body }: { image: string; title: string; body: string }) {
  return (
    <article className="overflow-hidden rounded-3xl border border-white/10 bg-[#0b0f12]">
      <img src={image} alt={title} className="h-[360px] w-full object-cover" />
      <div className="border-t border-white/10 p-5">
        <h3 className="text-xl font-semibold text-white">{title}</h3>
        <p className="mt-2 text-sm leading-7 text-zinc-400">{body}</p>
      </div>
    </article>
  );
}

function SourceLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#11171b] px-4 py-2 text-zinc-300 transition hover:border-cyan-200/35 hover:text-cyan-100"
    >
      {label}
      <ExternalLink size={14} />
    </a>
  );
}

function CopyCard({
  title,
  subtitle,
  text,
  copied,
  onCopy,
}: {
  title: string;
  subtitle?: string;
  text: string;
  copied: string;
  onCopy: (label: string, text: string) => void;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-[#0b0f12] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          {subtitle && <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={() => onCopy(title, text)}
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-cyan-200/18 bg-cyan-300/8 px-3 py-2 text-xs font-semibold text-cyan-50 transition hover:border-cyan-200/35"
        >
          <Copy size={14} />
          {copied === title ? '已复制' : '复制'}
        </button>
      </div>
      <p className="mt-4 rounded-2xl border border-white/10 bg-[#07090b] p-4 text-sm leading-7 text-zinc-300">{text}</p>
    </article>
  );
}
