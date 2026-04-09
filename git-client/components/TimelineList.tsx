import type { ReactNode } from "react";
import type { GitClientSnapshot } from "../types";
import { TimelineItem } from "./TimelineItem";

interface TimelineListProps {
  items: GitClientSnapshot[];
  currentOid: string | null;
  loading: boolean;
  emptyIcon: ReactNode;
  emptyLabel: string;
  onCheckout: (oid: string) => void;
  onRestore: (oid: string) => void;
}

export function TimelineList({
  items,
  currentOid,
  loading,
  emptyIcon,
  emptyLabel,
  onCheckout,
  onRestore
}: TimelineListProps) {
  if (items.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground/50 gap-3 min-h-[200px]">
        <div className="w-12 h-12 opacity-20 flex items-center justify-center">{emptyIcon}</div>
        <span className="text-sm font-medium">{emptyLabel}</span>
      </div>
    );
  }

  return (
    <ul>
      {items.map((commit, index) => (
        <TimelineItem
          key={commit.oid}
          message={commit.message}
          timestamp={commit.timestamp}
          isFirst={index === 0}
          isCurrent={currentOid === commit.oid}
          loading={loading}
          onCheckout={() => onCheckout(commit.oid)}
          onRestore={() => onRestore(commit.oid)}
        />
      ))}
    </ul>
  );
}
