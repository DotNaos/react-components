import type { Meta, StoryObj } from "@storybook/react-vite";
import { useMemo, useState } from "react";
import { GitClientShell } from "../git-client";
import { NodeTree } from "../node-tree/src";
import { type SelectionState, type TreeNode } from "../node-tree/src/types";
import { SettingsView } from "../settings";
import { WorkspacePicker } from "../workspace-picker/src";
import {
  StoryCard,
  StoryGrid,
  StorySection,
  createFakeGitClient,
  sampleSelectionStates,
  sampleSettings,
  sampleTreeNodes,
  settingsCategories,
  settingsLabels,
} from "./helpers";

const meta = {
  title: "React Components/Workflows",
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function WorkflowsGallery() {
  const gitClient = useMemo(() => createFakeGitClient(), []);
  const [selectedId, setSelectedId] = useState<string | undefined>("notes");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(["workspace", "docs"]),
  );
  const [selectionStates, setSelectionStates] =
    useState<Map<string, SelectionState>>(sampleSelectionStates);
  const [settings, setSettings] = useState(sampleSettings);
  const [lastAction, setLastAction] = useState("Idle");

  function toggleExpanded(node: TreeNode, expanded: boolean) {
    const next = new Set(expandedIds);
    if (expanded) {
      next.add(node.id);
    } else {
      next.delete(node.id);
    }
    setExpandedIds(next);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-6 py-8">
      <StorySection
        title="Workflow surfaces"
        description="These stories cover the higher-level components that tie data, navigation, and actions together."
      >
        <StoryGrid className="xl:grid-cols-2">
          <StoryCard
            title="GitClientShell"
            description="Backup and restore shell driven by a deterministic in-memory client."
            className="xl:col-span-2"
          >
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-background">
              <GitClientShell
                client={gitClient}
                notify={({ type, message }) =>
                  setLastAction(`${type.toUpperCase()}: ${message}`)
                }
                confirmRestore={() => true}
              />
            </div>
          </StoryCard>

          <StoryCard
            title="NodeTree"
            description="Hierarchical navigator with selection, expansion, and keyboard support."
          >
            <div className="rounded-2xl border border-white/10 bg-slate-950 p-3">
              <NodeTree
                input={{
                  nodes: sampleTreeNodes,
                  selectedId,
                  expandedIds,
                  selectionMode: "multi",
                  selectionStates,
                }}
                handlers={{
                  onSelect: (node) => {
                    setSelectedId(node?.id);
                    setLastAction(node ? `Selected ${node.name}` : "Selection cleared");
                  },
                  onOpen: (node) => setLastAction(`Opened ${node.name}`),
                  onExpand: (node, expanded) => toggleExpanded(node, expanded),
                  onSelectionChange: (node, newState) => {
                    setSelectionStates((prev) => {
                      const next = new Map(prev);
                      next.set(node.id, newState);
                      return next;
                    });
                    setLastAction(`Selection ${node.name}: ${newState}`);
                  },
                }}
              />
            </div>
          </StoryCard>

          <StoryCard
            title="WorkspacePicker"
            description="Folder selection surface with recent workspaces and primary actions."
          >
            <div className="h-[520px] overflow-hidden rounded-2xl border border-white/10 bg-[var(--bg-0)]">
              <WorkspacePicker
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
                  onSelect: (workspace) =>
                    setLastAction(`Selected workspace ${workspace.name}`),
                  onBrowse: () => setLastAction("Browse action"),
                  onCreate: () => setLastAction("Create action"),
                  onRemove: (workspace) =>
                    setLastAction(`Removed ${workspace.name}`),
                }}
              />
            </div>
          </StoryCard>

          <StoryCard
            title="SettingsView"
            description="Generated settings surface backed by the local registry."
            className="xl:col-span-2"
          >
            <div className="rounded-2xl border border-white/10 bg-[var(--bg-0)] p-4">
              <SettingsView
                settings={settings}
                onChange={(key, value) => {
                  setSettings((prev) => ({ ...prev, [key]: value }));
                  setLastAction(`Changed ${key}`);
                }}
                categories={settingsCategories}
                categoryLabels={settingsLabels}
              />
            </div>
          </StoryCard>

          <StoryCard
            title="Diagnostics"
            description="Runtime action log used for validation."
          >
            <div className="rounded-2xl border border-emerald-300/10 bg-emerald-500/5 p-4 text-sm text-emerald-100">
              <pre className="whitespace-pre-wrap font-mono">{lastAction}</pre>
            </div>
          </StoryCard>
        </StoryGrid>
      </StorySection>
    </div>
  );
}

export const Gallery: Story = {
  render: () => <WorkflowsGallery />,
};
