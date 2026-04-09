import { useCallback, useEffect, useRef, useState } from "react";
import type { Shape, ShapeKind } from "../types/drawingTypes";

interface Point {
  x: number;
  y: number;
}

interface UseShapesOptions {
  shapes: Shape[];
  onShapesChange?: (shapes: Shape[]) => void;
}

interface UseShapesReturn {
  /** All shapes */
  shapes: Shape[];
  /** Shape currently being drawn */
  currentShape: Shape | null;
  /** Currently selected shape type */
  shapeType: ShapeKind;
  /** IDs of selected shapes */
  selectedShapeIds: Set<string>;
  /** Start drawing a shape */
  startShape: (point: Point, strokeColor?: string, strokeWidth?: number, fillColor?: string) => void;
  /** Update shape while drawing */
  updateShape: (point: Point) => void;
  /** Finalize the shape */
  endShape: () => void;
  /** Set the shape type */
  setShapeType: (type: ShapeKind) => void;
  /** Select a shape by ID */
  selectShape: (id: string, addToSelection?: boolean) => void;
  /** Clear all shape selections */
  clearShapeSelection: () => void;
  /** Move selected shapes by delta */
  moveSelectedShapes: (delta: Point) => void;
  /** Delete selected shapes */
  deleteSelectedShapes: () => void;
  /** Get a shape by ID */
  getShape: (id: string) => Shape | undefined;
  /** Check if a point is inside a shape */
  hitTestShape: (point: Point) => Shape | null;
  /** Set selection to a set of IDs */
  setShapeSelection: (ids: Set<string>) => void;
  /** Get IDs of shapes within a bounding box */
  getShapesInBox: (box: { x1: number; y1: number; x2: number; y2: number }) => Set<string>;
  /** Get IDs of shapes within a polygon path */
  getShapesInLasso: (path: Point[]) => Set<string>;
  /** Scale selected shapes */
  scaleSelectedShapes: (scaleX: number, scaleY: number, origin: Point, baseShapes?: Shape[]) => void;
  /** Update a specific shape by ID */
  updateShapeById: (id: string, updates: Partial<Shape>) => void;
  /** Duplicate selected shapes */
  duplicateSelectedShapes: () => void;
  /** Create a line shape directly and select it */
  createLine: (start: Point, end: Point, strokeColor: string, strokeWidth: number, isHighlighter?: boolean) => void;
}

/**
 * Generate a unique ID for shapes
 */
