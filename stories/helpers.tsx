import type { ReactNode } from "react";
import { createEmptyDrawingData } from "../canvas/src/types/drawingTypes";
import type {
  GitBackupChange,
  GitBackupCheckoutState,
  GitBackupClient,
  GitBackupCommitDiffEntry,
  GitBackupRestoreResult,
  GitBackupSnapshot,
} from "../git-client/git-backup/types";
import type { NodeTreeInput, SelectionState, TreeNode } from "../node-tree/src/types";
import type { Settings, SettingsKey } from "../settings";

export function StoryFrame({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex min-h-screen items-center justify-center p-8 ${className}`.trim()}>
      {children}
    </div>
  );
}

export function StorySurface({
  children,
  className = "",
  widthClassName = "max-w-3xl",
}: {
  children: ReactNode;
  className?: string;
  widthClassName?: string;
}) {
  return (
    <div
      className={`w-full ${widthClassName} rounded-3xl border border-white/10 bg-slate-950/75 p-6 shadow-[0_18px_48px_rgba(0,0,0,0.24)] ${className}`.trim()}
    >
      {children}
    </div>
  );
}

export const sampleMarkdown = `# Shared views

This story exercises the editor surface with:

- headings
- task lists
- tables

| Package | Role |
| --- | --- |
| react-ui | base UI system |
| react-components | higher-level views |

- [x] Build Storybook
- [ ] Publish release
`;

export const sampleNoteTitle = "Release checklist";

export const sampleCode = `export function greet(name: string) {
  return \`Hello, \${name}\`;
}

console.log(greet("Storybook"));`;

export function createSampleCanvasData() {
  const data = createEmptyDrawingData();

  data.strokes = [
    {
      id: "stroke-1",
      color: "#38bdf8",
      size: 8,
      isHighlighter: false,
      bounds: { minX: 120, minY: 120, maxX: 340, maxY: 240 },
      points: [
        { x: 120, y: 140, pressure: 0.6 },
        { x: 170, y: 125, pressure: 0.55 },
        { x: 220, y: 160, pressure: 0.58 },
        { x: 290, y: 210, pressure: 0.63 },
        { x: 340, y: 225, pressure: 0.5 },
      ],
    },
  ];

  data.shapes = [
    {
      id: "shape-1",
      kind: "rectangle",
      x1: 420,
      y1: 150,
      x2: 620,
      y2: 280,
      strokeColor: "#f97316",
      fillColor: "rgba(249,115,22,0.16)",
      strokeWidth: 4,
    },
    {
      id: "shape-2",
      kind: "text",
      x1: 170,
      y1: 320,
      x2: 420,
      y2: 360,
      strokeColor: "#f8fafc",
      strokeWidth: 1,
      text: "Design review notes",
      fontSize: 28,
      fontFamily: "JetBrains Mono",
      fontWeight: "600",
    },
  ];

  data.view = { x: 0, y: 0, scale: 1 };
  return data;
}

export const sampleTreeNodes: NodeTreeInput["nodes"] = [
  {
    id: "workspace",
    name: "workspace",
    type: "folder",
    children: [
      {
        id: "docs",
        name: "docs",
        type: "folder",
        children: [
          { id: "notes", name: "notes.md", type: "file" },
          { id: "ideas", name: "ideas.md", type: "file" },
        ],
      },
      {
        id: "assets",
        name: "assets",
        type: "folder",
        children: [{ id: "diagram", name: "diagram.png", type: "file" }],
      },
    ],
  },
];

export const sampleSelectionStates = new Map<string, SelectionState>([
  ["workspace", "indeterminate"],
  ["docs", "checked"],
  ["notes", "checked"],
  ["ideas", "unchecked"],
  ["assets", "unchecked"],
]);

export const sampleSettings: Partial<Settings> = {
  "sync.apiUrl": "https://study-sync.aryazos.ch/api",
  "sync.useLocalApi": false,
  "sync.autoConnect": true,
  "canvas.straightLineDetection": true,
  "git.repoUrl": "https://github.com/DotNaos/example-notes.git",
  "git.token": "ghp_example_token",
};

export const settingsCategories: Record<string, SettingsKey[]> = {
  sync: ["sync.apiUrl", "sync.useLocalApi", "sync.autoConnect"],
  canvas: ["canvas.straightLineDetection"],
  git: ["git.repoUrl", "git.token"],
};

export const settingsLabels = {
  sync: "Sync",
  canvas: "Canvas",
  git: "Backup",
};

function createBaseSnapshots(prefix: string): GitBackupSnapshot[] {
  const now = Date.now();

  return [
    {
      oid: `${prefix}-b4f1`,
      message: "Auto save before refactor",
      timestamp: now - 1000 * 60 * 90,
    },
    {
      oid: `${prefix}-d2c8`,
      message: "Polish drawing interactions",
      timestamp: now - 1000 * 60 * 30,
    },
  ];
}

type FakeState = {
  snapshots: GitBackupSnapshot[];
  backups: GitBackupSnapshot[];
  changes: GitBackupChange[];
  checkout: GitBackupCheckoutState;
};

export function createFakeGitClient(): GitBackupClient {
  const state: FakeState = {
    snapshots: createBaseSnapshots("snapshot"),
    backups: createBaseSnapshots("backup"),
    changes: [
      { filepath: "notes/release.md", status: "modified", name: "release", type: "markdown" },
      { filepath: "drawings/ux-map.ink", status: "added", name: "ux-map", type: "drawing" },
      { filepath: "docs/plan.md", status: "modified", name: "plan", type: "markdown" },
    ],
    checkout: { oid: null, isDetached: false },
  };

  const detachedDiff: GitBackupCommitDiffEntry[] = [
    { filepath: "notes/release.md", status: "modified" },
    { filepath: "drawings/ux-map.ink", status: "added" },
  ];

  return {
    async initRepo() {
      return;
    },
    async createSnapshot() {
      const oid = `snapshot-${Math.random().toString(16).slice(2, 8)}`;
      state.snapshots = [
        {
          oid,
          message: "Snapshot from Storybook",
          timestamp: Date.now(),
        },
        ...state.snapshots,
      ];
      return oid;
    },
    async getPendingSnapshots() {
      return state.snapshots;
    },
    async getCommitDiff() {
      return state.checkout.isDetached ? detachedDiff : [];
    },
    async getPendingChanges() {
      return state.changes;
    },
    async createBackup() {
      const next = state.snapshots[0];
      if (next) {
        state.backups = [next, ...state.backups];
      }
      return next?.oid ?? "backup-missing";
    },
    async pushBackup() {
      return;
    },
    async getBackups() {
      return state.backups;
    },
    async getCurrentCheckout() {
      return state.checkout;
    },
    async checkoutCommit(oid: string) {
      state.checkout = { oid, isDetached: true };
    },
    async restoreToLatest(): Promise<GitBackupRestoreResult> {
      state.checkout = { oid: null, isDetached: false };
      return { snapshotCreated: true, snapshotOid: state.snapshots[0]?.oid };
    },
    async restoreFromCommit(oid: string) {
      state.checkout = { oid, isDetached: true };
    },
  };
}

export function asTreeNode(id: string): TreeNode {
  return {
    id,
    name: id,
    type: "folder",
    children: [],
  };
}
