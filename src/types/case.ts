export type NodeType = 'input' | 'prompt' | 'result' | 'problem' | 'final' | 'material' | 'generated' | 'timeline';

export type HighlightType = 'added' | 'modified' | 'risk' | 'errorFix' | 'model' | 'ratio';

export interface Highlight {
  text: string;
  type: HighlightType;
}

export interface PromptAnalysis {
  objective: string;
  keywordBreakdown: string[];
  addedConstraints: string[];
  resultReview: string;
  nextSuggestion: string;
}

export interface CaseNode {
  id: string;
  type: NodeType;
  title: string;
  description?: string;
  image?: string;
  prompt?: string;
  highlights?: Highlight[];
  analysis?: PromptAnalysis;
  custom?: boolean;
}

export interface CanvasConnection {
  id: string;
  from: string;
  to: string;
  fromSide?: 'left' | 'right';
  toSide?: 'left' | 'right';
  kind?: 'timeline' | 'prompt';
}

export interface Case {
  id: string;
  title: string;
  subtitle: string;
  difficulty: '入门' | '进阶' | '高级';
  modelTags: string[];
  categoryTags: string[];
  goal: string;
  themeColor: string;
  nodes: CaseNode[];
}
