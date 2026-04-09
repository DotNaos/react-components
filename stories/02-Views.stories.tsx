import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { calendarView } from "../calendar/src";
import { canvasView } from "../canvas/src";
import { markdownEditorView } from "../markdown-editor/src";
import { pdfView } from "../pdf-viewer/src";
import { StoryCard, StoryGrid, StorySection, createSampleCanvasData, sampleMarkdown } from "./helpers";

const meta = {
  title: "React Components/Views",
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function ViewsGallery() {
  const [canvasData, setCanvasData] = useState(createSampleCanvasData);
  const [markdownContent, setMarkdownContent] = useState(sampleMarkdown);
  const [lastEvent, setLastEvent] = useState("No events yet");

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-6 py-8">
      <StorySection
        title="Contract-driven views"
        description="These stories render the exported view objects directly, the same way a host app would."
      >
        <StoryGrid className="xl:grid-cols-2">
          <StoryCard
            title="calendarView"
            description="Current placeholder rendering for the calendar contract."
          >
            <div className="h-[320px] overflow-hidden rounded-2xl border border-white/10 bg-white text-slate-900">
              {calendarView.render(
                {
                  events: [
                    {
                      id: "kickoff",
                      title: "Kickoff",
                      start: new Date("2026-04-09T09:00:00Z"),
                      end: new Date("2026-04-09T10:00:00Z"),
                    },
                  ],
                },
                (output) => setLastEvent(JSON.stringify(output)),
              )}
            </div>
          </StoryCard>

          <StoryCard
            title="markdownEditorView"
            description="View wrapper around the markdown editor contract."
          >
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white text-slate-900">
              <div className="h-[420px]">
                {markdownEditorView.render(
                  { content: markdownContent },
                  (output) => {
                    setLastEvent(JSON.stringify(output));
                    if (output.type === "change") {
                      setMarkdownContent(output.payload);
                    }
                  },
                )}
              </div>
            </div>
          </StoryCard>

          <StoryCard
            title="canvasView"
            description="Interactive canvas contract for sketches and shape-based annotations."
            className="xl:col-span-2"
          >
            <div className="h-[620px] overflow-hidden rounded-2xl border border-white/10 bg-zinc-950">
              {canvasView.render(
                {
                  data: canvasData,
                  readOnly: false,
                },
                (output) => {
                  setLastEvent(output.type);
                  if (output.type === "change") {
                    setCanvasData(output.payload);
                  }
                },
              )}
            </div>
          </StoryCard>

          <StoryCard
            title="pdfView"
            description="PDF viewer contract backed by a local sample document and worker."
          >
            <div className="h-[520px] overflow-hidden rounded-2xl border border-white/10 bg-zinc-950">
              {pdfView.render(
                { data: "/sample.pdf", title: "Storybook sample PDF" },
                (output) => setLastEvent(JSON.stringify(output)),
              )}
            </div>
          </StoryCard>

          <StoryCard
            title="Event stream"
            description="Small diagnostic panel so emitted view outputs are observable during validation."
          >
            <div className="rounded-2xl border border-emerald-300/10 bg-emerald-500/5 p-4 text-sm text-emerald-100">
              <pre className="whitespace-pre-wrap font-mono">{lastEvent}</pre>
            </div>
          </StoryCard>
        </StoryGrid>
      </StorySection>
    </div>
  );
}

export const Gallery: Story = {
  render: () => <ViewsGallery />,
};
