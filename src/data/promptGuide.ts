export interface PromptTemplate {
  title: string;
  fit: string;
  prompt: string;
}

export interface GuideCase {
  title: string;
  problem: string[];
  goal: string;
  prompt: string;
}

export const guideScreenshots = [
  { src: '/assets/prompt-guide/image1.png', title: 'Gemini 图片生成入口', caption: '进入 Gemini 后，从输入框或工具菜单开始生成图片。' },
  { src: '/assets/prompt-guide/image3.png', title: 'Nano Banana Pro 重做入口', caption: '复杂提示词或终稿需求，可以使用 Pro 重做对比。' },
  { src: '/assets/prompt-guide/image6.png', title: '生成结果对比', caption: '同一个提示词可以多轮抽卡，再选择稳定结果继续优化。' },
  { src: '/assets/prompt-guide/image7.png', title: '模型切换与回看', caption: '回看不同轮次结果，记录哪一版提示词最有效。' },
  { src: '/assets/prompt-guide/image8.png', title: '下载完整尺寸', caption: '最终图像下载后进入 PS / Figma 做文字与精修收尾。' },
  { src: '/assets/prompt-guide/image10.png', title: '继续编辑图片', caption: '不满意时用自然语言继续要求模型改背景、改光影或修正错误。' },
  { src: '/assets/prompt-guide/image11.png', title: '导出到设计软件', caption: '重要文字和品牌排版建议后期用设计软件完成。' },
];

export interface GeminiWebTutorialStep {
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
}

export const geminiWebTutorial: GeminiWebTutorialStep[] = [
  {
    step: '01',
    title: '打开 Gemini 网页版',
    paragraphs: [
      '在你的电脑上，访问 gemini.google.com。',
      'Google 官方帮助页说明，在 Gemini 移动端可以打开 Gemini 后点击“制作图片”，然后输入提示词生成图片。网页端也可以进入 Gemini 后，在底部输入框直接输入生成图片的需求。',
    ],
    figures: [
      { src: '/assets/prompt-guide/gemini-web-basic/step-01.png', caption: '打开 Gemini 网页版，进入底部输入框。' },
      { src: '/assets/prompt-guide/gemini-web-basic/step-02.png', caption: '网页端可以通过输入框或工具入口开始图片生成。' },
    ],
  },
  {
    step: '02',
    title: '输入图片生成提示词',
    paragraphs: [
      '新手不要只写：',
    ],
    badExample: '生成一张电商主图',
    goodExample:
      '生成一张电商产品主图，产品是一个红色新年礼盒，放在高端红金色节日场景中，背景干净高级，产品居中突出，商业摄影光影，高清，比例 3:4。',
    figures: [
      { src: '/assets/prompt-guide/gemini-web-basic/step-03.png', caption: '在输入框中写入完整的图片生成提示词。' },
    ],
  },
  {
    step: '03',
    title: '提交生成',
    paragraphs: [
      '输入完成后，点击发送按钮，Gemini 会根据描述生成图片。',
    ],
    figures: [
      { src: '/assets/prompt-guide/gemini-web-basic/step-04.png', caption: '提交后生成红色新年礼盒电商图。' },
    ],
  },
  {
    step: '04',
    title: '使用 Nano Banana 2 编辑图像',
    paragraphs: [
      '使用 Nano Banana 2，您可以通过多种方式编辑图像。例如，您可以：',
      '提示：您可以上传图片进行编辑，也可以让 Gemini 编辑生成的图片。',
      '点击提交。',
    ],
    notes: [
      '编辑您在 Gemini 中生成的图像。',
      '上传图片并请 Gemini 进行编辑。',
      '上传多张图片，并让 Gemini 根据你上传的图片创建一个新图片。',
    ],
    figures: [
      { src: '/assets/prompt-guide/gemini-web-basic/step-05.png', caption: '上传参考图后，输入编辑提示词。' },
      { src: '/assets/prompt-guide/gemini-web-basic/step-07.png', caption: '提交后得到编辑生成结果。' },
    ],
  },
  {
    step: '05',
    title: '复杂任务用 Nano Banana Pro 重新制作',
    paragraphs: [
      '付费用户可以使用 Nano Banana Pro 来重新生成图像。Nano Banana Pro 可以提供更多细节，尤其适用于使用文本渲染的图像或信息图表。',
      '默认调用用 Nano Banana 2 创建图像，提示较复杂选择思考模式进行推理，建议每次生成都开启思考模式。',
      '在右下角，点击“使用 Pro 多重做”，调用 Nano Banana Pro 模型。',
      '生成结果往前切，显示为 Nano Banana 2 点重做，使用模型则是 Nano Banana 2。',
      '重要提示：如果您达到 Nano Banana 2 的每日图像数量上限，则无法使用 Nano Banana Pro 重新生成任何额外的图像。',
    ],
    figures: [
      { src: '/assets/prompt-guide/gemini-web-basic/step-10.png', caption: '在图片更多菜单中选择“使用 Pro 重做”。' },
      { src: '/assets/prompt-guide/gemini-web-basic/step-11.png', caption: '重做后可以在菜单底部看到当前模型为 Nano Banana Pro。' },
      { src: '/assets/prompt-guide/gemini-web-basic/step-12.png', caption: '切换上一轮结果时，界面会显示对应轮次和模型信息。' },
    ],
  },
  {
    step: '06',
    title: '下载、分享或导出生成图像',
    paragraphs: [
      '下载图片：将鼠标悬停在想要下载的图片上，然后点击“下载完整尺寸”按钮。',
      '导出图像：在图片下方，点击“更多”。',
      '下载图片。',
      '打开文档到 PS 继续编辑。',
    ],
    figures: [
      { src: '/assets/prompt-guide/gemini-web-basic/step-15.png', caption: '鼠标悬停图片后，点击下载完整尺寸按钮。' },
      { src: '/assets/prompt-guide/gemini-web-basic/step-16.png', caption: '也可以从更多菜单中选择下载图片。' },
    ],
  },
];

