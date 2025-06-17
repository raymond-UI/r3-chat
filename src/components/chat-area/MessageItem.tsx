"use client";

import React, { memo, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
// import { MarkdownRenderer } from "@/components/chat/MarkdownRenderer";
import type { MessageItemProps } from "@/types/message";
import dynamic from "next/dynamic";

const FilePreview = dynamic(() => import("@/components/chat/FilePreview").then((mod) => mod.FilePreview), {
  ssr: false,
});

const ChatBubbleAction = dynamic(() => import("@/components/actions/ChatBubbleAction").then((mod) => mod.ChatBubbleAction), {
  ssr: false,
});

const BranchSelector = dynamic(() => import("@/components/chat/BranchSelector").then((mod) => mod.BranchSelector), {
  ssr: false,
});

const MarkdownRenderer = dynamic(() => import("@/components/chat/MarkdownRenderer").then((mod) => mod.MarkdownRenderer), {
  ssr: false,
});

// Memoized file preview component to prevent unnecessary re-renders
const MemoizedFilePreview = memo(FilePreview);

// Memoized markdown renderer for better performance
const MemoizedMarkdownRenderer = memo(MarkdownRenderer);

// Memoized branch selector
const MemoizedBranchSelector = memo(BranchSelector);

// Individual message component with optimization
const MessageItem = memo<MessageItemProps>(({
  message,
  currentUserId,
  hoveredMessageId,
  openDropdownMessageId,
  isMobile,
  readOnly,
  handlers,
  onMouseEnter,
  onMouseLeave,
  onDropdownChange,
}) => {
  // Memoized computed values to prevent recalculation
  const messageMetadata = useMemo(() => ({
    isCurrentUser: message.userId === currentUserId,
    isAI: message.type === "ai",
    isSystem: message.type === "system",
    isStreaming: message.status === "streaming",
    isRealTimeStreaming: message.isRealTimeStreaming || false,
    hasFiles: (
      ("attachedFiles" in message && message.attachedFiles && message.attachedFiles.length > 0) ||
      (message.attachments && message.attachments.length > 0)
    ),
    timestamp: new Date(message.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
  }), [message, currentUserId]);

  // Memoized event handlers to prevent prop drilling re-renders
  const eventHandlers = useMemo(() => ({
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
  }), [message._id, message.content, handlers]);

  // Memoized mouse event handlers
  const mouseHandlers = useMemo(() => ({
    onMouseEnter: () => onMouseEnter(message._id),
    onMouseLeave: onMouseLeave,
  }), [message._id, onMouseEnter, onMouseLeave]);

  // Memoized dropdown handler
  const dropdownHandler = useCallback((isOpen: boolean) => {
    onDropdownChange(isOpen ? message._id : null);
  }, [message._id, onDropdownChange]);

  // Memoized file attachments rendering (always called, conditional logic inside)
  const fileAttachments = useMemo(() => {
    const { hasFiles, isCurrentUser, isAI } = messageMetadata;
    if (!hasFiles) return null;

    return (
      <div className={cn(
        "flex flex-col gap-2 max-w-md",
        isCurrentUser && !isAI ? "items-end" : "items-start"
      )}>
        {/* Render files from attachedFiles (database query) */}
        {"attachedFiles" in message && message.attachedFiles?.map((file) => (
          <MemoizedFilePreview
            key={file._id}
            file={file}
            className="max-w-full"
          />
        ))}
        
        {/* Fallback: Render files from attachments (message schema) */}
        {message.attachments && !("attachedFiles" in message && message.attachedFiles?.length) && 
          message.attachments.map((attachment, index) => (
            <div key={index} className="p-2 bg-muted/50 border rounded text-sm">
              <p className="font-medium">{attachment.file_name}</p>
              <p className="text-xs text-muted-foreground">
                {attachment.file_type.toUpperCase()} • {(attachment.file_size / 1024 / 1024).toFixed(1)} MB
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
          ))
        }
      </div>
    );
  }, [message, messageMetadata]);

  // Memoized message content rendering (always called, conditional logic inside)
  const messageContent = useMemo(() => {
    const { isAI, isCurrentUser, isRealTimeStreaming } = messageMetadata;
    if (!message.content) return null;

    return (
      <div className={cn(
        "rounded-2xl p-2 break-words max-w-full relative",
        isAI
          ? "bg-transparent text-foreground"
          : isCurrentUser
            ? "bg-primary/10 text-primary max-h-80 overflow-y-auto"
            : "bg-muted text-foreground"
      )}>
        <div className="relative">
          <MemoizedMarkdownRenderer content={message.content} />
          {/* Enhanced streaming cursor - only show for real-time streaming */}
          {isRealTimeStreaming && (
            <span className="inline-block w-2 h-4 bg-primary/60 animate-pulse ml-1" />
          )}
        </div>
      </div>
    );
  }, [message.content, messageMetadata]);

  const { isCurrentUser, isAI, isSystem, isStreaming, timestamp } = messageMetadata;

  // System message rendering (early return for performance)
  if (isSystem) {
    return (
      <div className="flex justify-center">
        <Badge variant="secondary" className="text-xs">
          {message.content}
        </Badge>
      </div>
    );
  }

  // Action visibility logic
  const actionsVisible = isMobile || hoveredMessageId === message._id || openDropdownMessageId === message._id;

  return (
    <div
      className={cn(
        "flex flex-col px-2 sm:px-0 gap-1 h-full w-full",
        isCurrentUser && !isAI ? "m-auto" : "",
        isStreaming ? "opacity-95" : ""
      )}
      {...mouseHandlers}
    >
      {/* Sender info */}
      <div className={cn(
        "flex items-center mt-4",
        isCurrentUser && !isAI ? "ml-auto" : ""
      )}>
        <span className="text-xs text-muted-foreground order-1">
          {isAI ? "Assistant:" : message.senderName || "User:"}
        </span>
        <div className={cn(
          "text-xs text-muted-foreground pl-1",
          isCurrentUser && !isAI ? "ml-auto" : "order-2"
        )}>
          {timestamp}
        </div>
      </div>

      {/* Message Content */}
      <div className={cn(
        "flex flex-col w-full gap-2",
        isCurrentUser && !isAI ? "items-end" : "items-start"
      )}>
        {/* File attachments */}
        {fileAttachments}

        {/* Message bubble */}
        {messageContent}

        {/* Branch Selector for AI messages */}
        {isAI && (
          <MemoizedBranchSelector
            messageId={message._id}
            currentBranchIndex={message.branchIndex || 0}
            onBranchChange={eventHandlers.onBranchChange}
            className="debug-branch-selector"
          />
        )}

        {/* Chat Bubble Actions */}
        <div className={cn(
          "flex h-9 w-full",
          isCurrentUser && !isAI ? "justify-end" : "justify-start"
        )}>
          <ChatBubbleAction
            visible={actionsVisible}
            onEdit={eventHandlers.onEdit}
            onRetry={eventHandlers.onRetry}
            onRetryAlternative={eventHandlers.onRetryAlternative}
            onCopy={eventHandlers.onCopy}
            onBranchConversation={eventHandlers.onBranchConversation}
            onDropdownOpenChange={dropdownHandler}
            isAssistant={isAI}
            readOnly={readOnly}
          />
        </div>
      </div>
    </div>
  );
});

MessageItem.displayName = "MessageItem";

export { MessageItem }; 