import { MutableRefObject, RefObject, useCallback, useEffect } from 'react';

interface UseCanvasResizeOptions {
    containerRef: RefObject<HTMLDivElement | null>;
    canvasElementRef: RefObject<HTMLCanvasElement | null>;
    inkCanvasRef: MutableRefObject<HTMLCanvasElement | null>;
    dprRef: MutableRefObject<number>;
    onResize?: () => void;
}

/**
 * Hook to handle canvas initialization and resizing.
 * Calls onResize callback after canvas is sized, to trigger redraw.
 */
export function useCanvasResize({
    containerRef,
    canvasElementRef,
    inkCanvasRef,
    dprRef,
    onResize,
}: UseCanvasResizeOptions): void {
    // Store the callback in a ref to avoid re-running the effect
    const onResizeRef = useCallback(() => {
        onResize?.();
    }, [onResize]);

    useEffect(() => {
        const canvas = canvasElementRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const resize = () => {
            const dpr = window.devicePixelRatio || 1;
            dprRef.current = dpr;

            const rect = container.getBoundingClientRect();
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            canvas.style.width = rect.width + 'px';
            canvas.style.height = rect.height + 'px';

            const ctx = canvas.getContext('2d');
            if (ctx) ctx.scale(dpr, dpr);

            // Setup ink canvas for compositing
            if (!inkCanvasRef.current) {
                inkCanvasRef.current = document.createElement('canvas');
            }
            inkCanvasRef.current.width = canvas.width;
            inkCanvasRef.current.height = canvas.height;
            const inkCtx = inkCanvasRef.current.getContext('2d');
            if (inkCtx) inkCtx.scale(dpr, dpr);

            // Trigger redraw after resize (use rAF to ensure React has updated refs)
            requestAnimationFrame(() => {
                onResizeRef();
            });
        };

        resize();
        window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
    }, [containerRef, canvasElementRef, inkCanvasRef, dprRef, onResizeRef]);
}