export const officialNanoCards = [
  {
    title: 'Nano Banana 2',
    tag: '快速生成与多轮编辑',
    body: '官方定位为最新图像模型，强调更强世界知识、质量、推理能力，同时保留快速迭代速度。课堂里可把它理解为“快速抽卡 + 连续修改”的主力模型。',
  },
  {
    title: '细节可控',
    tag: '背景 / 角度 / 焦点',
    body: '适合演示把同一张产品图改成不同氛围、不同镜头角度、不同光影焦点，让学生看到提示词如何控制画面变量。',
  },
  {
    title: '参考图迁移',
    tag: '材质 / 色彩 / 风格',
    body: '官方强调可从参考图提取纹理、颜色或风格并应用到主体。电商里可用于材质迁移、场景参考、系列图统一。',
  },
  {
    title: '文字与多尺寸',
    tag: '文案 / 比例 / 输出规格',
    body: 'Nano Banana 2 支持清晰文字、多语言文字与多尺寸输出。电商图仍建议把重要销售文案交给 PS / Figma 做最终排版。',
  },
  {
    title: 'Nano Banana Pro',
    tag: '终稿与复杂任务',
    body: '官方博客把 Pro 放在高保真、最大事实准确性任务中。课程里建议用于复杂包装、文字多、产品结构必须稳定的终稿对比。',
  },
  {
    title: '安全与来源',
    tag: 'SynthID / AI 标识',
    body: '官方说明 Gemini 生成图像会使用 SynthID 等水印/标识能力。用于商用前仍需人工审核品牌、文字、版权与平台规则。',
  },
];

export const beginnerTheory = [
  {
    title: 'AI 作图不是许愿',
    subtitle: '它更像一个摄影助理',
    body: '你不能只说“高级一点”。要告诉它产品是什么、哪里不能变、场景在哪里、光怎么打、画面怎么构图。',
    visual: 'director',
  },
  {
    title: '生成结果像抽卡',
    subtitle: '同一提示词也会有不同版本',
    body: '第一次不完美是正常的。课程重点不是“一次成功”，而是学会看问题、补约束、再生成。',
    visual: 'cards',
  },
  {
    title: '提示词就是控制面板',
    subtitle: '每句话都在控制一个画面变量',
    body: '保持结构、替换场景、参考风格、输出比例、避免错字，这些都要拆开写，模型才更容易听懂。',
    visual: 'panel',
  },
];

export const imageLayers = [
  { title: '产品主体', body: '礼盒、台历、杯子、文具等核心商品', color: '#67e8f9' },
  { title: '结构文字', body: 'Logo、包装文字、图案、开合方式', color: '#a7f3d0' },
  { title: '材质颜色', body: '纸张、金属、塑料、布纹、烫金', color: '#fde68a' },
  { title: '场景背景', body: '摄影棚、原木桌、办公空间、节日场景', color: '#c4b5fd' },
  { title: '光影阴影', body: '主光、补光、轮廓光、接触阴影', color: '#fca5a5' },
  { title: '比例构图', body: '1:1、3:4、9:16、主体占比、留白', color: '#93c5fd' },
];

