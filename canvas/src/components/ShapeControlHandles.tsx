import { ViewState } from "../types/types";
import React from "react";
import type { Shape } from "../types/drawingTypes";

interface ShapeControlHandlesProps {
  shape: Shape;
  view: ViewState;
  onControlPointStart: (shapeId: string, type: 'start' | 'end', e: React.PointerEvent) => void;
  onControlPointMove: (shapeId: string, type: 'start' | 'end', e: React.PointerEvent) => void;
  onControlPointEnd: (shapeId: string, type: 'start' | 'end', e: React.PointerEvent) => void;
}

export const ShapeControlHandles: React.FC<ShapeControlHandlesProps> = ({
  shape,
  view,
  onControlPointStart,
  onControlPointMove,
  onControlPointEnd,
}) => {
  if (shape.kind !== "line" && shape.kind !== "arrow") return null;

  const getScreenPos = (x: number, y: number) => ({
    x: x * view.scale + view.x,
    y: y * view.scale + view.y,
  });

  const startPos = getScreenPos(shape.x1, shape.y1);
  const endPos = getScreenPos(shape.x2, shape.y2);

  const handleStyle: React.CSSProperties = {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: "50%",
    backgroundColor: "white",
    border: "2px solid #3b82f6",
    transform: "translate(-50%, -50%)",
    cursor: "move",
    pointerEvents: "auto",
    zIndex: 20, // Higher than selection box (usually 10)
    touchAction: "none",
  };

  const renderHandle = (type: 'start' | 'end', pos: {x: number, y: number}) => (
    <div
      style={{ ...handleStyle, left: pos.x, top: pos.y }}
      onPointerDown={(e) => {
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        onControlPointStart(shape.id, type, e);
      }}
      onPointerMove={(e) => {
        e.stopPropagation();
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
           onControlPointMove(shape.id, type, e);
        }
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        e.currentTarget.releasePointerCapture(e.pointerId);
        onControlPointEnd(shape.id, type, e);
      }}
    />
  );

  return (
    <>
      {renderHandle('start', startPos)}
      {renderHandle('end', endPos)}
    </>
  );
};
