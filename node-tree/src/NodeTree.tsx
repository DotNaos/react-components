/**
 * NodeTree - Generic Tree Component
 *
 * A domain-agnostic tree view component.
 * Pure view: no side effects, just renders based on input and emits events.
 */

import { cn, Stack, Text } from "@dotnaos/react-ui";
import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type ReactElement,
} from 'react';
import { ContextMenu } from './ContextMenu';
import { CreateInput } from './NodeInputs';
import { TreeItem } from './TreeItem';
import type { NodeTreeHandlers, NodeTreeInput, TreeNode } from './types';
import { filterFoldersOnly, normalizeNodes } from './types';

// -----------------------------------------------------------------------------
// NodeTree Component
// -----------------------------------------------------------------------------

export interface NodeTreeProps {
    input: NodeTreeInput;
    handlers: NodeTreeHandlers;
    className?: string;
}

export function NodeTree({
    input,
    handlers,
    className,
}: NodeTreeProps): ReactElement {
    // Ref to track if tree has focus
    const treeRef = useRef<HTMLDivElement>(null);
    const [isFocused, setIsFocused] = useState(false);

    // Normalize input to TreeNode[] and optionally filter to folders only
    const rawNodes = normalizeNodes(input.nodes);
    const nodes = input.foldersOnly ? filterFoldersOnly(rawNodes) : rawNodes;

    // Internal expanded state (can be overridden by input.expandedIds)
    const [internalExpandedIds, setInternalExpandedIds] = useState<Set<string>>(
        () => new Set()
    );

    // Renaming state
    const [renamingId, setRenamingId] = useState<string | undefined>(undefined);

    // Context menu state
    const [contextMenu, setContextMenu] = useState<{
        x: number;
        y: number;
        node: TreeNode;
    } | null>(null);

    // Root DnD State
    const [isRootDragOver, setIsRootDragOver] = useState(false);
    const [dropTargetId, setDropTargetId] = useState<string | null>(null);

    // Use provided expandedIds or internal state
    const expandedIds = input.expandedIds ?? internalExpandedIds;

    const handleRootDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsRootDragOver(true);
    }, []);

    const handleRootDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        // Check if leaving the main container
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsRootDragOver(false);
        }
    }, []);

    const handleRootDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setIsRootDragOver(false);
            if (!e.dataTransfer) return;
            try {
                const data = e.dataTransfer.getData('node');
                if (!data) return;
                const sourceNode = JSON.parse(data) as TreeNode;
                handlers.onMove?.(sourceNode, null);
            } catch (err) {
                console.error('Failed to parse dropped node', err);
            }
        },
        [handlers]
    );

    const handleToggleExpand = useCallback(
        (nodeId: string) => {
            // Only update internal state if not controlled externally
            if (!input.expandedIds) {
                setInternalExpandedIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(nodeId)) {
                        next.delete(nodeId);
                    } else {
                        next.add(nodeId);
                    }
                    return next;
                });
            }
        },
        [input.expandedIds]
    );

    const handleContextMenu = useCallback(
        (e: React.MouseEvent, node: TreeNode) => {
            setContextMenu({ x: e.clientX, y: e.clientY, node });
        },
        []
    );

    const closeContextMenu = useCallback(() => {
        setContextMenu(null);
    }, []);

    // Keyboard handler for delete - only when tree is focused
    // Keyboard handler
    const handleKeyDown = useCallback(
        (e: globalThis.KeyboardEvent) => {
            if (!isFocused) return;

            // Deselect on Escape
            if (e.key === 'Escape') {
                e.preventDefault();
                handlers.onSelect?.(null);
                handlers.onClearClipboard?.();
                return;
            }

            // Commands below require command key (or simple checks)
            const isCmd = e.metaKey || e.ctrlKey;

            // Helper to find node and parent
            const searchNodes = (
                nodes: TreeNode[],
                id: string
            ): { node: TreeNode; parent: TreeNode | null } | null => {
                for (const node of nodes) {
                    if (node.id === id) return { node, parent: null };
                    if (node.children) {
                        const found = searchNodes(node.children, id);
                        if (found) {
                            return {
                                node: found.node,
                                parent: found.parent ?? node,
                            };
                        }
                    }
                }
                return null;
            };

            // Paste (can happen with or without selection)
            if (isCmd && e.key === 'v') {
                e.preventDefault();
                // If selection exists, paste into it (if folder) or parent
                // If no selection, paste into root
                if (!input.selectedId) {
                    handlers.onPaste?.(null);
                    return;
                }

                const found = searchNodes(nodes, input.selectedId);
                // If logical selection not found in rendered nodes (e.g. filtered out?), fallback to root
                if (!found) {
                    handlers.onPaste?.(null);
                    return;
                }
                const { node, parent } = found;
                const targetNode = node.type === 'folder' ? node : parent;
                handlers.onPaste?.(targetNode);
                return;
            }

            // Operations requiring selection
            if (!input.selectedId) return;

            const targetWrapper = searchNodes(nodes, input.selectedId);
            if (!targetWrapper) return;
            const { node } = targetWrapper;

            // Delete: Cmd+Backspace or Delete key
            if ((isCmd && e.key === 'Backspace') || e.key === 'Delete') {
                e.preventDefault();
                handlers.onDelete?.(node);
                return;
            }

            // Copy
            if (isCmd && e.key === 'c') {
                e.preventDefault();
                handlers.onCopy?.(node);
                return;
            }

            // Cut
            if (isCmd && e.key === 'x') {
                e.preventDefault();
                handlers.onCut?.(node);
                return;
            }
        },
        [isFocused, input.selectedId, nodes, handlers]
    );

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    // Show root-level create input
    const isCreatingAtRoot = input.creatingIn === null && input.creatingType;

    if (nodes.length === 0 && !isCreatingAtRoot) {
        return (
            <div className={cn('p-s-4 text-center', className)}>
                <Text size="s" color="muted">
                    No files
                </Text>
            </div>
        );
    }

    return (
        <div
            ref={treeRef}
            role="tree"
            className={cn(
                className,
                'h-full',
                isRootDragOver && !dropTargetId && 'bg-[var(--accent)]/10'
            )}
            tabIndex={-1}
            onFocus={() => setIsFocused(true)}
            onBlur={(e) => {
                // Only set unfocused if focus moved outside the tree
                if (!treeRef.current?.contains(e.relatedTarget as Node)) {
                    setIsFocused(false);
                }
            }}
            onClick={(e) => {
                // Deselect if clicking on the background (not swallowed by item)
                if (e.target === e.currentTarget) {
                    handlers.onSelect?.(null);
                }
            }}
            onDragOver={handleRootDragOver}
            onDragLeave={handleRootDragLeave}
            onDrop={handleRootDrop}
        >
            <Stack gap={1} className="py-s-1">
                {/* Root level create input */}
                {isCreatingAtRoot && input.creatingType && (
                    <CreateInput
                        type={input.creatingType}
                        depth={0}
                        onConfirm={(name) => handlers.onCreateConfirm?.(name)}
                        onCancel={() => handlers.onCreateCancel?.()}
                        showCheckbox={
                            input.selectionMode !== 'none' &&
                            input.selectionMode !== undefined
                        }
                    />
                )}
                {nodes.map((node: TreeNode) => (
                    <TreeItem
                        key={node.id}
                        node={node}
                        depth={0}
                        selectedId={input.selectedId}
                        expandedIds={expandedIds}
                        onToggleExpand={handleToggleExpand}
                        handlers={handlers}
                        creatingIn={input.creatingIn}
                        creatingType={input.creatingType}
                        renamingId={renamingId}
                        onStartRename={setRenamingId}
                        onEndRename={() => setRenamingId(undefined)}
                        onContextMenu={handleContextMenu}
                        selectionMode={input.selectionMode}
                        selectionStates={input.selectionStates}
                        setDropTargetId={setDropTargetId}
                        onDropComplete={() => {
                            setIsRootDragOver(false);
                            setDropTargetId(null);
                        }}
                        clipboard={input.clipboard}
                    />
                ))}
            </Stack>

            {/* Context Menu */}
            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    node={contextMenu.node}
                    onClose={closeContextMenu}
                    onRename={() => setRenamingId(contextMenu.node.id)}
                    onDelete={() => handlers.onDelete?.(contextMenu.node)}
                    onCut={() => {
                        handlers.onCut?.(contextMenu.node);
                        closeContextMenu();
                    }}
                    onCopy={() => {
                        handlers.onCopy?.(contextMenu.node);
                        closeContextMenu();
                    }}
                    onPaste={() => {
                        if (contextMenu.node.type === 'folder') {
                            handlers.onPaste?.(contextMenu.node);
                        }
                        closeContextMenu();
                    }}
                    canPaste={
                        (input.clipboard?.items?.length ?? 0) > 0 &&
                        contextMenu.node.type === 'folder'
                    }
                    onNewFile={() => {
                        handlers.onCreate?.(
                            contextMenu.node.type === 'folder'
                                ? contextMenu.node
                                : null,
                            'file'
                        );
                    }}
                    onNewFolder={() => {
                        handlers.onCreate?.(
                            contextMenu.node.type === 'folder'
                                ? contextMenu.node
                                : null,
                            'folder'
                        );
                    }}
                />
            )}
        </div>
    );
}