export const controlKnobs = [
  { title: '保持约束', body: '告诉 AI 哪些绝对不能变', example: '结构、Logo、文字、比例不变', value: 92 },
  { title: '修改目标', body: '告诉 AI 这次到底要改哪里', example: '替换背景、改色、场景重构', value: 76 },
  { title: '参考来源', body: '说明参考哪张图的什么内容', example: '图1结构，图3场景风格', value: 68 },
  { title: '质量标准', body: '告诉 AI 输出要达到什么审美', example: '商业摄影、电商主图、高清', value: 84 },
  { title: '风险控制', body: '提前堵住常见错误', example: '不乱码、不水印、不漂浮', value: 58 },
];

export const visualExamples = [
  {
    title: '从原图到场景重构',
    before: '/assets/pdf-case-01/material-02.png',
    after: '/assets/pdf-case-01/generated-04.png',
    lesson: '先锁定产品，再让模型替换背景和光影。',
  },
  {
    title: '多图参考融合',
    before: '/assets/pdf-cases/case-02/material-02.jpg',
    after: '/assets/pdf-cases/case-02/generated-03.png',
    lesson: '一张图负责产品，一张图负责颜色材质或场景氛围。',
  },
  {
    title: '复杂替换要拆任务',
    before: '/assets/pdf-cases/case-04/material-02.jpg',
    after: '/assets/pdf-cases/case-04/generated-04.png',
    lesson: '复杂需求不要一句话塞完，要逐轮加约束。',
  },
];

export const workflowSteps = [
  '上传产品图',
  '说明必须保持不变的内容',
  '说明要修改成什么场景',
  '补充风格、光影、构图',
  '写清比例、清晰度和禁止项',
  '生成后继续微调并复盘提示词',
];

export const promptFormula = {
  title: '万能提示词公式',
  formula: '目标动作 + 参考来源 + 保持约束 + 风格方向 + 质量标准 + 输出比例',
  template:
    '参考上传图片，严格保持【产品主体】的结构、材质、颜色、Logo、图案和文字内容不变。将画面优化为【目标场景/风格】。背景为【具体背景描述】，光线为【光线方向和质感】，构图为【主图/详情页/海报构图】，整体效果符合【电商平台/品牌调性】。产品边缘清晰，光影真实，底部有自然接触阴影，画面高清，比例【填写比例】。',
  example:
    '参考上传图片，严格保持礼盒产品的结构、材质、颜色、Logo、图案和文字内容不变。将画面优化为高端新年礼品电商主图。背景为深红色渐变空间，搭配柔和金色光效、少量飘落金粉和节日氛围装饰。光线从画面左上方照射，礼盒边缘有柔和轮廓光，底部有自然接触阴影。整体符合天猫高端礼品主图视觉标准，产品边缘清晰，画面高清，比例 3:4。',
};

export const scalist = [
  { key: 'S', title: 'Subject 主体', body: '产品类型、颜色、材质、结构、Logo、包装文字和关键图案。', example: '一个红色硬质新年礼盒，天地盖结构，表面为哑光艺术纸，正面有金色 Logo 和节日图案。' },
  { key: 'C', title: 'Composition 构图', body: '主体位置、占比、视角、文案留白与画面稳定性。', example: '产品居中偏下，占画面 70%，上方留出干净标题空间。' },
  { key: 'A', title: 'Action 状态', body: '静物也有状态，例如打开、平铺、翻页、露出内部产品。', example: '礼盒半打开，内部产品自然露出，形成高级礼赠开箱感。' },
  { key: 'L', title: 'Location 场景', body: '具体环境决定档次，不写“好看的背景”，写摄影棚、原木桌、办公空间等。', example: '场景为高级摄影棚中的红色渐变背景，带柔和金色光斑。' },
  { key: 'I', title: 'Image Style 风格', body: '天猫主图、商业摄影、日系清新、新中式、极简高级、科技感等。', example: '整体为高端商业摄影风格，画面干净、有质感，产品突出。' },
  { key: 'S', title: 'Specs 技术参数', body: '真实摄影光影、三点式布光、轮廓光、浅景深、4K、接触阴影。', example: '主光从左上方照射，右侧柔和补光，底部有真实接触阴影。' },
  { key: 'T', title: 'Text 文字处理', body: '明确哪些文字保留、替换、放哪里，以及不允许错字、漏字、乱码。', example: '保持包装上的所有中文文字和 Logo 完全不变，不新增无关文字。' },
];

