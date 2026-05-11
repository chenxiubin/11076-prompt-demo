import { useEffect, useMemo, useRef, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

const MATERIALS = [
  { value: "general", label: "通用", detail: "适合大多数产品图的均衡处理。" },
  { value: "giftbox_packaging", label: "礼盒包装", detail: "强化纸面、印刷、烫金和包装边缘层次。" },
  { value: "newyear_goods", label: "年俗用品", detail: "适合红金配色、摆件、挂饰、节庆礼品，增强喜庆色泽和金属高光。" },
  { value: "giftbox_display", label: "礼盒展示", detail: "适合打开礼盒或组合展示，保留杯子、文具、雨伞等内部产品的多材质层次。" },
  { value: "stationery", label: "文具", detail: "强调文字、图案、纸张和塑料边缘清晰度，避免过度锐化。" }
];

const MODES = [
  { value: "standard", label: "标准模式", detail: "阿里云商品分割 + 原图像素保留，适合稳定出图和文字产品。" },
  { value: "quality", label: "质感模式", detail: "阿里千问图像修图，更强调观感、材质和整体氛围。" },
  { value: "hd", label: "高清模式", detail: "Gemini 修图 + 原图细节回注，适合放大检查纹理与文字。" }
];

const ASPECTS = [
  { value: "1:1", label: "1:1", ratio: 1 },
  { value: "4:3", label: "4:3", ratio: 4 / 3 },
  { value: "3:4", label: "3:4", ratio: 3 / 4 },
  { value: "9:16", label: "9:16", ratio: 9 / 16 }
];

const MODE_ENGINE_LABELS = {
  aliyun: "阿里云商品分割",
  qwen: "阿里千问图像修图",
  gemini: "Nano Banana 2 / Gemini"
};

const EMPTY_PROGRESS = {
  visible: false,
  operation: "preview",
  mode: "standard",
  percent: 0,
  failed: false
};

const STAGE = { width: 860, height: 560 };
const FRAME_MAX_WIDTH = 650;
const FRAME_MAX_HEIGHT = 430;
const IMAGE_MIN_SCALE = 0.6;
const IMAGE_MAX_SCALE = 4;
const FRAME_MIN_SCALE = 0.46;
const FRAME_MAX_SCALE = 1.35;
const COMPARE_MAX_WIDTH = 980;
const COMPARE_MAX_HEIGHT = 620;

export default function App() {
  const inputRef = useRef(null);
  const stageRef = useRef(null);
  const compareRef = useRef(null);
  const dragRef = useRef(null);
  const compareDragRef = useRef(null);

  const [file, setFile] = useState(null);
  const [imageNatural, setImageNatural] = useState({ width: 0, height: 0 });
  const [aspect, setAspect] = useState("1:1");
  const [material, setMaterial] = useState("general");
  const [mode, setMode] = useState("standard");
  const [preserveTextLogo, setPreserveTextLogo] = useState(false);
  const [activeTool, setActiveTool] = useState("image");
  const [isCropLocked, setIsCropLocked] = useState(false);
  const [draftCrop, setDraftCrop] = useState(createCropState());
  const [appliedCrop, setAppliedCrop] = useState(createCropState());
  const [previewAfterUrl, setPreviewAfterUrl] = useState("");
  const [compareBeforeUrl, setCompareBeforeUrl] = useState("");
  const [previewBlob, setPreviewBlob] = useState(null);
  const [previewSignature, setPreviewSignature] = useState("");
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });
  const [comparePosition, setComparePosition] = useState(50);
  const [compareZoom, setCompareZoom] = useState(1);
  const [comparePan, setComparePan] = useState({ x: 0, y: 0 });
  const [isDraggingUpload, setIsDraggingUpload] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(EMPTY_PROGRESS);
  const [actualMode, setActualMode] = useState("");
  const [actualEngine, setActualEngine] = useState("");

  const fileUrl = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);
  const selectedAspect = ASPECTS.find((item) => item.value === aspect) ?? ASPECTS[0];
  const selectedMaterial = MATERIALS.find((item) => item.value === material) ?? MATERIALS[MATERIALS.length - 1];
  const selectedMode = MODES.find((item) => item.value === mode) ?? MODES[0];
  const frameBase = useMemo(
    () => getViewportSize(selectedAspect.ratio, FRAME_MAX_WIDTH, FRAME_MAX_HEIGHT),
    [selectedAspect.ratio]
  );
  const draftLayout = useMemo(
    () => getCropLayout(imageNatural, frameBase, draftCrop),
    [imageNatural, frameBase, draftCrop]
  );
  const appliedLayout = useMemo(
    () => getCropLayout(imageNatural, frameBase, appliedCrop),
    [imageNatural, frameBase, appliedCrop]
  );
  const currentOutputSignature = useMemo(() => {
    if (!file || !appliedLayout.cropRect) {
      return "";
    }
    const { x, y, width, height } = appliedLayout.cropRect;
    return [
      file.name,
      file.size,
      file.lastModified,
      aspect,
      material,
      mode,
      mode === "hd" && preserveTextLogo ? "preserve" : "normal",
      x,
      y,
      width,
      height
    ].join("|");
  }, [file, appliedLayout.cropRect, aspect, material, mode, preserveTextLogo]);
  const hasPendingCrop = !sameCropState(draftCrop, appliedCrop);
  const needsCropApply = Boolean(fileUrl && !isCropLocked && hasPendingCrop);
  const hasCurrentPreview = Boolean(previewBlob && previewAfterUrl && previewSignature === currentOutputSignature);
  const cropBadgeText = isCropLocked ? "构图已锁定" : hasPendingCrop ? "未应用" : "可调整";
  const cropBadgeClass = isCropLocked
    ? "bg-[#b7ff2a]/15 text-[#d9ff88]"
    : hasPendingCrop
      ? "bg-[#2b2200] text-[#ffe27a]"
      : "bg-white/5 text-white/55";
  const compareSourceSize =
    previewSize.width > 0 && previewSize.height > 0
      ? previewSize
      : appliedLayout.cropRect ?? { width: frameBase.width, height: frameBase.height };
  const compareViewport = useMemo(
    () =>
      getViewportSize(
        compareSourceSize.width / Math.max(compareSourceSize.height, 1),
        COMPARE_MAX_WIDTH,
        COMPARE_MAX_HEIGHT
    ),
    [compareSourceSize]
  );
  const compareDividerPx = Math.round(compareViewport.width * (comparePosition / 100));
  const compareTransform = `translate(${comparePan.x}px, ${comparePan.y}px) scale(${compareZoom})`;
  const progressDetails = progress.visible ? getProgressDetails(progress) : null;
  const showCompare = Boolean(compareBeforeUrl && previewAfterUrl);

  useEffect(() => {
    return () => {
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl);
      }
    };
  }, [fileUrl]);

  useEffect(() => {
    if (!progress.visible || progress.failed || progress.percent >= 100) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setProgress((current) => {
        if (!current.visible || current.failed || current.percent >= 100) {
          return current;
        }
        return {
          ...current,
          percent: Math.min(93, current.percent + progressStep(current.mode, current.percent))
        };
      });
    }, 850);

    return () => window.clearInterval(timer);
  }, [progress.visible, progress.failed, progress.percent]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) {
      return undefined;
    }

    const onWheel = (event) => {
      handleStageWheel(event);
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [imageNatural.width, imageNatural.height, activeTool, isCropLocked]);

  useEffect(() => {
    const compare = compareRef.current;
    if (!compare || !showCompare) {
      return undefined;
    }

    const onWheel = (event) => {
      handleCompareWheel(event);
    };
    compare.addEventListener("wheel", onWheel, { passive: false });
    return () => compare.removeEventListener("wheel", onWheel);
  }, [showCompare, compareZoom, comparePan, compareViewport.width, compareViewport.height]);

  useEffect(() => {
    if (!fileUrl) {
      setImageNatural({ width: 0, height: 0 });
      setDraftCrop(createCropState());
      setAppliedCrop(createCropState());
      setPreviewAfterUrl("");
      setCompareBeforeUrl("");
      setPreviewBlob(null);
      setPreviewSignature("");
      setPreviewSize({ width: 0, height: 0 });
      setError("");
      setStatus("");
      setProgress(EMPTY_PROGRESS);
      setActualMode("");
      setActualEngine("");
      setIsCropLocked(false);
      return;
    }

    const image = new Image();
    image.onload = () => {
      const natural = { width: image.naturalWidth, height: image.naturalHeight };
      setImageNatural(natural);
      const nextCrop = fitCropState(natural, frameBase);
        setDraftCrop(nextCrop);
        setAppliedCrop(nextCrop);
        setComparePosition(50);
        resetCompareView();
        setPreviewAfterUrl("");
        setCompareBeforeUrl("");
        setPreviewBlob(null);
        setPreviewSignature("");
      setPreviewSize({ width: 0, height: 0 });
      setIsCropLocked(false);
    };
    image.src = fileUrl;
  }, [fileUrl, frameBase]);

  useEffect(() => {
    if (!imageNatural.width || !imageNatural.height) {
      return;
    }
    const fitted = fitCropState(imageNatural, frameBase);
    setDraftCrop((current) => preserveCropForAspect(current, fitted, frameBase, selectedAspect.ratio));
    setAppliedCrop((current) => preserveCropForAspect(current, fitted, frameBase, selectedAspect.ratio));
      setIsCropLocked(false);
      setPreviewAfterUrl("");
      setCompareBeforeUrl("");
      setPreviewBlob(null);
      setPreviewSignature("");
      setPreviewSize({ width: 0, height: 0 });
      resetCompareView();
      setProgress(EMPTY_PROGRESS);
    }, [selectedAspect.ratio]);

  useEffect(() => {
    setPreviewAfterUrl("");
    setCompareBeforeUrl("");
    setPreviewBlob(null);
    setPreviewSignature("");
    setPreviewSize({ width: 0, height: 0 });
    resetCompareView();
    setProgress(EMPTY_PROGRESS);
  }, [mode, material, preserveTextLogo]);

  async function handleFiles(fileList) {
    const nextFile = fileList?.[0];
    if (!nextFile) {
      return;
    }
    setFile(nextFile);
  }

  function openFilePicker() {
    inputRef.current?.click();
  }

  function startCropDrag(pointerEvent, kind) {
    if (!imageNatural.width || !imageNatural.height) {
      return;
    }
    if (isCropLocked) {
      pointerEvent.preventDefault();
      return;
    }
    pointerEvent.preventDefault();
    pointerEvent.currentTarget.setPointerCapture?.(pointerEvent.pointerId);
    dragRef.current = {
      pointerId: pointerEvent.pointerId,
      kind,
      startX: pointerEvent.clientX,
      startY: pointerEvent.clientY,
      startCrop: { ...draftCrop }
    };
  }

  function handleStagePointerMove(pointerEvent) {
    const activeDrag = dragRef.current;
    if (!activeDrag || activeDrag.pointerId !== pointerEvent.pointerId) {
      return;
    }
    pointerEvent.preventDefault();
    const deltaX = pointerEvent.clientX - activeDrag.startX;
    const deltaY = pointerEvent.clientY - activeDrag.startY;

    setDraftCrop((current) => {
      const base = activeDrag.startCrop;
      if (activeDrag.kind === "image" || (activeDrag.kind === "stage" && activeTool === "image")) {
        return {
          ...base,
          imageOffsetX: base.imageOffsetX + deltaX,
          imageOffsetY: base.imageOffsetY + deltaY
        };
      }
      if (activeDrag.kind === "frame" || (activeDrag.kind === "stage" && activeTool === "frame")) {
        return {
          ...base,
          frameOffsetX: base.frameOffsetX + deltaX,
          frameOffsetY: base.frameOffsetY + deltaY
        };
      }
      return current;
    });
  }

  function handleStagePointerUp(pointerEvent) {
    const activeDrag = dragRef.current;
    if (!activeDrag || activeDrag.pointerId !== pointerEvent.pointerId) {
      return;
    }
    pointerEvent.preventDefault();
    dragRef.current = null;
  }

  function handleStageWheel(event) {
    if (!imageNatural.width || !imageNatural.height) {
      return;
    }
    event.preventDefault();
    event.stopPropagation?.();
    if (isCropLocked) {
      return;
    }
    const delta = event.deltaY < 0 ? 0.08 : -0.08;
    if (activeTool === "image") {
      setDraftCrop((current) => ({
        ...current,
        imageScale: clampFloat(current.imageScale + delta, IMAGE_MIN_SCALE, IMAGE_MAX_SCALE)
      }));
      return;
    }
    setDraftCrop((current) => ({
      ...current,
      frameScale: clampFloat(current.frameScale + delta, FRAME_MIN_SCALE, FRAME_MAX_SCALE)
    }));
  }

  function fitImageToFrame() {
    if (isCropLocked) {
      return;
    }
    if (!imageNatural.width || !imageNatural.height) {
      return;
    }
    const next = fitCropState(imageNatural, frameBase);
    setDraftCrop(next);
  }

  function revertDraft() {
    if (isCropLocked) {
      return;
    }
    setDraftCrop(appliedCrop);
  }

  function applyCrop() {
    setAppliedCrop(draftCrop);
    setIsCropLocked(true);
    setPreviewAfterUrl("");
    setCompareBeforeUrl("");
    setPreviewBlob(null);
    setPreviewSignature("");
    setPreviewSize({ width: 0, height: 0 });
    resetCompareView();
    setProgress(EMPTY_PROGRESS);
    setStatus("已应用并锁定当前裁剪构图。切换修图模式或材质管线时会保持同一构图。");
    setError("");
  }

  function unlockCrop() {
    setDraftCrop(appliedCrop);
    setIsCropLocked(false);
    setStatus("已解锁裁剪构图，可以重新调整后再应用。");
    setError("");
  }

  function handleAspectChange(nextAspect) {
    setAspect(nextAspect);
  }

  async function generatePreview() {
    if (!file || !appliedLayout.cropRect) {
      return;
    }

    setIsPreviewing(true);
    setError("");
    setStatus("");
    setProgress(createProgress("preview", mode, 3));

    try {
      const beforeUrl = await createCropPreviewUrl(file, appliedLayout.cropRect);
      setProgress((current) => advanceProgress(current, 12));
      setCompareBeforeUrl(beforeUrl);
      setPreviewSize({
        width: appliedLayout.cropRect.width,
        height: appliedLayout.cropRect.height
      });

      const formData = new FormData();
      formData.append("file", file);
      formData.append("aspect", aspect);
      formData.append("material", material);
      formData.append("mode", mode);
      formData.append("preserve_text_logo", String(mode === "hd" && preserveTextLogo));
      formData.append("crop_x", String(appliedLayout.cropRect.x));
      formData.append("crop_y", String(appliedLayout.cropRect.y));
      formData.append("crop_w", String(appliedLayout.cropRect.width));
      formData.append("crop_h", String(appliedLayout.cropRect.height));

      setProgress((current) => advanceProgress(current, 28));
      const response = await fetch(`${API_BASE}/api/preview`, {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const detail = await readError(response);
        throw new Error(detail);
      }

      setProgress((current) => advanceProgress(current, 94));
      const blob = await response.blob();
      const resultUrl = URL.createObjectURL(blob);
      setPreviewBlob(blob);
      setPreviewSignature(currentOutputSignature);
      setPreviewAfterUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }
        return resultUrl;
      });
      setActualMode(response.headers.get("X-Actual-Mode") || mode);
      setActualEngine(response.headers.get("X-Actual-Engine") || engineForMode(mode));
      setComparePosition(50);
      resetCompareView();
      setProgress((current) => completeProgress(current));
      setStatus("预览已生成，可以拖动中线检查抠图效果。");
    } catch (previewError) {
      setProgress((current) => failProgress(current));
      setError(`预览生成失败：${previewError.message}`);
    } finally {
      setIsPreviewing(false);
    }
  }

  async function downloadResult() {
    if (!file || !appliedLayout.cropRect) {
      return;
    }

    if (!hasCurrentPreview || !previewBlob) {
      setError("请先生成当前线路预览，再下载。这样可以保证下载文件与预览窗口完全一致。");
      return;
    }

    downloadBlob(previewBlob, buildDownloadFileName(aspect, material, mode));
    setStatus("已下载当前预览结果，文件内容与预览窗口保持一致。");
    setError("");
  }

  function handleComparePointer(event) {
    if (!compareRef.current || !previewAfterUrl) {
      return;
    }
    if (event.type === "pointerdown") {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }
    const bounds = compareRef.current.getBoundingClientRect();
    const pointX = event.clientX - bounds.left;
    const pointY = event.clientY - bounds.top;
    const nearDivider = Math.abs(pointX - compareDividerPx) <= 28;

    if (event.type === "pointerdown") {
      compareDragRef.current = {
        type: nearDivider || compareZoom <= 1 ? "divider" : "pan",
        startX: event.clientX,
        startY: event.clientY,
        startPan: comparePan
      };
    }

    if (compareDragRef.current?.type === "pan") {
      const deltaX = event.clientX - compareDragRef.current.startX;
      const deltaY = event.clientY - compareDragRef.current.startY;
      setComparePan(
        clampComparePan(
          {
            x: compareDragRef.current.startPan.x + deltaX,
            y: compareDragRef.current.startPan.y + deltaY
          },
          compareZoom,
          compareViewport
        )
      );
      return;
    }

    const next = (pointX / bounds.width) * 100;
    setComparePosition(clampFloat(next, 0, 100));
    if (pointY < 0 || pointY > bounds.height) {
      return;
    }
  }

  function handleComparePointerUp(event) {
    event.preventDefault();
    compareDragRef.current = null;
  }

  function handleCompareWheel(event) {
    if (!compareRef.current || !previewAfterUrl) {
      return;
    }
    event.preventDefault();
    event.stopPropagation?.();

    const bounds = compareRef.current.getBoundingClientRect();
    const mouseX = event.clientX - bounds.left;
    const mouseY = event.clientY - bounds.top;
    const nextZoom = clampFloat(compareZoom * (event.deltaY < 0 ? 1.12 : 0.89), 1, 5);
    const ratio = nextZoom / compareZoom;
    const nextPan = {
      x: mouseX - (mouseX - comparePan.x) * ratio,
      y: mouseY - (mouseY - comparePan.y) * ratio
    };
    setCompareZoom(nextZoom);
    setComparePan(clampComparePan(nextPan, nextZoom, compareViewport));
  }

  function resetCompareView() {
    setCompareZoom(1);
    setComparePan({ x: 0, y: 0 });
    compareDragRef.current = null;
  }

  return (
    <main className="retouch-legacy-page h-full w-full overflow-y-auto bg-[#050706] text-[#f4f7ef]">
      <section className="border-b border-white/10 bg-[#050706]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-7 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#b7ff2a]">
              GULIAN VISUAL PRODUCT RETOUCH
            </p>
            <h1 className="mt-2 text-3xl font-semibold leading-tight text-white sm:text-5xl">
              谷联视觉部产品白底修图平台
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-white/60">
              上传单张大图，先手动裁剪构图，再按模式生成白底商品图。当前支持标准模式、质感模式和高清模式。
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-sm text-white/75">
            <Badge icon={<CropIcon />}>{aspect}</Badge>
            <Badge icon={<SparkIcon />}>{selectedMaterial.label}</Badge>
            <Badge icon={<RouteIcon />}>{selectedMode.label}</Badge>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-6 sm:px-8 lg:grid-cols-[minmax(0,1.35fr)_380px]">
        <div className="space-y-6">
          <div
            className={`flex min-h-[300px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
              isDraggingUpload ? "border-[#b7ff2a] bg-[#0d1110]" : "border-white/12 bg-[#0d1110] hover:border-[#b7ff2a]"
            }`}
            onClick={openFilePicker}
            onDragEnter={(event) => {
              event.preventDefault();
              setIsDraggingUpload(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setIsDraggingUpload(false)}
            onDrop={(event) => {
              event.preventDefault();
              setIsDraggingUpload(false);
              handleFiles(event.dataTransfer.files);
            }}
          >
            <input
              ref={inputRef}
              className="hidden"
              type="file"
              accept="image/*"
              onChange={(event) => handleFiles(event.target.files ?? [])}
            />
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#b7ff2a] text-[#050706]">
              <UploadIcon />
            </div>
            <h2 className="text-2xl font-semibold text-white">拖拽或选择产品图</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-white/55">
              上传单张原图后，我们先做手动裁剪构图，再生成白底预览和最终 PNG 成图。
            </p>
            <button
              className="mt-6 rounded-xl bg-[#b7ff2a] px-5 py-3 text-sm font-semibold text-[#050706] transition hover:bg-[#d3ff72]"
              type="button"
            >
              选择图片
            </button>
          </div>

          {fileUrl && (
            <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d1110]">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-white">裁剪构图</p>
                  <p className="text-xs text-white/50">应用后会锁定构图；需要重新构图时先解锁，空白区域会自动补白。</p>
                </div>
                <span className={`rounded-md px-2 py-1 text-xs font-semibold ${cropBadgeClass}`}>
                  {cropBadgeText}
                </span>
              </div>

              <div className="p-4">
                <div
                  ref={stageRef}
                  className={`relative mx-auto overscroll-contain overflow-hidden rounded-2xl border border-white/10 bg-[#111614] ${
                    isCropLocked ? "cursor-not-allowed" : ""
                  }`}
                  style={{ width: `${STAGE.width}px`, height: `${STAGE.height}px` }}
                  onPointerMove={handleStagePointerMove}
                  onPointerUp={handleStagePointerUp}
                  onPointerLeave={handleStagePointerUp}
                >
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),rgba(255,255,255,0))]" />

                  {fileUrl && (
                    <img
                      className="absolute left-1/2 top-1/2 max-w-none select-none"
                      src={fileUrl}
                      alt={file?.name ?? "原图"}
                      draggable="false"
                      onPointerDown={(event) => startCropDrag(event, "stage")}
                      style={{
                        width: `${draftLayout.image.width}px`,
                        height: `${draftLayout.image.height}px`,
                        transform: `translate(calc(-50% + ${draftLayout.image.offsetX}px), calc(-50% + ${draftLayout.image.offsetY}px))`
                      }}
                    />
                  )}

                  <div className="absolute bg-black/32" style={{ left: 0, top: 0, width: "100%", height: `${draftLayout.frameRect.y}px` }} />
                  <div
                    className="absolute bg-black/32"
                    style={{
                      left: 0,
                      top: `${draftLayout.frameRect.y + draftLayout.frameRect.height}px`,
                      width: "100%",
                      height: `${Math.max(0, STAGE.height - draftLayout.frameRect.y - draftLayout.frameRect.height)}px`
                    }}
                  />
                  <div
                    className="absolute bg-black/32"
                    style={{
                      left: 0,
                      top: `${draftLayout.frameRect.y}px`,
                      width: `${draftLayout.frameRect.x}px`,
                      height: `${draftLayout.frameRect.height}px`
                    }}
                  />
                  <div
                    className="absolute bg-black/32"
                    style={{
                      left: `${draftLayout.frameRect.x + draftLayout.frameRect.width}px`,
                      top: `${draftLayout.frameRect.y}px`,
                      width: `${Math.max(0, STAGE.width - draftLayout.frameRect.x - draftLayout.frameRect.width)}px`,
                      height: `${draftLayout.frameRect.height}px`
                    }}
                  />

                  <div
                    className="absolute rounded-[28px] border-2 border-[#b7ff2a] shadow-[0_0_0_1px_rgba(255,255,255,0.12)]"
                    style={{
                      left: `${draftLayout.frameRect.x}px`,
                      top: `${draftLayout.frameRect.y}px`,
                      width: `${draftLayout.frameRect.width}px`,
                      height: `${draftLayout.frameRect.height}px`
                    }}
                    onPointerDown={(event) => startCropDrag(event, "frame")}
                  >
                    <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
                      {Array.from({ length: 9 }).map((_, index) => (
                        <div key={index} className="border border-dashed border-white/20" />
                      ))}
                    </div>
                    <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded bg-[#38a7ff] px-3 py-1 text-xs font-semibold text-white">
                      {appliedLayout.cropRect ? `${appliedLayout.cropRect.width} x ${appliedLayout.cropRect.height}` : ""}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0a0d0c] px-4 py-3">
                  <div className="inline-flex rounded-xl border border-white/10 bg-[#111614] p-1">
                    <button
                      className={`rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${
                        activeTool === "image" ? "bg-[#b7ff2a] text-[#050706]" : "text-white/70 hover:text-white"
                      }`}
                      type="button"
                      disabled={isCropLocked}
                      onClick={() => setActiveTool("image")}
                    >
                      图片
                    </button>
                    <button
                      className={`rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${
                        activeTool === "frame" ? "bg-[#b7ff2a] text-[#050706]" : "text-white/70 hover:text-white"
                      }`}
                      type="button"
                      disabled={isCropLocked}
                      onClick={() => setActiveTool("frame")}
                    >
                      裁剪框
                    </button>
                  </div>

                  <div className="flex min-w-[260px] flex-1 items-center gap-3">
                    <span className="text-xs font-semibold text-white/50">{activeTool === "image" ? "图片缩放" : "裁剪框缩放"}</span>
                    <input
                      className="w-full accent-[#b7ff2a]"
                      type="range"
                      min={activeTool === "image" ? IMAGE_MIN_SCALE : FRAME_MIN_SCALE}
                      max={activeTool === "image" ? IMAGE_MAX_SCALE : FRAME_MAX_SCALE}
                      step="0.01"
                      value={activeTool === "image" ? draftCrop.imageScale : draftCrop.frameScale}
                      disabled={isCropLocked}
                      onChange={(event) => {
                        if (isCropLocked) {
                          return;
                        }
                        const next = Number(event.target.value);
                        setDraftCrop((current) =>
                          activeTool === "image" ? { ...current, imageScale: next } : { ...current, frameScale: next }
                        );
                      }}
                    />
                    <span className="w-16 text-right text-sm font-semibold text-white/70">
                      {activeTool === "image"
                        ? `${Math.round(draftCrop.imageScale * 100)}%`
                        : `${Math.round(draftCrop.frameScale * 100)}%`}
                    </span>
                  </div>

                  {isCropLocked ? (
                    <button
                      className="rounded-lg border border-[#b7ff2a]/60 px-4 py-2 text-sm font-semibold text-[#d9ff88] transition hover:bg-[#b7ff2a]/10"
                      type="button"
                      onClick={unlockCrop}
                    >
                      解锁构图
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        className="rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-white/70 transition hover:border-[#b7ff2a] hover:text-[#b7ff2a]"
                        type="button"
                        onClick={fitImageToFrame}
                      >
                        适配
                      </button>
                      <button
                        className="rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-white/70 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                        type="button"
                        disabled={!hasPendingCrop}
                        onClick={revertDraft}
                      >
                        取消
                      </button>
                      <button
                        className="rounded-lg bg-[#b7ff2a] px-3 py-2 text-sm font-semibold text-[#050706] transition hover:bg-[#d3ff72]"
                        type="button"
                        onClick={applyCrop}
                      >
                        应用并锁定
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {showCompare && (
            <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d1110]">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-white">前后对比预览</p>
                  <p className="text-xs text-white/50">
                    底层是白底结果，上层是裁剪原图。拖动中线擦开原图，查看抠图前后差异。
                  </p>
                </div>
                <span className="rounded-md bg-white/5 px-2 py-1 text-xs font-semibold text-white/60">
                  滑杆对比
                </span>
              </div>

              <div className="p-4">
                <div
                  ref={compareRef}
                  className="relative mx-auto touch-none overflow-hidden rounded-2xl border border-white/10 bg-[#111614]"
                  style={{ width: `${compareViewport.width}px`, height: `${compareViewport.height}px` }}
                  onPointerDown={handleComparePointer}
                  onPointerMove={(event) => {
                    if (event.buttons === 1) {
                      handleComparePointer(event);
                    }
                  }}
                  onPointerUp={handleComparePointerUp}
                  onPointerLeave={handleComparePointerUp}
                >
                  <div
                    className="absolute left-0 top-0 h-full w-full select-none will-change-transform"
                    style={{ transform: compareTransform, transformOrigin: "0 0" }}
                  >
                    <img
                      className="h-full w-full select-none object-fill"
                      src={previewAfterUrl}
                      alt="白底结果"
                      draggable="false"
                    />
                  </div>
                  <div className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${compareDividerPx}px` }}>
                    <div
                      className="absolute left-0 top-0 max-w-none select-none will-change-transform"
                      style={{
                        width: `${compareViewport.width}px`,
                        height: `${compareViewport.height}px`,
                        transform: compareTransform,
                        transformOrigin: "0 0"
                      }}
                    >
                      <img className="h-full w-full select-none object-fill" src={compareBeforeUrl} alt="裁剪原图" draggable="false" />
                    </div>
                  </div>
                  <div className="pointer-events-none absolute inset-y-0" style={{ left: `${compareDividerPx - 1}px` }}>
                    <div className="h-full w-0.5 bg-white shadow-[0_0_0_1px_rgba(183,255,42,0.32)]" />
                  </div>
                  <div
                    className="pointer-events-none absolute top-1/2 z-10 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[#b7ff2a] text-[#050706] shadow-lg"
                    style={{ left: `${compareDividerPx}px` }}
                  >
                    <CompareIcon />
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-white/50">
                  <span>滚轮放大细节；放大后拖动画面平移；靠近中线拖动可擦开对比</span>
                  <span>
                    {compareSourceSize.width} x {compareSourceSize.height} · {Math.round(compareZoom * 100)}%
                  </span>
                </div>
                {compareZoom > 1 && (
                  <button
                    className="mt-3 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-white/60 transition hover:border-[#b7ff2a] hover:text-[#b7ff2a]"
                    type="button"
                    onClick={resetCompareView}
                  >
                    重置预览缩放
                  </button>
                )}
              </div>
            </section>
          )}
        </div>

        <aside className="h-fit rounded-2xl border border-white/10 bg-[#0d1110] p-5">
          <div className="space-y-6">
            <fieldset>
              <legend className="mb-3 text-sm font-semibold text-white/70">裁剪比例</legend>
              <div className="grid grid-cols-4 gap-2">
                {ASPECTS.map((item) => (
                  <button
                    key={item.value}
                    className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                      aspect === item.value
                        ? "border-[#b7ff2a] bg-[#b7ff2a] text-[#050706]"
                        : "border-white/10 bg-[#111614] text-white/70 hover:border-[#b7ff2a]"
                    }`}
                    type="button"
                    onClick={() => handleAspectChange(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="block">
              <span className="mb-3 block text-sm font-semibold text-white/70">修图模式</span>
              <select
                className="w-full rounded-xl border border-white/10 bg-[#111614] px-3 py-3 text-sm text-white outline-none transition focus:border-[#b7ff2a]"
                value={mode}
                onChange={(event) => setMode(event.target.value)}
              >
                {MODES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <span className="mt-2 block text-sm leading-6 text-white/50">{selectedMode.detail}</span>
            </label>

            {mode === "hd" && (
              <label className="flex items-start gap-3 rounded-2xl border border-[#b7ff2a]/25 bg-[#b7ff2a]/10 p-4">
                <input
                  className="mt-1 h-4 w-4 accent-[#b7ff2a]"
                  type="checkbox"
                  checked={preserveTextLogo}
                  onChange={(event) => setPreserveTextLogo(event.target.checked)}
                />
                <span>
                  <span className="block text-sm font-semibold text-[#d9ff88]">实验：文字 / Logo 强回贴</span>
                  <span className="mt-1 block text-sm leading-6 text-white/55">
                    仅在高清模式手动开启。透视变化较大时可能产生重影，默认关闭以保证成图稳定。
                  </span>
                </span>
              </label>
            )}

            <label className="block">
              <span className="mb-3 block text-sm font-semibold text-white/70">材质处理管线</span>
              <select
                className="w-full rounded-xl border border-white/10 bg-[#111614] px-3 py-3 text-sm text-white outline-none transition focus:border-[#b7ff2a]"
                value={material}
                onChange={(event) => setMaterial(event.target.value)}
              >
                {MATERIALS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <span className="mt-2 block text-sm leading-6 text-white/50">{selectedMaterial.detail}</span>
            </label>

            <div className="rounded-2xl border border-white/10 bg-[#111614] p-4 text-sm leading-6 text-white/65">
              <p className="font-semibold text-[#b7ff2a]">当前流程</p>
              <p className="mt-2">1. 先上传原图并手动裁剪构图。</p>
              <p>2. 预览会生成裁剪后的白底对比图。</p>
              <p>3. 下载时输出最终 PNG 成图。</p>
              <p>4. 裁剪框超出原图范围时，会自动补白。</p>
            </div>

            {appliedLayout.cropRect && (
              <p className="rounded-xl border border-white/10 bg-[#111614] px-3 py-2 text-sm leading-6 text-white/65">
                当前输出裁剪尺寸：
                <span className="font-semibold text-white">
                  {" "}
                  {appliedLayout.cropRect.width} x {appliedLayout.cropRect.height}
                </span>
              </p>
            )}

            <p className="rounded-xl border border-white/10 bg-[#111614] px-3 py-2 text-sm leading-6 text-white/65">
              实际线路：
              <span className="font-semibold text-white">
                {" "}
                {MODE_ENGINE_LABELS[actualEngine] || MODE_ENGINE_LABELS[engineForMode(mode)]}
              </span>
            </p>

            {error && (
              <p className="rounded-xl border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm leading-6 text-red-200">
                {error}
              </p>
            )}
            {status && (
              <p className="rounded-xl border border-[#b7ff2a]/25 bg-[#b7ff2a]/10 px-3 py-2 text-sm leading-6 text-[#d9ff88]">
                {status}
              </p>
            )}

            {progressDetails && (
              <ProgressPanel progress={progress} details={progressDetails} />
            )}

            <div className="grid gap-3">
              <button
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#111614] px-5 py-3 text-sm font-semibold text-white transition hover:border-[#b7ff2a] hover:text-[#b7ff2a] disabled:cursor-not-allowed disabled:opacity-40"
                type="button"
                disabled={isPreviewing || isProcessing || !file || !isCropLocked || needsCropApply}
                onClick={generatePreview}
              >
                {isPreviewing ? <SpinnerIcon /> : <CompareIcon />}
                {isPreviewing ? "正在生成最大尺寸预览..." : isCropLocked ? "生成最大尺寸预览" : "先应用并锁定构图"}
              </button>
              <button
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#b7ff2a] px-5 py-3 text-sm font-semibold text-[#050706] transition hover:bg-[#d3ff72] disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-white/35"
                type="button"
                disabled={isProcessing || isPreviewing || !file || !isCropLocked || needsCropApply || !hasCurrentPreview}
                onClick={downloadResult}
              >
                <DownloadIcon />
                {hasCurrentPreview ? "下载预览缓存 PNG" : isCropLocked ? "先生成最大尺寸预览" : "先应用并锁定构图"}
              </button>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}

function CompareCard({ title, url, viewport }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111614]">
      <div className="border-b border-white/10 px-3 py-2 text-xs font-semibold text-white/55">{title}</div>
      <div className="mx-auto overflow-hidden" style={{ width: `${viewport.width}px`, height: `${viewport.height}px` }}>
        <img className="h-full w-full select-none object-fill" src={url} alt={title} draggable="false" />
      </div>
    </div>
  );
}

function ProgressPanel({ progress, details }) {
  return (
    <div className="rounded-2xl border border-[#b7ff2a]/25 bg-[#0a0f0a] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">{details.title}</p>
          <p className="mt-1 text-xs leading-5 text-white/50">{details.subtitle}</p>
        </div>
        <span className="rounded-lg bg-[#b7ff2a] px-2.5 py-1 text-xs font-bold text-[#050706]">
          {Math.round(progress.percent)}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-all duration-500 ${progress.failed ? "bg-red-400" : "bg-[#b7ff2a]"}`}
          style={{ width: `${clampFloat(progress.percent, 0, 100)}%` }}
        />
      </div>
      <p className="mt-3 text-sm leading-6 text-white/65">{details.description}</p>
    </div>
  );
}

function Badge({ icon, children }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[#0d1110] px-3 py-2 font-semibold text-white/75">
      {icon}
      {children}
    </span>
  );
}

function createCropState() {
  return {
    imageScale: 1,
    frameScale: 1,
    imageOffsetX: 0,
    imageOffsetY: 0,
    frameOffsetX: 0,
    frameOffsetY: 0
  };
}

function sameCropState(a, b) {
  return (
    Math.abs(a.imageScale - b.imageScale) < 0.0001 &&
    Math.abs(a.frameScale - b.frameScale) < 0.0001 &&
    Math.abs(a.imageOffsetX - b.imageOffsetX) < 0.5 &&
    Math.abs(a.imageOffsetY - b.imageOffsetY) < 0.5 &&
    Math.abs(a.frameOffsetX - b.frameOffsetX) < 0.5 &&
    Math.abs(a.frameOffsetY - b.frameOffsetY) < 0.5
  );
}

function preserveCropForAspect(current, fitted) {
  if (!Number.isFinite(current.imageScale) || !Number.isFinite(current.frameScale)) {
    return fitted;
  }

  return {
    ...current,
    imageScale: clampFloat(current.imageScale, IMAGE_MIN_SCALE, IMAGE_MAX_SCALE),
    frameScale: clampFloat(current.frameScale, FRAME_MIN_SCALE, FRAME_MAX_SCALE),
    imageOffsetX: current.imageOffsetX,
    imageOffsetY: current.imageOffsetY,
    frameOffsetX: current.frameOffsetX,
    frameOffsetY: current.frameOffsetY
  };
}

function fitCropState(imageNatural) {
  const baseScale = Math.min(STAGE.width / imageNatural.width, STAGE.height / imageNatural.height);
  const scaledWidth = imageNatural.width * baseScale;
  const scaledHeight = imageNatural.height * baseScale;
  const coverScale = Math.max(FRAME_MAX_WIDTH / Math.max(scaledWidth, 1), FRAME_MAX_HEIGHT / Math.max(scaledHeight, 1), 1);

  return {
    imageScale: clampFloat(coverScale, IMAGE_MIN_SCALE, IMAGE_MAX_SCALE),
    frameScale: 1,
    imageOffsetX: 0,
    imageOffsetY: 0,
    frameOffsetX: 0,
    frameOffsetY: 0
  };
}

function getCropLayout(imageNatural, frameBase, cropState) {
  const frameWidth = Math.round(frameBase.width * cropState.frameScale);
  const frameHeight = Math.round(frameBase.height * cropState.frameScale);
  const frameRect = {
    x: Math.round(STAGE.width / 2 - frameWidth / 2 + cropState.frameOffsetX),
    y: Math.round(STAGE.height / 2 - frameHeight / 2 + cropState.frameOffsetY),
    width: frameWidth,
    height: frameHeight
  };

  if (!imageNatural.width || !imageNatural.height) {
    return {
      image: { width: 0, height: 0, offsetX: 0, offsetY: 0 },
      frameRect,
      cropRect: null
    };
  }

  const baseScale = Math.min(STAGE.width / imageNatural.width, STAGE.height / imageNatural.height);
  const imageWidth = imageNatural.width * baseScale * cropState.imageScale;
  const imageHeight = imageNatural.height * baseScale * cropState.imageScale;
  const imageLeft = STAGE.width / 2 - imageWidth / 2 + cropState.imageOffsetX;
  const imageTop = STAGE.height / 2 - imageHeight / 2 + cropState.imageOffsetY;
  const displayScale = imageWidth / imageNatural.width;

  const cropRect = {
    x: Math.round((frameRect.x - imageLeft) / displayScale),
    y: Math.round((frameRect.y - imageTop) / displayScale),
    width: Math.max(1, Math.round(frameRect.width / displayScale)),
    height: Math.max(1, Math.round(frameRect.height / displayScale))
  };

  return {
    image: {
      width: Math.round(imageWidth),
      height: Math.round(imageHeight),
      offsetX: Math.round(cropState.imageOffsetX),
      offsetY: Math.round(cropState.imageOffsetY)
    },
    frameRect,
    cropRect
  };
}

function getViewportSize(ratio, maxWidth, maxHeight) {
  if (!Number.isFinite(ratio) || ratio <= 0) {
    return { width: maxWidth, height: maxHeight };
  }
  let width = maxWidth;
  let height = Math.round(width / ratio);
  if (height > maxHeight) {
    height = maxHeight;
    width = Math.round(height * ratio);
  }
  return { width, height };
}

function clampFloat(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function clampComparePan(pan, zoom, viewport) {
  if (zoom <= 1) {
    return { x: 0, y: 0 };
  }
  const scaledWidth = viewport.width * zoom;
  const scaledHeight = viewport.height * zoom;
  const minX = Math.min(0, viewport.width - scaledWidth);
  const minY = Math.min(0, viewport.height - scaledHeight);
  return {
    x: clampFloat(pan.x, minX, 0),
    y: clampFloat(pan.y, minY, 0)
  };
}

async function createCropPreviewUrl(file, cropRect) {
  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = cropRect.width;
  canvas.height = cropRect.height;
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const overlapLeft = Math.max(0, cropRect.x);
  const overlapTop = Math.max(0, cropRect.y);
  const overlapRight = Math.min(image.naturalWidth, cropRect.x + cropRect.width);
  const overlapBottom = Math.min(image.naturalHeight, cropRect.y + cropRect.height);

  if (overlapRight > overlapLeft && overlapBottom > overlapTop) {
    const sx = overlapLeft;
    const sy = overlapTop;
    const sw = overlapRight - overlapLeft;
    const sh = overlapBottom - overlapTop;
    const dx = overlapLeft - cropRect.x;
    const dy = overlapTop - cropRect.y;
    context.drawImage(image, sx, sy, sw, sh, dx, dy, sw, sh);
  }

  return canvas.toDataURL("image/png");
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("读取图片失败"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("图片加载失败"));
    image.src = src;
  });
}

async function readError(response) {
  try {
    const data = await response.json();
    return data.detail || JSON.stringify(data);
  } catch {
    return `${response.status} ${response.statusText}`;
  }
}

function downloadBlob(blob, fileName) {
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(downloadUrl);
}

function buildDownloadFileName(aspect, material, mode, variant = "preview") {
  const safeAspect = aspect.replace(":", "x");
  return `PNG-${variant}-${safeAspect}-${material}-${mode}.png`;
}

function engineForMode(mode) {
  if (mode === "standard") {
    return "aliyun";
  }
  if (mode === "quality") {
    return "qwen";
  }
  return "gemini";
}

function createProgress(operation, mode, percent = 0) {
  return {
    visible: true,
    operation,
    mode,
    percent,
    failed: false
  };
}

function advanceProgress(current, percent) {
  if (!current.visible) {
    return current;
  }
  return { ...current, percent: Math.max(current.percent, percent), failed: false };
}

function completeProgress(current) {
  if (!current.visible) {
    return current;
  }
  return { ...current, percent: 100, failed: false };
}

function failProgress(current) {
  if (!current.visible) {
    return current;
  }
  return { ...current, failed: true };
}

function progressStep(mode, percent) {
  if (mode === "standard") {
    return percent < 35 ? 8 : percent < 70 ? 5 : 2;
  }
  if (mode === "quality") {
    return percent < 30 ? 6 : percent < 66 ? 3 : 1.4;
  }
  return percent < 30 ? 5 : percent < 62 ? 2.4 : 1.2;
}

function getProgressDetails(progress) {
  if (progress.failed) {
    return {
      title: "处理失败",
      subtitle: "请查看上方错误信息",
      description: "当前任务已停止，调整参数或网络后可以重新生成。"
    };
  }

  const operationLabel = progress.operation === "preview" ? "生成预览" : "生成 4K 成图";
  if (progress.percent >= 100) {
    return {
      title: `${operationLabel}完成`,
      subtitle: "结果已就绪",
      description: progress.operation === "preview" ? "可以拖动中线检查前后差异。" : "PNG 已触发下载。"
    };
  }

  const stages = progressStages(progress.mode);
  const stage = stages.find((item) => progress.percent <= item.until) ?? stages[stages.length - 1];
  return {
    title: operationLabel,
    subtitle: stage.title,
    description: stage.description
  };
}

function progressStages(mode) {
  if (mode === "standard") {
    return [
      { until: 18, title: "读取裁剪区域", description: "正在按你应用的裁剪框准备图片数据。" },
      { until: 42, title: "阿里云商品分割", description: "正在识别主体轮廓并分离背景。" },
      { until: 72, title: "边缘清理", description: "正在压制背景残留并柔化锯齿边缘。" },
      { until: 93, title: "白底合成", description: "正在合成白底图并应用材质处理管线。" }
    ];
  }

  if (mode === "quality") {
    return [
      { until: 16, title: "读取裁剪区域", description: "正在准备发送给阿里千问的裁剪图。" },
      { until: 34, title: "主体参考识别", description: "正在提取原图主体框，用于后续像素对齐。" },
      { until: 76, title: "阿里千问质感修图", description: "正在增强材质、清理背景并优化商品观感。" },
      { until: 93, title: "主体对齐与白底合成", description: "正在把生成结果按原主体位置等比放回画布。" }
    ];
  }

  return [
    { until: 16, title: "读取裁剪区域", description: "正在准备高清模式输入图。" },
    { until: 66, title: "Gemini 图像修图", description: "正在生成白底商品图并优化整体质感。" },
    { until: 82, title: "原图细节回注", description: "正在把原图纹理细节叠回主体区域。" },
    { until: 93, title: "边缘和背景整理", description: "正在清理白底、优化边缘并输出结果。" }
  ];
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8 fill-none stroke-current stroke-[2]">
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M5 20h14" />
    </svg>
  );
}

function CropIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[2]">
      <path d="M6 2v14a2 2 0 0 0 2 2h14" />
      <path d="M18 22V8a2 2 0 0 0-2-2H2" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[2]">
      <path d="m12 3 1.9 4.6L18.5 9l-4.6 1.4L12 15l-1.9-4.6L5.5 9l4.6-1.4Z" />
    </svg>
  );
}

function RouteIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[2]">
      <path d="M5 5h6v6H5z" />
      <path d="M13 8h2a4 4 0 0 1 4 4v1" />
      <path d="m17 16 2-2 2 2" />
    </svg>
  );
}

function CompareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[2]">
      <path d="m8 7-4 5 4 5" />
      <path d="m16 7 4 5-4 5" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[2]">
      <path d="M12 4v10" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 20h14" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin fill-none stroke-current stroke-[2]">
      <path d="M12 3a9 9 0 1 0 9 9" />
    </svg>
  );
}
