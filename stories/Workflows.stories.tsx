import type { Meta, StoryObj } from "@storybook/react-vite";
import { useMemo, useState } from "react";
import {
  GitClientShell as GitClientShellComponent,
  NodeTree as NodeTreeComponent,
  SettingsView as SettingsViewComponent,
  WorkspacePicker as WorkspacePickerComponent,
} from "../index";
import { type SelectionState, type TreeNode } from "../node-tree/src/types";
import {
  createFakeGitClient,
  sampleSelectionStates,
  sampleSettings,
  sampleTreeNodes,
  settingsCategories,
  settingsLabels,
  StoryFrame,
  StorySurface,
} from "./helpers";

const meta = {
  title: "React Components/Workflows",
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function GitClientShellExample() {
  const client = useMemo(() => createFakeGitClient(), []);

  return (
    <StoryFrame>
      <StorySurface widthClassName="max-w-7xl" className="overflow-hidden bg-background p-0">
        <div className="h-[720px]">
          <GitClientShellComponent
            client={client}
            notify={() => undefined}
            confirmRestore={() => true}
          />
        </div>
      </StorySurface>
    </StoryFrame>
  );
}

function NodeTreeExample() {
  const [selectedId, setSelectedId] = useState<string | undefined>("notes");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(["workspace", "docs"]),
  );
  const [selectionStates, setSelectionStates] =
    useState<Map<string, SelectionState>>(sampleSelectionStates);

  function toggleExpanded(node: TreeNode, expanded: boolean) {
    const next = new Set(expandedIds);
    if (expanded) next.add(node.id);
    else next.delete(node.id);
    setExpandedIds(next);
  }

  return (
    <StoryFrame>
      <StorySurface widthClassName="max-w-lg">
        <NodeTreeComponent
          input={{
            nodes: sampleTreeNodes,
            selectedId,
            expandedIds,
            selectionMode: "multi",
            selectionStates,
          }}
          handlers={{
            onSelect: (node) => setSelectedId(node?.id),
            onOpen: () => undefined,
            onExpand: (node, expanded) => toggleExpanded(node, expanded),
            onSelectionChange: (node, newState) => {
              setSelectionStates((prev) => {
                const next = new Map(prev);
                next.set(node.id, newState);
                return next;
              });
            },
          }}
        />
      </StorySurface>
    </StoryFrame>
  );
}

function SettingsViewExample() {
  const [settings, setSettings] = useState(sampleSettings);

  return (
    <StoryFrame>
      <StorySurface widthClassName="max-w-5xl">
        <SettingsViewComponent
          settings={settings}
          onChange={(key, value) => {
            setSettings((prev) => ({ ...prev, [key]: value }));
          }}
          categories={settingsCategories}
          categoryLabels={settingsLabels}
        />
      </StorySurface>
    </StoryFrame>
  );
}

export const GitClientShell: Story = {
  render: () => <GitClientShellExample />,
};

export const NodeTree: Story = {
  render: () => <NodeTreeExample />,
};

export const SettingsView: Story = {
  render: () => <SettingsViewExample />,
};

export const WorkspacePicker: Story = {
  render: () => (
    <StoryFrame>
      <StorySurface widthClassName="max-w-3xl" className="overflow-hidden bg-[var(--bg-0)] p-0">
        <div className="h-[560px]">
          <WorkspacePickerComponent
            input={{
              isLoading: false,
              workspaces: [
                {
                  id: "notes",
                  name: "Notes",
                  path: "/Users/oli/projects/notes",
                },
                {
                  id: "research",
                  name: "Research",
                  path: "/Users/oli/projects/research",
                },
              ],
            }}
            handlers={{
              onSelect: () => undefined,
              onBrowse: () => undefined,
              onCreate: () => undefined,
              onRemove: () => undefined,
            }}
          />
        </div>
      </StorySurface>
    </StoryFrame>
  ),
};
