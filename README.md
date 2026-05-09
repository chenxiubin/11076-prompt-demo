# 办公礼品产品替换场景重构教程

一个用于课程分享的 AI 电商视觉提示词演化实验室，展示从原始素材、提示词输入、模型抽卡结果、问题暴露、提示词修正，到最终效果优化的完整流程。

## 技术栈

- React + Vite + TypeScript
- Tailwind CSS
- Framer Motion
- SVG 动态时间线

## 启动

```bash
npm install
npm run dev
```

如果 Windows PowerShell 拦截 `npm.ps1`，可以使用：

```bash
npm.cmd run dev
```

## 图片替换

图片占位路径位于：

```text
public/assets/cases/
```

例如：

```text
public/assets/cases/case-01/input-01.jpg
public/assets/cases/case-01/result-01.jpg
```

后续替换真实素材时保持同名路径即可。
