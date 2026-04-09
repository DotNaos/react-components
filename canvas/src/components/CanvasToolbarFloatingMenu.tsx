import { LassoMode, ToolType } from "../types/types";
import {
    ArrowRight,
    Bold,
    ChevronDown,
    Circle,
    CircleOff,
    Eraser,
    Highlighter,
    Italic,
    Minus,
    PaintBucket,
    PenTool,
    Square,
    Triangle,
} from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import type { ShapeKind } from "../types/drawingTypes";
import { ActiveSlots, EraserMode, SizeSlot, ToolSizes } from "../types/types";
import { ColorSlot } from "./ColorSlot";
import { EraserSizeSlots } from "./EraserSizeSlots";
import { SizeSlotButton } from "./SizeSlotButton";

interface CanvasToolbarFloatingMenuProps {
  show: boolean;
  activeToolGroup: "pen" | "eraser" | "text" | "shapes" | null;
  tool: ToolType;
  theme: "dark" | "light";
  toolbarPos: { top: number; left: number; width: number };
  penColors: string[];
  activePenColorIndex: number;
  onPenColorSelect?: (index: number) => void;
  onPenColorChange?: (index: number, color: string) => void;
  toolSizes: ToolSizes;
  activeSlots: ActiveSlots;
  onSlotChange: (tool: ToolType, slot: SizeSlot) => void;
  onSizeChange: (tool: ToolType, slot: SizeSlot, size: number) => void;
  eraserMode: EraserMode;
  onEraserModeChange: (mode: EraserMode) => void;
  textFontSize: number;
  onTextFontSizeChange?: (size: number) => void;
  textBold: boolean;
  onTextBoldChange?: (bold: boolean) => void;
  textItalic: boolean;
  onTextItalicChange?: (italic: boolean) => void;
  shapeType: ShapeKind;
  onShapeTypeChange?: (type: ShapeKind) => void;
  shapeFilled: boolean;
  onShapeFilledChange?: (filled: boolean) => void;
  color: string;
  onColorChange: (color: string) => void;
  isHeaderToolbar: boolean;
  lassoMode?: LassoMode;
  onToolChange: (tool: ToolType) => void;
}

const SIZE_SLOTS: SizeSlot[] = ["small", "medium", "large"];