export const commonMistakes = [
  {
    title: '只写关键词',
    bad: '礼盒，高级，电商，红色，质感，高清',
    good: '保持上传礼盒的结构、颜色、图案和包装文字不变，将它放在高端新年礼品场景中。背景为深红色渐变，搭配柔和金色光效和少量节日装饰，整体符合天猫电商主图视觉标准，比例 3:4。',
  },
  {
    title: '一直说“不要”',
    bad: '不要变形，不要廉价，不要模糊，不要错字，不要背景乱',
    good: '产品结构稳定，边缘清晰，包装文字准确可读，背景简洁高级，主体突出，光影真实自然。',
  },
  {
    title: '没有锁定产品',
    bad: '把这个产品做成高级主图',
    good: '严格保持产品结构、材质、颜色、Logo、图案、包装文字、比例和放置状态不变，只优化背景、光影、构图和电商质感。',
  },
];

export const templates: PromptTemplate[] = [
  {
    title: '白底产品图转高端场景图',
    fit: '礼盒、食品、文具、台历、包装盒',
    prompt:
      '参考上传的产品白底图，严格保持产品的结构、材质、颜色、Logo、包装图案和文字内容不变，不要改变产品比例和外形。将纯白背景替换为高端商业摄影场景。背景为【填写场景】。产品放置在画面中心，底部与台面自然接触，有真实接触阴影。光线从画面左上方照射，产品边缘有柔和轮廓光，材质细节清晰，整体符合电商主图标准。画面高清，产品突出，背景干净不抢主体，不添加无关文字，不生成水印，比例【填写比例】。',
  },
  {
    title: '产品精修白底图',
    fit: '抠图不干净、边缘脏、产品不够高级',
    prompt:
      '参考上传的产品图片，将产品放置在纯白背景上，严格保持产品结构、材质、颜色、图案、Logo 和包装文字不变。清理产品边缘残留背景，去除杂边、脏污、灰边和抠图痕迹。优化产品光影，让产品看起来更干净、更清晰、更符合电商白底主图标准。保持产品真实比例，不改变外形，不新增任何元素，不改变包装文字。输出高清电商产品精修图，比例 1:1。',
  },
  {
    title: '电商主图视觉升级',
    fit: '已有主图不够高级，需要增强冲击力',
    prompt:
      '参考上传图片，严格保持产品主体、产品结构、材质、颜色、图案、Logo 和文字内容不变，只优化画面视觉表现。提升整体电商主图质感，让产品更加突出。优化背景层次、光影、产品边缘清晰度和视觉中心。主体占画面约 70%，构图稳定，画面有冲击力但不过度杂乱。背景风格为【填写风格】，光线真实自然，底部有合理接触阴影，整体符合天猫 / 抖音电商主图标准。不要新增无关文字，不要改变产品包装信息，比例【填写比例】。',
  },
  {
    title: '详情页首屏图',
    fit: '详情页第一屏、长图切片、卖点页',
    prompt:
      '参考上传产品图，严格保持产品结构、材质、颜色、图案、Logo 和包装文字不变。设计一张电商详情页首屏视觉。画面需要突出产品核心卖点：【填写卖点】。产品作为视觉中心，背景具有层次感，上方或侧边预留文案空间。整体风格为【填写风格】，光影真实，画面干净高级，适合天猫、京东、抖音电商详情页使用。不要新增乱码文字，不要改变产品信息，比例 9:16，高清输出。',
  },
  {
    title: '多图参考融合',
    fit: '一张图参考产品结构，另一张图参考风格或材质',
    prompt:
      '参考图 1 作为产品结构参考，严格保持图 1 中产品的外形、比例、开合方式、包装结构和主要图案不变。参考图 2 作为视觉风格参考，提取图 2 的背景氛围、光影质感、色调和画面层次。将图 1 产品融合到图 2 风格的电商场景中，产品必须保持清晰完整，不能改变结构、材质、颜色和包装文字。光影要与新场景一致，底部有真实接触阴影，整体符合高端电商主图标准，比例【填写比例】。',
  },
];

