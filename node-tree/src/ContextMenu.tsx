import { cn, Icon } from "@dotnaos/react-ui";
import {
    Clipboard,
    Copy,
    FilePlus,
    FolderPlus,
    Pencil,
    Scissors,
    Trash2,
} from 'lucide-react';
import { useEffect, useRef, type ReactElement } from 'react';
import type { TreeNode } from './types';

export interface ContextMenuProps {
    x: number;
    y: number;
    node: TreeNode;
    onClose: () => void;
    onRename: () => void;
    onDelete: () => void;
    onNewFile: () => void;
    onNewFolder: () => void;
    onCut: () => void;
    onCopy: () => void;
    onPaste: () => void;
    canPaste: boolean;
}

export function ContextMenu({
    x,
    y,
    node: _node,
    onClose,
    onRename,
    onDelete,
    onNewFile,
    onNewFolder,
    onCut,
    onCopy,
    onPaste,
    canPaste,
}: ContextMenuProps): ReactElement {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: globalThis.MouseEvent) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(e.target as Node)
            ) {
                onClose();
            }
        };
        const handleEscape = (e: globalThis.KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onClose]);

    const menuItems = [
        { label: 'New Note', icon: FilePlus, action: onNewFile, shortcut: '' },
        {
            label: 'New Folder',
            icon: FolderPlus,
            action: onNewFolder,
            shortcut: '',
        },
        { type: 'separator' as const },
        { label: 'Cut', icon: Scissors, action: onCut, shortcut: '⌘X' },
        { label: 'Copy', icon: Copy, action: onCopy, shortcut: '⌘C' },
        {
            label: 'Paste',
            icon: Clipboard,
            action: onPaste,
            shortcut: '⌘V',
            disabled: !canPaste,
        },
        { type: 'separator' as const },
        { label: 'Rename', icon: Pencil, action: onRename, shortcut: '' },
        {
            label: 'Delete',
            icon: Trash2,
            action: onDelete,
            shortcut: '⌘⌫',
            variant: 'destructive' as const,
        },
    ];

    return (
        <div
            ref={menuRef}
            className={cn(
                'fixed z-50 min-w-[180px] overflow-hidden rounded-xl',
                'border border-[var(--border)] bg-[var(--bg-1)]/80 shadow-2xl backdrop-blur-md',
                'animate-in fade-in-0 zoom-in-95 p-1.5',
            )}
            style={{ left: x, top: y }}
        >
            {menuItems.map((item, i) => {
                if (item.type === 'separator') {
                    return (
                        <div key={i} className="my-1 h-px bg-[var(--border)]" />
                    );
                }
                return (
                    <button
                        key={i}
                        onClick={() => {
                            if (!item.disabled) {
                                item.action();
                                onClose();
                            }
                        }}
                        disabled={item.disabled}
                        className={cn(
                            'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm',
                            'cursor-pointer outline-none transition-colors duration-150',
                            item.disabled
                                ? 'opacity-50 cursor-not-allowed text-[var(--text-muted)]'
                                : 'hover:bg-[var(--bg-2)]',
                            item.variant === 'destructive' &&
                                !item.disabled &&
                                'text-[var(--red-9)] hover:bg-[var(--red-3)]',
                        )}
                    >
                        <Icon name={item.icon as any} size="s" />
                        <span className="flex-1 text-left">{item.label}</span>
                        {item.shortcut && (
                            <span className="text-xs text-[var(--text-muted)]">
                                {item.shortcut}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