export function CanvasToolbarFloatingMenu({
  show,
  activeToolGroup,
  tool,
  theme,
  toolbarPos,
  penColors,
  activePenColorIndex,
  onPenColorSelect,
  onPenColorChange,
  toolSizes,
  activeSlots,
  onSlotChange,
  onSizeChange,
  eraserMode,
  onEraserModeChange,
  textFontSize,
  onTextFontSizeChange,
  textBold,
  onTextBoldChange,
  textItalic,
  onTextItalicChange,
  shapeType,
  onShapeTypeChange,
  shapeFilled,
  onShapeFilledChange,
  color,
  onColorChange,
  isHeaderToolbar,
  onToolChange,
}: CanvasToolbarFloatingMenuProps) {
  const [isEraserDropdownOpen, setIsEraserDropdownOpen] = useState(false);

  if (!show || !activeToolGroup) return null;

  const renderSizes = (targetTool: ToolType) => (
    <div className="floating-group" style={{ display: "flex", gap: "4px", alignItems: "center" }}>
      {SIZE_SLOTS.map((slot) => (
        <SizeSlotButton
          key={slot}
          tool={targetTool}
          slot={slot}
          size={toolSizes[targetTool][slot]}
          isActive={activeSlots[targetTool] === slot}
          isCurrentTool={true}
          onSlotClick={() => onSlotChange(targetTool, slot)}
          onSizeChange={(size) => onSizeChange(targetTool, slot, size)}
          theme={theme}
          openDown={isHeaderToolbar}
        />
      ))}
    </div>
  );

  return createPortal(
    <div
      className={`floating-toolbar ${theme === "light" ? "light" : ""}`}
      style={{
        position: "fixed",
        top: toolbarPos.top,
        left: toolbarPos.left,
        transform: "translate(-50%, 0)",
        zIndex: 1000,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: "8px",
        padding: "4px 8px",
        borderRadius: "50px",
        backgroundColor: theme === "light" ? "#ffffff" : "#1e1e1e",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        border: theme === "light" ? "1px solid #e5e5e5" : "1px solid #333",
        whiteSpace: "nowrap",
      }}
      onMouseDown={(e) => {
        if (e.target instanceof HTMLSelectElement || e.target instanceof HTMLInputElement) {
          return;
        }
        e.preventDefault();
      }}
    >
      {activeToolGroup === "pen" && (
        <>
          <div className="floating-group" style={{ display: "flex", gap: "4px" }}>
            <button
              className={`tool-btn small ${tool === "pen" ? "active" : ""}`}
              onClick={() => onToolChange("pen")}
              title="Pen"
              style={{ width: "24px", height: "24px", padding: "4px", borderRadius: "50%" }}
            >
              <PenTool className="w-3 h-3" />
            </button>
            <button
              className={`tool-btn small ${tool === "highlighter" ? "active" : ""}`}
              onClick={() => onToolChange("highlighter")}
              title="Marker"
              style={{ width: "24px", height: "24px", padding: "4px", borderRadius: "50%" }}
            >
              <Highlighter className="w-3 h-3" />
            </button>
          </div>
          <div className="divider-v" style={{ width: "1px", height: "20px", background: theme === "light" ? "#eee" : "#333" }} />
          <div className="floating-group" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            {penColors.map((c, index) => (
              <ColorSlot
                key={index}
                color={c}
                onChange={(newColor) => onPenColorChange?.(index, newColor)}
                isActive={activePenColorIndex === index}
                onSelect={() => onPenColorSelect?.(index)}
                size={16}
                theme={theme}
              />
            ))}
          </div>
          <div className="divider-v" style={{ width: "1px", height: "20px", background: theme === "light" ? "#eee" : "#333" }} />
          {renderSizes(tool)}
        </>
      )}

      {activeToolGroup === "eraser" && (
        <>
          <div style={{ position: "relative" }}>
            <button
              className="tool-btn"
              onClick={() => setIsEraserDropdownOpen(!isEraserDropdownOpen)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 10px",
                borderRadius: "20px",
                height: "32px",
                width: "auto",
                aspectRatio: "auto",
                background: theme === "light" ? "#f5f5f5" : "#333",
                border: "none",
                color: theme === "light" ? "#333" : "#fff",
                fontSize: "12px",
                fontWeight: 500,
                cursor: "pointer",
                transition: "background 0.2s",
              }}
            >
              {eraserMode === "stroke" ? <Eraser className="w-4 h-4" /> : <CircleOff className="w-4 h-4" />}
              <span>{eraserMode === "stroke" ? "Precision" : "Stroke"}</span>
              <ChevronDown className="w-3 h-3" style={{ opacity: 0.5 }} />
            </button>

            {isEraserDropdownOpen && (
              <>
                <div
                  style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1001 }}
                  onClick={() => setIsEraserDropdownOpen(false)}
                />
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: "50%",
                    transform: "translateX(-50%) translateY(8px)",
                    width: "280px",
                    background: theme === "light" ? "#fff" : "#1e1e1e",
                    border: theme === "light" ? "1px solid #e5e5e5" : "1px solid #333",
                    borderRadius: "12px",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                    padding: "12px",
                    zIndex: 1002,
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  <div style={{ fontSize: "13px", fontWeight: 600, textAlign: "center", color: theme === "light" ? "#000" : "#fff" }}>
                    Eraser Type
                  </div>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => {
                        onEraserModeChange("stroke");
                        setIsEraserDropdownOpen(false);
                      }}
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "8px",
                        padding: "12px",
                        borderRadius: "8px",
                        background: eraserMode === "stroke" ? (theme === "light" ? "#f0f0f0" : "#333") : "transparent",
                        border: eraserMode === "stroke" ? (theme === "light" ? "1px solid #ddd" : "1px solid #444") : "1px solid transparent",
                        cursor: "pointer",
                        textAlign: "center",
                        transition: "all 0.2s",
                      }}
                    >
                      <Eraser className="w-6 h-6" style={{ color: theme === "light" ? "#333" : "#fff" }} />
                      <span style={{ fontSize: "12px", fontWeight: 500, color: theme === "light" ? "#333" : "#fff" }}>
                        Precision Eraser
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        onEraserModeChange("object");
                        setIsEraserDropdownOpen(false);
                      }}
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "8px",
                        padding: "12px",
                        borderRadius: "8px",
                        background: eraserMode === "object" ? (theme === "light" ? "#f0f0f0" : "#333") : "transparent",
                        border: eraserMode === "object" ? (theme === "light" ? "1px solid #ddd" : "1px solid #444") : "1px solid transparent",
                        cursor: "pointer",
                        textAlign: "center",
                        transition: "all 0.2s",
                      }}
                    >
                      <CircleOff className="w-6 h-6" style={{ color: theme === "light" ? "#333" : "#fff" }} />
                      <span style={{ fontSize: "12px", fontWeight: 500, color: theme === "light" ? "#333" : "#fff" }}>
                        Stroke Eraser
                      </span>
                    </button>
                  </div>

                  <div
                    style={{
                      fontSize: "11px",
                      color: theme === "light" ? "#666" : "#999",
                      textAlign: "center",
                      paddingTop: "8px",
                      borderTop: theme === "light" ? "1px solid #eee" : "1px solid #333",
                    }}
                  >
                    {eraserMode === "stroke" ? "Precise erasing for small details" : "Erase entire strokes"}
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="divider-v" style={{ width: "1px", height: "20px", background: theme === "light" ? "#eee" : "#333" }} />
          <EraserSizeSlots activeSlot={activeSlots.eraser} onSlotChange={(slot) => onSlotChange("eraser", slot)} theme={theme} />
        </>
      )}

      {activeToolGroup === "text" && (
        <>
          <ColorSlot color={color} onChange={onColorChange} showChevron={true} isActive={true} size={16} theme={theme} />
          <div className="divider-v" style={{ width: "1px", height: "20px", background: theme === "light" ? "#eee" : "#333" }} />
          <div className="floating-group" style={{ display: "flex", gap: "4px", alignItems: "center" }}>
            <select
              value={textFontSize}
              onChange={(e) => onTextFontSizeChange?.(Number(e.target.value))}
              style={{
                background: theme === "light" ? "#f5f5f5" : "#333",
                color: theme === "light" ? "#333" : "#fff",
                border: "none",
                borderRadius: "8px",
                padding: "4px 8px",
                fontSize: "12px",
                cursor: "pointer",
              }}
              title="Font Size"
            >
              {[12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 64, 72, 96].map((size) => (
                <option key={size} value={size}>
                  {size}px
                </option>
              ))}
            </select>
          </div>
          <div className="divider-v" style={{ width: "1px", height: "20px", background: theme === "light" ? "#eee" : "#333" }} />
          <div className="floating-group" style={{ display: "flex", gap: "4px", alignItems: "center" }}>
            <button
              className={`tool-btn small ${textBold ? "active" : ""}`}
              onClick={() => onTextBoldChange?.(!textBold)}
              onMouseDown={(e) => e.preventDefault()}
              title="Bold"
              style={{ width: "24px", height: "24px", padding: "4px", borderRadius: "50%" }}
            >
              <Bold className="w-3 h-3" />
            </button>
            <button
              className={`tool-btn small ${textItalic ? "active" : ""}`}
              onClick={() => onTextItalicChange?.(!textItalic)}
              onMouseDown={(e) => e.preventDefault()}
              title="Italic"
              style={{ width: "24px", height: "24px", padding: "4px", borderRadius: "50%" }}
            >
              <Italic className="w-3 h-3" />
            </button>
          </div>
        </>
      )}

      {activeToolGroup === "shapes" && (
        <>
          <div className="floating-group" style={{ display: "flex", gap: "4px" }}>
            <button
              className={`tool-btn small ${shapeType === "rectangle" ? "active" : ""}`}
              onClick={() => onShapeTypeChange?.("rectangle")}
              style={{ width: "24px", height: "24px", padding: "4px", borderRadius: "50%" }}
            >
              <Square className="w-3 h-3" />
            </button>
            <button
              className={`tool-btn small ${shapeType === "ellipse" ? "active" : ""}`}
              onClick={() => onShapeTypeChange?.("ellipse")}
              style={{ width: "24px", height: "24px", padding: "4px", borderRadius: "50%" }}
            >
              <Circle className="w-3 h-3" />
            </button>
            <button
              className={`tool-btn small ${shapeType === "triangle" ? "active" : ""}`}
              onClick={() => onShapeTypeChange?.("triangle")}
              style={{ width: "24px", height: "24px", padding: "4px", borderRadius: "50%" }}
            >
              <Triangle className="w-3 h-3" />
            </button>
            <button
              className={`tool-btn small ${shapeType === "arrow" ? "active" : ""}`}
              onClick={() => onShapeTypeChange?.("arrow")}
              style={{ width: "24px", height: "24px", padding: "4px", borderRadius: "50%" }}
            >
              <ArrowRight className="w-3 h-3" />
            </button>
            <button
              className={`tool-btn small ${shapeType === "line" ? "active" : ""}`}
              onClick={() => onShapeTypeChange?.("line")}
              style={{ width: "24px", height: "24px", padding: "4px", borderRadius: "50%" }}
            >
              <Minus className="w-3 h-3" />
            </button>
          </div>
          <div className="divider-v" style={{ width: "1px", height: "20px", background: theme === "light" ? "#eee" : "#333" }} />
          <button
            className={`tool-btn small ${shapeFilled ? "active" : ""}`}
            onClick={() => onShapeFilledChange?.(!shapeFilled)}
            title={shapeFilled ? "Filled" : "Outline"}
            style={{ width: "24px", height: "24px", padding: "4px", borderRadius: "50%" }}
          >
            <PaintBucket className="w-3 h-3" />
          </button>
          <div className="divider-v" style={{ width: "1px", height: "20px", background: theme === "light" ? "#eee" : "#333" }} />
          <ColorSlot color={color} onChange={onColorChange} showChevron={true} isActive={true} size={16} theme={theme} />
          <div className="divider-v" style={{ width: "1px", height: "20px", background: theme === "light" ? "#eee" : "#333" }} />
          <div className="floating-group" style={{ display: "flex", gap: "4px" }}>
            {SIZE_SLOTS.map((slot) => (
              <SizeSlotButton
                key={slot}
                tool="shapes"
                slot={slot}
                size={toolSizes.shapes[slot]}
                isActive={activeSlots.shapes === slot}
                isCurrentTool={true}
                onSlotClick={() => onSlotChange("shapes", slot)}
                onSizeChange={(size) => onSizeChange("shapes", slot, size)}
                theme={theme}
                openDown={isHeaderToolbar}
              />
            ))}
          </div>
        </>
      )}
    </div>,
    document.body,
  );
}
