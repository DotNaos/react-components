import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { CodeEditor } from "../code-editor/src/CodeEditor/CodeEditor";
import { RawEditorShell } from "../code-editor/src/RawEditor/RawEditorShell";
import { Editor } from "../markdown-editor/src/Editor";
import { NoteEditorShell } from "../markdown-editor/src/NoteEditor";
import {
  StoryCard,
  StoryGrid,
  StorySection,
  sampleCode,
  sampleMarkdown,
  sampleNoteTitle,
} from "./helpers";

const meta = {
  title: "React Components/Editors",
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function EditorsGallery() {
  const [code, setCode] = useState(sampleCode);
  const [markdown, setMarkdown] = useState(sampleMarkdown);
  const [noteTitle, setNoteTitle] = useState(sampleNoteTitle);
  const [noteContent, setNoteContent] = useState(sampleMarkdown);

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-6 py-8">
      <StorySection
        title="Editor surfaces"
        description="Interactive stories for the exported editing components."
      >
        <StoryGrid className="xl:grid-cols-2">
          <StoryCard
            title="CodeEditor"
            description="Monaco-backed code surface for structured text."
          >
            <CodeEditor
              value={code}
              onChange={setCode}
              language="typescript"
              height={360}
            />
          </StoryCard>

          <StoryCard
            title="RawEditorShell"
            description="Framed code editor with header actions and file context."
          >
            <div className="overflow-hidden rounded-2xl border border-white/10">
              <RawEditorShell
                title="release-plan"
                extension="ts"
                content={code}
                onContentChange={setCode}
                onCopy={() => navigator.clipboard.writeText(code)}
                onSave={() => undefined}
                onBack={() => undefined}
              />
            </div>
          </StoryCard>

          <StoryCard
            title="Editor"
            description="Markdown-first text editor with tables and task items."
          >
            <div className="rounded-2xl border border-white/10 bg-white p-6 text-slate-900">
              <Editor value={markdown} onChange={setMarkdown} />
            </div>
          </StoryCard>

          <StoryCard
            title="NoteEditorShell"
            description="Title and body editing combined into a note-focused shell."
          >
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white">
              <NoteEditorShell
                title={noteTitle}
                content={noteContent}
                isDirty
                onTitleChange={setNoteTitle}
                onContentChange={setNoteContent}
                onSave={() => undefined}
                onBack={() => undefined}
              />
            </div>
          </StoryCard>
        </StoryGrid>
      </StorySection>
    </div>
  );
}

export const Gallery: Story = {
  render: () => <EditorsGallery />,
};
