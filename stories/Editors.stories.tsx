import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import {
  CodeEditor as CodeEditorComponent,
  Editor as EditorComponent,
  NoteEditorShell as NoteEditorShellComponent,
  RawEditorShell as RawEditorShellComponent,
} from "../index";
import { sampleCode, sampleMarkdown, sampleNoteTitle, StoryFrame, StorySurface } from "./helpers";

const meta = {
  title: "React Components/Editors",
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function CodeEditorExample() {
  const [value, setValue] = useState(sampleCode);

  return (
    <StoryFrame>
      <StorySurface widthClassName="max-w-4xl">
        <CodeEditorComponent value={value} onChange={setValue} language="typescript" height={360} />
      </StorySurface>
    </StoryFrame>
  );
}

function RawEditorShellExample() {
  const [content, setContent] = useState(sampleCode);

  return (
    <StoryFrame>
      <StorySurface widthClassName="max-w-5xl" className="overflow-hidden p-0">
        <RawEditorShellComponent
          title="release-plan"
          extension="ts"
          content={content}
          onContentChange={setContent}
          onCopy={() => navigator.clipboard.writeText(content)}
          onSave={() => undefined}
          onBack={() => undefined}
        />
      </StorySurface>
    </StoryFrame>
  );
}

function EditorExample() {
  const [value, setValue] = useState(sampleMarkdown);

  return (
    <StoryFrame>
      <StorySurface widthClassName="max-w-4xl" className="bg-white text-slate-900">
        <EditorComponent value={value} onChange={setValue} />
      </StorySurface>
    </StoryFrame>
  );
}

function NoteEditorShellExample() {
  const [title, setTitle] = useState(sampleNoteTitle);
  const [content, setContent] = useState(sampleMarkdown);

  return (
    <StoryFrame>
      <StorySurface widthClassName="max-w-5xl" className="overflow-hidden bg-white p-0">
        <NoteEditorShellComponent
          title={title}
          content={content}
          isDirty
          onTitleChange={setTitle}
          onContentChange={setContent}
          onSave={() => undefined}
          onBack={() => undefined}
        />
      </StorySurface>
    </StoryFrame>
  );
}

export const CodeEditor: Story = {
  render: () => <CodeEditorExample />,
};

export const RawEditorShell: Story = {
  render: () => <RawEditorShellExample />,
};

export const Editor: Story = {
  render: () => <EditorExample />,
};

export const NoteEditorShell: Story = {
  render: () => <NoteEditorShellExample />,
};
