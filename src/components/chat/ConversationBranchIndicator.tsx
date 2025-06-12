"use client";

import { GitBranch } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ConversationBranchIndicatorProps {
  conversationId: Id<"conversations">;
  onNavigateToParent?: () => void;
  className?: string;
}

export function ConversationBranchIndicator({
  conversationId,
  onNavigateToParent,
  className,
}: ConversationBranchIndicatorProps) {
  const branchInfo = useQuery(api.conversations.getConversationBranchInfo, {
    conversationId,
  });

  if (!branchInfo || !branchInfo.isBranched) {
    return null;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onNavigateToParent) {
      onNavigateToParent();
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleClick}
            className={cn(
              "p-1 rounded hover:bg-muted/50 transition-colors",
              className
            )}
          >
            <GitBranch className="h-3 w-3 text-muted-foreground" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-sm flex">
            <p className="font-medium">Branched from:</p>
            <p className="text-muted-foreground">
              {branchInfo.parentConversation?.title || "Unknown conversation"}
            </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
} 