export const categories = [
  { title: '礼盒类', focus: ['高级感', '仪式感', '纸张质感', '烫金 Logo', '开合方式'], prompt: '参考上传的礼盒产品图，严格保持礼盒的结构、颜色、图案、Logo、包装文字和材质不变。将画面升级为高端新年礼品电商主图。礼盒放置在深红色渐变摄影棚场景中，背景有柔和金色光效和少量节日氛围装饰。产品居中偏下，占画面约 70%，底部有自然接触阴影，比例 3:4。' },
  { title: '台历类', focus: ['页面排版清晰', '日期不乱', '纸张质感', '线圈装订', '办公桌场景'], prompt: '参考上传的台历产品图，严格保持台历结构、纸张材质、颜色、页面图案、日期文字和装订线圈不变。将画面优化为简洁高级的办公桌电商主图。台历页面必须清晰可读，日期和文字不能错乱，比例 3:4。' },
  { title: '文具类', focus: ['材质精密感', '排列整齐', '商务氛围', '金属反光', '清晰边缘'], prompt: '参考上传的文具产品图，严格保持文具的外形、颜色、Logo、图案和材质不变。将产品排列在简洁高级的办公桌场景中，采用俯拍平铺构图。金属部分呈现细腻拉丝反光，比例 3:4。' },
  { title: '食品类', focus: ['新鲜感', '食欲感', '包装真实', '食材点缀合理', '自然窗光'], prompt: '参考上传的食品包装图，严格保持包装袋或包装盒的结构、颜色、Logo、图案和文字内容不变。将画面转换为真实自然的食品电商场景图。周围搭配少量真实食材点缀，食材不抢主体，比例 3:4。' },
];

export const fixes = [
  ['产品变形', '严格保持上传产品的原始结构、外形比例、边缘轮廓和包装信息不变。只允许修改背景和光影，不允许重绘产品结构。'],
  ['文字乱码', '保持包装上的所有文字完全不变，文字必须清晰可读，不允许出现错字、漏字、乱码或新增无关文字。'],
  ['产品漂浮', '产品底部必须与桌面自然接触，在接触位置生成真实的接触阴影和轻微压暗区域。'],
  ['画面太乱', '背景保持简洁，减少装饰元素，所有辅助元素只能用于衬托产品，不得抢占主体。'],
  ['不够电商感', '提升画面电商主图质感，增强产品立体感、光影层次、边缘清晰度和视觉冲击力。'],
  ['多轮后变糊', '请基于最初上传的产品原图重新生成，不要基于上一轮低清图片继续修改。'],
];

export const guideCases: GuideCase[] = [
  {
    title: '礼盒主图升级',
    problem: ['白底图普通', '没有节日氛围', '礼盒高级感不够'],
    goal: '高端新年礼品主图',
    prompt:
      '参考上传礼盒图片，严格保持礼盒的结构、颜色、图案、Logo、包装文字和材质不变。将画面升级为高端新年礼品电商主图。背景为深红色渐变摄影棚，搭配柔和金色光效、少量飘落金粉和节日装饰。产品居中偏下，占画面约 70%，底部有真实接触阴影，比例 3:4。',
  },
  {
    title: '台历主图升级',
    problem: ['背景平淡', '产品不够突出', '日期需要清晰'],
    goal: '简洁办公桌电商主图',
    prompt:
      '参考上传台历图片，严格保持台历的结构、页面内容、日期文字、纸张材质、线圈装订和产品比例不变。台历放置在浅色原木桌面上，背景为干净的现代办公环境，光线为自然窗光，比例 3:4。',
  },
  {
    title: '食品包装场景图',
    problem: ['缺少食欲感', '场景不够生活化', '包装需要保持清晰'],
    goal: '自然食品摄影场景图',
    prompt:
      '参考上传食品包装图，严格保持包装的结构、颜色、Logo、图案、文字内容和产品比例不变。将背景替换为夏日午后野餐场景，周围有少量真实食材点缀，包装文字清晰可读，比例 3:4。',
  },
  {
    title: '文具套装详情图',
    problem: ['排列普通', '材质不够精致', '缺少商务感'],
    goal: '高级办公文具场景图',
    prompt:
      '参考上传文具产品图，严格保持所有文具的外形、颜色、Logo、材质和产品比例不变。将文具整齐排列在极简商务办公桌场景中，采用俯拍平铺构图，比例 9:16。',
  },
];

export const compactPrompt =
  '参考上传图片，严格保持产品结构、材质、颜色、Logo、图案和包装文字不变，只优化背景、光影、构图和整体电商质感。将画面升级为高端商业摄影风格，产品作为唯一视觉中心，边缘清晰，底部有真实接触阴影，光影自然，背景干净有层次，不抢主体。不要改变产品比例，不要生成乱码文字，不要新增无关文字，不要水印，高清输出，比例 3:4。';
