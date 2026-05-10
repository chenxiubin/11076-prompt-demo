import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Layout from './components/Layout';
import InfiniteCanvas from './components/InfiniteCanvas';
import AnalysisPanel from './components/AnalysisPanel';
import ImagePreviewModal from './components/ImagePreviewModal';
import MethodologyPage from './components/MethodologyPage';
import CanvasChrome from './components/CanvasChrome';
import { cases } from './data/cases';
import { pdfSeedConnectionsByCase, pdfSeedCustomNodesByCase, pdfSeedDeletedNodeIdsByCase, pdfSeedPositions } from './data/pdfSeedCanvas';
import type { CanvasConnection, CaseNode, NodeType } from './types/case';

interface PersistedCanvasState {
  uploadedImages: Record<string, string>;
  nodePositions: Record<string, { x: number; y: number }>;
  customNodesByCase: Record<string, CaseNode[]>;
  connectionsByCase: Record<string, CanvasConnection[]>;
  deletedNodeIdsByCase: Record<string, string[]>;
  deletedConnectionIdsByCase: Record<string, string[]>;
  nodeOverridesByCase: Record<string, Record<string, Partial<CaseNode>>>;
}

const storageKey = 'gulian-canvas-admin-state-v3';
const firstPrompt = (nodes: CaseNode[]) => nodes.find((node) => node.type === 'prompt') ?? nodes[0];

const emptyFirstCanvasDeletedNodes = {
  [cases[0].id]: cases[0].nodes.map((node) => node.id),
};

const pdfCaseBase = '/assets/pdf-case-01';

const pdfCasePrompts = [
  '将图1笔记本替换图2红圈内的笔记本，保持笔记本LOGO不变，产品其它结构保持不变，更换室内场景光影明亮柔和，保持文案内容不变优化排版，提升画面视觉，电商主图标准，比例3:4',
  '将图1笔记本替换图2红圈内的笔记本，保持笔记本LOGO不变，产品其它结构保持不变，更换场景参考图3风格不可与原图一致，保持文案内容不变，优化排版提升画面视觉，电商主图标准，比例3:4',
  '将图1笔记本替换图2红圈内的笔记本，保持笔记本LOGO不变，产品其它结构保持不变，更换场景参考图3风格不可与原图一致，保持文案内容不变，优化排版提升画面视觉，光影明亮柔和，电商主图标准，比例3:4',
  '将图1笔记本替换图2红圈内的笔记本，保持笔记本LOGO不变，产品其它结构保持不变，更换场景原木色桌面，其它参考图3风格不可与原图一致，保持文案内容不变，优化排版提升画面视觉，光影明亮柔和，电商主图标准，比例3:4',
];

const seededCase01Nodes: CaseNode[] = [
  {
    id: 'pdf-c1-material-1',
    type: 'material',
    title: '图1 白色笔记本',
    description: 'PDF 素材图 1：需要替换进主图的白色笔记本。',
    image: `${pdfCaseBase}/material-01.png`,
    custom: true,
  },
  {
    id: 'pdf-c1-material-2',
    type: 'material',
    title: '图2 待替换原图',
    description: 'PDF 素材图 2：红圈内笔记本为替换目标位置。',
    image: `${pdfCaseBase}/material-02.png`,
    custom: true,
  },
  {
    id: 'pdf-c1-material-3',
    type: 'material',
    title: '图3 场景参考',
    description: 'PDF 素材图 3：室内原木色、明亮柔和光影的场景参考。',
    image: `${pdfCaseBase}/material-03.png`,
    custom: true,
  },
  ...pdfCasePrompts.map((prompt, index) => ({
    id: `pdf-c1-generated-${index + 1}`,
    type: 'generated' as const,
    title: `AI生图${index + 1}`,
    description: `根据 PDF 第 ${index + 1} 条提示词生成的画面。`,
    image: `${pdfCaseBase}/generated-0${index + 1}.png`,
    prompt,
    custom: true,
  })),
  {
    id: 'pdf-c1-generated-5',
    type: 'generated',
    title: '抽卡1',
    description: 'PDF 中标注“抽卡”的生成结果。',
    image: `${pdfCaseBase}/generated-05.png`,
    prompt: '抽卡',
    custom: true,
  },
  {
    id: 'pdf-c1-generated-6',
    type: 'generated',
    title: '抽卡2',
    description: 'PDF 中标注“抽卡”的生成结果。',
    image: `${pdfCaseBase}/generated-06.png`,
    prompt: '抽卡',
    custom: true,
  },
];

