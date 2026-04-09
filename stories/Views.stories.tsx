import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import {
  calendarView,
  canvasView,
  gitClientView,
  markdownEditorView,
  pdfView,
} from "../index";
import { createSampleCanvasData, sampleMarkdown, StoryFrame, StorySurface } from "./helpers";

const meta = {
  title: "React Components/Views",
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const CalendarView: Story = {
  render: () => (
    <StoryFrame>
      <StorySurface widthClassName="max-w-4xl" className="overflow-hidden p-0">
        <div className="h-96">
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
            () => undefined,
          )}
        </div>
      </StorySurface>
    </StoryFrame>
  ),
};

function CanvasViewExample() {
  const [canvasData, setCanvasData] = useState(createSampleCanvasData);

  return (
    <StoryFrame>
      <StorySurface widthClassName="max-w-6xl" className="overflow-hidden bg-zinc-950 p-0">
        <div className="h-[640px]">
          {canvasView.render(
            { data: canvasData, readOnly: false },
            (output) => {
              if (output.type === "change") {
                setCanvasData(output.payload);
              }
            },
          )}
        </div>
      </StorySurface>
    </StoryFrame>
  );
}

function MarkdownEditorViewExample() {
  const [content, setContent] = useState(sampleMarkdown);

  return (
    <StoryFrame>
      <StorySurface widthClassName="max-w-5xl" className="overflow-hidden bg-white p-0 text-slate-900">
        <div className="h-[560px]">
          {markdownEditorView.render(
            { content },
            (output) => {
              if (output.type === "change") {
                setContent(output.payload);
              }
            },
          )}
        </div>
      </StorySurface>
    </StoryFrame>
  );
}

export const CanvasView: Story = {
  render: () => <CanvasViewExample />,
};

export const MarkdownEditorView: Story = {
  render: () => <MarkdownEditorViewExample />,
};

export const PdfView: Story = {
  render: () => (
    <StoryFrame>
      <StorySurface widthClassName="max-w-5xl" className="overflow-hidden bg-zinc-950 p-0">
        <div className="h-[640px]">
          {pdfView.render({ data: "/sample.pdf", title: "Storybook sample PDF" }, () => undefined)}
        </div>
      </StorySurface>
    </StoryFrame>
  ),
};

function GitClientViewExample() {
  const [refreshCount, setRefreshCount] = useState(0);

  return (
    <StoryFrame>
      <StorySurface widthClassName="max-w-7xl" className="overflow-hidden bg-background p-0">
        <div className="h-[720px]">
          {gitClientView.render(
            {
              snapshots: [
                {
                  oid: "snapshot-a1",
                  message: "Auto save before refactor",
                  timestamp: Date.now() - 1000 * 60 * 60,
                },
              ],
              backups: [
                {
                  oid: "backup-a1",
                  message: "Remote backup",
                  timestamp: Date.now() - 1000 * 60 * 90,
                },
              ],
              changes: [
                { filepath: "notes/release.md", status: "modified", name: "release", type: "markdown" },
                { filepath: "drawings/ux-map.ink", status: "added", name: "ux-map", type: "drawing" },
              ],
              commitDiff: [],
              loading: false,
              refreshing: false,
              hasPendingBackup: true,
              currentCheckout: { oid: null, isDetached: false },
              headerTitle: `Backup & Restore ${refreshCount ? `(${refreshCount})` : ""}`.trim(),
            },
            (output) => {
              if (output.type === "refresh") {
                setRefreshCount((count) => count + 1);
              }
            },
          )}
        </div>
      </StorySurface>
    </StoryFrame>
  );
}

export const GitClientView: Story = {
  render: () => <GitClientViewExample />,
};
