"use client";

import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { memo, useMemo } from "react";
import { Id, Doc } from "../../../convex/_generated/dataModel";
import dynamic from "next/dynamic";
import type { ChatMessage } from "@/types/message";

// Lazy load heavy components
const AiIndicator = dynamic(
  () => import("../indicators/LoadingIndicator").then((mod) => mod.LoadingIndicator),
  { ssr: false }
);

const MessageList = dynamic(
  () => import("./MessageList").then((mod) => mod.MessageList),
  { ssr: false }
);

interface ChatMessagesProps {
  messages: ChatMessage[];
  conversationId: Id<"conversations">;
  isStreaming: boolean;
  typingUsers: Doc<"presence">[];
  aiError: Error | null | undefined;
  isInitialLoading?: boolean;
}

// Memoized component to prevent unnecessary re-renders during streaming
export const ChatMessages = memo(function ChatMessages({
  messages,
  conversationId,
  isStreaming,
  typingUsers,
  aiError,
  isInitialLoading = false,
}: ChatMessagesProps) {
  // Memoize message list to prevent re-renders when only streaming state changes
  const memoizedMessages = useMemo(() => messages, [messages]);

  return (
    <>
      <MessageList
        messages={memoizedMessages}
        conversationId={conversationId}
        isLoading={isInitialLoading}
      />

      {/* AI streaming indicator - only render when actually streaming */}
      {isStreaming && (
        <div className="mt-4">
          <AiIndicator />
        </div>
      )}

      {/* Error display - memoized to prevent flicker */}
      {aiError && (
        <div className="mt-4 text-red-500 text-sm p-2 bg-red-50 dark:bg-red-950/20 rounded-md">
          Error: {aiError.message}
        </div>
      )}

      {/* Typing indicators - only render when users are typing */}
      {typingUsers.length > 0 && (
        <div className="mt-4">
          <TypingIndicator users={typingUsers} />
        </div>
      )}
    </>
  );
});

ChatMessages.displayName = "ChatMessages";