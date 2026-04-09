import { useRef } from "react";

interface TaperedSliderProps {
  /** Current value */
  value: number;
  /** Minimum value */
  min: number;
  /** Maximum value */
  max: number;
  /** Callback when value changes */
  onChange: (value: number) => void;
  /** Step value for the slider */
  step?: number;
  /** Use step index instead of actual value (for non-linear sliders) */
  useStepIndex?: boolean;
  /** Theme */
  theme?: "dark" | "light";
  /** Show value label */
  showLabel?: boolean;
  /** Label suffix (e.g., "px") */
  labelSuffix?: string;
  /** Custom label value (when using step index) */
  labelValue?: number;
}

/**
 * Custom tapered slider with a design matching GoodNotes.
 * Track is thin on left, thick on right, with a circular thumb with inner dot.
 */
export function TaperedSlider({
  value,
  min,
  max,
  onChange,
  step = 1,
  useStepIndex = false,
  theme = "dark",
  showLabel = false,
  labelSuffix = "px",
  labelValue,
}: TaperedSliderProps) {
  const sliderRef = useRef<HTMLDivElement>(null);

  // Calculate thumb position (0-100%)
  const range = max - min;
  const thumbPosition = range > 0 ? ((value - min) / range) * 100 : 0;

  const displayValue = labelValue ?? value;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", width: "100%" }}>
      {showLabel && (
        <span style={{
          fontSize: "13px",
          color: theme === "light" ? "#333" : "#fff",
          minWidth: "45px"
        }}>
          {displayValue} {labelSuffix}
        </span>
      )}

      {/* Custom tapered slider track */}
      <div ref={sliderRef} style={{ flex: 1, position: "relative", height: "24px" }}>
        {/* SVG Tapered Track Background - thin left, thick right, rounded ends */}
        <svg
          width="100%"
          height="24"
          viewBox="0 0 200 24"
          style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
          preserveAspectRatio="none"
        >
          {/* Tapered path - thin on left (point), thick on right (12px height), rounded right end */}
          <path
            d="M 0,12 L 194,6 Q 200,6 200,12 Q 200,18 194,18 L 0,12 Z"
            fill="#fff"
          />
        </svg>

        {/* Invisible range input for interaction */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(useStepIndex ? parseInt(e.target.value, 10) : parseFloat(e.target.value))}
          className="stroke-width-slider"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "24px",
            WebkitAppearance: "none",
            appearance: "none",
            background: "transparent",
            cursor: "pointer",
            margin: 0,
          }}
        />

        {/* Custom thumb */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: `${thumbPosition}%`,
            transform: "translate(-50%, -50%)",
            width: "22px",
            height: "22px",
            borderRadius: "50%",
            backgroundColor: "#fff",
            border: `2px solid ${theme === "light" ? "#ddd" : "#555"}`,
            boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
            pointerEvents: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Inner dot */}
          <div
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              backgroundColor: "#333",
            }}
          />
        </div>
      </div>
    </div>
  );
}
