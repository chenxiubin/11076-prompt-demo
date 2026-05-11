import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ImageIcon } from 'lucide-react';
import { geminiWebTutorial } from '../data/promptGuide';

interface Props {
  onBack: () => void;
}

const chapters = geminiWebTutorial.map((item) => [item.step, item.title] as const);

export default function GeminiWebBasicPage({ onBack }: Props) {
  return (
    <section className="flex h-full flex-1 overflow-hidden rounded-3xl border border-white/10 bg-[#05080a] shadow-2xl">
      <aside className="hidden w-[280px] shrink-0 border-r border-white/10 bg-[#070b0d] p-5 xl:block">
        <button
          type="button"
          onClick={onBack}
          className="mb-6 flex items-center gap-2 rounded-full border border-white/10 bg-[#11171b] px-4 py-2 text-sm text-zinc-200 transition hover:border-cyan-200/35 hover:text-cyan-100"
        >
          <ArrowLeft size={16} />
          返回教程画布
        </button>
        <p className="text-xs uppercase tracking-[.28em] text-cyan-200/60">Gemini Web Basic</p>
        <h2 className="mt-3 text-xl font-semibold leading-7 text-white">Gemini 网页版基础操作流程</h2>
        <p className="mt-2 text-xs leading-5 text-zinc-500">从打开网页到下载图片的基础图文教程</p>
        <nav className="mt-7 space-y-1">
          {chapters.map(([id, title], index) => (
            <a
              key={id}
              href={`#web-step-${id}`}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-zinc-400 transition hover:bg-[#11171b] hover:text-cyan-100"
            >
              <span className="font-mono text-[11px] text-zinc-600">{String(index + 1).padStart(2, '0')}</span>
              <span className="line-clamp-1">{title}</span>
            </a>
          ))}
        </nav>
      </aside>

      <div className="thin-scroll min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-6 py-8 lg:px-10">
          <motion.header
            className="rounded-3xl border border-cyan-200/14 bg-[#081014] p-8 lg:p-10"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl border border-cyan-200/20 bg-cyan-300/10 text-cyan-100">
                <ImageIcon size={22} />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.34em] text-cyan-100/70">Tutorial 02</p>
                <h1 className="mt-2 text-4xl font-semibold tracking-tight text-white lg:text-5xl">
                  Gemini 网页版基础操作流程
                </h1>
              </div>
            </div>
            <p className="mt-6 max-w-4xl text-base leading-8 text-zinc-300">
              这一页从《Gemini 网页基础操作》文档中单独提取出来，作为课程目录里的独立教程。阅读顺序就是文档顺序：打开 Gemini、输入图片生成提示词、提交生成、使用 Nano Banana 2 编辑、使用 Nano Banana Pro 重做、下载导出并进入 PS 收尾。
            </p>
          </motion.header>

          <article className="mt-8 rounded-3xl border border-white/10 bg-[#080c0f] p-6 lg:p-8">
            <div className="space-y-12">
              {geminiWebTutorial.map((item) => (
                <TutorialArticleStep key={item.step} item={item} />
              ))}
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

function TutorialArticleStep({
  item,
}: {
  item: {
    step: string;
    title: string;
    paragraphs: string[];
    badExample?: string;
    goodExample?: string;
    notes?: string[];
    figures: {
      src: string;
      caption: string;
    }[];
  };
}) {
  return (
    <section id={`web-step-${item.step}`} className="scroll-mt-8 border-t border-white/10 pt-8 first:border-t-0 first:pt-0">
      <div className="grid gap-5 lg:grid-cols-[88px_minmax(0,1fr)]">
        <div>
          <span className="grid h-14 w-14 place-items-center rounded-2xl border border-cyan-200/22 bg-cyan-300/10 font-mono text-base text-cyan-100">
            {item.step}
          </span>
        </div>
        <div className="min-w-0">
          <h3 className="text-2xl font-semibold text-white">{item.title}</h3>
          <TextStack>
            {item.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </TextStack>

          {(item.badExample || item.goodExample) && (
            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              {item.badExample && (
                <div className="rounded-2xl border border-red-300/16 bg-red-400/8 p-4">
                  <p className="text-xs uppercase tracking-[.2em] text-red-200/70">不要只写</p>
                  <p className="mt-2 text-sm leading-7 text-red-50">{item.badExample}</p>
                </div>
              )}
              {item.goodExample && (
                <div className="rounded-2xl border border-emerald-300/18 bg-emerald-400/8 p-4">
                  <p className="text-xs uppercase tracking-[.2em] text-emerald-200/70">建议写成</p>
                  <p className="mt-2 text-sm leading-7 text-emerald-50">{item.goodExample}</p>
                </div>
              )}
            </div>
          )}

          {item.notes && item.notes.length > 0 && (
            <ul className="mt-5 max-w-4xl space-y-2">
              {item.notes.map((note) => (
                <li key={note} className="flex gap-3 text-sm leading-7 text-zinc-300">
                  <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6 space-y-5">
            {item.figures.map((figure) => (
              <figure key={`${item.step}-${figure.src}`} className="overflow-hidden rounded-2xl border border-white/10 bg-black">
                <div className="flex min-h-[220px] items-center justify-center p-3">
                  <img
                    src={figure.src}
                    alt={figure.caption}
                    className="max-h-[680px] w-full object-contain"
                    loading="lazy"
                  />
                </div>
                <figcaption className="border-t border-white/10 bg-[#0d1215] px-4 py-3 text-xs leading-5 text-zinc-500">
                  {figure.caption}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function TextStack({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 max-w-4xl space-y-3 text-sm leading-7 text-zinc-400">
      {children}
    </div>
  );
}
