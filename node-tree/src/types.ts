/**
 * @aryazos/node-tree - Generic Tree Component
 *
 * A domain-agnostic tree component for displaying hierarchical data.
 * Follows Block Architecture: pure view, no side effects.
 *
 * Supports two input formats:
 * - Flat: FlatNode[] with parentId references
 * - Nested: NestedNode[] with children arrays
 */

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/** Node type - only folder or file, nothing domain-specific */
export type NodeType = 'folder' | 'file';

/**
 * Flat node structure (with parentId)
 * Use this when your data comes from a flat source (e.g., database rows)
 */
export interface FlatNode {
    id: string;
    name: string;
    type: NodeType;
    /** null or undefined = root node */
    parentId?: string | null;
}

/**
 * Nested node structure (with children)
 * Use this when your data is already hierarchical
 */
export interface NestedNode {
    id: string;
    name: string;
    type: NodeType;
    children?: NestedNode[];
}

/** Internal normalized node (always nested for rendering) */
export interface TreeNode {
    id: string;
    name: string;
    type: NodeType;
    children: TreeNode[];
}

// -----------------------------------------------------------------------------
// Input/Output contracts
// -----------------------------------------------------------------------------

/** Selection state for a node (tri-state checkbox) */
export type SelectionState = 'unchecked' | 'checked' | 'indeterminate';

export interface NodeTreeInput {
    /** Nodes to display - can be flat (with parentId) or nested (with children) */
    nodes: FlatNode[] | NestedNode[];
    /** Currently selected node ID (for highlight/focus) */
    selectedId?: string;
    /** Expanded folder IDs (controlled mode) */
    expandedIds?: Set<string>;
    /** Parent folder ID where new item is being created (null = root) */
    creatingIn?: string | null;
    /** Type of item being created */
    creatingType?: NodeType;

    // --- Selection Mode ---
    /** Only show folders (hide files) */
    foldersOnly?: boolean;
    /** Enable checkbox selection: 'none' | 'single' | 'multi' */
    selectionMode?: 'none' | 'single' | 'multi';
    /** Selection states map (nodeId -> state) */
    selectionStates?: Map<string, SelectionState>;

    // --- Clipboard ---
    /** Currently copied/cut items (for visual feedback) */
    clipboard?: {
        items: string[];
        operation: 'copy' | 'cut';
    };
}

export type NodeTreeOutput =
    | { type: 'open'; node: TreeNode }
    | { type: 'create'; parent: TreeNode | null; nodeType: NodeType }
    | { type: 'rename'; node: TreeNode; newName: string }
    | { type: 'delete'; node: TreeNode }
    | { type: 'expand'; node: TreeNode; expanded: boolean }
    | { type: 'selection'; node: TreeNode; state: SelectionState }
    | { type: 'move'; node: TreeNode; target: TreeNode | null } // target null = root
    | { type: 'copy'; node: TreeNode }
    | { type: 'cut'; node: TreeNode }
    | { type: 'paste'; target: TreeNode | null }; // target null = root

// -----------------------------------------------------------------------------
// Handlers (for component props)
// -----------------------------------------------------------------------------

export interface NodeTreeHandlers {
    onSelect?: (node: TreeNode | null) => void;
    onOpen: (node: TreeNode) => void;
    onCreate?: (parent: TreeNode | null, nodeType: NodeType) => void;
    onRename?: (node: TreeNode, newName: string) => void;
    onDelete?: (node: TreeNode) => void;
    onExpand?: (node: TreeNode, expanded: boolean) => void;
    /** Called when inline creation is confirmed (user presses Enter) */
    onCreateConfirm?: (name: string) => void;
    /** Called when inline creation is cancelled (user presses Escape or blurs) */
    onCreateCancel?: () => void;
    /** Called when a node's checkbox selection state changes */
    onSelectionChange?: (node: TreeNode, newState: SelectionState) => void;

    // --- DnD & Clipboard ---
    onMove?: (node: TreeNode, target: TreeNode | null) => void;
    onCopy?: (node: TreeNode) => void;
    onCut?: (node: TreeNode) => void;
    onPaste?: (target: TreeNode | null) => void;
    onClearClipboard?: () => void;
}

// -----------------------------------------------------------------------------
// Utilities
// -----------------------------------------------------------------------------

/** Check if nodes are in flat format (have parentId field) */
function isFlatNodes(nodes: FlatNode[] | NestedNode[]): nodes is FlatNode[] {
    if (nodes.length === 0) return false;
    return 'parentId' in nodes[0];
}

/** Convert flat nodes to nested tree structure */
export function flatToNested(nodes: FlatNode[]): TreeNode[] {
    const map = new Map<string, TreeNode>();
    const roots: TreeNode[] = [];

    // First pass: create all nodes
    for (const node of nodes) {
        map.set(node.id, { ...node, children: [] });
    }

    // Second pass: build tree
    for (const node of nodes) {
        const treeNode = map.get(node.id)!;
        if (node.parentId == null) {
            roots.push(treeNode);
        } else {
            const parent = map.get(node.parentId);
            if (parent) {
                parent.children.push(treeNode);
            } else {
                // Orphan - treat as root
                roots.push(treeNode);
            }
        }
    }

    return roots;
}

/** Convert nested nodes to internal TreeNode format */
export function nestedToTree(nodes: NestedNode[]): TreeNode[] {
    return nodes.map((node) => ({
        id: node.id,
        name: node.name,
        type: node.type,
        children: node.children ? nestedToTree(node.children) : [],
    }));
}

/** Normalize input nodes to TreeNode[] */
export function normalizeNodes(nodes: FlatNode[] | NestedNode[]): TreeNode[] {
    if (nodes.length === 0) return [];
    if (isFlatNodes(nodes)) {
        return flatToNested(nodes);
    }
    return nestedToTree(nodes);
}

/** Filter tree to only include folders (recursively) */
export function filterFoldersOnly(nodes: TreeNode[]): TreeNode[] {
    return nodes
        .filter((node) => node.type === 'folder')
        .map((node) => ({
            ...node,
            children: filterFoldersOnly(node.children),
        }));
}

/**
 * Get next selection state when clicking a checkbox
 * Single mode: unchecked ↔ checked
 * Multi mode: unchecked → checked → indeterminate → unchecked
 */
export function getNextSelectionState(
    current: SelectionState,
    mode: 'single' | 'multi'
): SelectionState {
    if (mode === 'single') {
        return current === 'checked' ? 'unchecked' : 'checked';
    }
    // Multi mode: cycle through all three states
    switch (current) {
        case 'unchecked':
            return 'checked';
        case 'checked':
            return 'indeterminate';
        case 'indeterminate':
            return 'unchecked';
    }
}
