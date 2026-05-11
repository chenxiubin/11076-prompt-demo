import type { ReactNode } from 'react';
import TopBar from './TopBar';
import TutorialDirectory from './TutorialDirectory';
import type { AppView } from '../types/view';

interface Props {
  activeView: AppView;
  children: ReactNode;
  onNavigate: (view: AppView) => void;
}

export default function Layout({
  activeView,
  children,
  onNavigate,
}: Props) {
  const showCourseDirectory = activeView === 'case' || activeView === 'methodology' || activeView === 'geminiBasic';
  const mainClass =
    activeView === 'retouch'
      ? 'relative z-10 flex h-screen overflow-hidden pt-[64px]'
      : 'relative z-10 flex h-screen gap-4 overflow-hidden px-4 pt-[84px]';

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050506] text-zinc-100">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_30%_10%,rgba(48,174,255,.18),transparent_34%),radial-gradient(circle_at_80%_70%,rgba(255,192,76,.12),transparent_28%),linear-gradient(180deg,#050506,#090a0f)]" />
      <div className="noise-layer" />
      <div className="grid-layer" />
      <TopBar activeView={activeView} onNavigate={onNavigate} />
      {showCourseDirectory && <TutorialDirectory activeView={activeView} onNavigate={onNavigate} />}
      <main className={mainClass}>
        {children}
      </main>
    </div>
  );
}
