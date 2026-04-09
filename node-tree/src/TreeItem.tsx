import { cn, FileIcon, Icon, Text } from "@dotnaos/react-ui";
import {
    Check,
    ChevronDown,
    ChevronRight,
    Folder,
    FolderOpen,
    Minus,
} from 'lucide-react';
import {
    useCallback,
    useRef,
    useState,
    type MouseEvent,
    type ReactElement,
} from 'react';
import { CreateInput, RenameInput } from './NodeInputs';
import {
    getNextSelectionState,
    type NodeTreeHandlers,
    type NodeType,
    type SelectionState,
    type TreeNode,
} from './types';

export interface TreeItemProps {
    node: TreeNode;
    depth: number;
    selectedId?: string;
    expandedIds: Set<string>;
    onToggleExpand: (nodeId: string) => void;
    handlers: NodeTreeHandlers;
    creatingIn?: string | null;
    creatingType?: NodeType;
    renamingId?: string;
    onStartRename: (nodeId: string) => void;
    onEndRename: () => void;
    onContextMenu: (e: MouseEvent, node: TreeNode) => void;
    // Selection mode props
    selectionMode?: 'none' | 'single' | 'multi';
    selectionStates?: Map<string, SelectionState>;
    setDropTargetId?: (id: string | null) => void;
    onDropComplete?: () => void;
    clipboard?: {
        items: string[];
        operation: 'copy' | 'cut';
    };
}

