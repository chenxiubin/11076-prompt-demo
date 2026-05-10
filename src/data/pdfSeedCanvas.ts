import { cases } from './cases';
import type { CanvasConnection, CaseNode } from '../types/case';

const base = '/assets/pdf-cases';

const makeConnections = (prefix: string, materialIds: string[], generatedIds: string[]): CanvasConnection[] => [
  ...materialIds.map((id, index) => ({
    id: `${prefix}-link-material-${index + 1}`,
    from: id,
    to: generatedIds[0],
    fromSide: 'right' as const,
    toSide: 'left' as const,
    kind: 'timeline' as const,
  })),
  ...generatedIds.slice(0, -1).map((id, index) => ({
    id: `${prefix}-link-generated-${index + 1}-${index + 2}`,
    from: id,
    to: generatedIds[index + 1],
    fromSide: 'right' as const,
    toSide: 'left' as const,
    kind: 'timeline' as const,
  })),
];

const makePositions = (ids: string[], xs: number[], y: number) =>
  ids.reduce<Record<string, { x: number; y: number }>>((positions, id, index) => {
    positions[id] = { x: xs[index], y };
    return positions;
  }, {});

const case02Prompts = [
  '参考图1产品的材质颜色，将图2产品颜色材质改成一样的，其它保持不变',
  '参考图1产品的材质颜色，将图2产品颜色材质改成一样的，其它保持不变，更换为简约原木风室内场景，光影明亮柔和，优化文案排版，字体颜色要与画面协调，比例3:4',
  '抽卡',
  '抽卡',
  '抽卡',
];

const case03Prompts = [
  '图1笔记本换成图2，其它保持不变',
  '图1笔记本换成图2，保持放置状态与比例不变，其它产品保持不变，更换为简约原木风室内场景，光影明亮柔和，优化文案排版，字体颜色要与画面协调，比例3:4',
  '抽卡',
];

const case04Prompts = [
  '将图2红框内礼盒整体替换成图1，笔记本加上华为LOGO，后方手提袋颜色改成图2盒子一样的绿色，出图比例3:4',
  '将图2红框内礼盒整体替换成图1，保持图1结构材质颜色比例不变，合理匹配大小，笔记本上方加上烫金华为LOGO，后方手提袋蓝色改成图1盒体一样的绿色，更换为简约风室内场景，光影明亮柔和，优化文案视觉排版美感，选用字体颜色与画面协调，比例3:4',
  '将图2红框内礼盒整体替换成图1，保持图1结构材质颜色比例不变，合理匹配大小，笔记本上方加上烫金华为LOGO，后方手提袋蓝色改成图1盒体一样的绿色，比例3:4',
  '抽卡',
  '抽卡',
  '抽卡',
  '将图2礼盒笔记本替换成图1，保持大小状态不变。将图3红框内礼盒整体替换图2，笔记本加上华为LOGO，后方手提袋颜色改成图2盒子一样的绿色，出图比例3:4',
  '抽卡（结果错误）',
];

const case02MaterialIds = ['pdf-c2-material-1', 'pdf-c2-material-2'];
const case02GeneratedIds = case02Prompts.map((_, index) => `pdf-c2-generated-${index + 1}`);
const case02Nodes: CaseNode[] = [
  {
    id: 'pdf-c2-material-1',
    type: 'material',
    title: '图1 蓝色材质参考',
    description: 'PDF 素材图 1：蓝色礼盒材质与颜色参考。',
    image: `${base}/case-02/material-01.jpg`,
    custom: true,
  },
  {
    id: 'pdf-c2-material-2',
    type: 'material',
    title: '图2 待改色原图',
    description: 'PDF 素材图 2：需要改成图 1 蓝色材质的原图。',
    image: `${base}/case-02/material-02.jpg`,
    custom: true,
  },
  ...case02Prompts.map((prompt, index) => ({
    id: case02GeneratedIds[index],
    type: 'generated' as const,
    title: index < 2 ? `AI生图${index + 1}` : `抽卡${index - 1}`,
    description: index === 2 ? 'Nano Banana Pro 抽卡结果。' : '根据 PDF 提示词生成的蓝色礼盒主图。',
    image: `${base}/case-02/generated-${String(index + 1).padStart(2, '0')}.png`,
    prompt,
    custom: true,
  })),
];

