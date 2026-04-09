import { cn, Icon } from "@dotnaos/react-ui";
import { File, Folder } from 'lucide-react';
import {
    useEffect,
    useRef,
    useState,
    type KeyboardEvent,
    type ReactElement,
} from 'react';
import type { NodeType, TreeNode } from './types';

// -----------------------------------------------------------------------------
// CreateInput Component
// -----------------------------------------------------------------------------

export interface CreateInputProps {
    type: NodeType;
    depth: number;
    onConfirm: (name: string) => void;
    onCancel: () => void;
    showCheckbox?: boolean;
}

export function CreateInput({
    type,
    depth,
    onConfirm,
    onCancel,
    showCheckbox = false,
}: CreateInputProps): ReactElement {
    const [value, setValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && value.trim()) {
            const name =
                type === 'file' && !value.includes('.') ? `${value}.md` : value;
            onConfirm(name.trim());
        } else if (e.key === 'Escape') {
            onCancel();
        }
    };

    const handleBlur = () => {
        if (value.trim()) {
            const name =
                type === 'file' && !value.includes('.') ? `${value}.md` : value;
            onConfirm(name.trim());
        } else {
            onCancel();
        }
    };

    const NodeIcon = type === 'folder' ? Folder : File;

    return (
        <div
            className={cn(
                'flex items-center gap-1 px-3 py-1.5 mx-2 rounded-md',
                'bg-[var(--bg-2)] ring-1 ring-[var(--accent)]/30',
            )}
            style={{ paddingLeft: `calc(var(--s-1) + ${depth * 20}px)` }}
        >
            {/* Checkbox placeholder to align with tree items */}
            {showCheckbox && <div className="w-4 h-4 mr-1" />}

            {/* Chevron placeholder */}
            <div className="w-5 h-5" />

            {/* Folder/File icon */}
            <div className="flex items-center justify-center p-0.5">
                <Icon name={NodeIcon as any} size="m" color="muted" />
            </div>

            <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                placeholder={type === 'folder' ? 'folder name' : 'file name'}
                className={cn(
                    'flex-1 bg-transparent border-none outline-none',
                    'text-[var(--text)] text-sm font-medium',
                    'placeholder:text-[var(--text-muted)]',
                )}
            />
        </div>
    );
}

// -----------------------------------------------------------------------------
// RenameInput Component
// -----------------------------------------------------------------------------

export interface RenameInputProps {
    node: TreeNode;
    depth: number;
    onConfirm: (newName: string) => void;
    onCancel: () => void;
}

export function RenameInput({
    node,
    depth,
    onConfirm,
    onCancel,
}: RenameInputProps): ReactElement {
    const [value, setValue] = useState(node.name);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
    }, []);

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && value.trim()) {
            onConfirm(value.trim());
        } else if (e.key === 'Escape') {
            onCancel();
        }
    };

    const handleBlur = () => {
        if (value.trim() && value !== node.name) {
            onConfirm(value.trim());
        } else {
            onCancel();
        }
    };

    const isFolder = node.type === 'folder';
    const NodeIcon = isFolder ? Folder : File;

    return (
        <div
            className={cn(
                'flex items-center gap-2 px-3 py-1.5 mx-2 my-0.5 rounded-md',
                'bg-[var(--accent)]/10 ring-1 ring-[var(--accent)] shadow-sm',
            )}
            style={{ marginLeft: `calc(8px + ${depth * 20}px)` }}
        >
            <div className="w-5 h-5 text-[var(--accent)]" />
            <Icon name={NodeIcon as any} size="s" color="accent" />
            <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                className={cn(
                    'flex-1 bg-transparent border-none outline-none',
                    'text-[var(--text)] text-sm font-medium',
                )}
            />
        </div>
    );
}
