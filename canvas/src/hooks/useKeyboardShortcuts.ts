import { Dispatch, SetStateAction, useEffect } from "react";
import type { Stroke } from "../types/drawingTypes";

interface UseKeyboardShortcutsOptions {
    isSpacePressed: boolean;
    isDrawing: boolean;
    setIsSpacePressed: Dispatch<SetStateAction<boolean>>;
    setIsPanning: Dispatch<SetStateAction<boolean>>;
    setStrokes: Dispatch<SetStateAction<Stroke[]>>;
    setRedoStack: Dispatch<SetStateAction<Stroke[]>>;
}

/**
 * Hook to handle keyboard shortcuts for the canvas (pan mode, undo/redo)
 */
export function useKeyboardShortcuts({
    isSpacePressed,
    isDrawing,
    setIsSpacePressed,
    setIsPanning,
    setStrokes,
    setRedoStack,
}: UseKeyboardShortcutsOptions): void {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' && !isSpacePressed) {
                setIsSpacePressed(true);
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                setStrokes((prev) => {
                    if (prev.length === 0) return prev;
                    const last = prev[prev.length - 1];
                    setRedoStack((redo) => [...redo, last]);
                    return prev.slice(0, -1);
                });
            }
            if (
                (e.ctrlKey || e.metaKey) &&
                (e.key === 'y' || (e.shiftKey && e.key === 'z'))
            ) {
                e.preventDefault();
                setRedoStack((redo) => {
                    if (redo.length === 0) return redo;
                    const last = redo[redo.length - 1];
                    setStrokes((prev) => [...prev, last]);
                    return redo.slice(0, -1);
                });
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                setIsSpacePressed(false);
                if (!isDrawing) setIsPanning(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [
        isSpacePressed,
        isDrawing,
        setIsSpacePressed,
        setIsPanning,
        setStrokes,
        setRedoStack,
    ]);
}
