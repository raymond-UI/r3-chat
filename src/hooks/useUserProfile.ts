"use client";

import { useUser } from "@clerk/nextjs";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState } from "react";
import { toast } from "sonner";
import { useQuery } from "@/cache/useQuery";
import { useMutation } from "convex/react";

export function useUserProfile() {
  const { user } = useUser();
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [isUpdatingShowcase, setIsUpdatingShowcase] = useState(false);

  // Get current user's profile
  const profile = useQuery(api.userProfiles.getMyProfile, {});
  
  // Mutations
  const createOrUpdateProfile = useMutation(api.userProfiles.createOrUpdateProfile);
  const updateConversationShowcase = useMutation(api.userProfiles.updateConversationShowcase);
  const toggleConversationLike = useMutation(api.userProfiles.toggleConversationLike);

  const createProfile = async (profileData: {
    username: string;
    displayName?: string;
    role?: string;
    isPublic?: boolean;
    customSlug?: string;
    socialLinks?: {
      twitter?: string;
      github?: string;
      linkedin?: string;
      website?: string;
    };
    showcaseSettings?: {
      showFeaturedFirst: boolean;
      groupByTags: boolean;
      showStats: boolean;
      allowSearch: boolean;
    };
  }) => {
    if (!user) {
      throw new Error("User not authenticated");
    }

    setIsCreatingProfile(true);
    try {
      const result = await createOrUpdateProfile(profileData);
      toast.success("Profile updated successfully!");
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update profile";
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsCreatingProfile(false);
    }
  };

  const updateShowcase = async (
    conversationId: Id<"conversations">,
    showcaseSettings: {
      isShownOnProfile: boolean;
      isFeatured: boolean;
      tags: string[];
      description?: string;
      excerpt?: string;
    }
  ) => {
    if (!user) {
      throw new Error("User not authenticated");
    }

    setIsUpdatingShowcase(true);
    try {
      await updateConversationShowcase({
        conversationId,
        showcase: showcaseSettings,
      });
      toast.success("Showcase settings updated!");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update showcase";
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsUpdatingShowcase(false);
    }
  };

  const likeConversation = async (conversationId: Id<"conversations">) => {
    if (!user) {
      throw new Error("User not authenticated");
    }

    try {
      const result = await toggleConversationLike({ conversationId });
      return result;
    } catch (error) {
      toast.error("Failed to like conversation");
      throw error;
    }
  };

  // Helper functions
  const hasProfile = !!profile;
  const isPublicProfile = profile?.isPublic ?? false;
  const profileUrl = profile ? `/u/${profile.customSlug || profile.username}` : null;
  
  return {
    // Data
    profile,
    hasProfile,
    isPublicProfile,
    profileUrl,
    
    // Actions
    createProfile,
    updateShowcase,
    likeConversation,
    
    // Loading states
    isCreatingProfile,
    isUpdatingShowcase,
    isLoading: profile === undefined,
  };
}

// Hook for getting public profile by username/slug
export function usePublicProfile(username: string) {
  const profile = useQuery(api.userProfiles.getProfileBySlug, { slug: username });
  
  return {
    profile,
    isLoading: profile === undefined,
    notFound: profile === null,
  };
}

// Hook for getting profile conversations
export function useProfileConversations(
  userId: string | undefined,
  options: {
    limit?: number;
    offset?: number;
    featuredOnly?: boolean;
    tag?: string;
  } = {}
) {
  const conversationsQuery = useQuery(
    api.userProfiles.getProfileConversations,
    userId ? {
      userId,
      limit: options.limit ?? 12,
      offset: options.offset ?? 0,
      featuredOnly: options.featuredOnly,
      tag: options.tag,
    } : "skip"
  );

  return {
    conversations: conversationsQuery?.conversations ?? [],
    total: conversationsQuery?.total ?? 0,
    hasMore: conversationsQuery?.hasMore ?? false,
    isLoading: conversationsQuery === undefined,
  };
}

// Hook for popular tags
export function usePopularTags(limit = 20) {
  const tags = useQuery(api.userProfiles.getPopularTags, { limit });
  
  return {
    tags: tags ?? [],
    isLoading: tags === undefined,
  };
}

// Hook for conversation likes
export function useConversationLike(conversationId: Id<"conversations">) {
  const likeData = useQuery(api.userProfiles.getConversationLike, { conversationId });
  
  return {
    liked: likeData?.liked ?? false,
    likeCount: likeData?.likeCount ?? 0,
    isLoading: likeData === undefined,
  };
} 