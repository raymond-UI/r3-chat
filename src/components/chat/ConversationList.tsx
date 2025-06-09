"use client";

import { useState, useMemo } from "react";
import { useConversations } from "@/hooks/useConversations";
import { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, MessageSquare, Users } from "lucide-react";

interface ConversationListProps {
  activeConversationId?: Id<"conversations">;
  onSelectConversation: (id: Id<"conversations">) => void;
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
}: ConversationListProps) {
  const { conversations, create, isLoading } = useConversations();
  const [isCreating, setIsCreating] = useState(false);
  const [newChatTitle, setNewChatTitle] = useState("");

  const groupedConversations = useMemo(() => {
    if (!conversations.length) return [];

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

    conversations.forEach((conversation) => {
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
  }, [conversations]);

  const handleCreateChat = async () => {
    if (!newChatTitle.trim()) return;

    try {
      const conversationId = await create(newChatTitle.trim());
      onSelectConversation(conversationId);
      setNewChatTitle("");
      setIsCreating(false);
    } catch (error) {
      console.error("Failed to create conversation:", error);
    }
  };

  const handleQuickStart = async () => {
    try {
      const conversationId = await create("New Chat");
      onSelectConversation(conversationId);
    } catch (error) {
      console.error("Failed to create conversation:", error);
    }
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
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Conversations</h2>
          <Button size="sm" onClick={handleQuickStart} className="h-8 w-8 p-0">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* New Chat Creation */}
      {isCreating && (
        <div className="p-4 border-b border-border">
          <div className="flex gap-2">
            <Input
              placeholder="Chat title..."
              value={newChatTitle}
              onChange={(e) => setNewChatTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateChat();
                if (e.key === "Escape") setIsCreating(false);
              }}
              autoFocus
            />
            <Button size="sm" onClick={handleCreateChat}>
              Create
            </Button>
          </div>
        </div>
      )}

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No conversations yet</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCreating(true)}
              className="mt-2"
            >
              Start your first chat
            </Button>
          </div>
        ) : (
          <div className="p-2 space-y-4">
            {groupedConversations.map((group) => (
              <div key={group.label}>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2 mb-2">
                  {group.label}
                </h3>
                <div className="space-y-1">
                  {group.conversations.map((conversation) => (
                    <div
                      key={conversation._id}
                      onClick={() => onSelectConversation(conversation._id)}
                      className={`
                        p-3 rounded-lg cursor-pointer transition-colors
                        hover:bg-background/50
                        ${
                          activeConversationId === conversation._id
                            ? "bg-background border border-border"
                            : ""
                        }
                      `}
                    >
                      <div className="font-medium text-sm mb-1 flex items-center gap-2">
                        {conversation.title}
                        {conversation.isCollaborative && (
                          <Users className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                      {conversation.lastMessage && (
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {conversation.lastMessage}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsCreating(true)}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </div>
    </div>
  );
}
