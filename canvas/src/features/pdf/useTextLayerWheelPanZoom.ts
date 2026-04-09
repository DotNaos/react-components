import type { ToolType, ViewState } from '../../types/types';
import type { Dispatch, SetStateAction } from 'react';
import { useEffect } from 'react';

type ContainerRef = { current: HTMLDivElement | null };
type TextLayerRefs = { current: Map<number, HTMLDivElement> };

type UseTextLayerWheelPanZoomParams = {
    tool: ToolType;
    view: ViewState;
    setView: Dispatch<SetStateAction<ViewState>>;
    containerRef: ContainerRef;
    textLayerRefs: TextLayerRefs;
};

export function useTextLayerWheelPanZoom({
    tool,
    view,
    setView,
    containerRef,
    textLayerRefs,
}: UseTextLayerWheelPanZoomParams) {
    // Handle wheel events on text layers for pan/zoom when cursor tool is active
    useEffect(() => {
        if (tool !== 'cursor') return;

        const textLayers = Array.from(textLayerRefs.current.values());
        if (textLayers.length === 0) return;

        const handleWheel = (event: WheelEvent) => {
            event.preventDefault();
            event.stopPropagation();

            const container = containerRef.current;
            if (!container) return;

            const rect = container.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;

            if (event.ctrlKey || event.metaKey) {
                // Zoom centered on cursor - same logic as useGestures
                const sensitivity = 0.01;
                const delta = -event.deltaY;
                const zoomFactor = Math.exp(delta * sensitivity);

                // Calculate world position under cursor
                const worldX = (mouseX - view.x) / view.scale;
                const worldY = (mouseY - view.y) / view.scale;

                // Calculate new scale with limits
                const newScale = Math.max(
                    0.1,
                    Math.min(10, view.scale * zoomFactor),
                );

                // Adjust position to keep world point under cursor
                setView({
                    x: mouseX - worldX * newScale,
                    y: mouseY - worldY * newScale,
                    scale: newScale,
                });
            } else {
                // Pan
                setView((prev) => ({
                    ...prev,
                    x: prev.x - event.deltaX,
                    y: prev.y - event.deltaY,
                }));
            }
        };

        textLayers.forEach((layer) => {
            layer.addEventListener('wheel', handleWheel, { passive: false });
        });

        return () => {
            textLayers.forEach((layer) => {
                layer.removeEventListener('wheel', handleWheel);
            });
        };
    }, [tool, view, setView, containerRef, textLayerRefs]);
}
