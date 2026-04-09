import { createLogger } from '../../../logging';
import React from 'react';
import type { Shape } from '../types/drawingTypes';
import { ViewState } from '../types/types';
import { calculateTextDimensions } from '../utils/drawingUtils';

const logger = createLogger('com.aryazos.components.canvas.shapes');

interface ShapeRendererProps {
    /** Shapes to render */
    shapes: Shape[];
    /** Current shape being drawn (if any) */
    currentShape?: Shape | null;
    /** View state for transforming world to screen coordinates */
    view: ViewState;
    /** IDs of selected shapes */
    selectedShapeIds?: Set<string>;
    /** Callback when a shape is clicked */
    onShapeClick?: (shapeId: string, e: React.MouseEvent) => void;
    /** Callback when a shape is double-clicked (for text editing) */
    onShapeDoubleClick?: (shapeId: string, e: React.MouseEvent) => void;
    /** Whether to show the dashed selection box around shapes (default: true) */
    showSelectionBox?: boolean;
}

/**
 * Component to render vector shapes on the canvas
 */
export function ShapeRenderer({
    shapes,
    currentShape,
    view,
    selectedShapeIds,
    onShapeClick,
    onShapeDoubleClick,
    showSelectionBox = true,
}: ShapeRendererProps) {
    const allShapes = currentShape ? [...shapes, currentShape] : shapes;

    if (allShapes.length === 0) return null;

    const renderShape = (
        shape: Shape,
        isSelected: boolean,
        isDrawing: boolean,
    ) => {
        const { x1, y1, x2, y2 } = shape;

        // Transform to screen coordinates
        const screenX1 = x1 * view.scale + view.x;
        const screenY1 = y1 * view.scale + view.y;
        const screenX2 = x2 * view.scale + view.x;
        const screenY2 = y2 * view.scale + view.y;

        const minX = Math.min(screenX1, screenX2);
        const minY = Math.min(screenY1, screenY2);
        const width = Math.abs(screenX2 - screenX1);
        const height = Math.abs(screenY2 - screenY1);

        const strokeWidth = shape.strokeWidth * view.scale;
        const strokeColor = shape.strokeColor;
        const fillColor = shape.fillColor || 'transparent';

        const commonProps = {
            stroke: strokeColor,
            strokeWidth: Math.max(1, strokeWidth),
            fill: fillColor,
            opacity: isDrawing ? 0.7 : 1,
            style: {
                cursor: onShapeClick ? 'pointer' : 'default',
                pointerEvents: (onShapeClick ? 'auto' : 'none') as
                    | 'auto'
                    | 'none',
            },
            onClick: onShapeClick
                ? (e: React.MouseEvent) => {
                      e.stopPropagation();
                      onShapeClick(shape.id, e);
                  }
                : undefined,
        };

        // Selection highlight
        const selectionRect =
            isSelected && showSelectionBox ? (
                <rect
                    x={minX - 4}
                    y={minY - 4}
                    width={width + 8}
                    height={height + 8}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    rx={4}
                    ry={4}
                    style={{ pointerEvents: 'none' }}
                />
            ) : null;

        switch (shape.kind) {
            case 'rectangle':
                return (
                    <g key={shape.id}>
                        {selectionRect}
                        <rect
                            x={minX}
                            y={minY}
                            width={width}
                            height={height}
                            rx={2}
                            ry={2}
                            {...commonProps}
                        />
                    </g>
                );

            case 'ellipse':
                return (
                    <g key={shape.id}>
                        {selectionRect}
                        <ellipse
                            cx={minX + width / 2}
                            cy={minY + height / 2}
                            rx={width / 2}
                            ry={height / 2}
                            {...commonProps}
                        />
                    </g>
                );

            case 'triangle':
                // Equilateral(ish) triangle fitting in box
                const tx1 = screenX1 + width / 2;
                const ty1 = screenY1;
                const tx2 = screenX2;
                const ty2 = screenY2;
                const tx3 = screenX1;
                const ty3 = screenY2;

                return (
                    <g key={shape.id}>
                        {selectionRect}
                        <polygon
                            points={`${tx1},${ty1} ${tx2},${ty2} ${tx3},${ty3}`}
                            {...commonProps}
                            fill={shape.fillColor || 'transparent'} // Explicit fill handling
                        />
                    </g>
                );

            case 'line': {
                // Calculate opacity - highlighter lines should be semi-transparent
                const lineOpacity = shape.isHighlighter
                    ? 0.4
                    : isDrawing
                      ? 0.7
                      : 1;
                return (
                    <g key={shape.id}>
                        {isSelected && (
                            <line
                                x1={screenX1}
                                y1={screenY1}
                                x2={screenX2}
                                y2={screenY2}
                                stroke="#3b82f6"
                                strokeWidth={Math.max(1, strokeWidth) + 6}
                                strokeLinecap="round"
                                opacity={0.3}
                                style={{ pointerEvents: 'none' }}
                            />
                        )}
                        <line
                            x1={screenX1}
                            y1={screenY1}
                            x2={screenX2}
                            y2={screenY2}
                            strokeLinecap="round"
                            {...commonProps}
                            opacity={lineOpacity}
                            fill="none"
                        />
                    </g>
                );
            }

            case 'arrow':
                // Calculate arrow head
                const angle = Math.atan2(
                    screenY2 - screenY1,
                    screenX2 - screenX1,
                );
                const headLength = Math.max(12, strokeWidth * 5);
                const headAngle = Math.PI / 5; // ~36 degrees for a wider head

                // Arrow head points
                const arrowX1 =
                    screenX2 - headLength * Math.cos(angle - headAngle);
                const arrowY1 =
                    screenY2 - headLength * Math.sin(angle - headAngle);
                const arrowX2 =
                    screenX2 - headLength * Math.cos(angle + headAngle);
                const arrowY2 =
                    screenY2 - headLength * Math.sin(angle + headAngle);

                // Notch point (where line meets head)
                const notchDepth = headLength * 0.3;
                const notchX = screenX2 - notchDepth * Math.cos(angle);
                const notchY = screenY2 - notchDepth * Math.sin(angle);

                return (
                    <g key={shape.id}>
                        {isSelected && (
                            <line
                                x1={screenX1}
                                y1={screenY1}
                                x2={notchX}
                                y2={notchY}
                                stroke="#3b82f6"
                                strokeWidth={Math.max(1, strokeWidth) + 6}
                                strokeLinecap="round"
                                opacity={0.3}
                                style={{ pointerEvents: 'none' }}
                            />
                        )}
                        {/* Arrow line (ending at notch point) */}
                        <line
                            x1={screenX1}
                            y1={screenY1}
                            x2={notchX}
                            y2={notchY}
                            strokeLinecap="round"
                            {...commonProps}
                            fill="none"
                        />
                        {/* Arrow head with rounded corners */}
                        <path
                            d={`M ${arrowX1},${arrowY1} L ${screenX2},${screenY2} L ${arrowX2},${arrowY2} L ${notchX},${notchY} Z`}
                            fill={strokeColor}
                            stroke={strokeColor}
                            strokeWidth={Math.max(1, strokeWidth * 0.5)}
                            strokeLinejoin="round"
                            strokeLinecap="round"
                            style={commonProps.style}
                            onClick={commonProps.onClick}
                        />
                    </g>
                );

            case 'text':
                if (!shape.text) return null;

                const fontSize = (shape.fontSize || 16) * view.scale;
                const fontFamily = shape.fontFamily || 'sans-serif';
                const fontWeight = shape.fontWeight || 'normal';
                const fontStyle = shape.fontStyle || 'normal';
                const textAlign = shape.textAlign || 'left';
                const color = shape.strokeColor;

                // Calculate dimensions dynamically based on text content and font size
                const { width: textWidth, height: textHeight } =
                    calculateTextDimensions(shape.text, fontSize);

                return (
                    <g key={shape.id} style={{ pointerEvents: 'all' }}>
                        {/* Selection box for text - uses calculated text height */}
                        {isSelected && showSelectionBox && (
                            <rect
                                x={minX - 4}
                                y={minY - 4}
                                width={textWidth + 8}
                                height={textHeight + 8}
                                fill="none"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                strokeDasharray="4 4"
                                rx={4}
                                ry={4}
                            />
                        )}

                        <foreignObject
                            x={minX}
                            y={minY}
                            width={textWidth}
                            height={textHeight}
                            style={{
                                overflow: 'visible',
                                pointerEvents: 'none',
                            }}
                        >
                            <div
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems:
                                        shape.textAlign === 'center'
                                            ? 'center'
                                            : shape.textAlign === 'right'
                                              ? 'flex-end'
                                              : 'flex-start',
                                }}
                            >
                                <div
                                    data-shape-interactive="true"
                                    style={{
                                        width: 'fit-content',
                                        height: 'auto',
                                        fontSize: `${fontSize}px`,
                                        fontFamily,
                                        fontWeight,
                                        fontStyle,
                                        textAlign: textAlign as any,
                                        color,
                                        wordWrap: 'break-word',
                                        whiteSpace: 'pre-wrap',
                                        lineHeight: '1.2',
                                        userSelect: 'none',
                                        cursor: onShapeClick
                                            ? 'pointer'
                                            : 'default',
                                        pointerEvents: 'auto',
                                    }}
                                    onPointerDown={(e) => {
                                        logger.trace('onPointerDown on shape', {
                                            shapeId: shape.id,
                                        });
                                        // Prevent canvas from handling this event (stops tool activation)
                                        e.stopPropagation();
                                    }}
                                    onClick={
                                        onShapeClick
                                            ? (
                                                  e: React.MouseEvent<HTMLDivElement>,
                                              ) => {
                                                  e.stopPropagation();
                                                  onShapeClick(
                                                      shape.id,
                                                      e as unknown as React.MouseEvent,
                                                  );
                                              }
                                            : undefined
                                    }
                                    onDoubleClick={
                                        onShapeDoubleClick
                                            ? (
                                                  e: React.MouseEvent<HTMLDivElement>,
                                              ) => {
                                                  logger.trace(
                                                      'onDoubleClick fired for shape',
                                                      { shapeId: shape.id },
                                                  );
                                                  e.stopPropagation();
                                                  onShapeDoubleClick(
                                                      shape.id,
                                                      e as unknown as React.MouseEvent,
                                                  );
                                              }
                                            : undefined
                                    }
                                >
                                    {shape.text}
                                </div>
                            </div>
                        </foreignObject>
                    </g>
                );

            default:
                return null;
        }
    };

    return (
        <svg
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                overflow: 'visible',
                pointerEvents: 'none',
            }}
        >
            {shapes.map((shape) =>
                renderShape(
                    shape,
                    selectedShapeIds?.has(shape.id) ?? false,
                    false,
                ),
            )}
            {currentShape && renderShape(currentShape, false, true)}
        </svg>
    );
}
