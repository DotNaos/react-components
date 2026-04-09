/**
 * WorkspacePicker - Folder selection component
 *
 * A reusable component for selecting a folder/workspace.
 * Shows recent workspaces and allows browsing for new ones.
 */

import { Center, Heading, Icon, Stack, Text } from "@dotnaos/react-ui";
import { Button } from "@dotnaos/react-ui/shadcn";
import { BookOpen, Folder, FolderPlus, Trash2 } from 'lucide-react';
import type { MouseEvent, ReactElement } from 'react';
import type { WorkspacePickerHandlers, WorkspacePickerInput } from './types';

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export interface WorkspacePickerProps {
    input: WorkspacePickerInput;
    handlers: WorkspacePickerHandlers;
}

export function WorkspacePicker({
    input,
    handlers,
}: WorkspacePickerProps): ReactElement {
    const { workspaces, isLoading } = input;
    const { onSelect, onBrowse, onCreate, onRemove } = handlers;

    return (
        <Center className="flex-1 h-full bg-[var(--bg-0)] p-8 animate-in fade-in duration-500">
            <Stack gap={6} className="w-full max-w-[420px]">
                {/* Header */}
                <Stack gap={4} className="items-center text-center">
                    <div
                        className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-2xl shadow-purple-500/20"
                        style={{
                            background:
                                'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                        }}
                    >
                        <Icon
                            name={BookOpen as any}
                            size="l"
                            className="text-white"
                        />
                    </div>
                    <div className="space-y-1">
                        <Heading level={2}>Choose a folder</Heading>
                        <Text color="muted">
                            Select where your files are stored.
                        </Text>
                    </div>
                </Stack>

                <Stack gap={6}>
                    {/* Main Actions */}
                    <div className="grid grid-cols-2 gap-3">
                        <Button
                            variant="outline"
                            className="h-24 flex flex-col gap-2 hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition-all"
                            onClick={onBrowse}
                        >
                            <div className="p-2 rounded-full bg-[var(--bg-2)]">
                                <Icon name={Folder as any} size="s" />
                            </div>
                            <span>Open folder</span>
                        </Button>
                        {onCreate && (
                            <Button
                                variant="outline"
                                className="h-24 flex flex-col gap-2 hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition-all"
                                onClick={onCreate}
                            >
                                <div className="p-2 rounded-full bg-[var(--bg-2)]">
                                    <Icon name={FolderPlus as any} size="s" />
                                </div>
                                <span>Create new</span>
                            </Button>
                        )}
                    </div>

                    {/* Recent Workspaces */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <Text
                                size="s"
                                color="muted"
                                className="font-medium uppercase tracking-wider text-[11px]"
                            >
                                Recent Folders
                            </Text>
                        </div>

                        <div className="bg-[var(--bg-1)] rounded-xl border border-[var(--border)] overflow-hidden divide-y divide-[var(--border)]">
                            {workspaces.length === 0 ? (
                                <div className="p-8 text-center">
                                    <Text color="muted" size="s">
                                        {isLoading
                                            ? 'Loading…'
                                            : 'No recent folders yet.'}
                                    </Text>
                                </div>
                            ) : (
                                workspaces.map((ws) => (
                                    <div
                                        key={ws.id}
                                        onClick={() => onSelect(ws)}
                                        className="group flex items-center justify-between p-4 hover:bg-[var(--bg-2)] transition-colors cursor-pointer relative"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-8 h-8 rounded-lg bg-[var(--bg-2)] flex items-center justify-center text-[var(--text-muted)] group-hover:bg-[var(--bg-3)] group-hover:text-[var(--text)] transition-colors">
                                                <Icon
                                                    name={Folder as any}
                                                    size="s"
                                                />
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <Text
                                                    size="s"
                                                    className="font-medium truncate"
                                                >
                                                    {ws.name}
                                                </Text>
                                                <Text
                                                    size="s"
                                                    color="muted"
                                                    className="font-mono truncate opacity-60 group-hover:opacity-100 transition-opacity text-xs"
                                                >
                                                    {ws.path}
                                                </Text>
                                            </div>
                                        </div>

                                        {onRemove && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e: MouseEvent<HTMLButtonElement>) => {
                                                    e.stopPropagation();
                                                    onRemove(ws);
                                                }}
                                                disabled={isLoading}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-red-400 hover:text-red-500 hover:bg-red-500/10"
                                                title="Remove from list"
                                            >
                                                <Icon
                                                    name={Trash2 as any}
                                                    size="s"
                                                />
                                            </Button>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </Stack>
            </Stack>
        </Center>
    );
}
