"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ModelLimitManager, UserType } from "@/utils/MessageLimitManager";

export function useAnonymousMessaging() {
  const { isSignedIn, user } = useUser();
  const [remainingMessages, setRemainingMessages] = useState<number | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);

  const migrateConversations = useMutation(api.anonymousMigration.migrateAnonymousConversations);

  const userType: UserType = isSignedIn 
    ? (user?.publicMetadata?.plan as UserType || 'free')
    : 'anonymous';

  const updateRemainingMessages = useCallback(() => {
    if (isSignedIn) {
      setRemainingMessages(null); // Unlimited for signed-in users
    } else {
      // For anonymous users, we'll use a simple message count approach
      // This maintains backward compatibility with the existing migration system
      const currentCount = ModelLimitManager.getAnonymousMessageCount();
      const limit = ModelLimitManager.getMessageLimit('anonymous');
      const remaining = Math.max(0, limit - currentCount);
      console.log("=== DEBUG: Anonymous user remaining messages:", remaining);
      setRemainingMessages(remaining);
    }
  }, [isSignedIn]);

  // Initialize message count on client side and handle migration
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleSignInMigration = async () => {
        if (isSignedIn && user?.id) {
          // Check if we have anonymous conversations to migrate
          const anonymousConversations = ModelLimitManager.getAnonymousConversations();
          
          if (anonymousConversations.length > 0) {
            setIsMigrating(true);
            try {
              const results = await migrateConversations({
                anonymousConversationIds: anonymousConversations,
              });

              // Clear anonymous data after successful migration
              ModelLimitManager.clearAnonymousData();
              
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
      updateRemainingMessages();
      setIsInitialized(true);
    }
  }, [isSignedIn, user?.id, migrateConversations, updateRemainingMessages]);

  const canSendMessage = useMemo(() => {
    if (isSignedIn) return true;
    
    const canSend = ModelLimitManager.canSendMessage('anonymous');
    console.log("=== DEBUG: Anonymous user canSendMessage:", canSend);
    console.log("=== DEBUG: Current message count:", ModelLimitManager.getAnonymousMessageCount());
    console.log("=== DEBUG: Message limit:", ModelLimitManager.getMessageLimit('anonymous'));
    
    return canSend;
  }, [isSignedIn]);

  const trackMessageSent = useCallback((conversationId?: string) => {
    if (!isSignedIn) {
      const newCount = ModelLimitManager.incrementAnonymousMessageCount();
      
      // Track the conversation for migration later
      if (conversationId) {
        ModelLimitManager.addAnonymousConversation(conversationId);
      }
      
      updateRemainingMessages();
      
      // Check if we've hit the limit
      const limit = ModelLimitManager.getMessageLimit('anonymous');
      if (newCount >= limit) {
        setShowLoginPrompt(true);
      }
    }
  }, [isSignedIn, updateRemainingMessages]);

  const handleLoginPromptClose = useCallback(() => {
    setShowLoginPrompt(false);
  }, []);

  const resetAnonymousData = useCallback(() => {
    ModelLimitManager.clearAnonymousData();
    updateRemainingMessages();
  }, [updateRemainingMessages]);

  const getAnonymousConversations = useCallback(() => {
    return ModelLimitManager.getAnonymousConversations();
  }, []);

  return {
    isSignedIn,
    userType,
    remainingMessages,
    canSendMessage,
    trackMessageSent,
    showLoginPrompt,
    handleLoginPromptClose,
    resetAnonymousData,
    getAnonymousConversations,
    messageLimit: ModelLimitManager.getMessageLimit(userType),
    isInitialized,
    isMigrating,
    setShowLoginPrompt,
  };
}