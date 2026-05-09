import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Layout from './components/Layout';
import InfiniteCanvas from './components/InfiniteCanvas';
import AnalysisPanel from './components/AnalysisPanel';
import ImagePreviewModal from './components/ImagePreviewModal';
import MethodologyPage from './components/MethodologyPage';
import { cases } from './data/cases';
import type { CaseNode } from './types/case';

const firstPrompt = (nodes: CaseNode[]) => nodes.find((node) => node.type === 'prompt') ?? nodes[0];

export default function App() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeView, setActiveView] = useState<'case' | 'methodology'>('case');
  const [selectedNode, setSelectedNode] = useState<CaseNode>(firstPrompt(cases[0].nodes));
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isPresentation, setIsPresentation] = useState(false);

  const activeCase = cases[activeIndex];
  const selectedInCase = useMemo(
    () => activeCase.nodes.find((node) => node.id === selectedNode.id) ?? firstPrompt(activeCase.nodes),
    [activeCase, selectedNode],
  );

  const changeCase = (index: number) => {
    const next = (index + cases.length) % cases.length;
    setActiveView('case');
    setActiveIndex(next);
    setSelectedNode(firstPrompt(cases[next].nodes));
  };

  return (
    <Layout
      activeCase={activeCase}
      activeView={activeView}
      onTutorialSelect={() => changeCase(0)}
      onMethodology={() => {
        setActiveView('methodology');
        setIsPresentation(false);
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={activeView === 'methodology' ? 'methodology' : activeCase.id}
          className="h-full min-w-0 flex-1"
          initial={{ opacity: 0, scale: 0.94, filter: 'blur(16px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, scale: 0.9, filter: 'blur(20px)' }}
          transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
        >
          {activeView === 'methodology' ? (
            <MethodologyPage onBack={() => changeCase(activeIndex)} />
          ) : (
            <InfiniteCanvas
              activeCase={activeCase}
              cases={cases}
              activeIndex={activeIndex}
              selectedNodeId={selectedInCase.id}
              isPresentation={isPresentation}
              onSelectNode={setSelectedNode}
              onPreviewImage={setPreviewImage}
              onCaseDelta={(delta) => changeCase(activeIndex + delta)}
              onCaseChange={changeCase}
              onMethodology={() => {
                setActiveView('methodology');
                setIsPresentation(false);
              }}
              onPresentationToggle={() => setIsPresentation((value) => !value)}
              onPresentationEnd={() => setIsPresentation(false)}
            />
          )}
        </motion.div>
      </AnimatePresence>
      {activeView === 'case' && <AnalysisPanel node={selectedInCase} />}
      <ImagePreviewModal image={previewImage} onClose={() => setPreviewImage(null)} />
    </Layout>
  );
}
