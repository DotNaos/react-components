import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import katex from "katex";
import Prism from "prismjs";

// Flag to track if prism-latex has been loaded
let prismLatexLoaded = false;

// Lazily load prism-latex when first needed
function ensurePrismLatex(): void {
  if (prismLatexLoaded) return;

  // Set global Prism before loading language
  if (typeof window !== "undefined") {
    (window as any).Prism = Prism;
  }

  // Dynamic import for the language component
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("prismjs/components/prism-latex");
    prismLatexLoaded = true;
  } catch {
    console.warn("Failed to load prism-latex");
  }
}

export interface MathDecorationOptions {
  katexOptions?: {
    throwOnError?: boolean;
    macros?: Record<string, string>;
  };
}

const mathPluginKey = new PluginKey("mathDecoration");

// Regex patterns for math delimiters
// Inline: $...$ (single line, not $$)
const INLINE_MATH_REGEX = /(?<!\$)\$([^$\n]+)\$(?!\$)/g;
// Block: $$...$$ (can span multiple lines but must be in same text node)
const BLOCK_MATH_REGEX = /\$\$([\s\S]*?)\$\$/g;

function renderKatex(latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(latex.trim(), {
      throwOnError: false,
      displayMode,
    });
  } catch {
    return `<span class="text-destructive">${latex}</span>`;
  }
}

/**
 * Create decorations for LaTeX syntax highlighting using Prism.js
 */
function createPrismDecorations(
    latex: string,
    contentStart: number
): Decoration[] {
    const decorations: Decoration[] = [];

    // Ensure prism-latex is loaded
    ensurePrismLatex();

    // Tokenize with Prism
    const grammar = Prism.languages.latex;
    if (!grammar) return decorations;

    const tokens = Prism.tokenize(latex, grammar);

    let pos = 0;
    function processTokens(tokenList: (string | Prism.Token)[]) {
        for (const token of tokenList) {
            if (typeof token === 'string') {
                pos += token.length;
            } else {
                const start = contentStart + pos;
                const content =
                    typeof token.content === 'string'
                        ? token.content
                        : Array.isArray(token.content)
                          ? token.content
                                .map((t) =>
                                    typeof t === 'string' ? t : t.content
                                )
                                .join('')
                          : '';
                const length = content.length;
                const end = start + length;

                // Map Prism token types to CSS classes
                const tokenType = token.type;
                let className = `math-token math-token-${tokenType}`;

                // Add decoration for this token
                if (length > 0) {
                    decorations.push(
                        Decoration.inline(start, end, {
                            class: className,
                        })
                    );
                }

                // Process nested tokens
                if (Array.isArray(token.content)) {
                    const savedPos = pos;
                    pos = 0;
                    processTokens(token.content);
                    pos = savedPos + length;
                } else {
                    pos += length;
                }
            }
        }
    }

    processTokens(tokens);
    return decorations;
}

/**
 * MathDecoration Extension
 *
 * This extension keeps math as raw text in the document (with $ delimiters)
 * and uses decorations to render KaTeX preview.
 *
 * - Cursor inside math region: shows italic code + preview tooltip/below
 * - Cursor outside: shows only rendered KaTeX (hides raw text)
 * - Arrow keys, backspace, typing all work normally on the raw text
 */
