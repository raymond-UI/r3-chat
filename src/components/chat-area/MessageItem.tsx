"use client";

import React, { memo, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
// import { MarkdownRenderer } from "@/components/chat/MarkdownRenderer";
import type { MessageItemProps } from "@/types/message";
import dynamic from "next/dynamic";

const FilePreview = dynamic(
  () => import("@/components/chat/FilePreview").then((mod) => mod.FilePreview),
  {
    ssr: false,
  }
);

const ChatBubbleAction = dynamic(
  () =>
    import("@/components/actions/ChatBubbleAction").then(
      (mod) => mod.ChatBubbleAction
    ),
  {
    ssr: false,
  }
);

const BranchSelector = dynamic(
  () =>
    import("@/components/chat/BranchSelector").then(
      (mod) => mod.BranchSelector
    ),
  {
    ssr: false,
  }
);

const MarkdownRenderer = dynamic(
  () =>
    import("@/components/chat/MarkdownRenderer").then(
      (mod) => mod.MarkdownRenderer
    ),
  {
    ssr: false,
  }
);

// Memoized file preview component to prevent unnecessary re-renders
const MemoizedFilePreview = memo(FilePreview);

// Memoized markdown renderer for better performance
const MemoizedMarkdownRenderer = memo(MarkdownRenderer);

// Memoized branch selector
const MemoizedBranchSelector = memo(BranchSelector);

// Enhanced MessageItem component with proper loading UI
// Enhanced MessageItem component with proper loading UI
const MessageItem = memo<MessageItemProps>(
  ({
    message,
    currentUserId,
    hoveredMessageId,
    openDropdownMessageId,
    isMobile,
    readOnly,
    handlers,
    onMouseEnter,
    onMouseLeave,
    // onDropdownChange,
  }) => {
    // Memoized computed values to prevent recalculation
    const messageMetadata = useMemo(
      () => ({
        isCurrentUser: message.userId === currentUserId,
        isAI: message.type === "ai",
        isSystem: message.type === "system",
        isStreaming: message.status === "streaming",
        isRealTimeStreaming: message.isRealTimeStreaming || false,
        // Check for loading states based on actual message status types
        isLoading:
          !message.content &&
          (message.status === "streaming" || message.status === undefined),
        hasFiles:
          ("attachedFiles" in message &&
            message.attachedFiles &&
            message.attachedFiles.length > 0) ||
          (message.attachments && message.attachments.length > 0),
        timestamp: new Date(message.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      }),
      [message, currentUserId]
    );

    // Memoized event handlers to prevent prop drilling re-renders
    const eventHandlers = useMemo(
      () => ({
        onEdit: (e: React.MouseEvent) => {
          e.stopPropagation();
          handlers.onEdit(message._id);
        },
        onRetry: (e: React.MouseEvent) => {
          e.stopPropagation();
          handlers.onRetry(message._id);
        },
        onRetryAlternative: (e: React.MouseEvent) => {
          e.stopPropagation();
          handlers.onRetryAlternative(message._id);
        },
        onCopy: (e: React.MouseEvent) => {
          e.stopPropagation();
          handlers.onCopy(message.content);
        },
        onBranchConversation: (e: React.MouseEvent) => {
          e.stopPropagation();
          handlers.onBranchConversation(message._id);
        },
        onBranchChange: (branchIndex: number) => {
          handlers.onBranchChange(message._id, branchIndex);
        },
      }),
      [message._id, message.content, handlers]
    );

    // Memoized mouse event handlers
    const mouseHandlers = useMemo(
      () => ({
        onMouseEnter: () => onMouseEnter(message._id),
        onMouseLeave: onMouseLeave,
      }),
      [message._id, onMouseEnter, onMouseLeave]
    );

    // Memoized dropdown handler
    // const dropdownHandler = useCallback(
    //   (isOpen: boolean) => {
    //     onDropdownChange(isOpen ? message._id : null);
    //   },
    //   [message._id, onDropdownChange]
    // );

    // Loading skeleton component (memoized outside of other useMemo)
    const LoadingSkeleton = useMemo(
      () => (
        <div className="space-y-2 animate-pulse">
          <div className="h-4 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
          <div className="h-4 bg-muted rounded w-2/3"></div>
        </div>
      ),
      []
    );

    // Typing indicator for AI messages (memoized outside of other useMemo)
    const TypingIndicator = useMemo(
      () => (
        <div className="flex items-center space-x-1 py-2">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"></div>
          </div>
          <span className="text-xs text-muted-foreground ml-2">
            AI is thinking...
          </span>
        </div>
      ),
      []
    );

    // Memoized file attachments rendering with loading state
    const fileAttachments = useMemo(() => {
      const { hasFiles, isCurrentUser, isAI, isLoading } = messageMetadata;
      if (!hasFiles) return null;

      return (
        <div
          className={cn(
            "flex flex-col gap-2 max-w-md",
            isCurrentUser && !isAI ? "items-end" : "items-start"
          )}
        >
          {/* Loading state for file attachments */}
          {isLoading ? (
            <div className="w-48 h-20 bg-muted/50 border rounded animate-pulse flex items-center justify-center">
              <span className="text-xs text-muted-foreground">
                Loading files...
              </span>
            </div>
          ) : (
            <>
              {/* Render files from attachedFiles (database query) */}
              {"attachedFiles" in message &&
                message.attachedFiles?.map((file) => (
                  <MemoizedFilePreview
                    key={file._id}
                    file={file}
                    className="max-w-full"
                  />
                ))}

              {/* Fallback: Render files from attachments (message schema) */}
              {message.attachments &&
                !(
                  "attachedFiles" in message && message.attachedFiles?.length
                ) &&
                message.attachments.map((attachment, index) => (
                  <div
                    key={index}
                    className="p-2 bg-muted/50 border rounded text-sm"
                  >
                    <p className="font-medium">{attachment.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {attachment.file_type.toUpperCase()} •{" "}
                      {(attachment.file_size / 1024 / 1024).toFixed(1)} MB
                    </p>
                    {attachment.file_url && (
                      <a
                        href={attachment.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        View File
                      </a>
                    )}
                  </div>
                ))}
            </>
          )}
        </div>
      );
    }, [message, messageMetadata]);

    // Memoized message content rendering with loading states
    const messageContent = useMemo(() => {
      const {
        isAI,
        isCurrentUser,
        isRealTimeStreaming,
        isLoading,
        isStreaming,
      } = messageMetadata;

      return (
        <div
          className={cn(
            "rounded-2xl p-2 break-words max-w-full relative",
            isAI
              ? "bg-transparent text-foreground"
              : isCurrentUser
                ? "bg-primary/10 text-primary max-h-80 overflow-y-auto"
                : "bg-muted text-foreground",
            isLoading && "bg-muted/30"
          )}
        >
          <div className="relative">
            {/* Loading states */}
            {isLoading ? (
              isAI ? (
                TypingIndicator
              ) : (
                LoadingSkeleton
              )
            ) : isStreaming && !message.content ? (
              isAI ? (
                TypingIndicator
              ) : (
                LoadingSkeleton
              )
            ) : message.content ? (
              <>
                <MemoizedMarkdownRenderer content={message.content} />
                {/* Enhanced streaming cursor - only show for real-time streaming */}
                {isRealTimeStreaming && (
                  <span className="inline-block w-2 h-4 bg-primary/60 animate-pulse ml-1" />
                )}
              </>
            ) : (
              // Fallback for empty content
              <div className="text-muted-foreground italic text-sm">
                No content
              </div>
            )}
          </div>
        </div>
      );
    }, [message.content, messageMetadata, LoadingSkeleton, TypingIndicator]);

    const { isCurrentUser, isAI, isSystem, isStreaming, isLoading, timestamp } =
      messageMetadata;

    // System message rendering (early return for performance)
    if (isSystem) {
      return (
        <div className="flex justify-center">
          <Badge variant="secondary" className="text-xs">
            {isLoading ? (
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-current rounded-full animate-pulse"></div>
                <span>Processing...</span>
              </div>
            ) : (
              message.content
            )}
          </Badge>
        </div>
      );
    }

    // Action visibility logic - hide actions during loading
    const actionsVisible =
      !isLoading &&
      (isMobile ||
        hoveredMessageId === message._id ||
        openDropdownMessageId === message._id);

    return (
      <div
        className={cn(
          "flex flex-col px-2 sm:px-0 gap-1 h-full w-full",
          isCurrentUser && !isAI ? "m-auto" : "",
          isStreaming || isLoading ? "opacity-95" : ""
        )}
        {...mouseHandlers}
      >
        {/* Sender info */}
        <div
          className={cn(
            "flex items-center mt-4",
            isCurrentUser && !isAI ? "ml-auto" : ""
          )}
        >
          <span className="text-xs text-muted-foreground order-1 flex items-center">
            {isLoading && (
              <div className="w-2 h-2 bg-current rounded-full animate-pulse mr-1"></div>
            )}
            {isAI ? "Assistant:" : message.senderName || "User:"}
          </span>
          <div
            className={cn(
              "text-xs text-muted-foreground pl-1",
              isCurrentUser && !isAI ? "ml-auto" : "order-2"
            )}
          >
            {isLoading ? "..." : timestamp}
          </div>
        </div>

        {/* Message Content */}
        <div
          className={cn(
            "flex flex-col w-full gap-2",
            isCurrentUser && !isAI ? "items-end" : "items-start"
          )}
        >
          {/* File attachments */}
          {fileAttachments}

          {/* Message bubble */}
          {messageContent}

          {/* Branch Selector for AI messages - hidden during loading */}
          {isAI && !isLoading && (
            <MemoizedBranchSelector
              messageId={message._id}
              currentBranchIndex={message.branchIndex || 0}
              onBranchChange={eventHandlers.onBranchChange}
              className="debug-branch-selector"
            />
          )}

          {/* Chat Bubble Actions - hidden during loading */}
          {!isLoading && (
            <div
              className={cn(
                "flex h-9 w-full",
                isCurrentUser && !isAI ? "justify-end" : "justify-start"
              )}
            >
              <ChatBubbleAction
                visible={actionsVisible}
                onEdit={eventHandlers.onEdit}
                // onRetry={eventHandlers.onRetry}
                // onRetryAlternative={eventHandlers.onRetryAlternative}
                onCopy={eventHandlers.onCopy}
                onBranchConversation={eventHandlers.onBranchConversation}
                // onDropdownOpenChange={dropdownHandler}
                isAssistant={isAI}
                readOnly={readOnly}
              />
            </div>
          )}
        </div>
      </div>
    );
  }
);

MessageItem.displayName = "MessageItem";

export { MessageItem };
