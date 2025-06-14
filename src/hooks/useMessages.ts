import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

export function useMessages(conversationId: Id<"conversations"> | undefined) {
  const queryResult = useQuery(
    api.messages.list,
    conversationId ? { conversationId } : "skip"
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
    
    return await sendMessage({
      conversationId,
      userId,
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