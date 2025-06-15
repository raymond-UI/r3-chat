"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function useAnonymousMessaging() {
  const { isSignedIn, user } = useUser();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);

  const migrateConversations = useMutation(api.anonymousMigration.migrateAnonymousConversations);

  // Get rate limit status from Convex
  const rateLimitStatus = useQuery(api.rateLimitChecks.getRateLimitStatus);

  const userType = isSignedIn 
    ? (user?.publicMetadata?.plan as "free" | "paid" || 'free')
    : 'anonymous';

  // Get anonymous conversations from localStorage (still needed for migration)
  const getAnonymousConversations = useCallback(() => {
    if (typeof window === "undefined") return [];
    const conversations = localStorage.getItem("anonymous_conversations");
    return conversations ? JSON.parse(conversations) : [];
  }, []);

  // Add anonymous conversation ID to localStorage (still needed for migration)
  const addAnonymousConversation = useCallback((conversationId: string) => {
    if (typeof window === "undefined") return;
    const conversations = getAnonymousConversations();
    if (!conversations.includes(conversationId)) {
      conversations.push(conversationId);
      localStorage.setItem("anonymous_conversations", JSON.stringify(conversations));
    }
  }, [getAnonymousConversations]);

  // Clear anonymous data
  const clearAnonymousData = useCallback(() => {
    if (typeof window === "undefined") return;
    localStorage.removeItem("anonymous_conversations");
  }, []);

  // Initialize and handle migration
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleSignInMigration = async () => {
        if (isSignedIn && user?.id) {
          // Check if we have anonymous conversations to migrate
          const anonymousConversations = getAnonymousConversations();
          
          if (anonymousConversations.length > 0) {
            setIsMigrating(true);
            try {
              const results = await migrateConversations({
                anonymousConversationIds: anonymousConversations,
              });

              // Clear anonymous data after successful migration
              clearAnonymousData();
              
              console.log('Migration completed:', results);
            } catch (error) {
              console.error('Migration failed:', error);
              // Optionally, keep the anonymous data for retry
            } finally {
              setIsMigrating(false);
            }
          }
        }
      };

      handleSignInMigration();
      setIsInitialized(true);
    }
  }, [isSignedIn, user?.id, migrateConversations, getAnonymousConversations, clearAnonymousData]);

  // Rate limiting is now handled server-side, so we can always allow sending
  // The actual check happens in the Convex mutation
  const canSendMessage = useMemo(() => {
    if (isSignedIn) return true;
    // For anonymous users, we'll let the server-side rate limiting handle it
    // The UI can show warnings based on rateLimitStatus if needed
    return true;
  }, [isSignedIn]);

  // Track message sent (now just tracks conversation for migration)
  const trackMessageSent = useCallback((conversationId?: string) => {
    if (!isSignedIn && conversationId) {
      // Only track the conversation for migration, not the message count
      // Message count is now tracked server-side
      addAnonymousConversation(conversationId);
    }
  }, [isSignedIn, addAnonymousConversation]);

  const handleLoginPromptClose = useCallback(() => {
    setShowLoginPrompt(false);
  }, []);

  return {
    isSignedIn,
    userType,
    canSendMessage,
    rateLimitStatus, // Expose the full rate limit status
    // Conversation tracking (for migration)
    trackMessageSent,
    getAnonymousConversations,
    // UI state
    showLoginPrompt,
    handleLoginPromptClose,
    setShowLoginPrompt,
    // Migration
    isInitialized,
    isMigrating,
    // Cleanup
    resetAnonymousData: clearAnonymousData,
  };
}