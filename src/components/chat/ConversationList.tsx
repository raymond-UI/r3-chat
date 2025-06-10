"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConversations } from "@/hooks/useConversations";
import { useDebounce } from "@/hooks/useDebounce";
import { MessageSquare, Search, Users, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Id } from "../../../convex/_generated/dataModel";

interface ConversationListProps {
  activeConversationId?: Id<"conversations">;
  onSelectConversation: (id: Id<"conversations">) => void;
  onNewChat: () => void;
}

type ConversationGroup = {
  label: string;
  conversations: Array<{
    _id: Id<"conversations">;
    title: string;
    lastMessage?: string;
    updatedAt: number;
    isCollaborative?: boolean;
  }>;
};

export function ConversationList({
  activeConversationId,
  onSelectConversation,
  onNewChat,
}: ConversationListProps) {
  const { conversations, isLoading } = useConversations();
  const [searchQuery, setSearchQuery] = useState("");

  // Debounce search query for performance
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
  }, []);

  // Filter and sort conversations based on search and sort options
  const filteredAndSortedConversations = useMemo(() => {
    if (!conversations.length) return [];

    // Filter by search query
    let filtered = conversations;
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase().trim();
      filtered = conversations.filter(
        (conversation) =>
          conversation.title.toLowerCase().includes(query) ||
          (conversation.lastMessage &&
            conversation.lastMessage.toLowerCase().includes(query))
      );
    }

    // Sort conversations
    const sorted = [...filtered].sort((a, b) => b.updatedAt - a.updatedAt);

    return sorted;
  }, [conversations, debouncedSearchQuery]);

  const groupedConversations = useMemo(() => {
    if (!filteredAndSortedConversations.length) return [];

    // If searching, don't group by date - show all results in one list
    if (debouncedSearchQuery.trim()) {
      return [
        {
          label: "Search Results",
          conversations: filteredAndSortedConversations,
        },
      ];
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const groups: ConversationGroup[] = [
      { label: "Today", conversations: [] },
      { label: "Yesterday", conversations: [] },
      { label: "Last 7 days", conversations: [] },
      { label: "Last 30 days", conversations: [] },
      { label: "Older", conversations: [] },
    ];

    filteredAndSortedConversations.forEach((conversation) => {
      const conversationDate = new Date(conversation.updatedAt);

      if (conversationDate >= today) {
        groups[0].conversations.push(conversation);
      } else if (conversationDate >= yesterday) {
        groups[1].conversations.push(conversation);
      } else if (conversationDate >= lastWeek) {
        groups[2].conversations.push(conversation);
      } else if (conversationDate >= lastMonth) {
        groups[3].conversations.push(conversation);
      } else {
        groups[4].conversations.push(conversation);
      }
    });

    // Filter out empty groups
    return groups.filter((group) => group.conversations.length > 0);
  }, [filteredAndSortedConversations, debouncedSearchQuery]);

  const handleQuickStart = () => {
    onNewChat();
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse">
          <div className="h-10 bg-muted rounded mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p- border-b border-border space-y-3">
        <div className="flex flex-col items-center justify-between">
          <h2 className="sr-only">Conversations</h2>
          <Button onClick={handleQuickStart} className="w-full">
            New chat
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10 h-9 rounded-none border-none border-b"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSearch}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0 hover:bg-muted"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No conversations yet</p>
            <Button
              variant="outline"
              size="sm"
              onClick={onNewChat}
              className="mt-2"
            >
              Start your first chat
            </Button>
          </div>
        ) : groupedConversations.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No conversations found</p>
            <p className="text-xs mt-1">
              Try adjusting your search or sorting options
            </p>
            {debouncedSearchQuery && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearSearch}
                className="mt-2"
              >
                Clear search
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4 mt-8">
            {groupedConversations.map((group) => (
              <div
                key={group.label}
                className="mt-2 p-2 border-b last:border-b-0 border-primary/25"
              >
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2 font-mono mb-2">
                  {group.label}
                </h3>
                <div className="space-y-1">
                  {group.conversations.map((conversation) => (
                    <div
                      key={conversation._id}
                      onClick={() => onSelectConversation(conversation._id)}
                      className={`
                        p-2 rounded-lg cursor-pointer transition-colors
                        hover:bg-background/50 text-foreground
                        ${
                          activeConversationId === conversation._id
                            ? "bg-background border border-border"
                            : ""
                        }
                      `}
                    >
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium truncate text-ellipsis">
                          {conversation.title}
                        </h3>
                        {conversation.isCollaborative && (
                          <Users className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
