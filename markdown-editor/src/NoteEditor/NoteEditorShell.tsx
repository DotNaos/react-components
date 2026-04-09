import { ArrowLeft } from "lucide-react";
import type { ReactElement, MouseEvent as ReactMouseEvent, ReactNode } from "react";
import { useCallback } from "react";
import { Editor, type EditorEvent } from "../Editor";
import { NoteSaveAction } from "./NoteSaveAction";
import { NoteTitleInput } from "./NoteTitleInput";

interface NoteEditorShellProps {
    title: string;
    content: string;
    isDirty?: boolean;
    isLoading?: boolean;
    hasExternalChanges?: boolean;
    titlePlaceholder?: string;
    editorPlaceholder?: string;
    onTitleChange: (value: string) => void;
    onTitleBlur?: () => void;
    onContentChange: (value: string) => void;
    onSave?: () => void;
    onBack?: () => void;
    onAcceptExternalChanges?: () => void;
    onDiscardExternalChanges?: () => void;
    headerLeftSlot?: ReactNode;
    headerRightSlot?: ReactNode;
    topSlot?: ReactNode;
    className?: string;
}

function getTitleInput(): HTMLTextAreaElement | null {
    return document.querySelector("textarea[data-note-title='true']");
}

function getEditorElement(): HTMLElement | null {
    return document.querySelector('.ProseMirror');
}

