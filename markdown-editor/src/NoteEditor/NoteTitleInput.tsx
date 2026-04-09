import type { ChangeEvent, KeyboardEvent, ReactElement } from "react";
import { useLayoutEffect, useRef } from "react";

interface NoteTitleInputProps {
    value: string;
    placeholder?: string;
    isLoading?: boolean;
    onChange: (value: string) => void;
    onBlur?: () => void;
    onArrowDown?: (cursorOffset: number) => void;
    onArrowRight?: () => void;
}

export function NoteTitleInput({
    value,
    placeholder = 'Title',
    isLoading = false,
    onChange,
    onBlur,
    onArrowDown,
    onArrowRight,
}: NoteTitleInputProps): ReactElement {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useLayoutEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
    }, [value]);

    const handleRename = (e: ChangeEvent<HTMLTextAreaElement>) => {
        onChange(e.target.value);
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const cursorPos = e.currentTarget.selectionStart ?? 0;
            onArrowDown?.(cursorPos);
        }

        if (e.key === 'ArrowRight') {
            const cursorPos = e.currentTarget.selectionStart ?? 0;
            const textLength = e.currentTarget.value.length;
            if (cursorPos >= textLength) {
                e.preventDefault();
                onArrowRight?.();
            }
        }
    };

    if (isLoading) {
        return <span className="text-muted-foreground">Loading...</span>;
    }

    return (
        <textarea
            ref={textareaRef}
            data-note-title="true"
            value={value}
            onChange={handleRename}
            onKeyDown={handleKeyDown}
            onBlur={onBlur}
            placeholder={placeholder}
            rows={1}
            className="text-[2.5rem] font-bold bg-transparent border-none outline-none focus:ring-0 w-full placeholder:text-muted-foreground/40 resize-none overflow-hidden"
        />
    );
}
