import { Editor } from "./Editor";
import type { View, ViewRenderProps } from "./types";
import {
    MarkdownInput,
    MarkdownInputSchema,
    MarkdownOutput,
    MarkdownOutputSchema,
} from "./types";

function MarkdownEditorView({ input, emit }: Readonly<ViewRenderProps<MarkdownInput, MarkdownOutput>>) {
  return (
    <div className="h-full w-full bg-bg-0 overflow-hidden flex flex-col">
      <div className="flex-1 overflow-auto relative">
        <Editor
          value={input.content}
          onChange={(newContent) => emit({ type: "change", payload: newContent })}
          onEvent={(event) => {
            if (event.type === "save") {
              emit({ type: "save", payload: input.content });
            }
          }}
          className="h-full min-h-[500px] max-w-3xl mx-auto py-8 px-8"
        />
      </div>
    </div>
  );
}

export const markdownEditorView: View<MarkdownInput, MarkdownOutput> = {
  name: "markdown-editor",
  input: MarkdownInputSchema,
  output: MarkdownOutputSchema,
  render: (input, emit) => <MarkdownEditorView input={input} emit={emit} />,
};
