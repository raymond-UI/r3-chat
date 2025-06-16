import { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useUser } from "@clerk/nextjs";
import { env } from "@/env";
import { getFallbackModel } from "@/lib/defaultModel";

export function useBranching(conversationId: Id<"conversations">) {
  const { user } = useUser();
  const createBranchMutation = useMutation(api.messages.createBranch);
  const switchBranchMutation = useMutation(api.messages.switchBranch);
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);

  const createBranch = useCallback(async (
    parentMessageId: Id<"messages">,
    content: string,
    type: "user" | "ai" | "system" = "ai",
    aiModel?: string
  ) => {
    if (!user?.id) throw new Error("User not authenticated");
    
    setIsCreatingBranch(true);
    try {
      const branchId = await createBranchMutation({
        parentMessageId,
        userId: type === "ai" ? "ai-assistant" : user.id,
        content,
        type,
        aiModel,
      });
      return branchId;
    } finally {
      setIsCreatingBranch(false);
    }
  }, [user?.id, createBranchMutation]);

  const switchBranch = useCallback(async (
    parentMessageId: Id<"messages">,
    branchIndex: number
  ) => {
    return await switchBranchMutation({
      parentMessageId,
      branchIndex,
    });
  }, [switchBranchMutation]);

  const regenerateResponse = useCallback(async (
    messageId: Id<"messages">,
    userMessage: string,
    model?: string
  ) => {
    if (!user?.id) throw new Error("User not authenticated");

    setIsCreatingBranch(true);
    try {
      // Create a new branch first (empty content, will be filled by streaming)
      const branchId = await createBranchMutation({
        parentMessageId: messageId,
        userId: "ai-assistant",
        content: "",
        type: "ai",
        aiModel: model,
      });

      // Now trigger streaming to fill the branch content
      // Use your existing Convex HTTP streaming endpoint
      const response = await fetch(`${env.NEXT_PUBLIC_CONVEX_SITE_URL}/ai/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          userMessage,
          model: model || getFallbackModel("chat"),
          userId: user.id,
          // Pass the branch message ID so it updates the right message
          messageId: branchId,
          parentMessageId: messageId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate response');
      }

      // The streaming will update the branch content automatically
      return branchId;
    } finally {
      setIsCreatingBranch(false);
    }
  }, [user?.id, conversationId, createBranchMutation]);

  return {
    createBranch,
    switchBranch,
    regenerateResponse,
    isCreatingBranch,
  };
} 