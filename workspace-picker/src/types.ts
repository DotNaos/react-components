/**
 * @aryazos/workspace-picker
 *
 * A generic folder/workspace picker component.
 * Pure view: no side effects, just renders and emits events.
 */

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/** A workspace/folder entry */
export interface Workspace {
    /** Unique identifier (typically the path) */
    id: string;
    /** Display name */
    name: string;
    /** Full path */
    path: string;
    /** Whether this is the currently active workspace */
    isActive?: boolean;
    /** Last opened timestamp */
    lastOpenedAt?: number | null;
}

/** Input for WorkspacePicker */
export interface WorkspacePickerInput {
    /** List of available workspaces */
    workspaces: Workspace[];
    /** Whether the list is loading */
    isLoading?: boolean;
}

/** Output events from WorkspacePicker */
export type WorkspacePickerOutput =
    | { type: 'select'; workspace: Workspace }
    | { type: 'browse' }
    | { type: 'create' }
    | { type: 'remove'; workspace: Workspace };

/** Handler props for the component */
export interface WorkspacePickerHandlers {
    onSelect: (workspace: Workspace) => void;
    onBrowse: () => void;
    onCreate?: () => void;
    onRemove?: (workspace: Workspace) => void;
}
