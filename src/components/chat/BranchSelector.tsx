"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, isValidConvexId } from "@/lib/utils";
import { useQuery } from "convex/react";
import { ChevronLeft, ChevronRight, GitBranch } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

interface BranchSelectorProps {
  messageId: Id<"messages"> | string;
  currentBranchIndex: number;
  onBranchChange: (branchIndex: number) => void;
  className?: string;
}

export function BranchSelector({
  messageId,
  currentBranchIndex,
  onBranchChange,
  className,
}: BranchSelectorProps) {
  // Only query if we have a valid Convex ID
  const branches = useQuery(
    api.messages.getBranches,
    isValidConvexId(messageId.toString()) 
      ? { parentMessageId: messageId as Id<"messages"> }
      : "skip"
  );
  const [isExpanded, setIsExpanded] = useState(false);

  // Only show when there are actual branches (alternatives) and we have valid Convex ID
  if (!isValidConvexId(messageId.toString()) || !branches || branches.length <= 1) {
    return null;
  }

  const totalBranches = branches.length;
  const currentIndex = Math.max(
    0,
    Math.min(currentBranchIndex, totalBranches - 1)
  );

  return (
    <div className={cn("BranchSelector flex items-center gap-2 w-full", className)}>
      {/* Branch Indicator */}
      <div className="flex items-center gap-1">
        <GitBranch className="h-3 w-3 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">
          {currentIndex + 1} of {totalBranches}
        </span>
      </div>

      {/* Branch Navigation */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onBranchChange(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
          className="h-6 w-6 p-0"
        >
          <ChevronLeft className="h-3 w-3" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            onBranchChange(Math.min(totalBranches - 1, currentIndex + 1))
          }
          disabled={currentIndex === totalBranches - 1}
          className="h-6 w-6 p-0"
        >
          <ChevronRight className="h-3 w-3" />
        </Button>
      </div>

      {/* Branch List (Expandable) */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="h-6 px-2 text-xs"
      >
        All ({branches.length})
      </Button>

      {/* Branch dropdown */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-8 left-0 z-50 bg-background border rounded-md shadow-lg p-2 min-w-48"
          >
            <div className="space-y-1">
              {branches.map((branch, index) => (
                <Button
                  key={branch._id}
                  variant={index === currentIndex ? "default" : "ghost"}
                  size="sm"
                  onClick={() => {
                    onBranchChange(index);
                    setIsExpanded(false);
                  }}
                  className="w-full justify-start text-xs"
                >
                  <div className="flex items-center gap-2 w-full">
                    <Badge
                      variant={index === 0 ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {index === 0 ? "Original" : `Alt ${index}`}
                    </Badge>
                    <span className="truncate">
                      {branch.content.slice(0, 30)}
                      {branch.content.length > 30 ? "..." : ""}
                    </span>
                  </div>
                </Button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
