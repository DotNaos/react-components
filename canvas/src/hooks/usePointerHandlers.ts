import { ViewState } from '../types/types';
import { MutableRefObject, RefObject, useCallback, useRef } from 'react';

interface PointerRefs {
    canvasElementRef: RefObject<HTMLCanvasElement | null>;
    containerRef?: RefObject<HTMLElement | null>;
    cursorRef: RefObject<HTMLDivElement | null>;
    cursorInnerRef: RefObject<HTMLDivElement | null>;
    pointerRef: MutableRefObject<{ x: number; y: number }>;
}

interface PointerCallbacks {
    toWorld: (x: number, y: number) => { x: number; y: number };
    startStroke: (
        worldPos: { x: number; y: number },
        pressure: number,
        pointerType: string,
    ) => void;
    addPointToStroke: (
        worldPos: { x: number; y: number },
        pressure: number,
        pointerType: string,
    ) => void;
    endStroke: () => void;
}

interface PointerState {
    isPanning: boolean;
    isDrawing: boolean;
    isSpacePressed: boolean;
    tool: string;
}

interface UsePointerHandlersReturn {
    handlePointerDown: (e: React.PointerEvent) => void;
    handlePointerMove: (e: React.PointerEvent) => void;
    handlePointerUp: (e: React.PointerEvent) => void;
    handlePointerLeave: (e: React.PointerEvent) => void;
    handlePointerEnter: (e: React.PointerEvent) => void;
}

/**
 * Hook to handle pointer events for drawing and panning
 */
export function usePointerHandlers(
    refs: PointerRefs,
    callbacks: PointerCallbacks,
    state: PointerState,
    setIsPanning: (v: boolean) => void,
    setView: (fn: (prev: ViewState) => ViewState) => void,
): UsePointerHandlersReturn {
    const { canvasElementRef, cursorRef, cursorInnerRef, pointerRef } = refs;

    const callbacksRef = useRef(callbacks);
    callbacksRef.current = callbacks;

    const stateRef = useRef(state);
    stateRef.current = state;

    const setIsPanningRef = useRef(setIsPanning);
    setIsPanningRef.current = setIsPanning;

    const setViewRef = useRef(setView);
    setViewRef.current = setView;

    const handlePointerDown = useCallback(
        (e: React.PointerEvent) => {
            const canvas = canvasElementRef.current;
            if (!canvas) return;

            const { isSpacePressed } = stateRef.current;
            const { toWorld, startStroke } = callbacksRef.current;
            const setIsPanning = setIsPanningRef.current;

            if (e.button === 1 || isSpacePressed) {
                setIsPanning(true);
                pointerRef.current = { x: e.clientX, y: e.clientY };

                // Capture on the element that fired the event (canvas or container)
                (e.currentTarget as Element).setPointerCapture(e.pointerId);
                return;
            }

            // Normal drawing - capture on canvas
            if (stateRef.current.tool !== 'cursor') {
                (e.currentTarget as Element).setPointerCapture(e.pointerId);
            }

            if (!e.isPrimary) return;

            const rect = canvas.getBoundingClientRect();
            const worldPos = toWorld(
                e.clientX - rect.left,
                e.clientY - rect.top,
            );
            startStroke(worldPos, e.pressure, e.pointerType);

            if (cursorInnerRef.current) {
                cursorInnerRef.current.style.transform =
                    'translate(-50%, -50%) scale(0.75)';
            }
        },
        [canvasElementRef, cursorInnerRef, pointerRef],
    );

    const handlePointerMove = useCallback(
        (e: React.PointerEvent) => {
            const canvas = canvasElementRef.current;
            if (!canvas) return;

            const { isPanning, isDrawing } = stateRef.current;
            const { toWorld, addPointToStroke } = callbacksRef.current;
            const setView = setViewRef.current;

            const rect = canvas.getBoundingClientRect();

            // Update cursor position - hide for tools that use native CSS cursors
            const toolsWithNativeCursor = ['cursor', 'text', 'lasso', 'shapes'];
            const useNativeCursor = toolsWithNativeCursor.includes(
                stateRef.current.tool,
            );
            if (cursorRef.current && !isPanning && !useNativeCursor) {
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                cursorRef.current.style.transform = `translate(${x}px, ${y}px)`;
                cursorRef.current.style.display = 'block';
            } else if (cursorRef.current) {
                cursorRef.current.style.display = 'none';
            }

            if (isPanning) {
                const dx = e.clientX - pointerRef.current.x;
                const dy = e.clientY - pointerRef.current.y;
                setView((prev) => ({
                    ...prev,
                    x: prev.x + dx,
                    y: prev.y + dy,
                    scale: prev.scale,
                }));
                pointerRef.current = { x: e.clientX, y: e.clientY };
                return;
            }

            if (isDrawing) {
                const worldPos = toWorld(
                    e.clientX - rect.left,
                    e.clientY - rect.top,
                );
                addPointToStroke(worldPos, e.pressure, e.pointerType);
            }
        },
        [canvasElementRef, cursorRef, pointerRef],
    );

    const handlePointerUp = useCallback(
        (e: React.PointerEvent) => {
            const canvas = canvasElementRef.current;
            if (!canvas) return;

            const { isPanning, isDrawing } = stateRef.current;
            const { endStroke } = callbacksRef.current;
            const setIsPanning = setIsPanningRef.current;

            if ((e.currentTarget as Element).hasPointerCapture(e.pointerId)) {
                (e.currentTarget as Element).releasePointerCapture(e.pointerId);
            }

            if (isPanning) {
                setIsPanning(false);
            } else if (isDrawing) {
                endStroke();
            }

            if (cursorInnerRef.current) {
                cursorInnerRef.current.style.transform =
                    'translate(-50%, -50%) scale(1)';
            }
        },
        [canvasElementRef, cursorInnerRef],
    );

    const handlePointerLeave = useCallback(
        (e: React.PointerEvent) => {
            handlePointerUp(e);
            if (cursorRef.current) {
                cursorRef.current.style.display = 'none';
            }
            if (cursorInnerRef.current) {
                cursorInnerRef.current.style.transform =
                    'translate(-50%, -50%) scale(1)';
            }
        },
        [handlePointerUp, cursorRef, cursorInnerRef],
    );

    const handlePointerEnter = useCallback(
        (_e: React.PointerEvent) => {
            const toolsWithNativeCursor = ['cursor', 'text', 'lasso', 'shapes'];
            const useNativeCursor = toolsWithNativeCursor.includes(
                stateRef.current.tool,
            );
            if (
                cursorRef.current &&
                !stateRef.current.isPanning &&
                !useNativeCursor
            ) {
                cursorRef.current.style.display = 'block';
            }
        },
        [cursorRef],
    );

    return {
        handlePointerDown,
        handlePointerMove,
        handlePointerUp,
        handlePointerLeave,
        handlePointerEnter,
    };
}