export function TreeItem({
    node,
    depth,
    selectedId,
    expandedIds,
    onToggleExpand,
    handlers,
    creatingIn,
    creatingType,
    renamingId,
    onStartRename,
    onEndRename,
    onContextMenu,
    selectionMode = 'none',
    selectionStates,
    setDropTargetId,
    onDropComplete,
    clipboard,
}: TreeItemProps): ReactElement {
    const isFolder = node.type === 'folder';
    const isExpanded = expandedIds.has(node.id);
    const isSelected = selectedId === node.id;
    const isCreatingHere = creatingIn === node.id;
    const isRenaming = renamingId === node.id;
    const selectionState = selectionStates?.get(node.id) ?? 'unchecked';
    const showCheckbox = selectionMode !== 'none';
    const [isDragOver, setIsDragOver] = useState(false);
    const expandTimer = useRef<NodeJS.Timeout | null>(null);

    const isCut =
        clipboard?.operation === 'cut' && clipboard.items.includes(node.id);

    const handleClick = useCallback(
        (event: MouseEvent) => {
            event.stopPropagation();
            handlers.onSelect?.(node);

            // Expand folder on click
            if (isFolder) {
                onToggleExpand(node.id);
                handlers.onExpand?.(node, !isExpanded);
            }

            handlers.onOpen(node);
        },
        [node, isFolder, isExpanded, onToggleExpand, handlers],
    );

    const handleChevronClick = useCallback(
        (event: MouseEvent) => {
            event.stopPropagation();
            if (isFolder) {
                onToggleExpand(node.id);
                handlers.onExpand?.(node, !isExpanded);
            }
        },
        [node, isFolder, isExpanded, onToggleExpand, handlers],
    );

    const handleContextMenu = useCallback(
        (event: MouseEvent) => {
            event.preventDefault();
            event.stopPropagation();
            handlers.onSelect?.(node);
            onContextMenu(event, node);
        },
        [node, handlers, onContextMenu],
    );

    const handleRenameConfirm = useCallback(
        (newName: string) => {
            handlers.onRename?.(node, newName);
            onEndRename();
        },
        [node, handlers, onEndRename],
    );

    // DnD Handlers
    const handleDragStart = useCallback(
        (e: React.DragEvent) => {
            if (!e.dataTransfer) return;
            e.dataTransfer.setData('node', JSON.stringify(node));
            e.dataTransfer.effectAllowed = 'move';
            e.stopPropagation();
        },
        [node],
    );

    const handleDragOver = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();

            // Highlight folder and notify parent
            if (isFolder) {
                if (!isDragOver) setIsDragOver(true);
                setDropTargetId?.(node.id);

                // Auto-expand timer
                if (!isExpanded && !expandTimer.current) {
                    expandTimer.current = setTimeout(() => {
                        onToggleExpand(node.id);
                        handlers.onExpand?.(node, true);
                    }, 800);
                }
            }
        },
        [
            isFolder,
            isDragOver,
            isExpanded,
            node.id,
            onToggleExpand,
            handlers,
            setDropTargetId,
        ],
    );

    const handleDragLeave = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragOver(false);
            setDropTargetId?.(null);

            if (expandTimer.current) {
                clearTimeout(expandTimer.current);
                expandTimer.current = null;
            }
        },
        [setDropTargetId],
    );

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragOver(false);
            setDropTargetId?.(null);
            onDropComplete?.();

            if (expandTimer.current) {
                clearTimeout(expandTimer.current);
                expandTimer.current = null;
            }

            if (!e.dataTransfer) return;
            try {
                const data = e.dataTransfer.getData('node');
                if (!data) return;
                const sourceNode = JSON.parse(data) as TreeNode;
                if (sourceNode.id !== node.id) {
                    handlers.onMove?.(sourceNode, node);
                }
            } catch (err) {
                console.error('Failed to parse dropped node', err);
            }
        },
        [node, handlers, setDropTargetId],
    );

    // If renaming this node, show rename input
    if (isRenaming) {
        return (
            <div>
                <RenameInput
                    node={node}
                    depth={depth}
                    onConfirm={handleRenameConfirm}
                    onCancel={onEndRename}
                />
                {/* Still show children if folder is expanded */}
                {isFolder && isExpanded && (
                    <div role="group">
                        {node.children.map((child) => (
                            <TreeItem
                                key={child.id}
                                node={child}
                                depth={depth + 1}
                                selectedId={selectedId}
                                expandedIds={expandedIds}
                                onToggleExpand={onToggleExpand}
                                handlers={handlers}
                                creatingIn={creatingIn}
                                creatingType={creatingType}
                                renamingId={renamingId}
                                onStartRename={onStartRename}
                                onEndRename={onEndRename}
                                onContextMenu={onContextMenu}
                                selectionMode={selectionMode}
                                selectionStates={selectionStates}
                                setDropTargetId={setDropTargetId}
                                onDropComplete={onDropComplete}
                                clipboard={clipboard}
                            />
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className={cn('relative', isCut && 'opacity-50')}>
            {/* Guide line for nesting */}
            {depth > 0 && (
                <div
                    className="absolute left-[3px] top-0 bottom-0 w-px bg-[var(--border)]/30"
                    style={{
                        left: `calc(var(--s-2) + ${(depth - 1) * 20}px + 7px)`,
                    }}
                />
            )}

            {/* Node Row */}
            <div
                data-node-id={node.id}
                role="treeitem"
                aria-selected={isSelected}
                aria-expanded={isFolder ? isExpanded : undefined}
                tabIndex={isSelected ? 0 : -1}
                draggable
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                    'flex items-center gap-1 px-3 py-1.5 cursor-pointer relative',
                    'transition-all duration-200 outline-none',
                    'hover:bg-[var(--bg-2)]',
                    isSelected && 'bg-[var(--text)]/5',
                    isDragOver && 'bg-[var(--accent)]/20 shadow-inner',
                    'select-none group mx-2 rounded-md',
                )}
                style={{ paddingLeft: `calc(var(--s-1) + ${depth * 20}px)` }}
                onClick={handleClick}
                onContextMenu={handleContextMenu}
            >
                {/* Selection Checkbox */}
                {showCheckbox && (
                    <div
                        className={cn(
                            'flex items-center justify-center w-4 h-4 rounded border cursor-pointer mr-1',
                            'transition-colors duration-150',
                            selectionState === 'checked' &&
                                'bg-[var(--accent)] border-[var(--accent)]',
                            selectionState === 'indeterminate' &&
                                'bg-[var(--bg-3)] border-[var(--border)]',
                            selectionState === 'unchecked' &&
                                'bg-transparent border-[var(--border)] hover:border-[var(--text)]/50',
                        )}
                        onClick={(e) => {
                            e.stopPropagation();
                            const nextState = getNextSelectionState(
                                selectionState,
                                selectionMode,
                            );
                            handlers.onSelectionChange?.(node, nextState);
                        }}
                    >
                        {selectionState === 'checked' && (
                            <Icon
                                name={Check as any}
                                size="s"
                                className="text-white"
                            />
                        )}
                        {selectionState === 'indeterminate' && (
                            <Icon
                                name={Minus as any}
                                size="s"
                                className="text-[var(--text)]/70"
                            />
                        )}
                    </div>
                )}

                {/* Chevron */}
                <div
                    className={cn(
                        'flex items-center justify-center w-5 h-5 rounded-md',
                        'transition-colors duration-200',
                        isFolder
                            ? 'text-[var(--text)]/40 group-hover:text-[var(--text)]'
                            : 'opacity-0',
                    )}
                    onClick={handleChevronClick}
                >
                    {isFolder &&
                        (isExpanded ? (
                            <Icon name={ChevronDown as any} size="s" />
                        ) : (
                            <Icon name={ChevronRight as any} size="s" />
                        ))}
                </div>

                {/* Icon */}
                <div
                    className={cn(
                        'flex items-center justify-center p-0.5 rounded-sm',
                        isSelected
                            ? 'text-[var(--text)]'
                            : 'text-[var(--text)]/70 group-hover:text-[var(--text)]',
                    )}
                >
                    {isFolder ? (
                        isExpanded ? (
                            // @ts-ignore
                            <Icon name={FolderOpen} size="m" color="inherit" />
                        ) : (
                            // @ts-ignore
                            <Icon name={Folder} size="m" color="inherit" />
                        )
                    ) : (
                        <FileIcon filename={node.name} size="m" />
                    )}
                </div>
                {/* Name */}
                <Text
                    size="s"
                    color="text"
                    weight={500}
                    className={cn(
                        'truncate flex-1 transition-all duration-200',
                        !isSelected && 'opacity-70 group-hover:opacity-100',
                    )}
                >
                    {node.name}
                </Text>
            </div>

            {/* Children + Inline Create Input */}
            {isFolder && isExpanded && (
                <div role="group">
                    {/* Inline create input at start of folder */}
                    {isCreatingHere && creatingType && (
                        <CreateInput
                            type={creatingType}
                            depth={depth + 1}
                            onConfirm={(name) =>
                                handlers.onCreateConfirm?.(name)
                            }
                            onCancel={() => handlers.onCreateCancel?.()}
                            showCheckbox={showCheckbox}
                        />
                    )}
                    {node.children.map((child) => (
                        <TreeItem
                            key={child.id}
                            node={child}
                            depth={depth + 1}
                            selectedId={selectedId}
                            expandedIds={expandedIds}
                            onToggleExpand={onToggleExpand}
                            handlers={handlers}
                            creatingIn={creatingIn}
                            creatingType={creatingType}
                            renamingId={renamingId}
                            onStartRename={onStartRename}
                            onEndRename={onEndRename}
                            onContextMenu={onContextMenu}
                            selectionMode={selectionMode}
                            selectionStates={selectionStates}
                            setDropTargetId={setDropTargetId}
                            onDropComplete={onDropComplete}
                            clipboard={clipboard}
                        />
                    ))}
                </div>
            )}

            {/* Show children container for empty folders when creating */}
            {isFolder && !isExpanded && isCreatingHere && creatingType && (
                <div role="group">
                    <CreateInput
                        type={creatingType}
                        depth={depth + 1}
                        onConfirm={(name) => handlers.onCreateConfirm?.(name)}
                        onCancel={() => handlers.onCreateCancel?.()}
                        showCheckbox={showCheckbox}
                    />
                </div>
            )}
        </div>
    );
}