export const MathDecoration = Extension.create<MathDecorationOptions>({
  name: "mathDecoration",

  addOptions() {
    return {
      katexOptions: {
        throwOnError: false,
      },
    };
  },

  addProseMirrorPlugins() {
    // Track focus state outside of transaction meta
    let editorHasFocus = false;

    return [
      new Plugin({
        key: mathPluginKey,
        state: {
          init(_, { doc }) {
            return buildDecorations(doc, null, false);
          },
          apply(tr, oldDecorations, oldState, newState) {
            // Update focus state from meta if present
            if (tr.getMeta("focus") === true) {
              editorHasFocus = true;
            } else if (tr.getMeta("blur") === true) {
              editorHasFocus = false;
            }

            // Rebuild decorations if document changed or selection changed or focus changed
            if (
              tr.docChanged ||
              !oldState.selection.eq(newState.selection) ||
              tr.getMeta("focus") !== undefined ||
              tr.getMeta("blur") !== undefined
            ) {
              return buildDecorations(
                newState.doc,
                newState.selection,
                editorHasFocus,
              );
            }
            return oldDecorations;
          },
        },
        props: {
          decorations(state) {
            return mathPluginKey.getState(state);
          },
          handleDOMEvents: {
            focus: (view) => {
              // Trigger decoration rebuild with focus state
              view.dispatch(view.state.tr.setMeta("focus", true));
              return false;
            },
            blur: (view) => {
              // Trigger decoration rebuild without focus state
              view.dispatch(view.state.tr.setMeta("blur", true));
              return false;
            },
          },
        },
      }),
    ];
  },
});

interface MathMatch {
  from: number;
  to: number;
  latex: string;
  fullMatch: string;
  isBlock: boolean;
  delimiterLength: number;
  isComplete: boolean; // Whether the math block has proper closing delimiter
}

// Incomplete block math: $$ followed by content but missing second $ at end
// Matches $$content$ (has one $ but missing the second)
const INCOMPLETE_BLOCK_REGEX = /\$\$([\s\S]*?)\$(?!\$)/g;
// Started block math: $$ at start but no closing at all yet
const STARTED_BLOCK_REGEX = /\$\$([^$]*)$/g;

/**
 * Build a mapping from document text positions to actual document positions.
 * This is needed because ProseMirror documents have structural positions
 * (paragraph boundaries, etc.) that aren't in the text content.
 */
function buildTextMapping(doc: any): { text: string; posMap: number[] } {
  let text = "";
  const posMap: number[] = [];

  doc.descendants((node: any, pos: number) => {
    if (node.isText) {
      for (let i = 0; i < node.text.length; i++) {
        posMap.push(pos + i);
        text += node.text[i];
      }
    } else if (node.isBlock && text.length > 0 && !text.endsWith("\n")) {
      // Add newline for block boundaries to help with matching
      posMap.push(-1); // -1 indicates a synthetic newline
      text += "\n";
    }
  });

  return { text, posMap };
}

function mapTextPosToDoc(
    textIdx: number,
    posMap: number[],
    direction: 'forward' | 'backward' = 'forward'
): number {
    if (posMap[textIdx] !== undefined && posMap[textIdx] !== -1)
        return posMap[textIdx] as number;

    if (direction === 'forward') {
        for (let i = textIdx + 1; i < posMap.length; i++) {
            if (posMap[i] !== undefined && posMap[i] !== -1)
                return posMap[i] as number;
        }
    } else {
        for (let i = textIdx - 1; i >= 0; i--) {
            if (posMap[i] !== undefined && posMap[i] !== -1)
                return (posMap[i] as number) + 1;
        }
    }
    return -1;
}

