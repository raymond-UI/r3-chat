import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

export function useMessages(conversationId: Id<"conversations"> | undefined) {
  const messages = useQuery(
    api.messages.list,
    conversationId ? { conversationId } : "skip"
  );

  return {
    messages: messages || [],
    isLoading: messages === undefined,
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
    if (!user?.id) throw new Error("User not authenticated");
    
    return await sendMessage({
      conversationId,
      userId: user.id,
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