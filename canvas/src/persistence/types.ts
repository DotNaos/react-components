import type { CanvasDrawingData } from "../types/drawingTypes";

/**
 * Persistence boundary for canvas drawings.
 * Implementations handle storage concerns outside the pure view layer.
 */
export interface CanvasPersistenceApi {
  loadDrawing: (id: string) => Promise<CanvasDrawingData | null>;
  saveDrawing: (id: string, data: CanvasDrawingData) => Promise<void>;
  deleteDrawing?: (id: string) => Promise<void>;
}
