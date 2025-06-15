"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "convex/react";
import { MessageSquare, Star } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { ConversationCard } from "./ConversationCard";

interface ConversationShowcaseProps {
  username: string;
  page: number;
  tag?: string;
  featuredOnly: boolean;
}

const ITEMS_PER_PAGE = 4;
const MAX_POPULAR_TAGS = 10;

export function ConversationShowcase({
  username,
  page,
  tag,
  featuredOnly,
}: ConversationShowcaseProps) {
  const [selectedTag, setSelectedTag] = useState<string | undefined>(tag);
  const [showFeatured, setShowFeatured] = useState(featuredOnly);
  const [currentPage, setCurrentPage] = useState(page);

  // Memoize sanitized inputs to prevent unnecessary re-renders
  const sanitizedInputs = useMemo(
    () => ({
      username: username?.trim(),
      page: Math.max(1, Math.floor(currentPage) || 1),
      tag: selectedTag?.trim() || undefined,
      featuredOnly: Boolean(showFeatured),
    }),
    [username, currentPage, selectedTag, showFeatured]
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

  // Sync state with URL parameters on initial load
  useEffect(() => {
    setSelectedTag(tag);
    setShowFeatured(featuredOnly);
    setCurrentPage(page);
  }, [tag, featuredOnly, page]);

  // Memoized handlers for better performance
  const updateURL = useCallback(
    (params: Record<string, string | undefined>, newPage?: number) => {
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

        // Handle page parameter
        if (newPage !== undefined) {
          if (newPage > 1) {
            url.searchParams.set("page", newPage.toString());
          } else {
            url.searchParams.delete("page");
          }
        }

        // Use pushState for smooth navigation
        window.history.pushState({}, "", url.toString());
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
      setCurrentPage(1); // Reset to first page when filtering
      updateURL({ tag: tagName }, 1);
    },
    [selectedTag, updateURL]
  );

  const handleFeaturedToggle = useCallback(
    (featured: boolean) => {
      if (featured === showFeatured) return; // Prevent unnecessary updates

      setShowFeatured(featured);
      setCurrentPage(1); // Reset to first page when filtering
      updateURL({ featured: featured ? "true" : undefined }, 1);
    },
    [showFeatured, updateURL]
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      if (newPage === currentPage) return; // Prevent unnecessary updates

      setCurrentPage(newPage);
      updateURL({}, newPage);

      // Smooth scroll to top of showcase
      const element = document.querySelector("[data-showcase-container]");
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    [currentPage, updateURL]
  );

  // Memoized derived state
  const conversationCount = useMemo(
    () => conversationsQuery?.total ?? 0,
    [conversationsQuery?.total]
  );

  const hasConversations = useMemo(
    () => (conversationsQuery?.conversations?.length ?? 0) > 0,
    [conversationsQuery?.conversations?.length]
  );

  // Calculate total pages for pagination
  const totalPages = useMemo(
    () => Math.ceil(conversationCount / ITEMS_PER_PAGE),
    [conversationCount]
  );

  // Loading state
  if (profile === undefined || conversationsQuery === undefined) {
    return <ShowcaseSkeleton />;
  }

  // Profile not found
  if (profile === null) {
    return null;
  }

  const { conversations } = conversationsQuery;

  return (
    <div className="space-y-8" data-showcase-container>
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
        <EmptyState showFeatured={showFeatured} selectedTag={selectedTag} />
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
              username={username}
            />
          ))}
        </div>
      )}

      {/* Pagination with shadcn/ui */}
      {totalPages > 1 && (
        <div className="flex justify-center px-4 sm:px-8 pb-4">
          <PaginationComponent
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
}

// Updated Pagination component with client-side navigation
function PaginationComponent({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  // Generate page numbers to show
  const getVisiblePages = useMemo(() => {
    const delta = 2; // Number of pages to show on each side of current page
    const pages: (number | "ellipsis")[] = [];

    // Always show first page
    pages.push(1);

    // Add ellipsis if there's a gap
    if (currentPage - delta > 2) {
      pages.push("ellipsis");
    }

    // Add pages around current page
    const start = Math.max(2, currentPage - delta);
    const end = Math.min(totalPages - 1, currentPage + delta);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    // Add ellipsis if there's a gap
    if (currentPage + delta < totalPages - 1) {
      pages.push("ellipsis");
    }

    // Always show last page (if it's not the same as first page)
    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  }, [currentPage, totalPages]);

  const handlePreviousClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (currentPage > 1) {
        onPageChange(currentPage - 1);
      }
    },
    [currentPage, onPageChange]
  );

  const handleNextClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (currentPage < totalPages) {
        onPageChange(currentPage + 1);
      }
    },
    [currentPage, totalPages, onPageChange]
  );

  const handlePageClick = useCallback(
    (page: number) => (e: React.MouseEvent) => {
      e.preventDefault();
      onPageChange(page);
    },
    [onPageChange]
  );

  return (
    <Pagination>
      <PaginationContent>
        {/* Previous button */}
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={handlePreviousClick}
            aria-label="Go to previous page"
            className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
            aria-disabled={currentPage <= 1}
          />
        </PaginationItem>

        {/* Page numbers */}
        {getVisiblePages.map((page, index) => (
          <PaginationItem key={index}>
            {page === "ellipsis" ? (
              <PaginationEllipsis />
            ) : (
              <PaginationLink
                href="#"
                onClick={handlePageClick(page)}
                isActive={page === currentPage}
                aria-label={`Go to page ${page}`}
                aria-current={page === currentPage ? "page" : undefined}
              >
                {page}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}

        {/* Next button */}
        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={handleNextClick}
            aria-label="Go to next page"
            className={
              currentPage >= totalPages ? "pointer-events-none opacity-50" : ""
            }
            aria-disabled={currentPage >= totalPages}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
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
  showFeatured,
  selectedTag,
}: {
  showFeatured: boolean;
  selectedTag?: string;
}) {
  const title = useMemo(() => {
    if (showFeatured) return "No featured conversations";
    if (selectedTag) return `No conversations tagged "${selectedTag}"`;
    return "No public conversations";
  }, [showFeatured, selectedTag]);

  const description = useMemo(() => {
    return "This user hasn't shared any conversations yet.";
  }, []);

  return (
    <div className="text-center py-12">
      <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground mb-4">{description}</p>
    </div>
  );
}
