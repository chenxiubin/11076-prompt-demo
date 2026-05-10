export default function TopBar() {
  return (
    <header className="fixed left-0 right-0 top-0 z-40 border-b border-white/10 bg-black/45 px-6 py-3 backdrop-blur-2xl">
      <div className="flex items-center gap-5">
        <div className="flex min-w-[300px] items-center gap-3">
          <img
            src="/assets/GuLianLOGO.png"
            alt="谷联"
            className="h-10 w-10 shrink-0 object-contain"
          />
          <div>
            <h1 className="text-base font-semibold tracking-wide">办公礼品产品替换场景重构教程</h1>
            <p className="text-xs text-zinc-500">AI 电商视觉提示词演化实验室</p>
          </div>
        </div>
      </div>
    </header>
  );
}
