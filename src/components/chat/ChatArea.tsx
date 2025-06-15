"use client";

import { MessageInput } from "@/components/chat/MessageInput";
import { MessageList } from "@/components/chat/MessageList";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { useChat } from "@/hooks/useChat";
import { useFiles } from "@/hooks/useFiles";
import { useMessages } from "@/hooks/useMessages";
import { usePresence } from "@/hooks/usePresence";
import { useUser } from "@clerk/nextjs";
import { ArrowDown } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Id } from "../../../convex/_generated/dataModel";
import { AiIndicator } from "../indicators/AiIndicator";
import { Button } from "../ui/button";

interface ChatAreaProps {
  conversationId: Id<"conversations">;
  aiEnabled: boolean;
}

export function ChatArea({ conversationId, aiEnabled }: ChatAreaProps) {
  // Use Convex messages for real-time updates and file attachments
  const { messages: convexMessages } = useMessages(conversationId);
  // Remove useSendMessage since useChat now handles message persistence
  const { typingUsers, setTyping, stopTyping } = usePresence(conversationId);

  // File upload functionality
  const {
    uploadingFiles,
    uploadedFileIds,
    isUploading,
    hasFilesToSend,
    uploadFiles,
    removeFile,
    clearUploadedFiles,
  } = useFiles(conversationId);

  // AI SDK integration
  const [selectedModel, setSelectedModel] = useState(
    "google/gemini-2.0-flash-exp:free"
  );
  const {
    messages: aiMessages,
    input,
    handleInputChange: aiHandleInputChange,
    handleSubmit: aiHandleSubmit,
    submitWithFiles,
    isLoading: aiIsLoading,
    error: aiError,
    reload,
  } = useChat({
    conversationId,
    model: selectedModel,
  });

  // Local state for UI management
  const [isSending, setIsSending] = useState(false);

  // Enhanced scroll state management
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { user } = useUser();

  // ✅ Fix: Use AI SDK messages consistently to prevent flickering
  const displayMessages = useMemo(() => {
    return aiMessages.map((msg) => ({
      _id: msg.id as Id<"messages">,
      _creationTime: msg.createdAt?.getTime() || Date.now(),
      conversationId,
      userId: msg.role === "user" ? user?.id || "" : "ai-assistant",
      senderName: msg.role === "user" 
        ? user?.firstName || user?.username || "Anonymous User"
        : "Assistant",
      content: msg.content,
      type:
        msg.role === "assistant"
          ? ("ai" as const)
          : (msg.role as "user" | "system"),
      timestamp: msg.createdAt?.getTime() || Date.now(),
      status: "complete" as const,
      isRealTimeStreaming: aiIsLoading && msg.role === "assistant",
      attachedFiles: [],
      aiModel: undefined,
      streamingForUser: undefined,
      lastUpdated: undefined,
      attachments: undefined,
      parentMessageId: undefined,
      branchIndex: undefined,
      isActiveBranch: undefined,
      branchCreatedBy: undefined,
      branchCreatedAt: undefined,
    }));
  }, [aiMessages, conversationId, user?.id, user?.firstName, user?.username, aiIsLoading]);

  // Debounced scroll to bottom function
  const scrollToBottom = useCallback(
    (force = false) => {
      if (!messagesEndRef.current || (!shouldAutoScroll && !force)) return;

      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({
          behavior: aiIsLoading ? "auto" : "smooth",
          block: "end",
        });
      });
    },
    [shouldAutoScroll, aiIsLoading]
  );

  // Throttled scroll handler to detect user scrolling
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } =
      messagesContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;

    if (!isAtBottom && !isUserScrolling) {
      setIsUserScrolling(true);
      setShouldAutoScroll(false);
    }

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

    if (aiIsLoading) {
      scrollTimeoutRef.current = setTimeout(() => {
        scrollToBottom();
      }, 150);
    } else {
      scrollToBottom();
    }

    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [displayMessages, scrollToBottom, aiIsLoading]);

  // Force scroll to bottom when new user message is sent
  useEffect(() => {
    if (displayMessages.length > 0) {
      const lastMessage = displayMessages[displayMessages.length - 1];
      if (lastMessage?.type === "user") {
        setShouldAutoScroll(true);
        setIsUserScrolling(false);
        scrollToBottom(true);
      }
    }
  }, [displayMessages, scrollToBottom]);

  // ✅ Fixed message sending with proper AI SDK integration
  const handleSendMessage = useCallback(async () => {
    if (
      !user?.id ||
      (!input.trim() && !hasFilesToSend) ||
      isSending ||
      aiIsLoading
    )
      return;

    const messageContent = input.trim();
    setIsSending(true);

    try {
      await stopTyping();

      // ✅ Use unified useChat hook that handles both Convex persistence and AI streaming
      if (aiEnabled && messageContent) {
        if (hasFilesToSend && uploadedFileIds.length > 0) {
          // Use submitWithFiles for messages with attachments (saves to Convex + triggers AI)
          await submitWithFiles(uploadedFileIds);
        } else {
          // Use regular submit for text-only messages (saves to Convex + triggers AI)
          await aiHandleSubmit();
        }
      }

      // Clear uploaded files after successful submission
      if (hasFilesToSend) {
        clearUploadedFiles();
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  }, [
    user?.id,
    input,
    hasFilesToSend,
    isSending,
    aiIsLoading,
    uploadedFileIds,
    clearUploadedFiles,
    stopTyping,
    aiEnabled,
    aiHandleSubmit,
    submitWithFiles,
  ]);

  // Handle input changes with typing indicators and AI SDK integration
  const handleInputChange = async (value: string) => {
    // Update AI SDK state
    aiHandleInputChange({
      target: { value },
    } as React.ChangeEvent<HTMLInputElement>);

    // Handle typing indicators
    if (value.length > 0) {
      await setTyping(true);
    } else {
      await stopTyping();
    }
  };

  // Debounced typing clear
  useEffect(() => {
    if (input.length === 0) return;

    const timeout = setTimeout(() => {
      stopTyping();
    }, 3000);

    return () => clearTimeout(timeout);
  }, [input, stopTyping]);

  // ✅ Auto-trigger AI response for new conversations with only user messages
  useEffect(() => {
    if (
      aiEnabled &&
      displayMessages.length === 1 &&
      displayMessages[0]?.type === "user" &&
      !aiIsLoading &&
      !isSending
    ) {
      // Use AI SDK's reload function to generate response to the existing message
      const triggerAIResponse = async () => {
        try {
          await reload();
        } catch (error) {
          console.error("Failed to trigger initial AI response:", error);
        }
      };

      // Small delay to ensure messages are fully loaded
      const timeout = setTimeout(triggerAIResponse, 300);
      return () => clearTimeout(timeout);
    }
  }, [displayMessages, aiEnabled, aiIsLoading, isSending, reload]);

  return (
    <div className="flex-1 flex flex-col w-full h-full mt-11 sm:mt-0 relative mx-auto overflow-y-auto">
      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 w-full sm:pt-6 max-w-3xl mx-auto relative z-0"
        onScroll={handleScroll}
      >
        <MessageList
          messages={displayMessages}
          conversationId={conversationId}
        />

        {/* Show scroll-to-bottom button when user has scrolled up */}
        {!shouldAutoScroll && (
          <Button
            variant="secondary"
            onClick={() => {
              setShouldAutoScroll(true);
              setIsUserScrolling(false);
              scrollToBottom(true);
            }}
            className="fixed bottom-32 left-1/2 -translate-x-1/2 z-10 text-xs group backdrop-blur-sm"
            aria-label="Scroll to bottom"
          >
            <span className="hidden sm:block text-muted-foreground group-hover:text-primary-foreground">
              Scroll to bottom
            </span>
            <ArrowDown className="h-4 w-4 text-muted-foreground group-hover:text-primary-foreground" />
          </Button>
        )}

        {/* Multi-user streaming indicators based on database status */}
        {convexMessages.some(
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

        {/* AI SDK streaming indicators */}
        {aiIsLoading && (
          <div className="mt-4">
            <AiIndicator />
          </div>
        )}

        {/* AI Error display */}
        {aiError && (
          <div className="mt-4 text-red-500 text-sm p-2 bg-red-50 rounded-md">
            Error: {aiError.message}
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

      <div className="w-full relative z-10">
        <MessageInput
          value={input}
          onChange={handleInputChange}
          onSend={handleSendMessage}
          disabled={isSending || aiIsLoading}
          placeholder={
            aiIsLoading ? "AI is responding..." : "Type a message..."
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
