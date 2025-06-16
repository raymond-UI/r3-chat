"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import type { Id } from "../../../convex/_generated/dataModel";
import { useBranching } from "@/hooks/useBranching";
import { useConversationBranching } from "@/hooks/useConversationBranching";
import { MessageItem } from "@/components/chat-area/MessageItem";
import type { 
  ChatMessage, 
  MessageActionHandlers 
} from "@/types/message";

interface MessageListProps {
  messages: ChatMessage[];
  conversationId: Id<"conversations">;
  readOnly?: boolean;
}

export function MessageList({ messages, conversationId, readOnly = false }: MessageListProps) {
  const { user } = useUser();
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [openDropdownMessageId, setOpenDropdownMessageId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const { switchBranch, regenerateResponse } = useBranching(conversationId);
  const { createConversationBranch } = useConversationBranching();

  // Detect if device is mobile with performance optimization
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || "ontouchstart" in window);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Memoized action handlers to prevent re-creation on every render
  const actionHandlers = useMemo<MessageActionHandlers>(() => ({
    onCopy: (content: string) => {
      navigator.clipboard.writeText(content);
    },
    
    onEdit: (messageId: string) => {
      // TODO: Implement edit functionality
      console.log("Edit message:", messageId);
    },
    
    onRetry: async (messageId: string) => {
      try {
        const messageIndex = messages.findIndex((m) => m._id === messageId);
        const previousUserMessage = messages
          .slice(0, messageIndex)
          .reverse()
          .find((m) => m.type === "user");

        if (previousUserMessage) {
          await regenerateResponse(
            messageId as Id<"messages">,
            previousUserMessage.content
          );
        }
      } catch (error) {
        console.error("Failed to retry message:", error);
      }
    },
    
    onRetryAlternative: async (messageId: string) => {
      try {
        const messageIndex = messages.findIndex((m) => m._id === messageId);
        const previousUserMessage = messages
          .slice(0, messageIndex)
          .reverse()
          .find((m) => m.type === "user");

        if (previousUserMessage) {
          await regenerateResponse(
            messageId as Id<"messages">,
            previousUserMessage.content
          );
        }
      } catch (error) {
        console.error("Failed to create alternative:", error);
      }
    },
    
    onBranchConversation: async (messageId: string) => {
      try {
        await createConversationBranch(
          conversationId,
          messageId as Id<"messages">
        );
      } catch (error) {
        console.error("Failed to branch conversation:", error);
      }
    },
    
    onBranchChange: async (messageId: string, branchIndex: number) => {
      try {
        await switchBranch(messageId as Id<"messages">, branchIndex);
      } catch (error) {
        console.error("Failed to switch branch:", error);
      }
    },
  }), [messages, regenerateResponse, createConversationBranch, conversationId, switchBranch]);

  // Optimized UI interaction handlers
  const handleMouseEnter = useCallback((messageId: string) => {
    setHoveredMessageId(messageId);
  }, []);
  
  const handleMouseLeave = useCallback(() => {
    setHoveredMessageId(null);
  }, []);
  
  const handleDropdownChange = useCallback((messageId: string | null) => {
    setOpenDropdownMessageId(messageId);
  }, []);

  // Early return for empty state
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-lg mb-2">No messages yet</p>
          <p className="text-sm">
            Start the conversation by sending a message below
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {messages.map((message) => (
        <MessageItem
          key={message._id}
          message={message}
          currentUserId={user?.id}
          hoveredMessageId={hoveredMessageId}
          openDropdownMessageId={openDropdownMessageId}
          isMobile={isMobile}
          readOnly={readOnly}
          handlers={actionHandlers}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onDropdownChange={handleDropdownChange}
        />
      ))}
    </div>
  );
}
