import type { Meta, StoryObj } from "@storybook/react-vite";
import { StoryCard, StoryGrid, StorySection } from "./helpers";

const meta = {
  title: "React Components/Overview",
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Inventory: Story = {
  render: () => (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-6 py-8">
      <section className="rounded-[36px] border border-white/10 bg-black/30 px-8 py-10 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <div className="space-y-4">
          <span className="inline-flex rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-emerald-200">
            DotNaos React Components
          </span>
          <h1 className="max-w-4xl text-5xl font-semibold tracking-tight text-white">
            Higher-level views, editors, and workflow surfaces
          </h1>
          <p className="max-w-2xl text-lg text-zinc-300">
            This Storybook collects the shared view layer on top of the base UI
            system, with live editors, document views, tree navigation, and
            backup workflows.
          </p>
        </div>
      </section>

      <StorySection
        title="Package areas"
        description="The catalog is split by the main surfaces exposed by the package."
      >
        <StoryGrid>
          <StoryCard
            title="Editors"
            description="Text, code, and note-editing surfaces."
          >
            <ul className="space-y-2 text-sm text-zinc-300">
              <li>CodeEditor</li>
              <li>RawEditorShell</li>
              <li>Editor</li>
              <li>NoteEditorShell</li>
            </ul>
          </StoryCard>

          <StoryCard
            title="Views"
            description="Ready-to-render views driven by input/output contracts."
          >
            <ul className="space-y-2 text-sm text-zinc-300">
              <li>calendarView</li>
              <li>canvasView</li>
              <li>markdownEditorView</li>
              <li>pdfView</li>
            </ul>
          </StoryCard>

          <StoryCard
            title="Workflow components"
            description="Reusable shells and data-oriented interfaces."
          >
            <ul className="space-y-2 text-sm text-zinc-300">
              <li>GitClientShell</li>
              <li>NodeTree</li>
              <li>SettingsView</li>
              <li>WorkspacePicker</li>
            </ul>
          </StoryCard>
        </StoryGrid>
      </StorySection>
    </div>
  ),
};
