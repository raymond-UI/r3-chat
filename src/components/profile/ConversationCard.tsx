"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createConversationSlug } from "@/lib/slugs";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { Doc } from "../../../convex/_generated/dataModel";

interface ConversationWithStats extends Doc<"conversations"> {
  likeCount: number;
  viewCount: number;
  previewMessages: Doc<"messages">[];
}

interface ConversationCardProps {
  conversation: ConversationWithStats;
  username: string;
}

export function ConversationCard({
  conversation,
  username,
}: ConversationCardProps) {
  // Memoized computed values
  const conversationUrl = useMemo(
    () =>
      `/u/${username}/${createConversationSlug(conversation.title, conversation._id)}`,
    [username, conversation.title, conversation._id]
  );
  const isFeatured = useMemo(
    () => Boolean(conversation.showcase?.isFeatured),
    [conversation.showcase?.isFeatured]
  );
  const tags = useMemo(
    () => conversation.showcase?.tags || [],
    [conversation.showcase?.tags]
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
        <CardHeader className="p-4">
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
        {tags.length > 0 && (
          <CardContent className="p-0 flex flex-col h-full justify-between border-t">
            <div className="flex flex-col items-start gap-2 flex-wrap p-4">
              {/* Tags */}
              {renderTags}
            </div>
          </CardContent>
        )}
      </Link>
    </Card>
  );
}
