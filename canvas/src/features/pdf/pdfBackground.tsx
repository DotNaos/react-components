import type { ToolType, ViewState } from '../../types/types';
import type { RefObject } from 'react';

export type GridPatternType = 'dots' | 'grid' | 'none';

export interface PageInfo {
    pageNum: number;
    width: number;
    height: number;
    yOffset: number; // Vertical offset from top of PDF container
}

interface RenderPdfBackgroundParams {
    renderView: ViewState;
    gridPattern: GridPatternType;
    pdfContainerRef: RefObject<HTMLDivElement | null>;
    pages: PageInfo[];
    canvasRefs: RefObject<Map<number, HTMLCanvasElement>>;
    textLayerRefs: RefObject<Map<number, HTMLDivElement>>;
    tool: ToolType;
    title?: string;
    ocrStatus: Map<number, string>;
    pageGap: number;
}

export function renderPdfBackground({
    renderView,
    gridPattern,
    pdfContainerRef,
    pages,
    canvasRefs,
    textLayerRefs,
    tool,
    title,
    ocrStatus,
    pageGap,
}: RenderPdfBackgroundParams) {
    // Grid constants for world-space grid
    const BASE_GRID_SIZE = 4; // 4px between dots/lines in world space
    // Stop subdividing the grid when zoom level is above this power of 2
    // e.g., -2 means stop subdividing at scale 0.25 (2^-2)
    // Lower values make the grid appear larger when zoomed in
    const MAX_SUBDIVISION_LEVEL = -3;

    // Calculate power of 2 for current scale to create a hierarchical grid
    // This ensures screen spacing stays roughly between BASE_GRID_SIZE and 2 * BASE_GRID_SIZE
    // and that grid points always align (subdividing as we zoom in)
    // Clamp max power to stop subdivision when zooming in
    const power = Math.min(
        MAX_SUBDIVISION_LEVEL,
        Math.floor(Math.log2(renderView.scale)),
    );
    const effectiveGridSize = BASE_GRID_SIZE / Math.pow(2, power);

    // Calculate the scaled grid size and position
    const scaledGridSize = effectiveGridSize * renderView.scale;

    // Calculate background position to align with world origin
    const bgPosX = renderView.x % scaledGridSize;
    const bgPosY = renderView.y % scaledGridSize;

    // Generate background pattern based on type
    const getBackgroundPattern = () => {
        if (gridPattern === 'none') return { backgroundImage: 'none' };

        const dotColor = 'rgba(0, 0, 0, 0.15)';
        const lineColor = 'rgba(0, 0, 0, 0.1)';
        // Scale dot size with zoom, but clamp it to avoid it getting too large or small
        const dotSize = Math.max(0.5, Math.min(4, renderView.scale * 2));

        if (gridPattern === 'dots') {
            return {
                backgroundImage: `radial-gradient(circle, ${dotColor} ${dotSize}px, transparent ${dotSize}px)`,
                backgroundSize: `${scaledGridSize}px ${scaledGridSize}px`,
                backgroundPosition: `${bgPosX}px ${bgPosY}px`,
            };
        }

        // Grid lines
        return {
            backgroundImage: `
        linear-gradient(to right, ${lineColor} 1px, transparent 1px),
        linear-gradient(to bottom, ${lineColor} 1px, transparent 1px)
      `,
            backgroundSize: `${scaledGridSize}px ${scaledGridSize}px`,
            backgroundPosition: `${bgPosX}px ${bgPosY}px`,
        };
    };

    return (
        <>
            {/* World-space grid layer - covers entire viewport */}
            {gridPattern !== 'none' && (
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: '#fafafa',
                        ...getBackgroundPattern(),
                        pointerEvents: 'none',
                    }}
                />
            )}
            {/* PDF pages container */}
            <div
                ref={pdfContainerRef}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    transform: `matrix(${renderView.scale}, 0, 0, ${renderView.scale}, ${renderView.x}, ${renderView.y})`,
                    transformOrigin: '0 0',
                    willChange: 'transform',
                    // Keep pointer-events none so wheel events pass through to Canvas
                    // Text layer spans will have pointer-events: auto via CSS when needed
                    pointerEvents: 'none',
                    // When cursor tool is active, PDF container should be ABOVE the canvas
                    zIndex: tool === 'cursor' ? 10 : 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: `${pageGap}px`,
                    padding: `${pageGap}px`,
                }}
            >
                {/* Title above the first page */}
                {title && (
                    <div
                        style={{
                            fontSize: '24px',
                            fontWeight: 500,
                            color: 'rgba(0, 0, 0, 0.75)',
                            paddingBottom: '12px',
                            paddingLeft: '4px',
                            pointerEvents: 'none',
                            userSelect: 'none',
                        }}
                    >
                        {title}
                    </div>
                )}
                {pages.map((pageInfo) => (
                    <div
                        key={pageInfo.pageNum}
                        style={{
                            position: 'relative',
                            width: `${pageInfo.width}px`,
                            height: `${pageInfo.height}px`,
                            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                            background: 'white',
                        }}
                    >
                        <canvas
                            ref={(el) => {
                                if (el)
                                    canvasRefs.current.set(
                                        pageInfo.pageNum,
                                        el,
                                    );
                            }}
                            style={{
                                display: 'block',
                                width: '100%',
                                height: '100%',
                            }}
                        />
                        <div
                            ref={(el) => {
                                if (el)
                                    textLayerRefs.current.set(
                                        pageInfo.pageNum,
                                        el,
                                    );
                            }}
                            className={`textLayer ${tool === 'cursor' ? 'active' : ''}`}
                        />
                        {/* OCR Status Indicator */}
                        {ocrStatus.get(pageInfo.pageNum) && (
                            <div
                                style={{
                                    position: 'absolute',
                                    bottom: '10px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    background: 'rgba(0, 0, 0, 0.7)',
                                    color: 'white',
                                    padding: '8px 16px',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    fontFamily: 'system-ui, sans-serif',
                                    pointerEvents: 'none',
                                    zIndex: 10,
                                }}
                            >
                                {ocrStatus.get(pageInfo.pageNum)}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </>
    );
}
