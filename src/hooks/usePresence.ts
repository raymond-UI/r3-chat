"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useCallback } from "react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useQuery } from "@/cache/useQuery";
import { useMutation } from "convex/react";

export function usePresence(conversationId: Id<"conversations"> | undefined) {
  const { user } = useUser();
  const userId = user?.id;

  const presence = useQuery(
    api.presence.list,
    conversationId ? { conversationId } : "skip"
  );

  const updatePresence = useMutation(api.presence.update);
  const clearTyping = useMutation(api.presence.clearTyping);

  const setTyping = useCallback(async (isTyping: boolean) => {
    if (!userId || !conversationId) return;
    
    await updatePresence({
      userId,
      conversationId,
      isTyping,
    });
  }, [userId, conversationId, updatePresence]);

  const stopTyping = useCallback(async () => {
    if (!userId || !conversationId) return;
    
    await clearTyping({
      userId,
      conversationId,
    });
  }, [userId, conversationId, clearTyping]);

  // Auto-clear typing status on unmount
  useEffect(() => {
    return () => {
      if (userId && conversationId) {
        clearTyping({ userId, conversationId });
      }
    };
  }, [userId, conversationId, clearTyping]);

  const activeUsers = presence?.filter(p => 
    Date.now() - p.lastSeen < 30000 // Active within last 30 seconds
  ) || [];

  const typingUsers = presence?.filter(p => 
    p.isTyping && p.userId !== userId
  ) || [];

  return {
    activeUsers,
    typingUsers,
    setTyping,
    stopTyping,
    isLoading: presence === undefined,
  };
} 