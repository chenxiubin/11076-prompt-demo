import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ChangeEvent, DragEvent, MouseEvent as ReactMouseEvent } from 'react';
import { Check, Copy, Expand, ImageIcon, Upload } from 'lucide-react';
import type { CaseNode } from '../types/case';

interface Props {
  node: CaseNode;
  selected: boolean;
  color: string;
  onSelect: () => void;
  onPreview: () => void;
  onImageUpload: (image: string) => void;
  onPromptChange: (prompt: string) => void;
  promptCompareBase?: string;
  onConnectionStart?: (event: ReactMouseEvent<HTMLElement>, side: 'left' | 'right') => void;
  onSizeChange?: (nodeId: string, size: ImageSize) => void;
}

interface ImageSize {
  width: number;
  height: number;
}

interface DiffResult {
  tokens: string[];
}

const defaultImageSize: ImageSize = { width: 360, height: 260 };
const resultImageSize: ImageSize = { width: 460, height: 300 };
const maxImageSize: ImageSize = { width: 500, height: 380 };

const fitImageSize = (naturalWidth: number, naturalHeight: number, fallback: ImageSize): ImageSize => {
  if (!naturalWidth || !naturalHeight) return fallback;

  const ratio = naturalWidth / naturalHeight;
  let width = maxImageSize.width;
  let height = width / ratio;

  if (height > maxImageSize.height) {
    height = maxImageSize.height;
    width = height * ratio;
  }

  return {
    width: Math.round(width),
    height: Math.round(height),
  };
};

const getNodeLabel = (node: CaseNode) => {
  if (node.custom) return node.title;

  const idParts = node.id.split('-');
  const suffix = ` ${idParts[idParts.length - 1]?.replace(/\D+/g, '') || ''}`;
  if (node.type === 'material' || node.type === 'input') return `图片节点${suffix}`;
  if (node.type === 'generated' || node.type === 'result' || node.type === 'final') return `生成节点${suffix}`;
  return `图片节点${suffix}`;
};

const getPromptDiff = (base: string, current: string): DiffResult | null => {
  if (base === current) return null;
  if (!base) return { tokens: current ? splitDiffTokens(current) : ['当前为空'] };
  if (!current) return { tokens: [`缺少：${base}`] };

  let prefixLength = 0;
  while (prefixLength < base.length && prefixLength < current.length && base[prefixLength] === current[prefixLength]) {
    prefixLength += 1;
  }

  let suffixLength = 0;
  while (
    suffixLength < base.length - prefixLength &&
    suffixLength < current.length - prefixLength &&
    base[base.length - 1 - suffixLength] === current[current.length - 1 - suffixLength]
  ) {
    suffixLength += 1;
  }

  const changed = current.slice(prefixLength, current.length - suffixLength);
  if (!changed) return null;

  return { tokens: splitDiffTokens(changed) };
};

const splitDiffTokens = (text: string) =>
  text
    .split(/[，。；、,.]/)
    .map((item) => item.trim())
    .filter(Boolean);

const stopNativeDrag = (event: DragEvent<HTMLElement>) => {
  event.preventDefault();
  event.stopPropagation();
};

