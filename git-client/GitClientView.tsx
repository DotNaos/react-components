import {
  ArrowLeft,
  Check,
  CloudOff,
  CloudUpload,
  FileX,
  Inbox,
  RefreshCw,
  RotateCcw,
  Save,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, Button } from "@dotnaos/react-ui/shadcn";

import { FileItem } from "./components/FileItem";
import { TimelineList } from "./components/TimelineList";
import type { GitClientInput, GitClientOutput, View, ViewRenderProps } from "./types";
import { GitClientInputSchema, GitClientOutputSchema } from "./types";

function resolveChangeType(filepath: string) {
  if (filepath.endsWith(".ink")) return "drawing";
  if (filepath.endsWith(".pdf")) return "pdf";
  if (filepath.endsWith(".md")) return "markdown";
  return undefined;
}

function GitClientView({ input, emit }: Readonly<ViewRenderProps<GitClientInput, GitClientOutput>>) {
  const {
    snapshots,
    backups,
    changes,
    commitDiff,
    loading,
    refreshing,
    hasPendingBackup,
    currentCheckout,
    headerTitle,
    className,
  } = input;

  const isInCheckoutMode = currentCheckout.isDetached;
  const filteredChanges = changes.filter(
    (change) =>
      !change.filepath.endsWith(".yaml") &&
      !change.filepath.endsWith(".yml") &&
      change.type !== "folder"
  );

  const rootClassName = ["h-full flex flex-col overflow-hidden bg-background", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClassName}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">{headerTitle ?? "Backup & Restore"}</h1>
          {isInCheckoutMode && (
            <span
              className="px-2 py-1 text-xs bg-yellow-500/20 text-yellow-600 border border-yellow-500/30"
              title="You are viewing an older version. Changes are read-only until you return to the latest."
            >
              Older version (read-only)
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => emit({ type: "refresh", payload: { showToast: true } })}
          disabled={refreshing || loading}
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-[1fr_48px_1fr_320px] divide-x divide-border">
        <div className="flex flex-col min-h-0">
          <div className="h-14 flex items-center justify-between px-4 border-b border-border bg-muted/5">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Cloud backups</h2>
            <Button
              onClick={() => emit({ type: "push-backup" })}
              disabled={loading || !hasPendingBackup || isInCheckoutMode}
              size="sm"
              variant={hasPendingBackup ? "default" : "outline"}
              className={`${
                hasPendingBackup && !isInCheckoutMode ? "bg-green-600 hover:bg-green-700 text-white" : ""
              } h-8 text-xs px-3 rounded-none`}
              title="Upload your latest backup to the cloud"
            >
              <CloudUpload className="w-3.5 h-3.5 mr-1.5" />
              Upload
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-0">
            <TimelineList
              items={backups}
              currentOid={currentCheckout.oid}
              loading={loading}
              emptyIcon={<CloudOff className="w-12 h-12" />}
              emptyLabel="No remote backups found"
              onCheckout={(oid) => emit({ type: "checkout", payload: { oid } })}
              onRestore={(oid) => emit({ type: "restore", payload: { oid } })}
            />
          </div>
        </div>

        <div className="flex flex-col items-center bg-muted/5">
          <Button
            variant="ghost"
            className="h-full w-full rounded-none hover:bg-accent border-none p-0 flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground"
            disabled={loading || snapshots.length === 0 || isInCheckoutMode}
            onClick={() => emit({ type: "create-backup" })}
            title="Combine snapshots into backup"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex flex-col min-h-0">
          <div className="h-14 flex items-center justify-between px-4 border-b border-border bg-muted/5">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Local snapshots</h2>
            {isInCheckoutMode ? (
              <Button
                onClick={() => emit({ type: "restore-latest" })}
                disabled={loading}
                size="sm"
                variant="default"
                className="h-8 text-xs px-3 rounded-none"
                title="Return to the most recent version"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Latest
              </Button>
            ) : (
              <Button
                onClick={() => emit({ type: "create-snapshot" })}
                disabled={loading}
                size="sm"
                variant="secondary"
                className="h-8 text-xs px-3 rounded-none"
                title="Save a snapshot of your notes"
              >
                <Save className="w-3.5 h-3.5 mr-1.5" />
                Snapshot
              </Button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-0">
            <TimelineList
              items={snapshots}
              currentOid={currentCheckout.oid}
              loading={loading}
              emptyIcon={<Inbox className="w-12 h-12" />}
              emptyLabel="No pending snapshots"
              onCheckout={(oid) => emit({ type: "checkout", payload: { oid } })}
              onRestore={(oid) => emit({ type: "restore", payload: { oid } })}
            />
          </div>
        </div>

        <div className="flex flex-col min-h-0">
          <div className="h-14 flex items-center px-4 border-b border-border bg-muted/5">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Current changes</h2>
            {filteredChanges.length > 0 && (
              <span className="ml-2 text-xs bg-muted-foreground/10 text-muted-foreground px-1.5 py-0.5 rounded-none font-mono">
                {filteredChanges.length}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-0">
            <Accordion type="multiple" defaultValue={["changes"]} className="flex flex-col gap-0">
              <AccordionItem value="changes" className="border-none">
                <AccordionContent className="pt-0 pb-0">
                  {filteredChanges.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground/50 gap-2 min-h-[100px] py-8">
                      <Check className="w-8 h-8 opacity-20" />
                      <span className="text-sm font-medium">No pending changes</span>
                    </div>
                  ) : (
                    <ul>
                      {filteredChanges.map((change) => (
                        <FileItem
                          key={change.filepath}
                          filepath={change.filepath}
                          status={change.status}
                          name={change.name}
                          type={change.type}
                        />
                      ))}
                    </ul>
                  )}
                </AccordionContent>
              </AccordionItem>

              {isInCheckoutMode && (
                <AccordionItem value="checkout" className="border-none mt-0 border-t border-border">
                  <div className="h-10 flex items-center gap-2 px-4 bg-muted/5 border-b border-border">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Opened version
                    </span>
                    {commitDiff.length > 0 && (
                      <span className="text-xs bg-muted-foreground/10 text-muted-foreground px-1.5 py-0.5 rounded-none font-mono">
                        {commitDiff.length}
                      </span>
                    )}
                  </div>
                  <AccordionContent className="pt-0 pb-0">
                    {commitDiff.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-muted-foreground/50 gap-2 min-h-[100px] py-8">
                        <FileX className="w-8 h-8 opacity-20" />
                        <span className="text-sm font-medium">No changes in this version</span>
                      </div>
                    ) : (
                      <ul>
                        {commitDiff.map((change) => (
                          <FileItem
                            key={`diff-${change.filepath}`}
                            filepath={change.filepath}
                            status={change.status}
                            type={resolveChangeType(change.filepath)}
                          />
                        ))}
                      </ul>
                    )}
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          </div>
        </div>
      </div>
    </div>
  );
}

export const gitClientView: View<GitClientInput, GitClientOutput> = {
  name: "git-client",
  input: GitClientInputSchema,
  output: GitClientOutputSchema,
  render: (input, emit) => <GitClientView input={input} emit={emit} />,
};
