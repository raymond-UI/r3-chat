"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { ChevronLeft, ChevronRight, MessageSquare, Star } from "lucide-react";
import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { ConversationCard } from "./ConversationCard";

interface ConversationShowcaseProps {
  username: string;
  page: number;
  tag?: string;
  featuredOnly: boolean;
}

const ITEMS_PER_PAGE = 12;
const MAX_POPULAR_TAGS = 10;

export function ConversationShowcase({
  username,
  page,
  tag,
  featuredOnly,
}: ConversationShowcaseProps) {
  const { user: currentUser } = useUser();
  const [selectedTag, setSelectedTag] = useState<string | undefined>(tag);
  const [showFeatured, setShowFeatured] = useState(featuredOnly);

  // Memoize sanitized inputs to prevent unnecessary re-renders
  const sanitizedInputs = useMemo(
    () => ({
      username: username?.trim(),
      page: Math.max(1, Math.floor(page) || 1),
      tag: tag?.trim() || undefined,
      featuredOnly: Boolean(featuredOnly),
    }),
    [username, page, tag, featuredOnly]
  );

  // Get the profile first to get userId
  const profile = useQuery(
    api.userProfiles.getProfileBySlug,
    sanitizedInputs.username ? { slug: sanitizedInputs.username } : "skip"
  );

  // Get conversations with optimized query parameters
  const conversationsQuery = useQuery(
    api.userProfiles.getProfileConversations,
    profile?.userId
      ? {
          userId: profile.userId,
          limit: ITEMS_PER_PAGE,
          offset: (sanitizedInputs.page - 1) * ITEMS_PER_PAGE,
          featuredOnly: showFeatured,
          tag: selectedTag,
        }
      : "skip"
  );

  // Get popular tags for filtering
  const popularTags = useQuery(api.userProfiles.getPopularTags, {
    limit: MAX_POPULAR_TAGS,
  });

  // Sync state with URL parameters
  useEffect(() => {
    setSelectedTag(sanitizedInputs.tag);
    setShowFeatured(sanitizedInputs.featuredOnly);
  }, [sanitizedInputs.tag, sanitizedInputs.featuredOnly]);

  // Memoized handlers for better performance
  const updateURL = useCallback(
    (params: Record<string, string | undefined>) => {
      try {
        const url = new URL(window.location.href);

        // Update or remove parameters
        Object.entries(params).forEach(([key, value]) => {
          if (value) {
            url.searchParams.set(key, value);
          } else {
            url.searchParams.delete(key);
          }
        });

        // Always reset to first page when filters change
        url.searchParams.delete("page");

        // Use replaceState for filter changes to avoid cluttering history
        window.history.replaceState({}, "", url.toString());
      } catch (error) {
        console.error("Failed to update URL:", error);
      }
    },
    []
  );

  const handleTagFilter = useCallback(
    (tagName?: string) => {
      if (tagName === selectedTag) return; // Prevent unnecessary updates

      setSelectedTag(tagName);
      updateURL({ tag: tagName });
    },
    [selectedTag, updateURL]
  );

  const handleFeaturedToggle = useCallback(
    (featured: boolean) => {
      if (featured === showFeatured) return; // Prevent unnecessary updates

      setShowFeatured(featured);
      updateURL({ featured: featured ? "true" : undefined });
    },
    [showFeatured, updateURL]
  );

  // Memoized derived state
  const isOwnProfile = useMemo(
    () => currentUser?.id === profile?.userId,
    [currentUser?.id, profile?.userId]
  );

  const conversationCount = useMemo(
    () => conversationsQuery?.total ?? 0,
    [conversationsQuery?.total]
  );

  const hasConversations = useMemo(
    () => (conversationsQuery?.conversations?.length ?? 0) > 0,
    [conversationsQuery?.conversations?.length]
  );

  // Loading state
  if (profile === undefined || conversationsQuery === undefined) {
    return <ShowcaseSkeleton />;
  }

  // Profile not found
  if (profile === null) {
    return null;
  }

  const { conversations, hasMore } = conversationsQuery;

  return (
    <div className="space-y-8">
      {/* Header with filters */}
      <div className="flex flex-col gap-4 px-4 sm:px-8">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">
            {showFeatured ? "Featured Conversations" : "Conversations"}
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {conversationCount} conversation
              {conversationCount !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Filter Tabs */}
        <Tabs value={showFeatured ? "featured" : "all"} className="w-full">
          <TabsList>
            <TabsTrigger
              value="all"
              onClick={() => handleFeaturedToggle(false)}
              aria-label="Show all conversations"
            >
              All Conversations
            </TabsTrigger>
            <TabsTrigger
              value="featured"
              onClick={() => handleFeaturedToggle(true)}
              aria-label="Show featured conversations only"
            >
              <Star className="w-4 h-4 mr-1" />
              Featured
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Tag filters */}
        {popularTags && popularTags.length > 0 && (
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Topic filters"
          >
            <Button
              variant={selectedTag === undefined ? "default" : "outline"}
              size="sm"
              onClick={() => handleTagFilter(undefined)}
              aria-pressed={selectedTag === undefined}
            >
              All Topics
            </Button>
            {popularTags.map(({ tag: tagName, count }) => (
              <Button
                key={tagName}
                variant={selectedTag === tagName ? "default" : "outline"}
                size="sm"
                onClick={() => handleTagFilter(tagName)}
                className="flex items-center gap-1"
                aria-pressed={selectedTag === tagName}
                aria-label={`Filter by ${tagName} (${count} conversations)`}
              >
                {tagName}
                <span className="text-xs opacity-70">({count})</span>
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Conversations Grid */}
      {!hasConversations ? (
        <EmptyState
          isOwnProfile={isOwnProfile}
          showFeatured={showFeatured}
          selectedTag={selectedTag}
        />
      ) : (
        <div
          className="grid grid-cols-1 gap-4 bg-dot border border-border/30 rounded-xl p-4 sm:p-8"
          role="grid"
          aria-label="Conversations grid"
        >
          {conversations.map((conversation) => (
            <ConversationCard
              key={conversation._id}
              conversation={conversation}
              isOwnProfile={isOwnProfile}
              username={username}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {(sanitizedInputs.page > 1 || hasMore) && (
        <PaginationControls
          currentPage={sanitizedInputs.page}
          hasMore={hasMore}
          username={sanitizedInputs.username}
          selectedTag={selectedTag}
          showFeatured={showFeatured}
        />
      )}
    </div>
  );
}

// Extracted pagination component for better maintainability
function PaginationControls({
  currentPage,
  hasMore,
  username,
  selectedTag,
  showFeatured,
}: {
  currentPage: number;
  hasMore: boolean;
  username: string;
  selectedTag?: string;
  showFeatured: boolean;
}) {
  const baseQuery = useMemo(
    () => ({
      ...(selectedTag && { tag: selectedTag }),
      ...(showFeatured && { featured: "true" }),
    }),
    [selectedTag, showFeatured]
  );

  const prevQuery = useMemo(
    () => ({
      ...baseQuery,
      page: currentPage - 1,
    }),
    [baseQuery, currentPage]
  );

  const nextQuery = useMemo(
    () => ({
      ...baseQuery,
      page: currentPage + 1,
    }),
    [baseQuery, currentPage]
  );

  return (
    <nav className="flex items-center justify-between" aria-label="Pagination">
      <Button
        variant="outline"
        disabled={currentPage <= 1}
        asChild={currentPage > 1}
        aria-label="Go to previous page"
      >
        {currentPage > 1 ? (
          <Link
            href={{
              pathname: `/u/${username}`,
              query: prevQuery,
            }}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Link>
        ) : (
          <span className="flex items-center gap-2">
            <ChevronLeft className="w-4 h-4" />
            Previous
          </span>
        )}
      </Button>

      <span className="text-sm text-muted-foreground" aria-current="page">
        Page {currentPage}
      </span>

      <Button
        variant="outline"
        disabled={!hasMore}
        asChild={hasMore}
        aria-label="Go to next page"
      >
        {hasMore ? (
          <Link
            href={{
              pathname: `/u/${username}`,
              query: nextQuery,
            }}
            className="flex items-center gap-2"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Link>
        ) : (
          <span className="flex items-center gap-2">
            Next
            <ChevronRight className="w-4 h-4" />
          </span>
        )}
      </Button>
    </nav>
  );
}

// Memoized skeleton component
const ShowcaseSkeleton = React.memo(function ShowcaseSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between px-4 sm:px-8">
        <div className="h-8 bg-muted rounded w-64 animate-pulse" />
        <div className="h-6 bg-muted rounded w-32 animate-pulse" />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {Array.from({ length: 6 }, (_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-3/4" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="h-4 bg-muted rounded w-full" />
              <div className="h-4 bg-muted rounded w-2/3" />
              <div className="flex gap-2">
                <div className="h-6 bg-muted rounded w-16" />
                <div className="h-6 bg-muted rounded w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
});

function EmptyState({
  isOwnProfile,
  showFeatured,
  selectedTag,
}: {
  isOwnProfile: boolean;
  showFeatured: boolean;
  selectedTag?: string;
}) {
  const title = useMemo(() => {
    if (showFeatured) return "No featured conversations";
    if (selectedTag) return `No conversations tagged "${selectedTag}"`;
    return "No public conversations";
  }, [showFeatured, selectedTag]);

  const description = useMemo(() => {
    if (isOwnProfile) {
      return showFeatured
        ? "Mark some conversations as featured to showcase your best work."
        : "Share your AI conversations with the world by making them public.";
    }
    return "This user hasn't shared any conversations yet.";
  }, [isOwnProfile, showFeatured]);

  return (
    <div className="text-center py-12">
      <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground mb-4">{description}</p>
      {isOwnProfile && (
        <Button variant="outline" asChild>
          <Link href="/chat">Start a New Conversation</Link>
        </Button>
      )}
    </div>
  );
}
