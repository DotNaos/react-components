import { ToolType } from '../types/types';
import { RefObject, useEffect } from 'react';

interface UseCursorOptions {
    tool: ToolType;
    color: string;
    penSize: number;
    highlighterSize: number;
    eraserSize: number;
    /** Current zoom scale - eraser uses this to maintain constant viewport size */
    scale?: number;
}

/**
 * Hook to manage cursor appearance based on current tool and settings
 */
export function useCanvasCursor(
    cursorVisualRef: RefObject<HTMLDivElement | null>,
    cursorInnerRef: RefObject<HTMLDivElement | null>,
    options: UseCursorOptions,
): void {
    const {
        tool,
        color,
        penSize,
        highlighterSize,
        eraserSize,
        scale = 1,
    } = options;

    useEffect(() => {
        if (!cursorVisualRef.current || !cursorInnerRef.current) return;

        let targetSize = penSize;
        if (tool === 'eraser') {
            // Eraser has constant viewport/screen size (doesn't scale with zoom)
            targetSize = eraserSize;
        } else if (tool === 'highlighter') {
            targetSize = highlighterSize;
        }

        // Cursor stays at constant screen size since stroke size is world-space
        const cursorSize = targetSize;

        cursorVisualRef.current.style.width = `${cursorSize}px`;
        cursorVisualRef.current.style.height = `${cursorSize}px`;

        if (tool === 'eraser') {
            // Transparent glass look with subtle border
            cursorVisualRef.current.style.backgroundColor =
                'rgba(200, 200, 200, 0.25)';
            cursorVisualRef.current.style.border =
                '1px solid rgba(128, 128, 128, 0.4)';
            cursorVisualRef.current.style.opacity = '1';
            cursorVisualRef.current.style.backdropFilter = 'blur(1px)';

            // No inner element styling for glass look
            cursorInnerRef.current.style.backgroundColor = 'transparent';
            cursorInnerRef.current.style.width = '0';
            cursorInnerRef.current.style.height = '0';
            // Remove animation for eraser
            cursorInnerRef.current.style.transition = 'none';
        } else if (tool === 'highlighter') {
            cursorVisualRef.current.style.backgroundColor = 'transparent';
            cursorVisualRef.current.style.opacity = '0.4';
            cursorVisualRef.current.style.border = 'none';
            cursorVisualRef.current.style.backdropFilter = 'none';

            cursorInnerRef.current.style.backgroundColor = color;
            cursorInnerRef.current.style.width = '100%';
            cursorInnerRef.current.style.height = '100%';
            cursorInnerRef.current.style.transition =
                'transform 0.1s ease-in-out, background-color 0.1s ease-in-out';
        } else {
            cursorVisualRef.current.style.backgroundColor = 'transparent';
            cursorVisualRef.current.style.border =
                '1px solid rgba(128, 128, 128, 0.6)';
            cursorVisualRef.current.style.opacity = '1';
            cursorVisualRef.current.style.backdropFilter = 'none';

            cursorInnerRef.current.style.backgroundColor = color;
            cursorInnerRef.current.style.width = 'calc(100% - 2px)';
            cursorInnerRef.current.style.height = 'calc(100% - 2px)';
            cursorInnerRef.current.style.transition =
                'transform 0.1s ease-in-out, background-color 0.1s ease-in-out';
        }
    }, [
        tool,
        color,
        penSize,
        highlighterSize,
        eraserSize,
        scale,
        cursorVisualRef,
        cursorInnerRef,
    ]);
}