function generateShapeId(): string {
  return `shape-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Hook to manage shape state and operations
 */
export function useShapes({
  shapes: initialShapes,
  onShapesChange,
}: UseShapesOptions): UseShapesReturn {
  const [shapes, setShapes] = useState<Shape[]>(initialShapes);
  const [currentShape, setCurrentShape] = useState<Shape | null>(null);
  const [shapeType, setShapeType] = useState<ShapeKind>("rectangle");
  const [selectedShapeIds, setSelectedShapeIds] = useState<Set<string>>(new Set());

  // Sync internal shapes with prop when it changes externally
  useEffect(() => {
    setShapes(initialShapes);
  }, [initialShapes]);

  const startPointRef = useRef<Point | null>(null);

  const updateShapes = useCallback((newShapes: Shape[]) => {
    setShapes(newShapes);
    onShapesChange?.(newShapes);
  }, [onShapesChange]);

  const startShape = useCallback((point: Point, strokeColor?: string, strokeWidth?: number, fillColor?: string) => {
    startPointRef.current = point;
    const newShape: Shape = {
      id: generateShapeId(),
      kind: shapeType,
      x1: point.x,
      y1: point.y,
      x2: point.x,
      y2: point.y,
      strokeColor: strokeColor ?? "#1a1a1a",
      strokeWidth: strokeWidth ?? 2,
      fillColor: fillColor,
    };
    setCurrentShape(newShape);
  }, [shapeType]);

  const updateShape = useCallback((point: Point) => {
    if (!currentShape || !startPointRef.current) return;

    setCurrentShape({
      ...currentShape,
      x2: point.x,
      y2: point.y,
    });
  }, [currentShape]);

  const endShape = useCallback(() => {
    if (!currentShape) return;

    // Only add shape if it has some size
    const minSize = 5;
    const width = Math.abs(currentShape.x2 - currentShape.x1);
    const height = Math.abs(currentShape.y2 - currentShape.y1);

    if (width >= minSize || height >= minSize) {
      // For arrows and lines, keep original coordinates to preserve direction
      // For other shapes, normalize so x1,y1 is always top-left
      let finalShape: Shape;
      if (currentShape.kind === "arrow" || currentShape.kind === "line") {
        // Preserve the draw direction for lines and arrows
        finalShape = currentShape;
      } else {
        // Normalize coordinates so x1,y1 is always top-left for rectangles, ellipses, etc.
        finalShape = {
          ...currentShape,
          x1: Math.min(currentShape.x1, currentShape.x2),
          y1: Math.min(currentShape.y1, currentShape.y2),
          x2: Math.max(currentShape.x1, currentShape.x2),
          y2: Math.max(currentShape.y1, currentShape.y2),
        };
      }
      updateShapes([...shapes, finalShape]);
    }

    setCurrentShape(null);
    startPointRef.current = null;
  }, [currentShape, shapes, updateShapes]);

  const selectShape = useCallback((id: string, addToSelection = false) => {
    if (addToSelection) {
      setSelectedShapeIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    } else {
      setSelectedShapeIds(new Set([id]));
    }
  }, []);

  const clearShapeSelection = useCallback(() => {
    setSelectedShapeIds(new Set());
  }, []);

  const moveSelectedShapes = useCallback((delta: Point) => {
    const newShapes = shapes.map(shape => {
      if (!selectedShapeIds.has(shape.id)) return shape;
      return {
        ...shape,
        x1: shape.x1 + delta.x,
        y1: shape.y1 + delta.y,
        x2: shape.x2 + delta.x,
        y2: shape.y2 + delta.y,
      };
    });
    updateShapes(newShapes);
  }, [shapes, selectedShapeIds, updateShapes]);

  const deleteSelectedShapes = useCallback(() => {
    const newShapes = shapes.filter(s => !selectedShapeIds.has(s.id));
    updateShapes(newShapes);
    setSelectedShapeIds(new Set());
  }, [shapes, selectedShapeIds, updateShapes]);

  const getShape = useCallback((id: string) => {
    return shapes.find(s => s.id === id);
  }, [shapes]);

  const hitTestShape = useCallback((point: Point): Shape | null => {
    // Test in reverse order (top-most first)
    for (let i = shapes.length - 1; i >= 0; i--) {
      const shape = shapes[i];
      const minX = Math.min(shape.x1, shape.x2);
      const maxX = Math.max(shape.x1, shape.x2);
      const minY = Math.min(shape.y1, shape.y2);
      const maxY = Math.max(shape.y1, shape.y2);

      // Simple bounding box hit test
      if (point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY) {
        // For ellipse, do more precise test
        if (shape.kind === "ellipse") {
          const cx = (minX + maxX) / 2;
          const cy = (minY + maxY) / 2;
          const rx = (maxX - minX) / 2;
          const ry = (maxY - minY) / 2;
          const dx = point.x - cx;
          const dy = point.y - cy;
          if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1) {
            return shape;
          }
        } else {
          return shape;
        }
      }
    }
    return null;
  }, [shapes]);

  const isShapeInBox = useCallback((shape: Shape, box: { x1: number; y1: number; x2: number; y2: number }): boolean => {
    const minX = Math.min(box.x1, box.x2);
    const maxX = Math.max(box.x1, box.x2);
    const minY = Math.min(box.y1, box.y2);
    const maxY = Math.max(box.y1, box.y2);

    const sMinX = Math.min(shape.x1, shape.x2);
    const sMaxX = Math.max(shape.x1, shape.x2);
    const sMinY = Math.min(shape.y1, shape.y2);
    const sMaxY = Math.max(shape.y1, shape.y2);

    return !(sMaxX < minX || sMinX > maxX || sMaxY < minY || sMinY > maxY);
  }, []);

  const getShapesInBox = useCallback((box: { x1: number; y1: number; x2: number; y2: number }): Set<string> => {
      const selected = new Set<string>();
      for (const shape of shapes) {
          if (isShapeInBox(shape, box)) {
              selected.add(shape.id);
          }
      }
      return selected;
  }, [shapes, isShapeInBox]);

  const isPointInPolygon = useCallback((point: Point, polygon: Point[]): boolean => {
    if (polygon.length < 3) return false;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].x, yi = polygon[i].y;
        const xj = polygon[j].x, yj = polygon[j].y;
        if (((yi > point.y) !== (yj > point.y)) &&
            (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
            inside = !inside;
        }
    }
    return inside;
  }, []);

  const getShapesInLasso = useCallback((path: Point[]): Set<string> => {
      const selected = new Set<string>();
      if (path.length < 3) return selected;
      for (const shape of shapes) {
          const cx = (shape.x1 + shape.x2) / 2;
          const cy = (shape.y1 + shape.y2) / 2;
          if (isPointInPolygon({ x: cx, y: cy }, path)) {
              selected.add(shape.id);
          }
      }
      return selected;
  }, [shapes, isPointInPolygon]);

  const setShapeSelection = useCallback((ids: Set<string>) => {
      setSelectedShapeIds(ids);
  }, []);

  const scaleSelectedShapes = useCallback((scaleX: number, scaleY: number, origin: Point, baseShapes?: Shape[]) => {
    const sourceShapes = baseShapes || shapes;
    const newShapes = sourceShapes.map(shape => {
      if (!selectedShapeIds.has(shape.id)) return shape;

      const newX1 = origin.x + (shape.x1 - origin.x) * scaleX;
      const newY1 = origin.y + (shape.y1 - origin.y) * scaleY;
      const newX2 = origin.x + (shape.x2 - origin.x) * scaleX;
      const newY2 = origin.y + (shape.y2 - origin.y) * scaleY;

      return {
        ...shape,
        x1: newX1,
        y1: newY1,
        x2: newX2,
        y2: newY2
      };
    });

    updateShapes(newShapes);
  }, [shapes, selectedShapeIds, updateShapes]);

  const updateShapeById = useCallback((id: string, updates: Partial<Shape>) => {
    const newShapes = shapes.map(s => s.id === id ? { ...s, ...updates } : s);
    updateShapes(newShapes);
  }, [shapes, updateShapes]);

  const duplicateSelectedShapes = useCallback(() => {
    const offset = 20; // Offset duplicated shapes slightly
    const duplicated: Shape[] = [];
    const newIds = new Set<string>();

    for (const shape of shapes) {
      if (selectedShapeIds.has(shape.id)) {
        const newId = generateShapeId();
        newIds.add(newId);
        duplicated.push({
          ...shape,
          id: newId,
          x1: shape.x1 + offset,
          y1: shape.y1 + offset,
          x2: shape.x2 + offset,
          y2: shape.y2 + offset,
        });
      }
    }

    if (duplicated.length > 0) {
      updateShapes([...shapes, ...duplicated]);
      setSelectedShapeIds(newIds); // Select the new duplicates
    }
  }, [shapes, selectedShapeIds, updateShapes]);

  const createLine = useCallback((start: Point, end: Point, strokeColor: string, strokeWidth: number, isHighlighter: boolean = false) => {
    const newShape: Shape = {
      id: generateShapeId(),
      kind: 'line',
      x1: start.x,
      y1: start.y,
      x2: end.x,
      y2: end.y,
      strokeColor,
      strokeWidth,
      isHighlighter,
    };
    updateShapes([...shapes, newShape]);
    setSelectedShapeIds(new Set([newShape.id])); // Select the new line
  }, [shapes, updateShapes]);

  return {
    shapes,
    currentShape,
    shapeType,
    selectedShapeIds,
    startShape,
    updateShape,
    endShape,
    setShapeType,
    selectShape,
    clearShapeSelection,
    moveSelectedShapes,
    deleteSelectedShapes,
    getShape,
    hitTestShape,
    setShapeSelection,
    getShapesInBox,
    getShapesInLasso,
    scaleSelectedShapes,
    updateShapeById,
    duplicateSelectedShapes,
    createLine,
  };
}
