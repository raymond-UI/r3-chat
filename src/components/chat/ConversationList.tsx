"use client";

import { useState } from "react";
import { useConversations } from "@/hooks/useConversations";
import { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, MessageSquare } from "lucide-react";

interface ConversationListProps {
  activeConversationId?: Id<"conversations">;
  onSelectConversation: (id: Id<"conversations">) => void;
}

export function ConversationList({ 
  activeConversationId, 
  onSelectConversation 
}: ConversationListProps) {
  const { conversations, create, isLoading } = useConversations();
  const [isCreating, setIsCreating] = useState(false);
  const [newChatTitle, setNewChatTitle] = useState("");

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
          <h2 className="text-lg font-semibold">Conversations</h2>
          <Button 
            size="sm" 
            onClick={handleQuickStart}
            className="h-8 w-8 p-0"
          >
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
          <div className="p-2">
            {conversations.map((conversation) => (
              <div
                key={conversation._id}
                onClick={() => onSelectConversation(conversation._id)}
                className={`
                  p-3 rounded-lg cursor-pointer transition-colors
                  hover:bg-muted/50
                  ${activeConversationId === conversation._id 
                    ? "bg-muted border border-border" 
                    : ""
                  }
                `}
              >
                <div className="font-medium text-sm mb-1">
                  {conversation.title}
                </div>
                {conversation.lastMessage && (
                  <div className="text-xs text-muted-foreground line-clamp-2">
                    {conversation.lastMessage}
                  </div>
                )}
                <div className="text-xs text-muted-foreground mt-1">
                  {new Date(conversation.updatedAt).toLocaleDateString()}
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