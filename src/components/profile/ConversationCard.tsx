"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { Eye, Heart, MessageSquare, Settings, Star } from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState, useTransition } from "react";
import { api } from "../../../convex/_generated/api";
import { Doc, Id } from "../../../convex/_generated/dataModel";

interface ConversationWithStats extends Doc<"conversations"> {
  likeCount: number;
  viewCount: number;
  previewMessages: Doc<"messages">[];
}

interface ConversationCardProps {
  conversation: ConversationWithStats;
  isOwnProfile: boolean;
  onShowcaseSettings?: (conversationId: Id<"conversations">) => void;
}

// Memoized AI model extractor
const extractAIModel = (previewMessages: Doc<"messages">[]): string => {
  const firstAIMessage = previewMessages.find((msg) => msg.type === "ai");
  return firstAIMessage?.aiModel || "AI Assistant";
};

// Memoized time formatter
const formatRelativeTime = (createdAt: number): string => {
  try {
    return formatDistanceToNow(new Date(createdAt), { addSuffix: true });
  } catch {
    return "Recently";
  }
};

export function ConversationCard({
  conversation,
  isOwnProfile,
  onShowcaseSettings,
}: ConversationCardProps) {
  const { user } = useUser();
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [localLikeCount, setLocalLikeCount] = useState<number>(
    conversation.likeCount
  );
  const [isPending, startTransition] = useTransition();

  const toggleLike = useMutation(api.userProfiles.toggleConversationLike);

  // Memoized computed values
  const aiModel = useMemo(
    () => extractAIModel(conversation.previewMessages),
    [conversation.previewMessages]
  );
  const formattedTime = useMemo(
    () => formatRelativeTime(conversation.createdAt),
    [conversation.createdAt]
  );
  const conversationUrl = useMemo(
    () => `/chat/${conversation._id}`,
    [conversation._id]
  );
  const isFeatured = useMemo(
    () => Boolean(conversation.showcase?.isFeatured),
    [conversation.showcase?.isFeatured]
  );
  const tags = useMemo(
    () => conversation.showcase?.tags || [],
    [conversation.showcase?.tags]
  );

  // Optimized like handler with error handling and optimistic updates
  const handleLike = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();

      if (!user?.id || isPending) return;

      // Optimistic update
      const previousLiked = isLiked;
      const previousCount = localLikeCount;

      startTransition(() => {
        setIsLiked(!previousLiked);
        setLocalLikeCount((prev) => (previousLiked ? prev - 1 : prev + 1));
      });

      try {
        const result = await toggleLike({ conversationId: conversation._id });

        // Update with server response
        startTransition(() => {
          setIsLiked(result.liked);
        });
      } catch (error) {
        // Revert optimistic update on error
        startTransition(() => {
          setIsLiked(previousLiked);
          setLocalLikeCount(previousCount);
        });

        console.error("Failed to toggle like:", error);
        // You might want to show a toast notification here
      }
    },
    [user?.id, isPending, isLiked, localLikeCount, toggleLike, conversation._id]
  );

  // Optimized settings handler
  const handleShowcaseSettings = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      onShowcaseSettings?.(conversation._id);
    },
    [onShowcaseSettings, conversation._id]
  );

  // Memoized tag rendering
  const renderTags = useMemo(() => {
    if (tags.length === 0) return null;

    const visibleTags = tags.slice(0, 3);
    const remainingCount = tags.length - 3;

    return (
      <div
        className="flex flex-wrap gap-1"
        role="group"
        aria-label="Conversation tags"
      >
        {visibleTags.map((tag) => (
          <Badge key={tag} variant="outline" className="text-xs px-2 py-0.5">
            {tag}
          </Badge>
        ))}
        {remainingCount > 0 && (
          <Badge
            variant="outline"
            className="text-xs px-2 py-0.5"
            aria-label={`${remainingCount} more tags`}
          >
            +{remainingCount}
          </Badge>
        )}
      </div>
    );
  }, [tags]);

  return (
    <Card
      className={cn(
        "group hover:shadow-md transition-all duration-200 p-0 cursor-pointer relative overflow-hidden",
        isFeatured && "ring-2 ring-primary/50"
      )}
      role="article"
      aria-labelledby={`conversation-title-${conversation._id}`}
    >
      <Link
        href={conversationUrl}
        className="block"
        aria-describedby={`conversation-preview-${conversation._id}`}
      >
        <CardHeader className="p-4 pb-0">
          <div className="flex items-start justify-between gap-2">
            <CardTitle
              id={`conversation-title-${conversation._id}`}
              className="text-lg line-clamp-2 group-hover:text-primary transition-colors"
            >
              {conversation.title}
            </CardTitle>
            {isFeatured && (
              <Star
                className="w-5 h-5 text-yellow-500 flex-shrink-0"
                fill="currentColor"
                aria-label="Featured conversation"
              />
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0 flex flex-col h-full justify-between">
          {/* AI Model Badge */}
          <div className="flex items-center gap-2 flex-wrap p-4 border-b">
            <Badge variant="secondary" className="text-xs">
              {aiModel}
            </Badge>

          {/* Tags */}
          {renderTags}
          </div>

          {/* Stats and actions */}
          <div className="flex items-center justify-between p-4 pt-0 bg-amber-800">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div
                className="flex items-center gap-1"
                aria-label={`${conversation.viewCount} views`}
              >
                <Eye className="w-4 h-4" aria-hidden="true" />
                <span>{conversation.viewCount.toLocaleString()}</span>
              </div>

              <div
                className="flex items-center gap-1"
                aria-label={`${conversation.previewMessages.length} messages`}
              >
                <MessageSquare className="w-4 h-4" aria-hidden="true" />
                <span>{conversation.previewMessages.length}</span>
              </div>

              <time
                className="text-xs"
                dateTime={new Date(conversation.createdAt).toISOString()}
                title={new Date(conversation.createdAt).toLocaleDateString()}
              >
                {formattedTime}
              </time>
            </div>

            {/* Like button */}
            {user && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                disabled={isPending}
                className={cn(
                  "flex items-center gap-1 hover:text-red-500 transition-colors",
                  isLiked && "text-red-500",
                  isPending && "opacity-50 cursor-not-allowed"
                )}
                aria-label={`${isLiked ? "Unlike" : "Like"} conversation (${localLikeCount} likes)`}
              >
                <Heart
                  className={cn("w-4 h-4", isLiked && "fill-current")}
                  aria-hidden="true"
                />
                <span className="text-sm">
                  {localLikeCount.toLocaleString()}
                </span>
              </Button>
            )}
          </div>
        </CardContent>
      </Link>

      {/* Settings for own profile */}
      {isOwnProfile && onShowcaseSettings && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleShowcaseSettings}
            className="h-8 w-8 p-0"
            aria-label="Showcase settings"
          >
            <Settings className="w-4 h-4" aria-hidden="true" />
          </Button>
        </div>
      )}
    </Card>
  );
}
