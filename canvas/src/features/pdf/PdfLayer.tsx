// IMPORTANT: Configure pdfjs worker BEFORE any other imports
import { createLogger } from '../../../../logging';
import { ToolType, ViewState } from '../../types/types';
import * as pdfjs from 'pdfjs-dist';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActiveSlots, CanvasToolbarComponentProps, EraserMode, SizeSlot, ToolSizes } from "../../components/CanvasToolbar";
import type { CanvasDrawingData } from "../../types/drawingTypes";
import { CanvasEditor } from '../../CanvasEditor';
import './pdf.css';
import { renderPdfBackground, type GridPatternType, type PageInfo } from "./pdfBackground";
import {
    MAX_CANVAS_DIMENSION,
    MIN_RENDER_SCALE,
    PAGE_GAP,
} from './pdfConstants';
import { renderTextLayerWithOcr } from "./pdfTextLayer";
import { useTextLayerWheelPanZoom } from "./useTextLayerWheelPanZoom";
// Use local worker file copied to public directory
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

const logger = createLogger("com.aryazos.components.pdf.viewer");
export interface PdfViewerProps {
  /** URL or file path to the PDF */
  src?: string;
  /** Base64 encoded PDF data (alternative to src) */
  pdfData?: string;
  /** Document ID for annotation storage */
  documentId: string;
  /** Initial annotation data */
  initialAnnotations?: CanvasDrawingData | null;
  /** Callback when annotations change */
  onAnnotationsChange?: (data: CanvasDrawingData) => void;
  /** Callback to save annotations */
  onSave?: (data: CanvasDrawingData) => Promise<void>;
  /** Whether annotations are read-only */
  readOnly?: boolean;
  /** CSS class name */
  className?: string;
  /** Theme variant */
  theme?: "dark" | "light";
  /** Custom toolbar renderer - if provided, internal toolbar is not shown */
  renderToolbar?: (props: CanvasToolbarComponentProps) => React.ReactNode;
  /** Title to display above the first page */
  title?: string;
  /** External tool state */
  tool?: ToolType;
  /** External color state */
  color?: string;
  /** External tool sizes */
  toolSizes?: ToolSizes;
  /** External active slots */
  activeSlots?: ActiveSlots;
  /** External eraser mode */
  eraserMode?: EraserMode;
  /** Callback when tool changes */
  onToolChange?: (tool: ToolType) => void;
  /** Callback when color changes */
  onColorChange?: (color: string) => void;
  /** Callback when active slot changes */
  onSlotChange?: (tool: ToolType, slot: SizeSlot) => void;
  /** Callback when size changes */
  onSizeChange?: (tool: ToolType, slot: SizeSlot, size: number) => void;
  /** Callback when eraser mode changes */
  onEraserModeChange?: (mode: EraserMode) => void;
}

/**
 * PDF Viewer component with annotation overlay.
 * Renders all pages stacked vertically with CanvasEditor for annotations.
 */