const seededCase01Positions: Record<string, { x: number; y: number }> = {
  'pdf-c1-material-1': { x: 1020, y: 240 },
  'pdf-c1-material-2': { x: 1400, y: 240 },
  'pdf-c1-material-3': { x: 1780, y: 240 },
  'pdf-c1-generated-1': { x: 1020, y: 760 },
  'pdf-c1-generated-2': { x: 1580, y: 760 },
  'pdf-c1-generated-3': { x: 2140, y: 760 },
  'pdf-c1-generated-4': { x: 2700, y: 760 },
  'pdf-c1-generated-5': { x: 3260, y: 760 },
  'pdf-c1-generated-6': { x: 3820, y: 760 },
};

const seededCase01Connections: CanvasConnection[] = [
  { id: 'pdf-c1-link-material-1', from: 'pdf-c1-material-1', to: 'pdf-c1-generated-1', fromSide: 'right', toSide: 'left', kind: 'timeline' },
  { id: 'pdf-c1-link-material-2', from: 'pdf-c1-material-2', to: 'pdf-c1-generated-1', fromSide: 'right', toSide: 'left', kind: 'timeline' },
  { id: 'pdf-c1-link-material-3', from: 'pdf-c1-material-3', to: 'pdf-c1-generated-1', fromSide: 'right', toSide: 'left', kind: 'timeline' },
  { id: 'pdf-c1-link-generated-1-2', from: 'pdf-c1-generated-1', to: 'pdf-c1-generated-2', fromSide: 'right', toSide: 'left', kind: 'timeline' },
  { id: 'pdf-c1-link-generated-2-3', from: 'pdf-c1-generated-2', to: 'pdf-c1-generated-3', fromSide: 'right', toSide: 'left', kind: 'timeline' },
  { id: 'pdf-c1-link-generated-3-4', from: 'pdf-c1-generated-3', to: 'pdf-c1-generated-4', fromSide: 'right', toSide: 'left', kind: 'timeline' },
  { id: 'pdf-c1-link-generated-4-5', from: 'pdf-c1-generated-4', to: 'pdf-c1-generated-5', fromSide: 'right', toSide: 'left', kind: 'timeline' },
  { id: 'pdf-c1-link-generated-5-6', from: 'pdf-c1-generated-5', to: 'pdf-c1-generated-6', fromSide: 'right', toSide: 'left', kind: 'timeline' },
];

const getInitialCanvasState = (): PersistedCanvasState => {
  const fallback: PersistedCanvasState = {
    uploadedImages: {},
    nodePositions: {
      ...seededCase01Positions,
      ...pdfSeedPositions,
    },
    customNodesByCase: {
      [cases[0].id]: seededCase01Nodes,
      ...pdfSeedCustomNodesByCase,
    },
    connectionsByCase: {
      [cases[0].id]: seededCase01Connections,
      ...pdfSeedConnectionsByCase,
    },
    deletedNodeIdsByCase: {
      ...emptyFirstCanvasDeletedNodes,
      ...pdfSeedDeletedNodeIdsByCase,
    },
    deletedConnectionIdsByCase: {},
    nodeOverridesByCase: {},
  };

  try {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return fallback;

    const parsed = JSON.parse(saved) as Partial<PersistedCanvasState>;
    const merged: PersistedCanvasState = {
      uploadedImages: { ...fallback.uploadedImages, ...(parsed.uploadedImages ?? {}) },
      nodePositions: { ...fallback.nodePositions, ...(parsed.nodePositions ?? {}) },
      customNodesByCase: { ...fallback.customNodesByCase, ...(parsed.customNodesByCase ?? {}) },
      connectionsByCase: { ...fallback.connectionsByCase, ...(parsed.connectionsByCase ?? {}) },
      deletedNodeIdsByCase: { ...fallback.deletedNodeIdsByCase, ...(parsed.deletedNodeIdsByCase ?? {}) },
      deletedConnectionIdsByCase: { ...fallback.deletedConnectionIdsByCase, ...(parsed.deletedConnectionIdsByCase ?? {}) },
      nodeOverridesByCase: { ...fallback.nodeOverridesByCase, ...(parsed.nodeOverridesByCase ?? {}) },
    };

    Object.keys(pdfSeedCustomNodesByCase).forEach((caseId) => {
      const savedNodes = parsed.customNodesByCase?.[caseId] ?? [];
      const hasCurrentPdfSeed = savedNodes.some((node) => node.id.startsWith('pdf-c'));
      if (hasCurrentPdfSeed) return;

      merged.customNodesByCase[caseId] = fallback.customNodesByCase[caseId];
      merged.connectionsByCase[caseId] = fallback.connectionsByCase[caseId];
      merged.deletedNodeIdsByCase[caseId] = fallback.deletedNodeIdsByCase[caseId];
    });

    return merged;
  } catch {
    return fallback;
  }
};

