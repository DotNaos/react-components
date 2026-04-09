import { ViewState } from "../types/types";
import { Dispatch, RefObject, SetStateAction, useEffect } from "react";
import { CanvasHandle } from "../Canvas";
import type { Stroke } from "../types/drawingTypes";

interface UseCanvasHandleOptions {
    canvasRef: RefObject<CanvasHandle | null> | undefined;
    canvasElementRef: RefObject<HTMLCanvasElement | null>;
    strokes: Stroke[];
    setStrokes: Dispatch<SetStateAction<Stroke[]>>;
    setRedoStack: Dispatch<SetStateAction<Stroke[]>>;
    view: ViewState;
    setView: Dispatch<SetStateAction<ViewState>>;
    onViewChange?: (view: ViewState) => void;
    animateViewTo: (targetView: ViewState, duration?: number) => void;
}

/**
 * Hook to expose canvas methods via imperative handle ref
 */
export function useCanvasHandle({
    canvasRef,
    canvasElementRef,
    strokes,
    setStrokes,
    setRedoStack,
    view,
    setView,
    onViewChange,
    animateViewTo,
}: UseCanvasHandleOptions): void {
    useEffect(() => {
        if (canvasRef && 'current' in canvasRef) {
            (canvasRef as React.MutableRefObject<CanvasHandle>).current = {
                getStrokes: () => strokes,
                setStrokes: (newStrokes) => {
                    setStrokes(newStrokes);
                    setRedoStack([]);
                },
                addStroke: (stroke) => {
                    setStrokes((prev) => [...prev, stroke]);
                    setRedoStack([]);
                },
                clear: () => {
                    setStrokes([]);
                    setRedoStack([]);
                },
                undo: () => {
                    setStrokes((prev) => {
                        if (prev.length === 0) return prev;
                        const last = prev[prev.length - 1];
                        setRedoStack((redo) => [...redo, last]);
                        return prev.slice(0, -1);
                    });
                },
                redo: () => {
                    setRedoStack((redo) => {
                        if (redo.length === 0) return redo;
                        const last = redo[redo.length - 1];
                        setStrokes((prev) => [...prev, last]);
                        return redo.slice(0, -1);
                    });
                },
                getView: () => view,
                setView: (newView) => {
                    setView(newView);
                    onViewChange?.(newView);
                },
                resetView: () => {
                    const defaultView = { x: 0, y: 0, scale: 1 };
                    animateViewTo(defaultView);
                },
                toDataURL: (type = 'image/png', quality = 1) => {
                    return (
                        canvasElementRef.current?.toDataURL(type, quality) ?? ''
                    );
                },
            };
        }
    }, [
        canvasRef,
        strokes,
        view,
        onViewChange,
        animateViewTo,
        setStrokes,
        setRedoStack,
        setView,
        canvasElementRef,
    ]);
}
