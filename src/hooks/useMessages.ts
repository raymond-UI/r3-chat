import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

export function useMessages(conversationId: Id<"conversations"> | undefined, isInviteAccess?: boolean) {
  const queryResult = useQuery(
    api.messages.list,
    conversationId ? { conversationId, isInviteAccess } : "skip"
  );

  return {
    messages: queryResult?.success ? queryResult.messages : [],
    isLoading: queryResult === undefined,
    error: queryResult?.error || null,
    hasAccess: queryResult?.success || false,
  };
}

export function useSendMessage() {
  const { user } = useUser();
  const sendMessage = useMutation(api.messages.send);
  const removeMessage = useMutation(api.messages.remove);

  const send = async (
    conversationId: Id<"conversations">,
    content: string,
    type: "user" | "ai" | "system" = "user",
    aiModel?: string,
    fileIds?: Id<"files">[]
  ) => {
    // Support both authenticated and anonymous users
    const userId = user?.id || `anonymous_${crypto.randomUUID()}`;
    const senderName = user?.firstName || user?.username || "Anonymous User";
    
    return await sendMessage({
      conversationId,
      userId,
      senderName,
      content,
      type,
      aiModel,
      fileIds,
    });
  };

  const remove = async (messageId: Id<"messages">) => {
    return await removeMessage({ messageId });
  };

  return {
    send,
    remove,
  };
} 