export default function App() {
  const initialStateRef = useRef<PersistedCanvasState | null>(null);
  if (!initialStateRef.current) {
    initialStateRef.current = getInitialCanvasState();
  }

  const [activeIndex, setActiveIndex] = useState(0);
  const [activeView, setActiveView] = useState<'case' | 'methodology'>('case');
  const [selectedNode, setSelectedNode] = useState<CaseNode | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [uploadedImages, setUploadedImages] = useState<Record<string, string>>(initialStateRef.current.uploadedImages);
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>(initialStateRef.current.nodePositions);
  const [customNodesByCase, setCustomNodesByCase] = useState<Record<string, CaseNode[]>>(initialStateRef.current.customNodesByCase);
  const [connectionsByCase, setConnectionsByCase] = useState<Record<string, CanvasConnection[]>>(initialStateRef.current.connectionsByCase);
  const [deletedNodeIdsByCase, setDeletedNodeIdsByCase] = useState<Record<string, string[]>>(initialStateRef.current.deletedNodeIdsByCase);
  const [deletedConnectionIdsByCase, setDeletedConnectionIdsByCase] = useState<Record<string, string[]>>(initialStateRef.current.deletedConnectionIdsByCase);
  const [nodeOverridesByCase, setNodeOverridesByCase] = useState<Record<string, Record<string, Partial<CaseNode>>>>(initialStateRef.current.nodeOverridesByCase);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const uploadedImageUrlsRef = useRef<Record<string, string>>({});

  const activeCase = cases[activeIndex];
  const activeDeletedNodeIds = deletedNodeIdsByCase[activeCase.id] ?? [];
  const activeDeletedConnectionIds = deletedConnectionIdsByCase[activeCase.id] ?? [];
  const activeNodeOverrides = nodeOverridesByCase[activeCase.id] ?? {};
  const activeCaseNodes = activeCase.nodes
    .filter((node) => !activeDeletedNodeIds.includes(node.id))
    .map((node) => ({ ...node, ...(activeNodeOverrides[node.id] ?? {}) }));
  const activeCustomNodes = customNodesByCase[activeCase.id] ?? [];
  const activeConnections = connectionsByCase[activeCase.id] ?? [];
  const activeAllNodes = useMemo(
    () =>
      [...activeCaseNodes, ...activeCustomNodes].map((node) => (
        uploadedImages[node.id] ? { ...node, image: uploadedImages[node.id] } : node
      )),
    [activeCaseNodes, activeCustomNodes, uploadedImages],
  );

  const selectedInCase = useMemo(() => {
    if (!selectedNode) return null;
    return activeAllNodes.find((item) => item.id === selectedNode.id) ?? null;
  }, [activeAllNodes, selectedNode]);

  useEffect(() => {
    return () => {
      Object.values(uploadedImageUrlsRef.current).forEach((image) => {
        if (image.startsWith('blob:')) {
          URL.revokeObjectURL(image);
        }
      });
    };
  }, []);

  const handleImageUpload = (nodeId: string, image: string) => {
    const previousImage = uploadedImageUrlsRef.current[nodeId];
    if (previousImage?.startsWith('blob:')) {
      URL.revokeObjectURL(previousImage);
    }

    uploadedImageUrlsRef.current[nodeId] = image;
    setUploadedImages((current) => ({ ...current, [nodeId]: image }));
  };

  const handleCustomNodeAdd = (caseId: string, type: Extract<NodeType, 'material' | 'generated' | 'timeline'>, position: { x: number; y: number }) => {
    const id = `${caseId}-${type}-${Date.now()}`;
    const existingNodes = customNodesByCase[caseId] ?? [];
    const materialIndex = existingNodes.filter((node) => node.type === 'material').length + 1;
    const generatedIndex = existingNodes.filter((node) => node.type === 'generated').length + 1;
    const timelineIndex = existingNodes.filter((node) => node.type === 'timeline').length + 1;
    const titleMap = {
      material: `图片${materialIndex}`,
      generated: generatedIndex === 1 ? 'AI生图' : `AI生图${generatedIndex}`,
      timeline: timelineIndex === 1 ? '时间线' : `时间线${timelineIndex}`,
    };
    const descriptionMap = {
      material: '生图前的素材，可上传图片。',
      generated: '生成后的图片，可填写提示词并连接时间线。',
      timeline: '用于串联素材、提示词和生成结果。',
    };
    const node: CaseNode = {
      id,
      type,
      title: titleMap[type],
      description: descriptionMap[type],
      prompt: type === 'generated' ? '' : undefined,
      custom: true,
    };

    setCustomNodesByCase((current) => ({
      ...current,
      [caseId]: [...(current[caseId] ?? []), node],
    }));
    setNodePositions((current) => ({ ...current, [id]: position }));
    setSelectedNode(node);
  };

  const handleNodeUpdate = (caseId: string, nodeId: string, updates: Partial<CaseNode>) => {
    const isCustomNode = (customNodesByCase[caseId] ?? []).some((node) => node.id === nodeId);

    if (isCustomNode) {
      setCustomNodesByCase((current) => ({
        ...current,
        [caseId]: (current[caseId] ?? []).map((node) => (node.id === nodeId ? { ...node, ...updates } : node)),
      }));
    } else {
      setNodeOverridesByCase((current) => ({
        ...current,
        [caseId]: {
          ...(current[caseId] ?? {}),
          [nodeId]: {
            ...((current[caseId] ?? {})[nodeId] ?? {}),
            ...updates,
          },
        },
      }));
    }

    setSelectedNode((current) => (current?.id === nodeId ? { ...current, ...updates } : current));
  };

  const handleNodeDelete = (caseId: string, nodeId: string) => {
    const currentCustomNodes = customNodesByCase[caseId] ?? [];
    const isCustomNode = currentCustomNodes.some((node) => node.id === nodeId);
    const sourceCase = cases.find((item) => item.id === caseId) ?? cases[activeIndex];
    const nextVisibleNodes = [
      ...sourceCase.nodes.filter((node) => node.id !== nodeId && !(deletedNodeIdsByCase[caseId] ?? []).includes(node.id)),
      ...currentCustomNodes.filter((node) => node.id !== nodeId),
    ];

    if (isCustomNode) {
      setCustomNodesByCase((current) => ({
        ...current,
        [caseId]: (current[caseId] ?? []).filter((node) => node.id !== nodeId),
      }));
    } else {
      setDeletedNodeIdsByCase((current) => ({
        ...current,
        [caseId]: Array.from(new Set([...(current[caseId] ?? []), nodeId])),
      }));
    }

    setConnectionsByCase((current) => ({
      ...current,
      [caseId]: (current[caseId] ?? []).filter((connection) => connection.from !== nodeId && connection.to !== nodeId),
    }));
    setNodePositions((current) => {
      const next = { ...current };
      delete next[nodeId];
      return next;
    });
    setSelectedNode(firstPrompt(nextVisibleNodes) ?? nextVisibleNodes[0] ?? null);
  };

  const handleConnectionAdd = (caseId: string, connection: CanvasConnection) => {
    setConnectionsByCase((current) => {
      const existing = current[caseId] ?? [];
      if (existing.some((item) => item.from === connection.from && item.to === connection.to)) {
        return current;
      }
      return {
        ...current,
        [caseId]: [...existing, connection],
      };
    });
  };

  const handleConnectionDelete = (caseId: string, connectionId: string) => {
    setConnectionsByCase((current) => ({
      ...current,
      [caseId]: (current[caseId] ?? []).filter((connection) => connection.id !== connectionId),
    }));
    setDeletedConnectionIdsByCase((current) => ({
      ...current,
      [caseId]: Array.from(new Set([...(current[caseId] ?? []), connectionId])),
    }));
  };

  const handleSavePageState = () => {
    const state: PersistedCanvasState = {
      uploadedImages,
      nodePositions,
      customNodesByCase,
      connectionsByCase,
      deletedNodeIdsByCase,
      deletedConnectionIdsByCase,
      nodeOverridesByCase,
    };
    window.localStorage.setItem(storageKey, JSON.stringify(state));
    setSavedAt(new Date().toLocaleString('zh-CN', { hour12: false }));
  };

  const changeCase = (index: number) => {
    const next = (index + cases.length) % cases.length;
    const nextCase = cases[next];
    const deletedIds = deletedNodeIdsByCase[nextCase.id] ?? [];
    const overrides = nodeOverridesByCase[nextCase.id] ?? {};
    const nextVisibleNodes = [
      ...nextCase.nodes.filter((node) => !deletedIds.includes(node.id)).map((node) => ({ ...node, ...(overrides[node.id] ?? {}) })),
      ...(customNodesByCase[nextCase.id] ?? []),
    ];
    setActiveView('case');
    setActiveIndex(next);
    setSelectedNode(firstPrompt(nextVisibleNodes) ?? nextVisibleNodes[0] ?? null);
  };

  return (
    <Layout
      activeView={activeView}
      onTutorialSelect={() => changeCase(0)}
      onMethodology={() => {
        setActiveView('methodology');
      }}
    >
      <div className="relative h-full min-w-0 flex-1">
        {activeView === 'case' && (
          <CanvasChrome
            activeCase={activeCase}
            cases={cases}
            activeIndex={activeIndex}
            onCaseChange={changeCase}
            onMethodology={() => setActiveView('methodology')}
          />
        )}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView === 'methodology' ? 'methodology' : activeCase.id}
            className="h-full"
            initial={{ opacity: 0, scale: 0.94, filter: 'blur(16px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.9, filter: 'blur(20px)' }}
            transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
          >
            {activeView === 'methodology' ? (
              <MethodologyPage onBack={() => changeCase(activeIndex)} />
            ) : (
              <InfiniteCanvas
                activeCase={{ ...activeCase, nodes: activeCaseNodes }}
                selectedNodeId={selectedInCase?.id ?? ''}
                nodePositions={nodePositions}
                uploadedImages={uploadedImages}
                customNodes={activeCustomNodes}
                connections={activeConnections}
                deletedConnectionIds={activeDeletedConnectionIds}
                onNodePositionChange={setNodePositions}
                onNodeImageUpload={handleImageUpload}
                onCustomNodeAdd={(type, position) => handleCustomNodeAdd(activeCase.id, type, position)}
                onCustomNodeUpdate={(nodeId, updates) => handleNodeUpdate(activeCase.id, nodeId, updates)}
                onNodeDelete={(nodeId) => handleNodeDelete(activeCase.id, nodeId)}
                onConnectionAdd={(connection) => handleConnectionAdd(activeCase.id, connection)}
                onConnectionDelete={(connectionId) => handleConnectionDelete(activeCase.id, connectionId)}
                onSelectNode={setSelectedNode}
                onPreviewImage={setPreviewImage}
                onCaseDelta={(delta) => changeCase(activeIndex + delta)}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      {activeView === 'case' && (
        <AnalysisPanel
          node={selectedInCase}
          allNodes={activeAllNodes}
          savedAt={savedAt}
          onNodeUpdate={(nodeId, updates) => handleNodeUpdate(activeCase.id, nodeId, updates)}
          onImageUpload={handleImageUpload}
          onSave={handleSavePageState}
        />
      )}
      <ImagePreviewModal image={previewImage} onClose={() => setPreviewImage(null)} />
    </Layout>
  );
}
