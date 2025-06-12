"use client";

import { cn } from "@/lib/utils";
import { useUser } from "@clerk/nextjs";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { FilePreview, FilePreviewCompact } from "./FilePreview";
import { ChatBubbleAction } from "../actions/ChatBubbleAction";
import { BranchSelector } from "./BranchSelector";
import { useBranching } from "@/hooks/useBranching";
import { useConversationBranching } from "@/hooks/useConversationBranching";
import { useState } from "react";
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
}

export function MessageList({ messages, conversationId }: MessageListProps) {
  const { user } = useUser();
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const { switchBranch, regenerateResponse } = useBranching(conversationId);
  const { createConversationBranch } = useConversationBranching();

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
        messageId as Id<"messages">,
        `Branched conversation`
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

  const handleCreateBranch = async (messageId: string) => {
    try {
      await regenerateResponse(
        messageId as Id<"messages">,
        "Generate new alternative"
      );
    } catch (error) {
      console.error("Failed to create new branch:", error);
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
          "attachedFiles" in message &&
          message.attachedFiles &&
          message.attachedFiles.length > 0;

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
              {hasFiles && "attachedFiles" in message && (
                <div
                  className={cn(
                    "flex flex-col gap-2 max-w-md",
                    isCurrentUser && !isAI ? "items-end" : "items-start"
                  )}
                >
                  {message.attachedFiles?.map((file) => (
                    <FilePreview
                      key={file._id}
                      file={file}
                      className="max-w-full"
                    />
                  ))}
                  {message.attachedFiles?.map((file) => (
                    <FilePreviewCompact
                      key={file._id}
                      file={file}
                      className="max-w-full"
                    />
                  ))}
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

              {/* 🌿 Branch Selector - Show for AI messages */}
              {isAI && (
                <div
                  className={cn(
                    "BranchSelector relative flex h-9 w-full bg-muted rounded p-1",
                    isCurrentUser && !isAI ? "justify-end" : "justify-start"
                  )}
                >
                  <BranchSelector
                    messageId={message._id as Id<"messages">}
                    currentBranchIndex={message.branchIndex || 0}
                    onBranchChange={(branchIndex) =>
                      handleBranchChange(message._id, branchIndex)
                    }
                    onCreateBranch={() => handleCreateBranch(message._id)}
                    className="debug-branch-selector"
                  />
                </div>
              )}

              {/* Chat Bubble Actions - Positioned below message */}
              <div
                className={cn(
                  "flex h-9 w-full",
                  isCurrentUser && !isAI ? "justify-end" : "justify-start"
                )}
              >
                <ChatBubbleAction
                  visible={hoveredMessageId === message._id}
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
                  isAssistant={isAI}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
