import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "../../convex/_generated/api";
import { Id, Doc } from "../../convex/_generated/dataModel";

interface UseConversationAccessResult {
  canAccess: boolean;
  isLoading: boolean;
  error: string | null;
  conversation: Doc<"conversations"> | null;
  accessReason: string;
}

export function useConversationAccess(
  conversationId: Id<"conversations"> | undefined,
  isInviteAccess?: boolean
): UseConversationAccessResult {
  const { user } = useUser();
  
  const queryResult = useQuery(
    api.conversations.get,
    conversationId ? { conversationId, isInviteAccess } : "skip"
  );

  if (!conversationId) {
    return {
      canAccess: false,
      isLoading: false,
      error: "No conversation ID provided",
      conversation: null,
      accessReason: "No conversation specified"
    };
  }

  // Check if query is loading
  const isLoading = queryResult === undefined;

  if (isLoading) {
    return {
      canAccess: false,
      isLoading: true,
      error: null,
      conversation: null,
      accessReason: "Loading..."
    };
  }

  // Handle the structured response from the query
  if (!queryResult || !queryResult.success) {
    return {
      canAccess: false,
      isLoading: false,
      error: queryResult?.error || "Unknown error",
      conversation: null,
      accessReason: queryResult?.error?.includes("not found") ? "Conversation not found" : "Access denied"
    };
  }

  const validConversation = queryResult.conversation as Doc<"conversations">;

  // Determine access reason for UI feedback
  let accessReason = "Unknown";

  if (validConversation.sharing?.isPublic) {
    accessReason = "Public conversation";
  } else if (user?.id && validConversation.participants?.includes(user.id)) {
    accessReason = "You are a participant";
  } else if (user?.id && validConversation.createdBy === user.id) {
    accessReason = "You are the creator";
  } else if (!user?.id && validConversation.createdBy?.startsWith("anonymous_")) {
    accessReason = "Anonymous conversation";
  } else {
    accessReason = "Access granted";
  }

  return {
    canAccess: true,
    isLoading: false,
    error: null,
    conversation: validConversation,
    accessReason
  };
}

// Hook for checking if user can modify a conversation
export function useCanModifyConversation(
  conversationId: Id<"conversations"> | undefined
): boolean {
  const { user } = useUser();
  const { conversation, canAccess } = useConversationAccess(conversationId);

  if (!canAccess || !conversation || !user?.id) {
    return false;
  }

  // Only participants or creator can modify
  return (
    (conversation.participants && conversation.participants.includes(user.id)) ||
    conversation.createdBy === user.id
  );
}

// Hook for checking if user can invite others to a conversation
export function useCanInviteToConversation(
  conversationId: Id<"conversations"> | undefined
): boolean {
  const { user } = useUser();
  const { conversation, canAccess } = useConversationAccess(conversationId);

  if (!canAccess || !conversation || !user?.id) {
    return false;
  }

  // Only participants or creator can invite
  return (
    (conversation.participants && conversation.participants.includes(user.id)) ||
    conversation.createdBy === user.id
  );
} 