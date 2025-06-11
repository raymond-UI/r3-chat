"use client";

import { MessageInput } from "@/components/chat/MessageInput";
import { MessageList } from "@/components/chat/MessageList";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { useAI } from "@/hooks/useAI";
import { useFiles } from "@/hooks/useFiles";
import { useMessages, useSendMessage } from "@/hooks/useMessages";
import { usePresence } from "@/hooks/usePresence";
import { useUser } from "@clerk/nextjs";
import { useCallback, useEffect, useRef, useState } from "react";
import { Id } from "../../../convex/_generated/dataModel";
import { AiIndicator } from "../indicators/AiIndicator";
import { Button } from "../ui/button";
import { ArrowDown } from "lucide-react";

interface ChatAreaProps {
  conversationId: Id<"conversations">;
  aiEnabled: boolean;
}

export function ChatArea({ conversationId, aiEnabled }: ChatAreaProps) {
  const { messages, isLoading } = useMessages(conversationId);
  const { send } = useSendMessage();
  const { typingUsers, setTyping, stopTyping } = usePresence(conversationId);
  const { selectedModel, setSelectedModel, isStreaming, streamToAI } = useAI();
  const {
    uploadingFiles,
    uploadedFileIds,
    isUploading,
    hasFilesToSend,
    uploadFiles,
    removeFile,
    clearUploadedFiles,
  } = useFiles(conversationId);

  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  // Track streaming content for active user only (real-time streaming)
  const [activeStreamingContent, setActiveStreamingContent] = useState<
    Record<string, string>
  >({});

  // Enhanced scroll state management
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { user } = useUser();

  // Enhanced message display with proper status from database
  const displayMessages = messages.map((message) => {
    // Show real-time streaming content for the user who initiated the stream
    if (
      message.status === "streaming" &&
      message.streamingForUser === user?.id
    ) {
      // Use a simple key that matches any active streaming
      const streamingContent = activeStreamingContent["active-stream"];

      return {
        ...message,
        content: streamingContent || message.content,
        isRealTimeStreaming: Boolean(streamingContent),
      };
    }
    return {
      ...message,
      isRealTimeStreaming: false,
    };
  });

  // Debounced scroll to bottom function
  const scrollToBottom = useCallback(
    (force = false) => {
      if (!messagesEndRef.current || (!shouldAutoScroll && !force)) return;

      // Use requestAnimationFrame for smoother scrolling
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({
          behavior: isStreaming ? "auto" : "smooth", // Instant during streaming, smooth otherwise
          block: "end",
        });
      });
    },
    [shouldAutoScroll, isStreaming]
  );

  // Throttled scroll handler to detect user scrolling
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } =
      messagesContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100; // 100px threshold

    // If user scrolled up significantly, disable auto-scroll
    if (!isAtBottom && !isUserScrolling) {
      setIsUserScrolling(true);
      setShouldAutoScroll(false);
    }

    // If user scrolled back to bottom, re-enable auto-scroll
    if (isAtBottom && isUserScrolling) {
      setIsUserScrolling(false);
      setShouldAutoScroll(true);
    }
  }, [isUserScrolling]);

  // Throttled scroll listener
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    let ticking = false;
    const throttledScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    container.addEventListener("scroll", throttledScroll, { passive: true });
    return () => container.removeEventListener("scroll", throttledScroll);
  }, [handleScroll]);

  // Enhanced message change handler with streaming awareness
  useEffect(() => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // During streaming, batch scroll updates to avoid excessive scrolling
    if (isStreaming) {
      scrollTimeoutRef.current = setTimeout(() => {
        scrollToBottom();
      }, 150); // Batch updates every 150ms during streaming
    } else {
      // Immediate scroll for non-streaming messages
      scrollToBottom();
    }

    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [displayMessages, scrollToBottom, isStreaming]);

  // Force scroll to bottom when new user message is sent
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.type === "user") {
        setShouldAutoScroll(true);
        setIsUserScrolling(false);
        scrollToBottom(true); // Force scroll for new user messages
      }
    }
  }, [messages.length, scrollToBottom]);

  const handleSendMessage = useCallback(async () => {
    if (!user?.id || (!inputValue.trim() && !hasFilesToSend)) return;

    const messageContent = inputValue.trim();
    setInputValue("");
    setIsSending(true);

    try {
      // Send user message with uploaded file IDs
      const userMessage = await send(
        conversationId,
        messageContent,
        "user",
        undefined,
        uploadedFileIds.length > 0 ? uploadedFileIds : undefined
      );

      // Clear uploaded files after message is sent
      clearUploadedFiles();
      await stopTyping();

      // Real streaming with multi-user coordination
      if (aiEnabled && messageContent && userMessage) {
        try {
          await streamToAI(
            conversationId,
            messageContent,
            selectedModel,
            // Real-time chunks for active user
            (chunk: string) => {
              setActiveStreamingContent((prev) => ({
                ...prev,
                "active-stream": (prev["active-stream"] || "") + chunk,
              }));
            },
            // Complete handler
            () => {
              console.log("✅ Streaming complete");
              // Clear all streaming content - database message should now be complete
              setActiveStreamingContent({});
            }
          );
        } catch (error) {
          console.error("Streaming error:", error);
          setActiveStreamingContent({});
        }
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      // Re-add message to input on error
      setInputValue(messageContent);
      // Clear any streaming content
      setActiveStreamingContent({});
    } finally {
      setIsSending(false);
    }
  }, [
    user?.id,
    inputValue,
    hasFilesToSend,
    uploadedFileIds,
    send,
    conversationId,
    clearUploadedFiles,
    stopTyping,
    aiEnabled,
    streamToAI,
    selectedModel,
  ]);

  const handleInputChange = async (value: string) => {
    setInputValue(value);

    // Handle typing indicators
    if (value.length > 0) {
      await setTyping(true);
    } else {
      await stopTyping();
    }
  };

  // Debounced typing clear
  useEffect(() => {
    if (inputValue.length === 0) return;

    const timeout = setTimeout(() => {
      stopTyping();
    }, 3000); // Stop typing after 3 seconds of inactivity

    return () => clearTimeout(timeout);
  }, [inputValue, stopTyping]);

  if (isLoading) {
    return (
      <div className="flex-1 w-full flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">
          Loading conversation...
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col w-full h-full relative mx-auto overflow-y-auto">
      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 w-full sm:pt-6 max-w-3xl mx-auto relative"
      >
        <MessageList messages={displayMessages} />

        {/* Show scroll-to-bottom button when user has scrolled up */}
        {!shouldAutoScroll && (
          <Button
            variant="secondary"
            onClick={() => {
              setShouldAutoScroll(true);
              setIsUserScrolling(false);
              scrollToBottom(true);
            }}
            className="fixed bottom-32 left-1/2 -translate-y-1/2 z-10 text-xsn group backdrop-blur-sm"
            aria-label="Scroll to bottom"
          >
            <span className="hidden sm:block text-muted-foreground group-hover:text-primary-foreground">
              Scroll to bottom
            </span>
            <ArrowDown className="h-4 w-4 text-muted-foreground group-hover:text-primary-foreground" />
          </Button>
        )}

        {/* Multi-user streaming indicators based on database status */}
        {messages.some(
          (m) => m.status === "streaming" && m.streamingForUser !== user?.id
        ) && (
          <div className="mt-4 -translate-y-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="flex space-x-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-3 h-3 bg-current rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 100}ms` }}
                  />
                ))}
              </div>
              <span>Assistant is typing...</span>
            </div>
          </div>
        )}

        {/* Enhanced streaming indicators */}
        {isStreaming && (
          <div className="mt-4">
            <AiIndicator />
          </div>
        )}

        {/* Typing Indicators */}
        {typingUsers.length > 0 && (
          <div className="mt-4">
            <TypingIndicator users={typingUsers} />
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-secondary/60 backdrop-blur shadow-2xl p-2 pb-0 w-full rounded-t-lg max-w-3xl mx-auto">
        <MessageInput
          value={inputValue}
          onChange={handleInputChange}
          onSend={handleSendMessage}
          disabled={isSending || isStreaming}
          placeholder={
            isStreaming ? "AI is responding..." : "Type a message..."
          }
          uploadingFiles={uploadingFiles}
          onUploadFiles={uploadFiles}
          onRemoveFile={removeFile}
          isUploading={isUploading}
          hasFilesToSend={hasFilesToSend}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
        />
      </div>
    </div>
  );
}
