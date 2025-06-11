import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

export function useConversations() {
  const { user } = useUser();
  const userId = user?.id;

  const conversations = useQuery(
    api.conversations.list,
    userId ? { userId } : "skip"
  );

  // Get user preferences for pinned conversations
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
    if (!userId) throw new Error("User not authenticated");
    return await createConversation({ 
      title, 
      participants: [userId], // Convert userId to participants array
      isCollaborative 
    });
  };

  const update = async (conversationId: Id<"conversations">, title: string) => {
    return await updateTitle({ conversationId, title });
  };

  const addUser = async (conversationId: Id<"conversations">, targetUserId: string) => {
    return await addParticipant({ conversationId, userId: targetUserId });
  };

  const remove = async (conversationId: Id<"conversations">) => {
    return await deleteConversation({ conversationId });
  };

  const pin = async (conversationId: Id<"conversations">) => {
    if (!userId) throw new Error("User not authenticated");
    return await togglePin({ userId, conversationId });
  };

  return {
    conversations: conversations || [],
    pinnedConversations: userPreferences?.pinnedConversations || [],
    create,
    update,
    addUser,
    remove,
    pin,
    isLoading: conversations === undefined,
  };
}

export function useConversation(conversationId: Id<"conversations"> | undefined) {
  const conversation = useQuery(
    api.conversations.get,
    conversationId ? { conversationId } : "skip"
  );

  return {
    conversation,
    isLoading: conversation === undefined,
  };
} 