"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getOrCreateAnonymousId } from "@/lib/utils";

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

  // Get anonymous user ID (will be created if doesn't exist)
  const anonymousId = useMemo(() => {
    if (isSignedIn) return null;
    return getOrCreateAnonymousId();
  }, [isSignedIn]);

  // Initialize and handle migration
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleSignInMigration = async () => {
        if (isSignedIn && user?.id && anonymousId) {
          setIsMigrating(true);
          try {
            // Pass the anonymous ID instead of conversation IDs
            const results = await migrateConversations({
              anonymousId,
            });
            
            // Clear anonymous ID after successful migration
            localStorage.removeItem("anonymous_user_id");
            
            console.log('Migration completed:', results);
          } catch (error) {
            console.error('Migration failed:', error);
          } finally {
            setIsMigrating(false);
          }
        }
      };

      handleSignInMigration();
      setIsInitialized(true);
    }
  }, [isSignedIn, user?.id, migrateConversations, anonymousId]);

  // Rate limiting is now handled server-side, so we can always allow sending
  const canSendMessage = useMemo(() => {
    if (isSignedIn) return true;
    return true;
  }, [isSignedIn]);

  const handleLoginPromptClose = useCallback(() => {
    setShowLoginPrompt(false);
  }, []);

  return {
    isSignedIn,
    userType,
    canSendMessage,
    rateLimitStatus,
    anonymousId,
    // UI state
    showLoginPrompt,
    handleLoginPromptClose,
    setShowLoginPrompt,
    // Migration
    isInitialized,
    isMigrating,
  };
}