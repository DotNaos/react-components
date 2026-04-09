import { TextLayer } from "pdfjs-dist";
import Tesseract from "tesseract.js";
import type * as pdfjs from "pdfjs-dist";
import type { PageInfo } from "./pdfBackground";

type Logger = {
  debug: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
};

type OcrStatusSetter = (
  value: Map<number, string> | ((prev: Map<number, string>) => Map<number, string>)
) => void;

type RenderTextLayerParams = {
  pdf: pdfjs.PDFDocumentProxy;
  pageInfo: PageInfo;
  textLayerDiv: HTMLDivElement;
  pageCanvas?: HTMLCanvasElement;
  renderedTextLayers: Set<number>;
  processingOcr: Set<number>;
  setOcrStatus: OcrStatusSetter;
  logger: Logger;
};

export async function renderTextLayerWithOcr({
  pdf,
  pageInfo,
  textLayerDiv,
  pageCanvas,
  renderedTextLayers,
  processingOcr,
  setOcrStatus,
  logger,
}: RenderTextLayerParams): Promise<"continue" | "abort"> {
  try {
    const page = await pdf.getPage(pageInfo.pageNum);
    const textContent = await page.getTextContent();

    // Check if PDF has embedded text
    const hasEmbeddedText = textContent.items.length > 0;

    if (hasEmbeddedText) {
      // Use native PDF text layer
      const textViewport = page.getViewport({ scale: 1 });
      textLayerDiv.innerHTML = "";

      const textLayer = new TextLayer({
        textContentSource: textContent,
        container: textLayerDiv,
        viewport: textViewport,
      });

      await textLayer.render();
      renderedTextLayers.add(pageInfo.pageNum);
      return "continue";
    }

    // No embedded text - use OCR
    // Check if already processing to avoid loop
    if (processingOcr.has(pageInfo.pageNum)) {
      return "abort";
    }

    logger.debug("No embedded text on page, running OCR", { pageNum: pageInfo.pageNum });
    processingOcr.add(pageInfo.pageNum);
    setOcrStatus((prev) => new Map(prev).set(pageInfo.pageNum, "Running OCR..."));

    if (!pageCanvas) {
      processingOcr.delete(pageInfo.pageNum);
      return "continue";
    }

    try {
      const result = await Tesseract.recognize(pageCanvas, "eng", {
        logger: (message) => {
          if (message.status === "recognizing text") {
            setOcrStatus((prev) =>
              new Map(prev).set(pageInfo.pageNum, `OCR: ${Math.round(message.progress * 100)}%`)
            );
          }
        },
      });

      // Clear and create text overlay from OCR results
      textLayerDiv.innerHTML = "";

      // Get the scale factor between canvas and page dimensions
      const canvasScale = pageCanvas.width / pageInfo.width;

      // Access words from OCR result (cast to any for Tesseract types)
      const ocrData = result.data as any;
      const words = ocrData.words || [];

      // Create text spans for each word
      for (const word of words) {
        const span = document.createElement("span");
        span.textContent = word.text + " ";
        span.style.position = "absolute";
        span.style.left = `${word.bbox.x0 / canvasScale}px`;
        span.style.top = `${word.bbox.y0 / canvasScale}px`;
        span.style.width = `${(word.bbox.x1 - word.bbox.x0) / canvasScale}px`;
        span.style.height = `${(word.bbox.y1 - word.bbox.y0) / canvasScale}px`;
        span.style.fontSize = `${(word.bbox.y1 - word.bbox.y0) / canvasScale}px`;
        span.style.lineHeight = "1";
        span.style.color = "transparent";
        span.style.cursor = "text";
        span.style.whiteSpace = "pre";
        textLayerDiv.appendChild(span);
      }

      renderedTextLayers.add(pageInfo.pageNum);
      setOcrStatus((prev) => new Map(prev).set(pageInfo.pageNum, "OCR Complete"));
      logger.debug("OCR text layer rendered", { pageNum: pageInfo.pageNum, wordCount: words.length });

      // Clear status after a delay
      setTimeout(() => {
        setOcrStatus((prev) => {
          const next = new Map(prev);
          next.delete(pageInfo.pageNum);
          return next;
        });
      }, 2000);
    } catch (ocrErr) {
      logger.error("OCR failed for page", { pageNum: pageInfo.pageNum, error: ocrErr });
      setOcrStatus((prev) => new Map(prev).set(pageInfo.pageNum, "OCR Failed"));
    } finally {
      processingOcr.delete(pageInfo.pageNum);
    }
  } catch (err) {
    logger.error("Failed to render text layer", { pageNum: pageInfo.pageNum, error: err });
  }

  return "continue";
}
