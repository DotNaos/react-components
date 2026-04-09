import { ToolType, ViewState } from "../types/types";
import { RefObject, useCallback, useRef, useState } from "react";
import { EraserMode } from "../components/CanvasToolbar";
import type { Stroke } from "../types/drawingTypes";
import { CANVAS_CONSTANTS } from "../types/types";
import { generateStrokeId, pointNearStroke } from "../utils/drawingUtils";
import { Stabilizer } from "../utils/Stabilizer";

interface UseStrokesOptions {
    initialStrokes: Stroke[];
    readOnly: boolean;
    tool: ToolType;
    color: string;
    penSize: number;
    highlighterSize: number;
    eraserSize: number;
    eraserMode: EraserMode;
    view: ViewState;
    onStrokeComplete?: (stroke: Stroke) => void;
    onStrokesRemoved?: (strokeIds: string[]) => void;
}

interface UseStrokesReturn {
    strokes: Stroke[];
    setStrokes: React.Dispatch<React.SetStateAction<Stroke[]>>;
    redoStack: Stroke[];
    setRedoStack: React.Dispatch<React.SetStateAction<Stroke[]>>;
    currentStrokeRef: RefObject<Stroke | null>;
    isDrawing: boolean;
    setIsDrawing: React.Dispatch<React.SetStateAction<boolean>>;
    startStroke: (
        worldPos: { x: number; y: number },
        pressure: number,
        pointerType: string
    ) => void;
    addPointToStroke: (
        worldPos: { x: number; y: number },
        pressure: number,
        pointerType: string,
        draw: () => void
    ) => void;
    endStroke: (draw: () => void) => void;
    eraseStrokesAtPoint: (worldPos: { x: number; y: number }) => void;
    objectEraserActiveRef: RefObject<boolean>;
}

/**
 * Hook to manage stroke state and operations
 */