const case03MaterialIds = ['pdf-c3-material-1', 'pdf-c3-material-2'];
const case03GeneratedIds = case03Prompts.map((_, index) => `pdf-c3-generated-${index + 1}`);
const case03Nodes: CaseNode[] = [
  {
    id: 'pdf-c3-material-1',
    type: 'material',
    title: '图1 原始套装画面',
    description: 'PDF 素材图 1：需要替换笔记本的原始套装主图。',
    image: `${base}/case-03/material-01.jpg`,
    custom: true,
  },
  {
    id: 'pdf-c3-material-2',
    type: 'material',
    title: '图2 白色笔记本',
    description: 'PDF 素材图 2：替换目标白色笔记本。',
    image: `${base}/case-03/material-02.png`,
    custom: true,
  },
  ...case03Prompts.map((prompt, index) => ({
    id: case03GeneratedIds[index],
    type: 'generated' as const,
    title: index < 2 ? `AI生图${index + 1}` : '抽卡1',
    description: index === 2 ? 'Nano Banana Pro 抽卡结果。' : '根据 PDF 提示词生成的笔记本替换主图。',
    image: `${base}/case-03/generated-${String(index + 1).padStart(2, '0')}.png`,
    prompt,
    custom: true,
  })),
];

const case04MaterialIds = ['pdf-c4-material-1', 'pdf-c4-material-2', 'pdf-c4-material-3'];
const case04GeneratedIds = case04Prompts.map((_, index) => `pdf-c4-generated-${index + 1}`);
const case04Nodes: CaseNode[] = [
  {
    id: 'pdf-c4-material-1',
    type: 'material',
    title: '图1 绿色礼盒参考',
    description: 'PDF 素材图 1：替换目标礼盒结构、材质与颜色参考。',
    image: `${base}/case-04/material-01.png`,
    custom: true,
  },
  {
    id: 'pdf-c4-material-2',
    type: 'material',
    title: '图2 红框待替换图',
    description: 'PDF 素材图 2：红框内礼盒为替换目标位置。',
    image: `${base}/case-04/material-02.jpg`,
    custom: true,
  },
  {
    id: 'pdf-c4-material-3',
    type: 'material',
    title: '图3 礼盒内托参考',
    description: 'PDF 补充素材：礼盒内托与产品摆放参考。',
    image: `${base}/case-04/material-03.png`,
    custom: true,
  },
  ...case04Prompts.map((prompt, index) => ({
    id: case04GeneratedIds[index],
    type: 'generated' as const,
    title: index < 3 ? `AI生图${index + 1}` : `抽卡${index - 2}`,
    description: '根据 PDF 提示词生成的礼盒整体替换结果。',
    image: `${base}/case-04/generated-${String(index + 1).padStart(2, '0')}.png`,
    prompt,
    custom: true,
  })),
];

export const pdfSeedCustomNodesByCase: Record<string, CaseNode[]> = {
  [cases[1].id]: case02Nodes,
  [cases[2].id]: case03Nodes,
  [cases[3].id]: case04Nodes,
};

export const pdfSeedPositions: Record<string, { x: number; y: number }> = {
  ...makePositions(case02MaterialIds, [1020, 1400], 240),
  ...makePositions(case02GeneratedIds, [1020, 1580, 2140, 2700, 3260], 760),
  ...makePositions(case03MaterialIds, [1020, 1400], 240),
  ...makePositions(case03GeneratedIds, [1020, 1580, 2140], 760),
  ...makePositions(case04MaterialIds, [620, 1460, 2300], 240),
  ...makePositions(case04GeneratedIds, [620, 1080, 1540, 2000, 2460, 2920, 3380, 3840], 760),
};

export const pdfSeedConnectionsByCase: Record<string, CanvasConnection[]> = {
  [cases[1].id]: makeConnections('pdf-c2', case02MaterialIds, case02GeneratedIds),
  [cases[2].id]: makeConnections('pdf-c3', case03MaterialIds, case03GeneratedIds),
  [cases[3].id]: makeConnections('pdf-c4', case04MaterialIds, case04GeneratedIds),
};

export const pdfSeedDeletedNodeIdsByCase: Record<string, string[]> = {
  [cases[1].id]: cases[1].nodes.map((node) => node.id),
  [cases[2].id]: cases[2].nodes.map((node) => node.id),
  [cases[3].id]: cases[3].nodes.map((node) => node.id),
};
