import { useUser } from "@clerk/nextjs";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState, useEffect } from "react";
import { useQuery } from "@/cache/useQuery";
import { useMutation } from "convex/react";
import { getOrCreateAnonymousId } from "@/lib/utils";

export function useConversations() {
  const { user } = useUser();
  const userId = user?.id;
  const [isAnonymousInitialized, setIsAnonymousInitialized] = useState(false);
  const anonymousId = !userId ? getOrCreateAnonymousId() : null;

  // Initialize anonymous state
  useEffect(() => {
    if (!userId) {
      setIsAnonymousInitialized(true);
    } else {
      setIsAnonymousInitialized(true);
    }
  }, [userId]);

  // Query for authenticated users
  const authenticatedConversations = useQuery(
    api.conversations.list,
    userId ? { userId } : "skip"
  );

  // Query for anonymous users using their anonymousId
  const anonymousConversations = useQuery(
    api.conversations.list,
    !userId && isAnonymousInitialized ? { userId: anonymousId!, isAnonymous: true } : "skip"
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

  const create = async (title: string, isCollaborative = false, participants?: string[]) => {
    if (userId) {
      // Authenticated user
      return await createConversation({ 
        title, 
        participants: [userId, ...(participants || [])],
        isCollaborative 
      });
    } else if (anonymousId) {
      // Anonymous user
      return await createConversation({ 
        title, 
        participants: [],
        isCollaborative,
        anonymousId,
      });
    }
  };

  const update = async (conversationId: Id<"conversations">, title: string) => {
    return await updateTitle({ conversationId, title });
  };

  const addUser = async (conversationId: Id<"conversations">, targetUserId: string) => {
    return await addParticipant({ conversationId, userId: targetUserId });
  };

  const remove = async (conversationId: Id<"conversations">) => {
    if (userId) {
      // Authenticated user
      await deleteConversation({ conversationId });
    } else {
      // Anonymous user
      const anonId = getOrCreateAnonymousId();
      await deleteConversation({ conversationId, anonymousId: anonId });
    }
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
    : !isAnonymousInitialized || anonymousConversations === undefined;

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