import { LassoMode } from "../types/types";
import { useCallback, useRef, useState } from "react";
import type { Stroke } from "../types/drawingTypes";

interface SelectionBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface Point {
  x: number;
  y: number;
}

interface UseSelectionOptions {
  strokes: Stroke[];
  onStrokesMove?: (movedStrokes: Stroke[]) => void;
}

interface UseSelectionReturn {
  /** IDs of currently selected strokes */
  selectedStrokeIds: Set<string>;
  /** Current selection box being drawn (null when not selecting) */
  selectionBox: SelectionBox | null;
  /** Freeform lasso path while drawing (null when not using freeform) */
  lassoPath: Point[] | null;
  /** Current lasso mode */
  lassoMode: LassoMode;
  /** Whether we're currently dragging selected items */
  isDragging: boolean;
  /** Start drawing a selection */
  startSelection: (point: Point) => void;
  /** Update selection bounds while drawing */
  updateSelection: (point: Point) => void;
  /** Finalize selection and find strokes within bounds */
  endSelection: (strokes: Stroke[]) => void;
  /** Move all selected strokes by delta */
  moveSelected: (delta: Point, strokes: Stroke[]) => Stroke[];
  /** Start dragging selected items */
  startDrag: (point: Point) => void;
  /** Update drag position */
  updateDrag: (point: Point, strokes: Stroke[]) => Stroke[];
  /** End dragging */
  endDrag: () => void;
  /** Clear all selections */
  clearSelection: () => void;
  /** Set lasso mode */
  setLassoMode: (mode: LassoMode) => void;
  /** Check if a point is within the current selection */
  isPointInSelection: (point: Point) => boolean;
  /** Get the bounding box of all selected strokes */
  getSelectionBounds: (strokes: Stroke[]) => SelectionBox | null;
  /** Scale selected strokes */
  scaleSelected: (scaleX: number, scaleY: number, origin: Point, strokes: Stroke[]) => Stroke[];
}

/**
 * Hook to manage stroke selection and movement
 */
