import { Check, History, RotateCcw } from "lucide-react";
import type { MouseEvent } from "react";
import { Button } from "@dotnaos/react-ui/shadcn";

interface TimelineItemProps {
  message: string;
  timestamp: number;
  isFirst: boolean;
  isCurrent: boolean;
  loading: boolean;
  onCheckout: () => void;
  onRestore: () => void;
}

export function TimelineItem({
  message,
  timestamp,
  isFirst,
  isCurrent,
  loading,
  onCheckout,
  onRestore
}: TimelineItemProps) {
  return (
    <li
      className={`relative hover:bg-accent transition-colors group border-b border-border last:border-0 ${
        !isCurrent && !loading ? "cursor-pointer" : ""
      }`}
      onClick={() => !isCurrent && !loading && onCheckout()}
    >
      <div className="absolute left-[31px] top-0 bottom-0 w-px bg-border/60" />

      <div className="pl-14 pr-4 py-4 flex justify-between items-center gap-2">
        <div className="flex flex-col gap-1">
          <span className={`font-medium text-sm ${isCurrent ? "text-foreground" : "text-foreground/90"}`}>
            {message}
          </span>
          <span className="text-[11px] text-muted-foreground font-mono">
            {new Date(timestamp).toLocaleString()}
          </span>
        </div>

        <Button
          size="icon"
          className="h-8 w-8 opacity-0 group-hover:opacity-100 disabled:opacity-0 transition-opacity bg-muted text-muted-foreground hover:bg-red-600 hover:text-white rounded-none shadow-none"
          onClick={(event: MouseEvent<HTMLButtonElement>) => {
            event.stopPropagation();
            onRestore();
          }}
          title="Reset to this state"
          disabled={loading}
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>

      <div
        className={`absolute top-1/2 -translate-y-1/2 flex items-center justify-center transition-all duration-200 pointer-events-none z-10
          ${
            isCurrent
              ? "left-6 w-4 h-4 bg-primary shadow-sm ring-2 ring-background"
              : isFirst
                ? "left-[27px] w-2 h-2 bg-primary/80 group-hover:left-[22px] group-hover:w-5 group-hover:h-5 group-hover:bg-primary/60 ring-4 ring-background"
                : "left-[27px] w-2 h-2 bg-muted-foreground/30 group-hover:left-[22px] group-hover:w-5 group-hover:h-5 group-hover:bg-muted-foreground/50 ring-4 ring-background"
          }`}
      >
        {isCurrent ? (
          <Check className="w-2.5 h-2.5 text-primary-foreground" />
        ) : (
          <History className="w-3 h-3 text-background opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>
    </li>
  );
}
