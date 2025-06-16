import { useUser } from "@clerk/nextjs";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@/cache/useQuery";
import { useMutation } from "convex/react";

export function useConversations() {
  const { user } = useUser();
  const userId = user?.id;
  const [anonymousConversationIds, setAnonymousConversationIds] = useState<string[]>([]);
  const [isAnonymousInitialized, setIsAnonymousInitialized] = useState(false);

  // Helper functions for anonymous conversation management
  const getAnonymousConversations = useCallback(() => {
    if (typeof window === "undefined") return [];
    const conversations = localStorage.getItem("anonymous_conversations");
    return conversations ? JSON.parse(conversations) : [];
  }, []);

  const addAnonymousConversation = useCallback((conversationId: string) => {
    if (typeof window === "undefined") return;
    const conversations = getAnonymousConversations();
    if (!conversations.includes(conversationId)) {
      conversations.push(conversationId);
      localStorage.setItem("anonymous_conversations", JSON.stringify(conversations));
      setAnonymousConversationIds(conversations);
    }
  }, [getAnonymousConversations]);

  const removeAnonymousConversation = useCallback((conversationId: string) => {
    if (typeof window === "undefined") return;
    const conversations = getAnonymousConversations();
    const filteredConversations = conversations.filter((id: string) => id !== conversationId);
    localStorage.setItem("anonymous_conversations", JSON.stringify(filteredConversations));
    setAnonymousConversationIds(filteredConversations);
  }, [getAnonymousConversations]);

  // Get anonymous conversation IDs from localStorage on client side
  useEffect(() => {
    if (!userId) {
      // Only run on client side
      if (typeof window !== 'undefined') {
        const ids = getAnonymousConversations();
        setAnonymousConversationIds(ids);
        setIsAnonymousInitialized(true);
      }
    } else {
      setIsAnonymousInitialized(true);
    }
  }, [userId, getAnonymousConversations]);

  // Query for authenticated users
  const authenticatedConversations = useQuery(
    api.conversations.list,
    userId ? { userId } : "skip"
  );

  // Query for anonymous users using their conversation IDs
  // Always run the query for anonymous users, even if they have no conversations
  const anonymousConversations = useQuery(
    api.conversations.getByIds,
    !userId && isAnonymousInitialized ? { conversationIds: anonymousConversationIds } : "skip"
  );

  // Get user preferences for pinned conversations (only for authenticated users)
  const userPreferences = useQuery(
    api.userPreferences.get,
    userId ? { userId } : "skip"
  );

  const createConversation = useMutation(api.conversations.create);
  const updateTitle = useMutation(api.conversations.updateTitle);
  const addParticipant = useMutation(api.conversations.addParticipant);
  const deleteConversation = useMutation(api.conversations.remove);
  const togglePin = useMutation(api.userPreferences.togglePin);

  const create = async (title: string, isCollaborative = false) => {
    // Support both authenticated and anonymous users
    if (userId) {
      // Authenticated user
      return await createConversation({ 
        title, 
        participants: [userId], // Convert userId to participants array
        isCollaborative 
      });
    } else {
      // Anonymous user
      const conversationId = await createConversation({ 
        title, 
        participants: [], // No specific participants for anonymous
        isCollaborative,
        isAnonymous: true
      });
      
      // Track the conversation for anonymous user
      if (conversationId) {
        addAnonymousConversation(conversationId);
      }
      
      return conversationId;
    }
  };

  const update = async (conversationId: Id<"conversations">, title: string) => {
    return await updateTitle({ conversationId, title });
  };

  const addUser = async (conversationId: Id<"conversations">, targetUserId: string) => {
    return await addParticipant({ conversationId, userId: targetUserId });
  };

  const remove = async (conversationId: Id<"conversations">) => {
    const result = await deleteConversation({ conversationId });
    
    // For anonymous users, also remove from localStorage
    if (!userId) {
      removeAnonymousConversation(conversationId);
    }
    
    return result;
  };

  const pin = async (conversationId: Id<"conversations">) => {
    if (!userId) throw new Error("User not authenticated");
    return await togglePin({ userId, conversationId });
  };

  // Determine which conversations to use and fix loading state
  const conversations = userId ? (authenticatedConversations || []) : (anonymousConversations || []);
  
  // Fix loading state for anonymous users
  const isLoading = userId 
    ? authenticatedConversations === undefined 
    : !isAnonymousInitialized || (anonymousConversationIds.length > 0 && anonymousConversations === undefined);

  return {
    conversations,
    pinnedConversations: userPreferences?.pinnedConversations || [],
    create,
    update,
    addUser,
    remove,
    pin,
    isLoading,
  };
}

export function useConversation(conversationId: Id<"conversations"> | undefined) {
  const queryResult = useQuery(
    api.conversations.get,
    conversationId ? { conversationId } : "skip"
  );

  return {
    conversation: queryResult?.success ? queryResult.conversation : null,
    isLoading: queryResult === undefined,
    error: queryResult?.error || null,
    hasAccess: queryResult?.success || false,
  };
} 