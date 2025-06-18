"use client";

import { ArrowDown } from "lucide-react";
import { memo, useRef, useCallback, useEffect, useState, useMemo } from "react";
import { Button } from "../ui/button";
import { ChatMessages } from "./ChatMessages";
import type { Id } from "../../../convex/_generated/dataModel";
import type { Doc } from "../../../convex/_generated/dataModel";
import type { ChatMessage } from "@/types/message";

interface ChatScrollManagerProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  isAwaitingAIResponse?: boolean;
  conversationId: Id<"conversations">;
  typingUsers: Doc<"presence">[];
  aiError: Error | null | undefined;
  isInitialLoading?: boolean;
}

// Optimized scroll management with performance considerations
export const ChatScrollManager = memo(function ChatScrollManager({
  messages,
  isStreaming,
  isAwaitingAIResponse = false,
  conversationId,
  typingUsers,
  aiError,
  isInitialLoading = false,
}: ChatScrollManagerProps) {
  // Scroll state management
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageCountRef = useRef(0);

  // Optimized scroll to bottom with RequestAnimationFrame
  const scrollToBottom = useCallback(
    (force = false) => {
      if (!messagesEndRef.current || (!shouldAutoScroll && !force)) return;

      // Use different scroll behavior for streaming vs normal messages
      const behavior = isStreaming ? "auto" : "smooth";
      
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({
          behavior,
          block: "end",
        });
      });
    },
    [shouldAutoScroll, isStreaming]
  );

  // Throttled scroll handler to detect user interaction
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;

    // Only update state when necessary to prevent excessive re-renders
    if (!isAtBottom && !isUserScrolling) {
      setIsUserScrolling(true);
      setShouldAutoScroll(false);
    } else if (isAtBottom && isUserScrolling) {
      setIsUserScrolling(false);
      setShouldAutoScroll(true);
    }
  }, [isUserScrolling]);

  // Optimized scroll listener with passive flag and RAF throttling
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    let rafId: number | null = null;
    
    const throttledScroll = () => {
      if (rafId) return;
      
      rafId = requestAnimationFrame(() => {
        handleScroll();
        rafId = null;
      });
    };

    container.addEventListener("scroll", throttledScroll, { 
      passive: true,
      capture: false 
    });
    
    return () => {
      container.removeEventListener("scroll", throttledScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [handleScroll]);

  // Smart scroll management for message updates
  useEffect(() => {
    const currentMessageCount = messages.length;
    const hasNewMessages = currentMessageCount > lastMessageCountRef.current;
    
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Immediate scroll for streaming, delayed for new messages
    if (isStreaming) {
      scrollTimeoutRef.current = setTimeout(scrollToBottom, 100);
    } else if (hasNewMessages) {
      scrollToBottom();
    }

    lastMessageCountRef.current = currentMessageCount;

    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [messages.length, scrollToBottom, isStreaming]);

  // Force scroll when user sends a message
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.type === "user") {
        setShouldAutoScroll(true);
        setIsUserScrolling(false);
        scrollToBottom(true);
      }
    }
  }, [messages, scrollToBottom]);

  const handleScrollToBottom = useCallback(() => {
    setShouldAutoScroll(true);
    setIsUserScrolling(false);
    scrollToBottom(true);
  }, [scrollToBottom]);

  const memoizedMessages = useMemo(() => messages, [messages]);

  return (
    <div
      ref={messagesContainerRef}
      className="flex-1 overflow-y-auto p-4 w-full sm:pt-6 max-w-3xl mx-auto relative z-0"
      style={{
        // Optimize scrolling performance
        scrollBehavior: isStreaming ? "auto" : "smooth",
        overscrollBehavior: "contain",
      }}
    >
      <ChatMessages
        messages={memoizedMessages}
        conversationId={conversationId}
        isStreaming={isStreaming || isAwaitingAIResponse}
        typingUsers={typingUsers}
        aiError={aiError}
        isInitialLoading={isInitialLoading}
      />

      {/* Scroll to bottom button - only show when needed */}
      {!shouldAutoScroll && (
        <Button
          variant="secondary"
          onClick={handleScrollToBottom}
          className="fixed bottom-32 left-1/2 -translate-x-1/2 z-10 text-xs group backdrop-blur-sm shadow-lg"
          aria-label="Scroll to bottom"
          size="sm"
        >
          <span className="hidden sm:block text-muted-foreground group-hover:text-primary-foreground mr-1">
            Scroll to bottom
          </span>
          <ArrowDown className="h-4 w-4 text-muted-foreground group-hover:text-primary-foreground" />
        </Button>
      )}

      {/* Invisible scroll anchor */}
      <div ref={messagesEndRef} className="h-0" />
    </div>
  );
});

ChatScrollManager.displayName = "ChatScrollManager";