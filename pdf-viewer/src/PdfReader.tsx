// IMPORTANT: Configure pdfjs worker BEFORE any other imports
import * as pdfjs from "pdfjs-dist";
import { TextLayer } from "pdfjs-dist";

// Use local worker file copied to public directory
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

import { createLogger } from "../../logging";
import { useEffect, useRef, useState } from "react";
import "./pdf.css";
import { ViewState } from "./types";

const logger = createLogger("com.aryazos.components.pdf.reader");

export interface PdfReaderProps {
  /** URL or file path to the PDF */
  src?: string;
  /** Base64 encoded PDF data (alternative to src) */
  pdfData?: string;
  /** CSS class name */
  className?: string;
  /** Theme variant */
  theme?: "dark" | "light";
  /** Title to display above the first page */
  title?: string;
}

interface PageInfo {
  pageNum: number;
  width: number;
  height: number;
  yOffset: number;
}

// Minimum render scale for high quality PDF rendering
const MIN_RENDER_SCALE = 3;
const MAX_CANVAS_DIMENSION = 4096;
const PAGE_GAP = 20;

/**
 * Pure PDF Reader component - read-only, no annotation canvas.
 * Renders all pages stacked vertically with zoom/pan support.
 */
export function PdfReader({
  src,
  pdfData,
  className,
  theme = "dark",
  title,
}: PdfReaderProps) {
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewState>({ x: 0, y: 0, scale: 1 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const textLayerRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const pdfDocRef = useRef<pdfjs.PDFDocumentProxy | null>(null);
  const renderedPagesRef = useRef<Map<number, number>>(new Map());
  const renderedTextLayersRef = useRef<Set<number>>(new Set());
  const renderTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasSetInitialViewRef = useRef(false);

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

  // Calculate total content size for boundary clamping
  const getTotalContentSize = () => {
    if (pages.length === 0) return { width: 0, height: 0 };
    const maxWidth = Math.max(...pages.map(p => p.width));
    const lastPage = pages[pages.length - 1];
    const totalHeight = lastPage.yOffset + lastPage.height + PAGE_GAP * 2;
    return { width: maxWidth + PAGE_GAP * 2, height: totalHeight };
  };

  // Get the valid boundary limits
  const getBounds = (scale: number) => {
    const content = getTotalContentSize();
    if (content.width === 0 || content.height === 0) return null;

    const scaledWidth = content.width * scale;
    const scaledHeight = content.height * scale;

    // Minimum visible content on each edge (in viewport pixels)
    const minVisible = 400;

    return {
      minX: minVisible - scaledWidth,
      maxX: containerSize.width - minVisible,
      minY: minVisible - scaledHeight,
      maxY: containerSize.height - minVisible,
    };
  };

  // Clamp to bounds (hard border)
  const clampToBounds = (newView: ViewState): ViewState => {
    const bounds = getBounds(newView.scale);
    if (!bounds) return newView;

    return {
      x: Math.max(bounds.minX, Math.min(bounds.maxX, newView.x)),
      y: Math.max(bounds.minY, Math.min(bounds.maxY, newView.y)),
      scale: newView.scale,
    };
  };

  // Handle wheel events for pan/zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      if (e.ctrlKey || e.metaKey) {
        // Zoom centered on cursor
        const sensitivity = 0.01;
        const delta = -e.deltaY;
        const zoomFactor = Math.exp(delta * sensitivity);

        const worldX = (mouseX - view.x) / view.scale;
        const worldY = (mouseY - view.y) / view.scale;

        const newScale = Math.max(0.3, Math.min(3, view.scale * zoomFactor));

        const newView = {
          x: mouseX - worldX * newScale,
          y: mouseY - worldY * newScale,
          scale: newScale,
        };
        setView(clampToBounds(newView));
      } else {
        // Pan with speed dampening and hard border
        const panSpeed = 0.5; // Slow down trackpad panning
        const newView = {
          ...view,
          x: view.x - e.deltaX * panSpeed,
          y: view.y - e.deltaY * panSpeed,
        };
        setView(clampToBounds(newView));
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [view, pages, containerSize]);

  // Load PDF document
  useEffect(() => {
    const currentPdfData = pdfDataRef.current;
    const currentSrc = pdfSrcRef.current;

    if (!currentPdfData && !currentSrc) {
      setError("No PDF source provided");
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    hasSetInitialViewRef.current = false;

    async function loadPdf() {
      try {
        logger.debug("Loading PDF document");

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
    if (hasSetInitialViewRef.current) return;
    if (pages.length === 0 || containerSize.width === 0 || containerSize.height === 0) return;

    const firstPage = pages[0];
    const padding = 60;

    const availableWidth = containerSize.width - (padding * 2);
    const availableHeight = containerSize.height - (padding * 2);

    const scaleToFitWidth = availableWidth / firstPage.width;
    const scaleToFitHeight = availableHeight / firstPage.height;
    const scale = Math.min(
      scaleToFitWidth,
      scaleToFitHeight,
      0.55
    );

    const scaledPageWidth = firstPage.width * scale;
    const x = (containerSize.width - scaledPageWidth) / 2;

    const scaledPageHeight = firstPage.height * scale;
    const y = (containerSize.height - scaledPageHeight) / 2;

    setView({ x, y, scale });
    hasSetInitialViewRef.current = true;
  }, [pages, containerSize]);

  // Render visible pages
  useEffect(() => {
    if (!pdfDocRef.current || pages.length === 0 || containerSize.width === 0) return;

    if (renderTimeoutRef.current) clearTimeout(renderTimeoutRef.current);

    renderTimeoutRef.current = setTimeout(async () => {
      const pdf = pdfDocRef.current!;
      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio : 1;

      let renderScale = Math.max(MIN_RENDER_SCALE, Math.ceil(view.scale * dpr));
      const visibleTop = -view.y / view.scale;
      const visibleBottom = visibleTop + (containerSize.height / view.scale);

      const buffer = 1000;
      const bufferTop = visibleTop - buffer;
      const bufferBottom = visibleBottom + buffer;

      for (const pageInfo of pages) {
        const effectivePageTop = pageInfo.yOffset + PAGE_GAP;
        const effectivePageBottom = effectivePageTop + pageInfo.height;

        const isVisible = !(effectivePageBottom < bufferTop || effectivePageTop > bufferBottom);

        const canvas = canvasRefs.current.get(pageInfo.pageNum);
        if (!canvas) continue;

        if (isVisible) {
          const maxScaleW = MAX_CANVAS_DIMENSION / pageInfo.width;
          const maxScaleH = MAX_CANVAS_DIMENSION / pageInfo.height;
          const allowedScale = Math.min(renderScale, maxScaleW, maxScaleH);

          const currentRenderScale = renderedPagesRef.current.get(pageInfo.pageNum);
          if (currentRenderScale === allowedScale) continue;

          try {
            const page = await pdf.getPage(pageInfo.pageNum);
            const viewport = page.getViewport({ scale: allowedScale });

            const tempCanvas = document.createElement("canvas");
            tempCanvas.width = viewport.width;
            tempCanvas.height = viewport.height;
            const tempContext = tempCanvas.getContext("2d")!;

            await page.render({
              canvasContext: tempContext,
              viewport
            }).promise;

            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const context = canvas.getContext("2d")!;
            context.drawImage(tempCanvas, 0, 0);

            renderedPagesRef.current.set(pageInfo.pageNum, allowedScale);
          } catch (err) {
            logger.error("Failed to render page", { pageNum: pageInfo.pageNum, error: err });
          }

          // Render text layer
          const textLayerDiv = textLayerRefs.current.get(pageInfo.pageNum);
          if (textLayerDiv && !renderedTextLayersRef.current.has(pageInfo.pageNum)) {
            try {
              const page = await pdf.getPage(pageInfo.pageNum);
              const textContent = await page.getTextContent();

              if (textContent.items.length > 0) {
                const textViewport = page.getViewport({ scale: 1 });
                textLayerDiv.innerHTML = "";

                const textLayer = new TextLayer({
                  textContentSource: textContent,
                  container: textLayerDiv,
                  viewport: textViewport,
                });

                await textLayer.render();
                renderedTextLayersRef.current.add(pageInfo.pageNum);
              }
            } catch (err) {
              logger.error("Failed to render text layer", { pageNum: pageInfo.pageNum, error: err });
            }
          }
        }
      }
    }, 100);

    return () => {
      if (renderTimeoutRef.current) clearTimeout(renderTimeoutRef.current);
    };
  }, [pages, view, containerSize]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }
    };
  }, []);

  const themeClass = theme === "light" ? "light" : "";

  return (
    <div
      ref={containerRef}
      className={`pdf-viewer pdf-reader ${themeClass} ${className ?? ""}`}
      style={{ width: "100%", height: "100%", overflow: "hidden", position: "relative" }}
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

      {/* PDF pages container */}
      <div
        ref={pdfContainerRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          transform: `matrix(${view.scale}, 0, 0, ${view.scale}, ${view.x}, ${view.y})`,
          transformOrigin: "0 0",
          willChange: "transform",
          display: "flex",
          flexDirection: "column",
          gap: `${PAGE_GAP}px`,
          padding: "40px", // Extra padding for shadow visibility
        }}
      >
        {title && (
          <div
            style={{
              fontSize: "24px",
              fontWeight: 500,
              color: "rgba(0, 0, 0, 0.75)",
              paddingBottom: "12px",
              paddingLeft: "4px",
              pointerEvents: "none",
              userSelect: "none",
            }}
          >
            {title}
          </div>
        )}
        {pages.map((pageInfo) => (
          <div
            key={pageInfo.pageNum}
            style={{
              position: "relative",
              width: `${pageInfo.width}px`,
              height: `${pageInfo.height}px`,
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
              background: "white",
            }}
          >
            <canvas
              ref={(el) => {
                if (el) canvasRefs.current.set(pageInfo.pageNum, el);
              }}
              style={{
                display: "block",
                width: "100%",
                height: "100%",
              }}
            />
            <div
              ref={(el) => {
                if (el) textLayerRefs.current.set(pageInfo.pageNum, el);
              }}
              className="textLayer active"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
