import type { View } from "../../view";
import { CanvasEditor } from "./CanvasEditor";
import type { CanvasInput, CanvasOutput } from "./view/types";
import { CanvasInputSchema, CanvasOutputSchema } from "./view/types";

type CanvasViewComponentProps = {
  input: CanvasInput;
  onChange: (data: CanvasOutput["payload"]) => void;
};

function CanvasViewComponent({ input, onChange }: CanvasViewComponentProps) {
  return (
    <div className="relative h-full w-full">
      <CanvasEditor
        className="h-full w-full"
        initialData={input.data ?? undefined}
        readOnly={input.readOnly}
        onChange={onChange}
      />
    </div>
  );
}

export const canvasView: View<CanvasInput, CanvasOutput> = {
  name: "canvas",
  input: CanvasInputSchema,
  output: CanvasOutputSchema,
  render: (input, emit) => (
    <CanvasViewComponent
      input={input}
      onChange={(data) => emit({ type: "change", payload: data })}
    />
  ),
};