export function useStrokes({
    initialStrokes,
    readOnly,
    tool,
    color,
    penSize,
    highlighterSize,
    eraserSize,
    eraserMode,
    view,
    onStrokeComplete,
    onStrokesRemoved,
}: UseStrokesOptions): UseStrokesReturn {
    const [strokes, setStrokes] = useState<Stroke[]>(initialStrokes);
    const [redoStack, setRedoStack] = useState<Stroke[]>([]);
    const [isDrawing, setIsDrawing] = useState(false);

    const currentStrokeRef = useRef<Stroke | null>(null);
    const lastPointTimeRef = useRef(0);
    const stabilizerRef = useRef(new Stabilizer());
    const objectEraserActiveRef = useRef(false);

    // Erase strokes at a given world position (object eraser mode)
    const eraseStrokesAtPoint = useCallback(
        (worldPos: { x: number; y: number }) => {
            // Divide by scale to get world-space eraser radius
            const baseSize = eraserSize / view.scale;
            const eraserRadius = baseSize / 2;

            const strokesToRemove: string[] = [];

            for (const stroke of strokes) {
                if (pointNearStroke(worldPos, stroke, eraserRadius)) {
                    strokesToRemove.push(stroke.id);
                }
            }

            if (strokesToRemove.length > 0) {
                setStrokes((prev) =>
                    prev.filter((s) => !strokesToRemove.includes(s.id))
                );
                setRedoStack([]);
                onStrokesRemoved?.(strokesToRemove);
            }
        },
        [strokes, eraserSize, view.scale, onStrokesRemoved]
    );

    // Start stroke
    const startStroke = useCallback(
        (
            worldPos: { x: number; y: number },
            pressure: number,
            pointerType: string
        ) => {
            if (readOnly) return;

            const isEraser = tool === 'eraser';
            const isHighlighter = tool === 'highlighter';

            // For object eraser mode, erase strokes at point once per click
            if (isEraser && eraserMode === 'object') {
                setIsDrawing(true);
                objectEraserActiveRef.current = true;
                eraseStrokesAtPoint(worldPos);
                return;
            }

            setIsDrawing(true);
            lastPointTimeRef.current = Date.now();
            stabilizerRef.current.reset();

            const initialPressure =
                pointerType === 'pen' ? (pressure > 0 ? pressure : 0.3) : 0.3;

            const stabilizedPos = stabilizerRef.current.update(
                worldPos.x,
                worldPos.y
            );

            // Store size directly in world units (not dependent on current zoom)
            const baseSize = isEraser
                ? eraserSize
                : isHighlighter
                  ? highlighterSize
                  : penSize;

            currentStrokeRef.current = {
                id: generateStrokeId(),
                color: isEraser ? CANVAS_CONSTANTS.ERASE_FLAG : color,
                size: baseSize,
                points: [
                    {
                        x: stabilizedPos.x,
                        y: stabilizedPos.y,
                        pressure: initialPressure,
                        timestamp: 0,
                    },
                ],
                isHighlighter,
                bounds: {
                    minX: stabilizedPos.x,
                    maxX: stabilizedPos.x,
                    minY: stabilizedPos.y,
                    maxY: stabilizedPos.y,
                },
            };
        },
        [
            readOnly,
            tool,
            color,
            penSize,
            highlighterSize,
            eraserSize,
            eraserMode,
            eraseStrokesAtPoint,
        ]
    );

    // Add point to stroke
    const addPointToStroke = useCallback(
        (
            worldPos: { x: number; y: number },
            inputPressure: number,
            pointerType: string,
            draw: () => void
        ) => {
            // For object eraser mode, erase strokes at each point while dragging
            if (tool === 'eraser' && eraserMode === 'object') {
                eraseStrokesAtPoint(worldPos);
                return;
            }

            if (!currentStrokeRef.current) return;

            const stabilizedPos = stabilizerRef.current.update(
                worldPos.x,
                worldPos.y
            );
            const now = Date.now();
            const dt = now - lastPointTimeRef.current;
            const lastPt =
                currentStrokeRef.current.points[
                    currentStrokeRef.current.points.length - 1
                ];

            const dist = Math.hypot(
                stabilizedPos.x - lastPt.x,
                stabilizedPos.y - lastPt.y
            );
            if (dist < 0.5 / view.scale) return;

            let pressure = inputPressure;
            if (pointerType === 'pen') {
                pressure = lastPt.pressure * 0.4 + inputPressure * 0.6;
            } else {
                const velocity = dist / (dt || 1);
                const targetPressure = Math.max(
                    0.3,
                    Math.min(1.0, 0.9 - velocity * 0.1)
                );
                pressure = lastPt.pressure * 0.6 + targetPressure * 0.4;
            }

            const stroke = currentStrokeRef.current;
            stroke.bounds.minX = Math.min(stroke.bounds.minX, stabilizedPos.x);
            stroke.bounds.maxX = Math.max(stroke.bounds.maxX, stabilizedPos.x);
            stroke.bounds.minY = Math.min(stroke.bounds.minY, stabilizedPos.y);
            stroke.bounds.maxY = Math.max(stroke.bounds.maxY, stabilizedPos.y);

            stroke.points.push({
                x: stabilizedPos.x,
                y: stabilizedPos.y,
                pressure,
                timestamp: now - lastPointTimeRef.current,
            });

            lastPointTimeRef.current = now;
            requestAnimationFrame(draw);
        },
        [view.scale, tool, eraserMode, eraseStrokesAtPoint]
    );

    // End stroke
    const endStroke = useCallback(
        (draw: () => void) => {
            // Reset object eraser flag
            objectEraserActiveRef.current = false;

            // For object eraser, there's no stroke to end
            if (!currentStrokeRef.current) {
                setIsDrawing(false);
                return;
            }
            setIsDrawing(false);

            const stroke = currentStrokeRef.current;

            // For single-point strokes (clicks without movement), duplicate the point
            if (stroke.points.length === 1) {
                const pt = stroke.points[0];
                stroke.points.push({
                    x: pt.x,
                    y: pt.y,
                    pressure: pt.pressure,
                    timestamp: 0,
                });
            }

            const padding = stroke.size * 2;
            stroke.bounds.minX -= padding;
            stroke.bounds.maxX += padding;
            stroke.bounds.minY -= padding;
            stroke.bounds.maxY += padding;

            if (stroke.points.length >= 1) {
                setStrokes((prev) => [...prev, stroke]);
                setRedoStack([]);
                onStrokeComplete?.(stroke);
            }

            currentStrokeRef.current = null;
            requestAnimationFrame(draw);
        },
        [onStrokeComplete]
    );

    return {
        strokes,
        setStrokes,
        redoStack,
        setRedoStack,
        currentStrokeRef,
        isDrawing,
        setIsDrawing,
        startStroke,
        addPointToStroke,
        endStroke,
        eraseStrokesAtPoint,
        objectEraserActiveRef,
    };
}