export function PdfViewer({
  src,
  pdfData,
  documentId,
  initialAnnotations,
  onAnnotationsChange,
  onSave,
  readOnly = false,
  className,
  theme = "dark",
  renderToolbar,
  title,
  tool: externalTool,
  color: externalColor,
  toolSizes: externalToolSizes,
  activeSlots: externalActiveSlots,
  eraserMode: externalEraserMode,
  onToolChange: externalOnToolChange,
  onColorChange: externalOnColorChange,
  onSlotChange: externalOnSlotChange,
  onSizeChange: externalOnSizeChange,
  onEraserModeChange: externalOnEraserModeChange,
}: PdfViewerProps) {
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewState>(() => initialAnnotations?.view ?? { x: 0, y: 0, scale: 1 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [internalTool, setInternalTool] = useState<ToolType>("pen");

  const tool = externalTool ?? internalTool;

  // Part of the public API; kept for future persistence hooks.
  void documentId;

  const [gridPattern, setGridPattern] = useState<GridPatternType>("dots");
  const [ocrStatus, setOcrStatus] = useState<Map<number, string>>(new Map()); // pageNum -> status

  const containerRef = useRef<HTMLDivElement>(null);
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const textLayerRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const pdfDocRef = useRef<pdfjs.PDFDocumentProxy | null>(null);
  // Track rendered state to avoid re-rendering same scale
  const renderedPagesRef = useRef<Map<number, number>>(new Map()); // pageNum -> scale
  const renderedTextLayersRef = useRef<Set<number>>(new Set()); // pageNum -> hasRendered
  const processingOcrRef = useRef<Set<number>>(new Set()); // pageNum -> isProcessing
  const renderTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Track if initial view has been calculated
  const hasSetInitialViewRef = useRef(false);

  // Autosave handling for CanvasEditor
  const isDirtyRef = useRef(false);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Store the base64 data or URL
  const pdfDataRef = useRef(pdfData);
  const pdfSrcRef = useRef(src);
  pdfDataRef.current = pdfData;
  pdfSrcRef.current = src;

  // Track container size
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useTextLayerWheelPanZoom({ tool, view, setView, containerRef, textLayerRefs });

  // Load PDF document and all page info
  useEffect(() => {
    const currentPdfData = pdfDataRef.current;
    const currentSrc = pdfSrcRef.current;

    if (!currentPdfData && !currentSrc) {
      // No PDF source = Whiteboard mode
      logger.debug("No PDF source provided, initializing in whiteboard mode");
      setIsLoading(false);
      setPages([]);

      // Set initial view for whiteboard if not already set
      if (!hasSetInitialViewRef.current) {
         // Respect the initial view from annotations if present, otherwise default
         if (!initialAnnotations?.view) {
             setView({ x: 0, y: 0, scale: 1 });
         }
         hasSetInitialViewRef.current = true;
      }
      return;
    }

    let cancelled = false;

    // Reset initial view flag so it's recalculated for this new PDF
    hasSetInitialViewRef.current = false;

    async function loadPdf() {
      try {
        logger.debug("Loading PDF document");

        // Create fresh data each time to avoid ArrayBuffer detachment
        let source: Parameters<typeof pdfjs.getDocument>[0];
        if (currentPdfData) {
          const binaryString = atob(currentPdfData);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          source = { data: bytes };
        } else {
          source = currentSrc!;
        }

        const loadingTask = pdfjs.getDocument(source);
        const pdf = await loadingTask.promise;

        if (cancelled) return;

        logger.debug("PDF loaded", { numPages: pdf.numPages });
        pdfDocRef.current = pdf;
        renderedPagesRef.current.clear();
        renderedTextLayersRef.current.clear();

        // Get page dimensions for all pages at scale 1
        const pageInfos: PageInfo[] = [];
        let currentY = 0;

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1 });

          pageInfos.push({
            pageNum: i,
            width: viewport.width,
            height: viewport.height,
            yOffset: currentY,
          });

          currentY += viewport.height + PAGE_GAP;
        }

        if (cancelled) return;
        setPages(pageInfos);
        setIsLoading(false);
      } catch (err) {
        if (cancelled) return;
        logger.error("Failed to load PDF", { error: err });
        setError(`Failed to load PDF: ${(err as Error).message}`);
        setIsLoading(false);
      }
    }

    loadPdf();

    return () => {
      cancelled = true;
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy();
        pdfDocRef.current = null;
      }
    };
  }, [pdfData, src]);

  // Calculate and set initial view to fit and center the first page
  useEffect(() => {
    // Only run once when we have pages and container size
    if (hasSetInitialViewRef.current) return;
    if (pages.length === 0 || containerSize.width === 0 || containerSize.height === 0) return;

    const firstPage = pages[0];
    const padding = 60; // Padding around the page

    // Calculate scale to fit page within container with padding
    const availableWidth = containerSize.width - (padding * 2);
    const availableHeight = containerSize.height - (padding * 2);

    // Fit to width or height, whichever is more constraining, with a max scale
    const scaleToFitWidth = availableWidth / firstPage.width;
    const scaleToFitHeight = availableHeight / firstPage.height;
    const scale = Math.min(
      scaleToFitWidth,
      scaleToFitHeight,
      0.55 // Max initial scale (~55%) for comfortable viewing
    );

    // Center the page horizontally
    const scaledPageWidth = firstPage.width * scale;
    const x = (containerSize.width - scaledPageWidth) / 2;

    // Center the page vertically
    const scaledPageHeight = firstPage.height * scale;
    const y = (containerSize.height - scaledPageHeight) / 2;

    const initialView = { x, y, scale };
    logger.debug("Setting initial view", { initialView });
    setView(initialView);
    hasSetInitialViewRef.current = true;
  }, [pages, containerSize]);

  // Render visible pages
  useEffect(() => {
    if (!pdfDocRef.current || pages.length === 0 || containerSize.width === 0) return;

    if (renderTimeoutRef.current) clearTimeout(renderTimeoutRef.current);

    // Debounce rendering slightly to avoid trashing during fast scrolling/zooming
    renderTimeoutRef.current = setTimeout(async () => {
      const pdf = pdfDocRef.current!;
      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio : 1;

      // Calculate dynamic scale
      let renderScale = Math.max(MIN_RENDER_SCALE, Math.ceil(view.scale * dpr));

      // Calculate visible viewport in PDF coordinate space (unscaled)
      const visibleTop = -view.y / view.scale;
      const visibleBottom = visibleTop + (containerSize.height / view.scale);

      // Add a buffer margin (e.g., 1000px) to pre-render nearby pages
      // This helps avoid white flashes during scrolling
      const buffer = 1000;
      const bufferTop = visibleTop - buffer;
      const bufferBottom = visibleBottom + buffer;

      logger.trace("Checking page visibility", { visibleTop: visibleTop.toFixed(0), visibleBottom: visibleBottom.toFixed(0), targetScale: renderScale });

      for (const pageInfo of pages) {
        const pageTop = pageInfo.yOffset;

        // Check intersection with vertical buffer
        // The container has padding: PAGE_GAP
        const effectivePageTop = pageTop + PAGE_GAP;
        const effectivePageBottom = effectivePageTop + pageInfo.height;

        const isVisible = !(effectivePageBottom < bufferTop || effectivePageTop > bufferBottom);

        const canvas = canvasRefs.current.get(pageInfo.pageNum);
        if (!canvas) continue;

        if (isVisible) {
          // Check max dimensions to avoid browser crashes
          const maxScaleW = MAX_CANVAS_DIMENSION / pageInfo.width;
          const maxScaleH = MAX_CANVAS_DIMENSION / pageInfo.height;
          const allowedScale = Math.min(renderScale, maxScaleW, maxScaleH);

          // Check if already rendered at this scale
          const currentRenderScale = renderedPagesRef.current.get(pageInfo.pageNum);
          if (currentRenderScale === allowedScale) {
             // Already rendered at correct scale, skip
             continue;
          }

          try {
            const page = await pdf.getPage(pageInfo.pageNum);
            const viewport = page.getViewport({ scale: allowedScale });

            // Double buffering to prevent flickering
            // Creating a temp canvas in memory
            const tempCanvas = document.createElement("canvas");
            tempCanvas.width = viewport.width;
            tempCanvas.height = viewport.height;
            const tempContext = tempCanvas.getContext("2d")!;

            await page.render({
              canvasContext: tempContext,
              viewport
            }).promise;

            // Only update the visible canvas once rendering is complete
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const context = canvas.getContext("2d")!;
            context.drawImage(tempCanvas, 0, 0);

            renderedPagesRef.current.set(pageInfo.pageNum, allowedScale);
            // console.log(`[PdfViewer] Page ${pageInfo.pageNum} rendered at scale ${allowedScale}`);
          } catch (err) {
            logger.error("Failed to render page", { pageNum: pageInfo.pageNum, error: err });
          }

          // Render Text Layer with OCR fallback
          const textLayerDiv = textLayerRefs.current.get(pageInfo.pageNum);

          if (textLayerDiv && !renderedTextLayersRef.current.has(pageInfo.pageNum)) {
            const pageCanvas = canvasRefs.current.get(pageInfo.pageNum);
            const status = await renderTextLayerWithOcr({
              pdf,
              pageInfo,
              textLayerDiv,
              pageCanvas,
              renderedTextLayers: renderedTextLayersRef.current,
              processingOcr: processingOcrRef.current,
              setOcrStatus,
              logger,
            });

            if (status === "abort") return;
          }
        }
      }
    }, 100); // 100ms debounce

    return () => {
      if (renderTimeoutRef.current) clearTimeout(renderTimeoutRef.current);
    };
  }, [pages, view, containerSize]);

  // Clean up timers
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }
    };
  }, []);

  // Handle changes from CanvasEditor
  const handleCanvasChange = useCallback(
    (data: CanvasDrawingData) => {
      isDirtyRef.current = true;
      onAnnotationsChange?.(data);

      if (onSave) {
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

        autoSaveTimerRef.current = setTimeout(async () => {
          try {
            await onSave(data);
            isDirtyRef.current = false;
          } catch (err) {
            logger.error("Failed to save annotations", { error: err });
          }
        }, 1500);
      }
    },
    [onSave, onAnnotationsChange]
  );

  // Handle view changes to update resolution
  const handleViewChange = useCallback((newView: ViewState) => {
    setView(newView);
  }, []);

  const themeClass = theme === "light" ? "light" : "";

  return (
    <div
      ref={containerRef}
      className={`pdf-viewer ${themeClass} ${className ?? ""}`}
      style={{ width: "100%", height: "100%" }}
    >
      {/* Content Area with CanvasEditor and PDF Background */}
      <div
        className="pdf-content"
        style={{ overflow: "hidden", position: "relative", background: "transparent", width: "100%", height: "100%" }}
      >
        {isLoading && (
          <div
            className="pdf-loading"
            style={{ position: "absolute", zIndex: 10, top: 20, left: 20 }}
          >
            <span>Loading PDF...</span>
          </div>
        )}

        {error && (
          <div
            className="pdf-error"
            style={{ position: "absolute", zIndex: 10, top: 20, left: 20 }}
          >
            <span>Error: {error}</span>
          </div>
        )}

        <CanvasEditor
          initialData={initialAnnotations ?? undefined}
          onChange={handleCanvasChange}
          view={view}
          onViewChange={handleViewChange}
          readOnly={readOnly}
          theme={theme}
          showGrid={false}
          tool={tool}
          color={externalColor}
          toolSizes={externalToolSizes}
          activeSlots={externalActiveSlots}
          eraserMode={externalEraserMode}
          onToolChange={(newTool) => {
            logger.trace("Tool changed", { from: tool, to: newTool });
            if (externalOnToolChange) {
                externalOnToolChange(newTool);
            } else {
                setInternalTool(newTool);
            }
          }}
          onColorChange={externalOnColorChange}
          onSlotChange={externalOnSlotChange}
          onSizeChange={externalOnSizeChange}
          onEraserModeChange={externalOnEraserModeChange}
          renderToolbar={renderToolbar}
          gridPattern={gridPattern}
          onGridPatternChange={setGridPattern}
          renderBackground={(renderView) => renderPdfBackground({
            renderView,
            gridPattern,
            pdfContainerRef,
            pages,
            canvasRefs,
            textLayerRefs,
            tool,
            title,
            ocrStatus,
            pageGap: PAGE_GAP,
          })}
        />
      </div>
    </div>
  );
}