export default function ImageNode({
  node,
  selected,
  color,
  onSelect,
  onPreview,
  onImageUpload,
  onPromptChange,
  promptCompareBase,
  onConnectionStart,
  onSizeChange,
}: Props) {
  const isFinal = node.type === 'final';
  const isGenerated = node.type === 'generated';
  const isResult = node.type === 'result' || isFinal || isGenerated;
  const fallbackSize = isResult ? resultImageSize : defaultImageSize;
  const [imageSrc, setImageSrc] = useState(node.image ?? '');
  const [imageSize, setImageSize] = useState<ImageSize>(fallbackSize);
  const [imageFailed, setImageFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const promptRef = useRef<HTMLTextAreaElement | null>(null);
  const prompt = node.prompt ?? '';
  const diff = useMemo(() => getPromptDiff(promptCompareBase ?? '', prompt), [prompt, promptCompareBase]);

  const adjustPromptHeight = () => {
    const input = promptRef.current;
    if (!input) return;
    input.style.height = 'auto';
    input.style.height = `${input.scrollHeight + 2}px`;
  };

  useEffect(() => {
    const nextImage = node.image ?? '';
    setImageSrc(nextImage);
    setImageFailed(false);

    if (!nextImage) {
      setImageSize(fallbackSize);
      return;
    }

    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      if (cancelled) return;
      setImageSize(fitImageSize(image.naturalWidth, image.naturalHeight, fallbackSize));
    };
    image.onerror = () => {
      if (cancelled) return;
      setImageFailed(true);
      setImageSize(fallbackSize);
    };
    image.src = nextImage;

    return () => {
      cancelled = true;
    };
  }, [fallbackSize, node.image]);

  useEffect(() => {
    adjustPromptHeight();
    const frame = window.requestAnimationFrame(adjustPromptHeight);
    return () => window.cancelAnimationFrame(frame);
  }, [imageSize.width, prompt]);

  useEffect(() => {
    onSizeChange?.(node.id, imageSize);
  }, [imageSize, node.id, onSizeChange]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1400);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const previewUrl = String(reader.result ?? '');
      setImageFailed(false);
      setImageSrc(previewUrl);
      onImageUpload(previewUrl);
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleCopyPrompt = async () => {
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
    } catch {
      const fallback = document.createElement('textarea');
      fallback.value = prompt;
      fallback.style.position = 'fixed';
      fallback.style.left = '-9999px';
      document.body.appendChild(fallback);
      fallback.select();
      document.execCommand('copy');
      document.body.removeChild(fallback);
      setCopied(true);
    }
  };

  return (
    <article
      className={`node-card image-node-card group ${isFinal ? 'final-node' : ''} ${selected ? 'is-selected' : ''}`}
      style={{ '--node-color': color, width: imageSize.width } as CSSProperties}
      onClick={onSelect}
      onDragStart={stopNativeDrag}
      onDrop={stopNativeDrag}
    >
      <div className="image-node-label">
        <ImageIcon size={13} />
        <span>{getNodeLabel(node)}</span>
      </div>
      <div
        className="image-node-frame"
        style={{
          width: imageSize.width,
          height: imageSize.height,
        }}
      >
        <span
          data-connection-handle="true"
          data-node-id={node.id}
          data-side="left"
          className="connection-dot image-connection-dot image-connection-dot-left"
          onMouseDown={(event) => onConnectionStart?.(event, 'left')}
          title="拖出时间线"
        />
        <span
          data-connection-handle="true"
          data-node-id={node.id}
          data-side="right"
          className="connection-dot image-connection-dot image-connection-dot-right"
          onMouseDown={(event) => onConnectionStart?.(event, 'right')}
          title="拖出时间线"
        />
        {imageSrc && !imageFailed && (
          <img
            key={imageSrc}
            src={imageSrc}
            alt={node.title}
            draggable={false}
            className="absolute inset-0 z-10 h-full w-full object-cover"
            onDragStart={(event) => event.preventDefault()}
            onError={() => setImageFailed(true)}
            onLoad={(event) => {
              const image = event.currentTarget;
              setImageSize(fitImageSize(image.naturalWidth, image.naturalHeight, fallbackSize));
            }}
          />
        )}
        <div className={`grid h-full w-full place-items-center bg-zinc-800 text-zinc-500 ${imageSrc && !imageFailed ? 'opacity-0' : ''}`}>
          <div className="text-center">
            <ImageIcon className="mx-auto" size={42} />
            <p className="mt-3 text-xs">{imageFailed ? '图片加载失败，请重新上传' : '点击左上角上传图片'}</p>
          </div>
        </div>
        <label
          className={`image-node-upload ${selected || !imageSrc || imageFailed ? 'opacity-100' : 'opacity-0'}`}
          aria-label="上传图片"
          onClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <Upload size={16} />
          <input type="file" accept="image/*" className="sr-only" onChange={handleUpload} />
        </label>
        {imageSrc && !imageFailed && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onPreview();
            }}
            className="image-node-preview opacity-0 group-hover:opacity-100"
            aria-label="预览大图"
          >
            <Expand size={15} />
          </button>
        )}
      </div>
      {isGenerated && (
        <div className="ai-prompt-panel" onClick={(event) => event.stopPropagation()}>
          <div className="ai-prompt-header">
            <span className="ai-prompt-badge">PROMPT</span>
            <div className="ai-prompt-actions">
              <button
                type="button"
                className="ai-prompt-copy"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleCopyPrompt();
                }}
                onMouseDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? '已复制' : '复制'}
              </button>
            </div>
          </div>
          <textarea
            ref={promptRef}
            value={prompt}
            onChange={(event) => {
              event.currentTarget.style.height = 'auto';
              event.currentTarget.style.height = `${event.currentTarget.scrollHeight + 2}px`;
              onPromptChange(event.target.value);
            }}
            onMouseDown={(event) => event.stopPropagation()}
            placeholder="填写 AI 生图提示词"
            className="ai-prompt-input"
          />
          {promptCompareBase !== undefined && (
            <div className="ai-prompt-diff">
              <p className="ai-prompt-diff-title">与第 1 张 AI 生图提示词差异</p>
              {diff ? (
                <div className="ai-prompt-diff-list">
                  {diff.tokens.map((token, index) => (
                    <span key={`${token}-${index}`} className={`ai-prompt-diff-chip tone-${index % 6}`}>
                      {token}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="ai-prompt-diff-text">暂无差异</p>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