export function useSelection({
  onStrokesMove,
}: UseSelectionOptions): UseSelectionReturn {
  const [selectedStrokeIds, setSelectedStrokeIds] = useState<Set<string>>(new Set());
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const [lassoPath, setLassoPath] = useState<Point[] | null>(null);
  const [lassoMode, setLassoMode] = useState<LassoMode>("rectangle");
  const [isDragging, setIsDragging] = useState(false);

  const dragStartRef = useRef<Point | null>(null);
  const dragOffsetRef = useRef<Point>({ x: 0, y: 0 });

  /**
   * Check if a stroke's bounding box intersects with a selection box
   */
  const isStrokeInBox = useCallback((stroke: Stroke, box: SelectionBox): boolean => {
    const minX = Math.min(box.x1, box.x2);
    const maxX = Math.max(box.x1, box.x2);
    const minY = Math.min(box.y1, box.y2);
    const maxY = Math.max(box.y1, box.y2);

    // Check if stroke bounds intersect with selection box
    return !(
      stroke.bounds.maxX < minX ||
      stroke.bounds.minX > maxX ||
      stroke.bounds.maxY < minY ||
      stroke.bounds.minY > maxY
    );
  }, []);

  /**
   * Check if a point is inside a polygon (for freeform lasso)
   */
  const isPointInPolygon = useCallback((point: Point, polygon: Point[]): boolean => {
    if (polygon.length < 3) return false;

    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x;
      const yi = polygon[i].y;
      const xj = polygon[j].x;
      const yj = polygon[j].y;

      if (((yi > point.y) !== (yj > point.y)) &&
          (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  }, []);

  /**
   * Check if a stroke is inside a freeform lasso path
   */
  const isStrokeInLasso = useCallback((stroke: Stroke, path: Point[]): boolean => {
    // Check if the stroke's center is inside the lasso
    const centerX = (stroke.bounds.minX + stroke.bounds.maxX) / 2;
    const centerY = (stroke.bounds.minY + stroke.bounds.maxY) / 2;
    return isPointInPolygon({ x: centerX, y: centerY }, path);
  }, [isPointInPolygon]);

  const startSelection = useCallback((point: Point) => {
    if (lassoMode === "rectangle") {
      setSelectionBox({ x1: point.x, y1: point.y, x2: point.x, y2: point.y });
      setLassoPath(null);
    } else {
      setLassoPath([point]);
      setSelectionBox(null);
    }
    setSelectedStrokeIds(new Set());
  }, [lassoMode]);

  const updateSelection = useCallback((point: Point) => {
    if (lassoMode === "rectangle" && selectionBox) {
      setSelectionBox(prev => prev ? { ...prev, x2: point.x, y2: point.y } : null);
    } else if (lassoMode === "freeform" && lassoPath) {
      setLassoPath(prev => prev ? [...prev, point] : [point]);
    }
  }, [lassoMode, selectionBox, lassoPath]);

  const endSelection = useCallback((strokes: Stroke[]) => {
    const newSelection = new Set<string>();

    // Minimum drag threshold (in world units) to consider it a selection drag vs a click
    const MIN_DRAG_THRESHOLD = 5;

    if (lassoMode === "rectangle" && selectionBox) {
      const width = Math.abs(selectionBox.x2 - selectionBox.x1);
      const height = Math.abs(selectionBox.y2 - selectionBox.y1);

      // Only select strokes if the user actually dragged (not just clicked)
      // A click should only select shapes (handled separately in CanvasEditor)
      if (width >= MIN_DRAG_THRESHOLD || height >= MIN_DRAG_THRESHOLD) {
        for (const stroke of strokes) {
          if (isStrokeInBox(stroke, selectionBox)) {
            newSelection.add(stroke.id);
          }
        }
      }
    } else if (lassoMode === "freeform" && lassoPath && lassoPath.length >= 3) {
      // For freeform, check if the path covers enough area
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const p of lassoPath) {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
      }
      const width = maxX - minX;
      const height = maxY - minY;

      if (width >= MIN_DRAG_THRESHOLD || height >= MIN_DRAG_THRESHOLD) {
        for (const stroke of strokes) {
          if (isStrokeInLasso(stroke, lassoPath)) {
            newSelection.add(stroke.id);
          }
        }
      }
    }

    setSelectedStrokeIds(newSelection);
    setSelectionBox(null);
    setLassoPath(null);
  }, [lassoMode, selectionBox, lassoPath, isStrokeInBox, isStrokeInLasso]);

  const moveSelected = useCallback((delta: Point, strokes: Stroke[]): Stroke[] => {
    return strokes.map(stroke => {
      if (!selectedStrokeIds.has(stroke.id)) return stroke;

      return {
        ...stroke,
        points: stroke.points.map(p => ({
          ...p,
          x: p.x + delta.x,
          y: p.y + delta.y,
        })),
        bounds: {
          minX: stroke.bounds.minX + delta.x,
          maxX: stroke.bounds.maxX + delta.x,
          minY: stroke.bounds.minY + delta.y,
          maxY: stroke.bounds.maxY + delta.y,
        },
      };
    });
  }, [selectedStrokeIds]);

  const startDrag = useCallback((point: Point) => {
    dragStartRef.current = point;
    dragOffsetRef.current = { x: 0, y: 0 };
    setIsDragging(true);
  }, []);

  const updateDrag = useCallback((point: Point, strokes: Stroke[]): Stroke[] => {
    if (!dragStartRef.current) return strokes;

    const delta = {
      x: point.x - dragStartRef.current.x - dragOffsetRef.current.x,
      y: point.y - dragStartRef.current.y - dragOffsetRef.current.y,
    };

    dragOffsetRef.current = {
      x: point.x - dragStartRef.current.x,
      y: point.y - dragStartRef.current.y,
    };

    return moveSelected(delta, strokes);
  }, [moveSelected]);

  const endDrag = useCallback(() => {
    if (isDragging && onStrokesMove) {
      // Callback could be used for saving or other operations
    }
    setIsDragging(false);
    dragStartRef.current = null;
    dragOffsetRef.current = { x: 0, y: 0 };
  }, [isDragging, onStrokesMove]);

  const clearSelection = useCallback(() => {
    setSelectedStrokeIds(new Set());
    setSelectionBox(null);
    setLassoPath(null);
  }, []);

  const isPointInSelection = useCallback((point: Point): boolean => {
    if (selectionBox) {
      const minX = Math.min(selectionBox.x1, selectionBox.x2);
      const maxX = Math.max(selectionBox.x1, selectionBox.x2);
      const minY = Math.min(selectionBox.y1, selectionBox.y2);
      const maxY = Math.max(selectionBox.y1, selectionBox.y2);
      return point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY;
    }
    return false;
  }, [selectionBox]);

  const getSelectionBounds = useCallback((strokes: Stroke[]): SelectionBox | null => {
    const selectedStrokes = strokes.filter(s => selectedStrokeIds.has(s.id));
    if (selectedStrokes.length === 0) return null;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const stroke of selectedStrokes) {
      minX = Math.min(minX, stroke.bounds.minX);
      minY = Math.min(minY, stroke.bounds.minY);
      maxX = Math.max(maxX, stroke.bounds.maxX);
      maxY = Math.max(maxY, stroke.bounds.maxY);
    }

    return { x1: minX, y1: minY, x2: maxX, y2: maxY };
  }, [selectedStrokeIds]);

  const scaleSelected = useCallback((scaleX: number, scaleY: number, origin: Point, strokes: Stroke[]): Stroke[] => {
    return strokes.map(stroke => {
      if (!selectedStrokeIds.has(stroke.id)) return stroke;

      const newPoints = stroke.points.map(p => ({
        ...p,
        x: origin.x + (p.x - origin.x) * scaleX,
        y: origin.y + (p.y - origin.y) * scaleY,
      }));

      // Calculate new bounds based on old bounds
      let newMinX = origin.x + (stroke.bounds.minX - origin.x) * scaleX;
      let newMaxX = origin.x + (stroke.bounds.maxX - origin.x) * scaleX;
      let newMinY = origin.y + (stroke.bounds.minY - origin.y) * scaleY;
      let newMaxY = origin.y + (stroke.bounds.maxY - origin.y) * scaleY;

      if (scaleX < 0) [newMinX, newMaxX] = [newMaxX, newMinX];
      if (scaleY < 0) [newMinY, newMaxY] = [newMaxY, newMinY];

      return {
        ...stroke,
        points: newPoints,
        bounds: {
          minX: newMinX,
          maxX: newMaxX,
          minY: newMinY,
          maxY: newMaxY,
        }
      };
    });
  }, [selectedStrokeIds]);

  return {
    selectedStrokeIds,
    selectionBox,
    lassoPath,
    lassoMode,
    isDragging,
    startSelection,
    updateSelection,
    endSelection,
    moveSelected,
    startDrag,
    updateDrag,
    endDrag,
    clearSelection,
    setLassoMode,
    isPointInSelection,
    getSelectionBounds,
    scaleSelected,
  };
}
