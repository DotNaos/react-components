import React from "react";

export type ResizeHandle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

interface ResizeHandlesProps {
  onResizeStart: (handle: ResizeHandle, e: React.PointerEvent) => void;
  onResizeMove: (handle: ResizeHandle, e: React.PointerEvent) => void;
  onResizeEnd: (handle: ResizeHandle, e: React.PointerEvent) => void;
  allowedHandles?: ResizeHandle[];
}

export const ResizeHandles: React.FC<ResizeHandlesProps> = ({ onResizeStart, onResizeMove, onResizeEnd, allowedHandles }) => {
  const handleStyle = (cursor: string): React.CSSProperties => ({
    position: "absolute",
    width: 12,
    height: 12,
    backgroundColor: "white",
    border: "2px solid #3b82f6",
    cursor,
    pointerEvents: "auto",
    zIndex: 10,
    boxSizing: "border-box", // Ensure border is included in size
    touchAction: "none", // Critical for pointer events on touch devices
  });

  const cornerStyle: React.CSSProperties = {
    borderRadius: 0, // Square
  };

  const sideStyle: React.CSSProperties = {
    borderRadius: "50%", // Circle
    backgroundColor: "#3b82f6", // Blue filled
    border: "2px solid white", // White border
  };

  const handles: { id: ResizeHandle; style: React.CSSProperties; cursor: string }[] = [
    { id: "nw", cursor: "nwse-resize", style: { top: -6, left: -6, ...cornerStyle } },
    { id: "n", cursor: "ns-resize", style: { top: -6, left: "50%", transform: "translateX(-50%)", ...sideStyle } },
    { id: "ne", cursor: "nesw-resize", style: { top: -6, right: -6, ...cornerStyle } },

    { id: "w", cursor: "ew-resize", style: { top: "50%", left: -6, transform: "translateY(-50%)", ...sideStyle } },
    { id: "e", cursor: "ew-resize", style: { top: "50%", right: -6, transform: "translateY(-50%)", ...sideStyle } },

    { id: "sw", cursor: "nesw-resize", style: { bottom: -6, left: -6, ...cornerStyle } },
    { id: "s", cursor: "ns-resize", style: { bottom: -6, left: "50%", transform: "translateX(-50%)", ...sideStyle } },
    { id: "se", cursor: "nwse-resize", style: { bottom: -6, right: -6, ...cornerStyle } },
  ];

  return (
    <>
      {handles.filter(h => !allowedHandles || allowedHandles.includes(h.id)).map(({ id, style, cursor }) => (
        <div
          key={id}
          style={{ ...handleStyle(cursor), ...style }}
          onPointerDown={(e) => {
            e.stopPropagation(); // Prevent ensuring selection box drag
            e.currentTarget.setPointerCapture(e.pointerId);
            onResizeStart(id, e);
          }}
          onPointerMove={(e) => {
            e.stopPropagation();
            if (e.currentTarget.hasPointerCapture(e.pointerId)) {
               onResizeMove(id, e);
            }
          }}
          onPointerUp={(e) => {
            e.stopPropagation();
            e.currentTarget.releasePointerCapture(e.pointerId);
            onResizeEnd(id, e);
          }}
        />
      ))}
    </>
  );
};
