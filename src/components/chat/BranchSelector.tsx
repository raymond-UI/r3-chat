"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import { ChevronLeft, ChevronRight, GitBranch, Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

interface BranchSelectorProps {
  messageId: Id<"messages">;
  currentBranchIndex: number;
  onBranchChange: (branchIndex: number) => void;
  onCreateBranch: () => void;
  className?: string;
}

export function BranchSelector({
  messageId,
  currentBranchIndex,
  onBranchChange,
  onCreateBranch,
  className,
}: BranchSelectorProps) {
  const branches = useQuery(api.messages.getBranches, {
    parentMessageId: messageId,
  });
  const [isExpanded, setIsExpanded] = useState(false);

  // Always show for AI messages, even if no branches exist yet
  // This allows users to create the first alternative branch
  if (!branches) {
    return null; // Still loading
  }

  const totalBranches = Math.max(1, branches.length); // Show at least 1
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
          {branches.length > 0 ? `${currentIndex + 1} of ${totalBranches}` : "Original"}
        </span>
      </div>

      {/* Branch Navigation - Only show if there are multiple branches */}
      {branches.length > 1 && (
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
      )}

      {/* Create Branch Button - Always show */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onCreateBranch}
        className="h-6 px-2 text-xs"
        title="Create alternative response"
      >
        <Plus className="h-3 w-3 mr-1" />
        {branches.length === 0 ? "Branch" : "Alt"}
      </Button>

      {/* Branch List (Expandable) - Only show if there are multiple branches */}
      {branches.length > 1 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-6 px-2 text-xs"
        >
          All ({branches.length})
        </Button>
      )}

      {/* Branch dropdown - Only show if expanded and multiple branches */}
      <AnimatePresence>
        {isExpanded && branches.length > 1 && (
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

              <div className="border-t pt-1 mt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onCreateBranch();
                    setIsExpanded(false);
                  }}
                  className="w-full justify-start text-xs text-muted-foreground"
                >
                  <Plus className="h-3 w-3 mr-2" />
                  Create New Branch
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
