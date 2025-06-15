"use client";

import { cn } from "@/lib/utils";
import { useUser } from "@clerk/nextjs";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { FilePreview } from "./FilePreview";
import { ChatBubbleAction } from "../actions/ChatBubbleAction";
import { BranchSelector } from "./BranchSelector";
import { useBranching } from "@/hooks/useBranching";
import { useConversationBranching } from "@/hooks/useConversationBranching";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";

interface MessageWithFiles extends Doc<"messages"> {
  attachedFiles?: Doc<"files">[];
}

// 🆕 Enhanced message type with streaming status
interface EnhancedMessage extends MessageWithFiles {
  isRealTimeStreaming?: boolean;
}

type MessageType = EnhancedMessage;

interface MessageListProps {
  messages: MessageType[];
  conversationId: Id<"conversations">;
  readOnly?: boolean;
}

export function MessageList({ messages, conversationId, readOnly = false }: MessageListProps) {
  const { user } = useUser();
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [openDropdownMessageId, setOpenDropdownMessageId] = useState<
    string | null
  >(null);
  const [isMobile, setIsMobile] = useState(false);
  const { switchBranch, regenerateResponse } = useBranching(conversationId);
  const { createConversationBranch } = useConversationBranching();

  // Detect if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || "ontouchstart" in window);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const handleEdit = (messageId: string) => {
    // TODO: Implement edit functionality
    console.log("Edit message:", messageId);
  };

  const handleRetry = async (messageId: string) => {
    try {
      // Find the user message that preceded this AI response
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
  };

  const handleRetryAlternative = async (messageId: string) => {
    try {
      // Find the user message that preceded this AI response
      const messageIndex = messages.findIndex((m) => m._id === messageId);
      const previousUserMessage = messages
        .slice(0, messageIndex)
        .reverse()
        .find((m) => m.type === "user");

      if (previousUserMessage) {
        // This creates an alternative branch instead of replacing
        await regenerateResponse(
          messageId as Id<"messages">,
          previousUserMessage.content
        );
      }
    } catch (error) {
      console.error("Failed to create alternative:", error);
    }
  };

  const handleBranchConversation = async (messageId: string) => {
    try {
      // Create a new conversation branched from this message point
      await createConversationBranch(
        conversationId,
        messageId as Id<"messages">
      );
    } catch (error) {
      console.error("Failed to branch conversation:", error);
    }
  };

  const handleBranchChange = async (messageId: string, branchIndex: number) => {
    try {
      await switchBranch(messageId as Id<"messages">, branchIndex);
    } catch (error) {
      console.error("Failed to switch branch:", error);
    }
  };

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
      {messages.map((message) => {
        const isCurrentUser = message.userId === user?.id;
        const isAI = message.type === "ai";
        const isSystem = message.type === "system";
        // 🆕 Enhanced streaming status detection
        const isStreaming = message.status === "streaming";
        // const isMyStream = message.streamingForUser === user?.id;
        const isRealTimeStreaming = message.isRealTimeStreaming || false;
        const hasFiles =
          ("attachedFiles" in message &&
            message.attachedFiles &&
            message.attachedFiles.length > 0) ||
          (message.attachments && message.attachments.length > 0);

        // Debug logging for file attachments
        if (hasFiles) {
          console.log("Message with files:", {
            messageId: message._id,
            attachedFiles: "attachedFiles" in message ? message.attachedFiles?.length : 0,
            attachments: message.attachments?.length || 0,
          });
        }

        if (isSystem) {
          return (
            <div key={message._id} className="flex justify-center">
              <Badge variant="secondary" className="text-xs">
                {message.content}
              </Badge>
            </div>
          );
        }

        return (
          <div
            key={message._id}
            className={cn(
              "flex flex-col px-2 sm:px-0 gap-1 sm:max-w-[90%] h-full w-full",
              isCurrentUser && !isAI ? "m-auto" : "",
              // 🆕 Visual indication for streaming messages
              isStreaming ? "opacity-95" : ""
            )}
            onMouseEnter={() => setHoveredMessageId(message._id)}
            onMouseLeave={() => setHoveredMessageId(null)}
          >
            {/* sender */}
            <div
              className={cn(
                "flex items-center mt-4",
                isCurrentUser && !isAI ? "ml-auto" : ""
              )}
            >
              {isAI ? (
                <span className="text-xs text-muted-foreground order-1">
                  {/*  streaming indicator */}
                  Assistant:
                </span>
              ) : isSystem ? (
                <span className="text-xs text-muted-foreground">System:</span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {user?.firstName || "U"}:
                </span>
              )}
              <div
                className={cn(
                  "text-xs text-muted-foreground pl-1",
                  isCurrentUser && !isAI ? "ml-auto" : "order-2"
                )}
              >
                {new Date(message.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>

            {/* Message Content */}
            <div
              className={cn(
                "flex flex-col  w-full gap-2",
                isCurrentUser && !isAI ? "items-end" : "items-start"
              )}
            >
              {/* Attached Files */}
              {hasFiles && (
                <div
                  className={cn(
                    "flex flex-col gap-2 max-w-md",
                    isCurrentUser && !isAI ? "items-end" : "items-start"
                  )}
                >
                  {/* Render files from attachedFiles (database query) */}
                  {"attachedFiles" in message && message.attachedFiles?.map((file) => (
                    <FilePreview
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
              )}

              {/* Message Bubble */}
              {message.content && (
                <div
                  className={cn(
                    "rounded-2xl p-2 break-words max-w-full relative",
                    isAI
                      ? "bg-transparent text-foreground"
                      : isSystem
                        ? "bg-transparent text-foreground wrap-anywhere border w-full text-sm"
                        : isCurrentUser
                          ? "bg-primary/10 text-primary max-h-80 overflow-y-auto"
                          : "bg-muted text-foreground"
                  )}
                >
                  {/* Render markdown for AI and user messages, plain text for system */}
                  {isSystem ? (
                    <p className="w-full max-w-full text-base">
                      {message.content}
                    </p>
                  ) : (
                    <div className="relative">
                      <MarkdownRenderer content={message.content} />
                      {/* 🆕 Enhanced streaming cursor - only show for real-time streaming */}
                      {isRealTimeStreaming && (
                        <span className="inline-block w-2 h-4 bg-primary/60 animate-pulse ml-1" />
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 🌿 Branch Selector - Show for AI messages with branches */}
              {isAI && (
                <BranchSelector
                  messageId={message._id}
                  currentBranchIndex={message.branchIndex || 0}
                  onBranchChange={(branchIndex) =>
                    handleBranchChange(message._id, branchIndex)
                  }
                  className="debug-branch-selector"
                />
              )}

              {/* Chat Bubble Actions - Positioned below message */}
              <div
                className={cn(
                  "flex h-9 w-full",
                  isCurrentUser && !isAI ? "justify-end" : "justify-start"
                )}
              >
                <ChatBubbleAction
                  visible={
                    isMobile ||
                    hoveredMessageId === message._id ||
                    openDropdownMessageId === message._id
                  }
                  onEdit={(e) => {
                    e.stopPropagation();
                    handleEdit(message._id);
                  }}
                  onRetry={(e) => {
                    e.stopPropagation();
                    handleRetry(message._id);
                  }}
                  onRetryAlternative={(e) => {
                    e.stopPropagation();
                    handleRetryAlternative(message._id);
                  }}
                  onCopy={(e) => {
                    e.stopPropagation();
                    handleCopy(message.content);
                  }}
                  onBranchConversation={(e) => {
                    e.stopPropagation();
                    handleBranchConversation(message._id);
                  }}
                  onDropdownOpenChange={(isOpen) => {
                    setOpenDropdownMessageId(isOpen ? message._id : null);
                  }}
                  isAssistant={isAI}
                  readOnly={readOnly}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
