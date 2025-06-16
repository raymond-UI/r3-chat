import { useMemo } from "react";
import type { Id } from "../../../convex/_generated/dataModel";
import type { Message } from "ai";
import type { UserResource } from "@clerk/types";
import type { ChatMessage } from "@/types/message";

interface UseChatMessagesProps {
  aiMessages: Message[];
  conversationId: Id<"conversations">;
  user: UserResource | null | undefined;
  aiIsLoading: boolean;
}

// Optimized hook to transform AI messages to display format
// Memoized to prevent unnecessary re-computations during streaming
export function useChatMessages({
  aiMessages,
  conversationId,
  user,
  aiIsLoading,
}: UseChatMessagesProps): ChatMessage[] {
  return useMemo(() => {
    // Early return for empty messages to avoid processing
    if (!aiMessages?.length) return [];

    return aiMessages.map((msg, index) => {
      const isLastMessage = index === aiMessages.length - 1;
      const isAssistantMessage = msg.role === "assistant";

      return {
        _id: msg.id as Id<"messages">,
        _creationTime: msg.createdAt?.getTime() || Date.now(),
        conversationId,
        userId: isAssistantMessage ? "ai-assistant" : user?.id || "",
        senderName: isAssistantMessage
          ? "Assistant"
          : user?.firstName || user?.username || "Anonymous User",
        content: msg.content,
        type: isAssistantMessage
          ? ("ai" as const)
          : (msg.role as "user" | "system"),
        timestamp: msg.createdAt?.getTime() || Date.now(),
        status: "complete" as const,
        // Only mark as streaming if it's the last assistant message and AI is loading
        isRealTimeStreaming: aiIsLoading && isAssistantMessage && isLastMessage,
        // Optimized empty defaults to reduce object size
        attachedFiles: [],
        aiModel: undefined,
        streamingForUser: undefined,
        lastUpdated: undefined,
        attachments: undefined,
        parentMessageId: undefined,
        branchIndex: undefined,
        isActiveBranch: undefined,
        branchCreatedBy: undefined,
        branchCreatedAt: undefined,
      };
    });
  }, [
    aiMessages,
    conversationId,
    user?.id,
    user?.firstName,
    user?.username,
    aiIsLoading,
  ]);
}