export function NoteEditorShell({
    title,
    content,
    isDirty = false,
    isLoading = false,
    hasExternalChanges = false,
    titlePlaceholder = 'Title',
    editorPlaceholder = "Write something, or type '/' for commands...",
    onTitleChange,
    onTitleBlur,
    onContentChange,
    onSave,
    onBack,
    onAcceptExternalChanges,
    onDiscardExternalChanges,
    headerLeftSlot,
    headerRightSlot,
    topSlot,
    className,
}: NoteEditorShellProps): ReactElement {
    const focusTitleAt = useCallback((cursorOffset?: number) => {
        const titleInput = getTitleInput();
        if (!titleInput) return;
        titleInput.focus();
        const length = titleInput.value.length;
        const pos =
            cursorOffset === undefined
                ? length
                : Math.min(cursorOffset, length);
        titleInput.setSelectionRange(pos, pos);
    }, []);

    const focusEditorAtStart = useCallback(() => {
        const editorEl = getEditorElement();
        if (!editorEl) return;
        editorEl.focus();
        const selection = window.getSelection();
        const firstTextNode = editorEl.querySelector(
            'p, h1, h2, h3, h4, h5, h6'
        )?.firstChild;
        if (selection && firstTextNode) {
            const range = document.createRange();
            range.setStart(firstTextNode, 0);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
        }
    }, []);

    const focusEditorAtOffset = useCallback((cursorOffset: number) => {
        const editorEl = getEditorElement();
        if (!editorEl) return;
        editorEl.focus();
        const selection = window.getSelection();
        const firstTextNode = editorEl.querySelector(
            'p, h1, h2, h3, h4, h5, h6'
        )?.firstChild;
        if (selection && firstTextNode) {
            const maxPos = firstTextNode.textContent?.length ?? 0;
            const pos = Math.min(cursorOffset, maxPos);
            const range = document.createRange();
            range.setStart(firstTextNode, pos);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
        }
    }, []);

    const handleTitleArrowDown = useCallback(
        (cursorOffset: number) => {
            focusEditorAtOffset(cursorOffset);
        },
        [focusEditorAtOffset]
    );

    const handleTitleArrowRight = useCallback(() => {
        focusEditorAtStart();
    }, [focusEditorAtStart]);

    const handleEditorEvent = useCallback(
        (event: EditorEvent) => {
            if (event.type === 'save') {
                onSave?.();
                return;
            }

            if (event.type === 'boundary' && event.direction === 'up') {
                focusTitleAt();
            }

            if (event.type === 'boundary' && event.direction === 'left') {
                focusTitleAt();
            }
        },
        [focusTitleAt, onSave]
    );

    const handleContainerMouseDown = useCallback(
        (e: ReactMouseEvent<HTMLDivElement>) => {
            const target = e.target as HTMLElement;
            const isInTitle =
                target.closest("textarea[data-note-title='true']") ||
                target.tagName === 'TEXTAREA';
            const isInEditor = Boolean(target.closest('.ProseMirror'));

            if (isInTitle || isInEditor) return;

            e.preventDefault();

            const titleInput = getTitleInput();
            const editorEl = getEditorElement();
            if (!titleInput || !editorEl) return;

            const clickX = e.clientX;
            const clickY = e.clientY;

            const titleRect = titleInput.getBoundingClientRect();
            const titleCenterY = titleRect.top + titleRect.height / 2;
            const distanceToTitle = Math.abs(clickY - titleCenterY);

            const blocks = editorEl.querySelectorAll(
                'p, h1, h2, h3, h4, h5, h6, pre, blockquote, ul, ol'
            );

            let nearestBlock: Element | null = null;
            let minDistanceToBlock = Infinity;

            for (const block of blocks) {
                const rect = block.getBoundingClientRect();
                const blockCenterY = rect.top + rect.height / 2;
                const distance = Math.abs(clickY - blockCenterY);

                if (distance < minDistanceToBlock) {
                    minDistanceToBlock = distance;
                    nearestBlock = block;
                }
            }

            if (!nearestBlock && blocks.length > 0) {
                nearestBlock = blocks[blocks.length - 1];
                const rect = nearestBlock.getBoundingClientRect();
                minDistanceToBlock = Math.abs(
                    clickY - (rect.top + rect.height / 2)
                );
            }

            if (!nearestBlock) {
                nearestBlock = editorEl.querySelector(
                    'p, h1, h2, h3, h4, h5, h6'
                );
                if (nearestBlock) {
                    const rect = nearestBlock.getBoundingClientRect();
                    minDistanceToBlock = Math.abs(
                        clickY - (rect.top + rect.height / 2)
                    );
                }
            }

            if (distanceToTitle < minDistanceToBlock) {
                titleInput.focus();

                const titleText = titleInput.value;
                if (titleText.length > 0) {
                    const inputStyles = window.getComputedStyle(titleInput);
                    const paddingLeft =
                        parseFloat(inputStyles.paddingLeft) || 0;
                    const borderLeft =
                        parseFloat(inputStyles.borderLeftWidth) || 0;
                    const textStartX =
                        titleRect.left + paddingLeft + borderLeft;

                    if (clickX <= textStartX) {
                        titleInput.setSelectionRange(0, 0);
                    } else {
                        const tempSpan = document.createElement('span');
                        tempSpan.style.font = inputStyles.font;
                        tempSpan.style.fontSize = inputStyles.fontSize;
                        tempSpan.style.fontFamily = inputStyles.fontFamily;
                        tempSpan.style.fontWeight = inputStyles.fontWeight;
                        tempSpan.style.fontStyle = inputStyles.fontStyle;
                        tempSpan.style.letterSpacing =
                            inputStyles.letterSpacing;
                        tempSpan.style.textTransform =
                            inputStyles.textTransform;
                        tempSpan.style.position = 'absolute';
                        tempSpan.style.visibility = 'hidden';
                        tempSpan.style.whiteSpace = 'pre';
                        document.body.appendChild(tempSpan);

                        const relativeX = clickX - textStartX;
                        let bestPos = titleText.length;

                        for (let i = 0; i <= titleText.length; i++) {
                            tempSpan.textContent = titleText.substring(0, i);
                            const width =
                                tempSpan.getBoundingClientRect().width;

                            if (width >= relativeX) {
                                if (i > 0) {
                                    tempSpan.textContent = titleText.substring(
                                        0,
                                        i - 1
                                    );
                                    const prevWidth =
                                        tempSpan.getBoundingClientRect().width;
                                    bestPos =
                                        relativeX - prevWidth <
                                        width - relativeX
                                            ? i - 1
                                            : i;
                                } else {
                                    bestPos = 0;
                                }
                                break;
                            }
                        }

                        document.body.removeChild(tempSpan);
                        titleInput.setSelectionRange(bestPos, bestPos);
                    }
                } else {
                    titleInput.setSelectionRange(0, 0);
                }
            } else {
                const blockRect = nearestBlock?.getBoundingClientRect();

                if (nearestBlock && blockRect && document.caretRangeFromPoint) {
                    const projectedY = blockRect.top + blockRect.height / 2;
                    const caretRange = document.caretRangeFromPoint(
                        clickX,
                        projectedY
                    );

                    editorEl.focus();

                    if (caretRange) {
                        requestAnimationFrame(() => {
                            const selection = window.getSelection();
                            selection?.removeAllRanges();
                            selection?.addRange(caretRange.cloneRange());
                        });
                    }
                } else if (nearestBlock) {
                    editorEl.focus();
                    const textNode = nearestBlock.firstChild;
                    if (textNode) {
                        requestAnimationFrame(() => {
                            const selection = window.getSelection();
                            const range = document.createRange();
                            range.setStart(textNode, 0);
                            range.collapse(true);
                            selection?.removeAllRanges();
                            selection?.addRange(range);
                        });
                    }
                }
            }
        },
        []
    );

    return (
        <div
            className={`flex flex-col w-full h-full bg-muted/30 ${className ?? ''}`}
        >
            {hasExternalChanges && (
                <div className="flex items-center justify-between px-4 py-2 bg-amber-500/10 border-b border-amber-500/30 text-amber-600 dark:text-amber-400">
                    <span className="text-sm">
                        This note was modified externally.
                    </span>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onAcceptExternalChanges}
                            className="px-2 py-1 text-xs font-medium rounded bg-amber-500 text-white hover:bg-amber-600"
                        >
                            Load external
                        </button>
                        <button
                            type="button"
                            onClick={onDiscardExternalChanges}
                            className="px-2 py-1 text-xs font-medium rounded bg-muted hover:bg-muted/80"
                        >
                            Keep mine
                        </button>
                    </div>
                </div>
            )}

            {topSlot}

            <header
                className={`hidden h-[57px] flex items-center justify-between px-4 border-b transition-colors duration-300 ${
                    isDirty ? 'border-border bg-foreground/2' : 'border-border'
                }`}
            >
                <div className="flex items-center gap-3">
                    {onBack && (
                        <button
                            type="button"
                            onClick={onBack}
                            className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="Back"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                    )}
                    {headerLeftSlot}
                </div>
                <div className="flex-1" />
                <div className="flex items-center gap-2">
                    {headerRightSlot}
                    <NoteSaveAction
                        isDirty={isDirty}
                        isLoading={isLoading}
                        hasExternalChanges={hasExternalChanges}
                        onSave={onSave}
                    />
                </div>
            </header>

            <div
                className="flex-1 overflow-auto px-8 pt-24 pb-8 cursor-text"
                onMouseDown={handleContainerMouseDown}
            >
                <div className="max-w-2xl mx-auto w-full">
                    <NoteTitleInput
                        value={title}
                        placeholder={titlePlaceholder}
                        isLoading={isLoading}
                        onChange={onTitleChange}
                        onBlur={onTitleBlur}
                        onArrowDown={handleTitleArrowDown}
                        onArrowRight={handleTitleArrowRight}
                    />
                    <div className="editor-gap h-8" />
                    <Editor
                        className="min-h-full"
                        placeholder={editorPlaceholder}
                        value={content}
                        onChange={onContentChange}
                        onEvent={handleEditorEvent}
                        isLoading={isLoading}
                    />
                </div>
            </div>
        </div>
    );
}