function findMathRanges(doc: any): MathMatch[] {
    const matches: MathMatch[] = [];
    const { text, posMap } = buildTextMapping(doc);

    // Find complete block math first ($$...$$)
    let match;
    BLOCK_MATH_REGEX.lastIndex = 0;
    while ((match = BLOCK_MATH_REGEX.exec(text)) !== null) {
        if (!match[1]) continue;

        const startTextIdx = match.index;
        const endTextIdx = match.index + match[0].length - 1;

        const from = mapTextPosToDoc(startTextIdx, posMap, 'forward');
        const to = mapTextPosToDoc(endTextIdx, posMap, 'backward') + 1;

        if (from !== -1 && to !== -1) {
            matches.push({
                from,
                to,
                latex: match[1],
                fullMatch: match[0],
                isBlock: true,
                delimiterLength: 2,
                isComplete: true,
            });
        }
    }

    // Find incomplete block math ($$...$ - missing one $)
    INCOMPLETE_BLOCK_REGEX.lastIndex = 0;
    while ((match = INCOMPLETE_BLOCK_REGEX.exec(text)) !== null) {
        if (!match[1]) continue;

        const startTextIdx = match.index;
        const endTextIdx = match.index + match[0].length - 1;

        const from = mapTextPosToDoc(startTextIdx, posMap, 'forward');
        const to = mapTextPosToDoc(endTextIdx, posMap, 'backward') + 1;

        // Check if this overlaps with a complete block
        const overlaps = matches.some(
            (m) => m.isBlock && m.isComplete && from >= m.from && to <= m.to
        );

        if (from !== -1 && to !== -1 && !overlaps) {
            matches.push({
                from,
                to,
                latex: match[1],
                fullMatch: match[0],
                isBlock: true,
                delimiterLength: 2,
                isComplete: false, // Missing one $
            });
        }
    }

    // Find started block math ($$ with no closing yet)
    STARTED_BLOCK_REGEX.lastIndex = 0;
    while ((match = STARTED_BLOCK_REGEX.exec(text)) !== null) {
        if (!match[1]) continue;

        const startTextIdx = match.index;
        const endTextIdx = match.index + match[0].length - 1;

        const from = mapTextPosToDoc(startTextIdx, posMap, 'forward');
        const to = mapTextPosToDoc(endTextIdx, posMap, 'backward') + 1;

        // Check if this overlaps with existing blocks
        const overlaps = matches.some(
            (m) => m.isBlock && from >= m.from && from < m.to
        );

        if (from !== -1 && to !== -1 && !overlaps && match[0].length > 2) {
            matches.push({
                from,
                to,
                latex: match[1],
                fullMatch: match[0],
                isBlock: true,
                delimiterLength: 2,
                isComplete: false, // No closing at all
            });
        }
    }

    // Find inline math ($...$) within single text nodes only
    doc.descendants((node: any, pos: number) => {
        if (!node.isText) return;

        const nodeText = node.text || '';
        INLINE_MATH_REGEX.lastIndex = 0;
        while ((match = INLINE_MATH_REGEX.exec(nodeText)) !== null) {
            if (!match[1]) continue;

            const from = pos + match.index;
            const to = pos + match.index + match[0].length;
            // Skip if this overlaps with a block math
            const overlaps = matches.some(
                (m) => m.isBlock && from >= m.from && to <= m.to
            );
            if (!overlaps) {
                matches.push({
                    from,
                    to,
                    latex: match[1],
                    fullMatch: match[0],
                    isBlock: false,
                    delimiterLength: 1,
                    isComplete: true,
                });
            }
        }
    });

    return matches;
}

