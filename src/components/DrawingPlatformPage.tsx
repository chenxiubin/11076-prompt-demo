import { Bot, Cable, ImagePlus, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const drawingFeatures: Array<{ title: string; body: string; icon: LucideIcon }> = [
  { title: '素材节点', body: '导入产品、场景、品牌参考。', icon: ImagePlus },
  { title: 'Agent 编排', body: '自动拆解目标、补充约束、生成下一轮提示词。', icon: Bot },
  { title: '多轮链路', body: '提示词、模型、结果图用时间线连接复盘。', icon: Cable },
];

export default function DrawingPlatformPage() {
  return (
    <section className="home-shell h-full w-full overflow-hidden rounded-3xl p-8">
      <div className="mx-auto flex h-full max-w-6xl flex-col justify-center">
        <p className="text-xs uppercase tracking-[.32em] text-amber-200/70">AI Drawing Agent Canvas</p>
        <h1 className="mt-4 text-4xl font-semibold text-white">AI 绘图平台</h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-zinc-400">
          这里会作为后续无限画布 Agent 方向：素材输入、提示词规划、模型调用、结果评估和自动迭代都将变成可连接的节点。
        </p>
        <div className="mt-10 grid grid-cols-3 gap-4">
          {drawingFeatures.map(({ title, body, icon: Icon }) => (
            <article key={title} className="rounded-3xl border border-white/10 bg-[#0b0f12] p-6 shadow-2xl">
              <span className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-[#141a1e] text-amber-100">
                <Icon size={20} />
              </span>
              <h2 className="mt-6 text-xl font-semibold text-white">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-zinc-400">{body}</p>
            </article>
          ))}
        </div>
        <div className="mt-8 rounded-3xl border border-amber-200/20 bg-[#171207] p-6 text-amber-50">
          <div className="flex items-center gap-3">
            <Sparkles size={18} />
            <p className="font-semibold">下一步预留：把当前 AI 提示词宝典的画布能力抽象成通用 Agent 工作流。</p>
          </div>
        </div>
      </div>
    </section>
  );
}
