import { Home } from 'lucide-react';
import type { AppView } from '../types/view';

interface Props {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
}

const titleMap: Record<AppView, { title: string; subtitle: string }> = {
  home: { title: '谷联视觉部 AI 工具工作台', subtitle: 'Gulian Visual AI Workspace' },
  retouch: { title: '谷联视觉部产品白底修图平台', subtitle: '白底抠图 / 商品图输出' },
  case: { title: '办公礼品产品替换场景重构教程', subtitle: 'AI 电商视觉提示词演化实验室' },
  draw: { title: 'AI 绘图平台', subtitle: '无限画布 Agent 方向' },
  methodology: { title: 'AI 提示词宝典', subtitle: 'Gemini Nano Banana 电商视觉入门教程' },
  geminiBasic: { title: 'Gemini 网页版基础操作流程', subtitle: '基础图文教程 / 网页生成与下载流程' },
};

export default function TopBar({ activeView, onNavigate }: Props) {
  const copy = titleMap[activeView];
  return (
    <header className="fixed left-0 right-0 top-0 z-40 border-b border-white/10 bg-[#05080a]/95 px-6 py-3 shadow-2xl">
      <div className="flex items-center justify-between gap-5">
        <div className="flex min-w-[300px] items-center gap-3">
          <img
            src="/assets/GuLianLOGO.png"
            alt="谷联"
            className="h-10 w-10 shrink-0 object-contain"
          />
          <div>
            <h1 className="text-base font-semibold tracking-wide">{copy.title}</h1>
            <p className="text-xs text-zinc-500">{copy.subtitle}</p>
          </div>
        </div>
        {activeView !== 'home' && (
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-[#101417] px-4 py-2 text-sm text-zinc-200 transition hover:border-cyan-200/40 hover:text-cyan-100"
          >
            <Home size={16} />
            返回主页
          </button>
        )}
      </div>
    </header>
  );
}