function buildDecorations(
  doc: any,
  selection: any,
  editorHasFocus: boolean,
): DecorationSet {
  const decorations: Decoration[] = [];
  const mathRanges = findMathRanges(doc);

  // Get cursor position - only if editor is focused
  const cursorPos = selection && editorHasFocus ? selection.from : null;
  const selectionFrom = selection && editorHasFocus ? selection.from : null;
  const selectionTo = selection && editorHasFocus ? selection.to : null;

  for (const mathMatch of mathRanges) {
    // Check if cursor is inside this math range
    const cursorInside =
      cursorPos !== null &&
      cursorPos >= mathMatch.from &&
      cursorPos <= mathMatch.to;

    // Also check if selection overlaps with math range
    const selectionOverlaps =
      selectionFrom !== null &&
      selectionTo !== null &&
      !(selectionTo < mathMatch.from || selectionFrom > mathMatch.to);

    const isEditing = cursorInside || selectionOverlaps;

    // Handle incomplete block math (always show styled, never render preview)
    if (mathMatch.isBlock && !mathMatch.isComplete) {
      const dl = mathMatch.delimiterLength;
      // Check if ends with a lone $ (incomplete closing)
      const endsWithLone$ =
        mathMatch.fullMatch.endsWith("$") &&
        !mathMatch.fullMatch.endsWith("$$");

      // Style opening $$ delimiter (with right spacing)
      decorations.push(
        Decoration.inline(mathMatch.from, mathMatch.from + dl, {
          class: "math-delimiter math-delimiter-open",
        }),
      );

      if (endsWithLone$) {
        // Style content between $$ and the lone $
        const contentStart = mathMatch.from + dl;
        const contentEnd = mathMatch.to - 1;
        if (contentStart < contentEnd) {
          // Base font decoration for entire content
          decorations.push(
            Decoration.inline(contentStart, contentEnd, {
              class: "math-content",
            }),
          );
          // Prism syntax highlighting on top
          decorations.push(
            ...createPrismDecorations(mathMatch.latex, contentStart),
          );
        }
        // Mark only the lone $ as error (with left spacing)
        decorations.push(
          Decoration.inline(mathMatch.to - 1, mathMatch.to, {
            class: "math-delimiter-error math-delimiter-close",
          }),
        );
      } else {
        // No closing at all - style content after $$
        if (mathMatch.from + dl < mathMatch.to) {
          // Base font decoration for entire content
          decorations.push(
            Decoration.inline(mathMatch.from + dl, mathMatch.to, {
              class: "math-content",
            }),
          );
          // Prism syntax highlighting on top
          decorations.push(
            ...createPrismDecorations(mathMatch.latex, mathMatch.from + dl),
          );
        }
      }
      continue;
    }

    const rendered = renderKatex(mathMatch.latex, mathMatch.isBlock);

    if (isEditing) {
      // Cursor is inside - show raw text styled
      const dl = mathMatch.delimiterLength;

      // Style opening delimiter (with right spacing)
      decorations.push(
        Decoration.inline(mathMatch.from, mathMatch.from + dl, {
          class: "math-delimiter math-delimiter-open",
        }),
      );

      // Style content with base font + Prism syntax highlighting
      const contentStart = mathMatch.from + dl;
      const contentEnd = mathMatch.to - dl;
      if (contentStart < contentEnd) {
        // Base font decoration for entire content
        decorations.push(
          Decoration.inline(contentStart, contentEnd, {
            class: "math-content",
          }),
        );
        // Prism syntax highlighting on top
        decorations.push(
          ...createPrismDecorations(mathMatch.latex, contentStart),
        );
      }

      // Style closing delimiter (with left spacing)
      decorations.push(
        Decoration.inline(mathMatch.to - dl, mathMatch.to, {
          class: "math-delimiter math-delimiter-close",
        }),
      );

      // Add preview widget
      if (mathMatch.isBlock) {
        // Block math: show preview below
        decorations.push(
          Decoration.widget(
            mathMatch.to,
            () => {
              const wrapper = document.createElement("div");
              wrapper.className = "math-live-preview math-live-preview-block";
              wrapper.innerHTML = rendered;
              return wrapper;
            },
            { side: 1 },
          ),
        );
      } else {
        // Inline math: show preview as tooltip above
        decorations.push(
          Decoration.widget(
            mathMatch.from,
            () => {
              const wrapper = document.createElement("span");
              wrapper.className = "math-live-preview math-live-preview-inline";
              wrapper.innerHTML = `<span class="math-tooltip">${rendered}</span>`;
              return wrapper;
            },
            { side: -1 },
          ),
        );
      }
    } else {
      // Cursor is outside - show KaTeX preview widget before the text
      decorations.push(
        Decoration.widget(
          mathMatch.from,
          () => {
            const wrapper = document.createElement(
              mathMatch.isBlock ? "div" : "span",
            );
            wrapper.className = mathMatch.isBlock
              ? "math-preview math-preview-block"
              : "math-preview math-preview-inline";
            wrapper.innerHTML = rendered;
            return wrapper;
          },
          { side: -1 },
        ),
      );

      // Hide the raw text visually but keep it in the DOM for cursor navigation
      decorations.push(
        Decoration.inline(mathMatch.from, mathMatch.to, {
          class: "math-hidden",
        }),
      );
    }
  }

  return DecorationSet.create(doc, decorations);
}
