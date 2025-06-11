"use client";

import { cn } from "@/lib/utils";
import { useUser } from "@clerk/nextjs";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { FilePreview } from "./FilePreview";

interface MessageWithFiles extends Doc<"messages"> {
  attachedFiles?: Doc<"files">[];
}

// Optimistic message type for streaming
interface OptimisticMessage {
  _id: string;
  conversationId: Id<"conversations">;
  userId: string;
  content: string;
  type: "user" | "ai" | "system";
  timestamp: number;
  aiModel?: string;
  attachments?: Array<{
    file_name: string;
    file_type: string;
    file_size: number;
    file_url: string;
    extracted_content?: string;
  }>;
  isOptimistic?: boolean;
  isStreaming?: boolean;
}

type MessageType = MessageWithFiles | OptimisticMessage;

interface MessageListProps {
  messages: MessageType[];
}

export function MessageList({ messages }: MessageListProps) {
  const { user } = useUser();

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
        const isOptimistic = 'isOptimistic' in message && message.isOptimistic;
        const isStreaming = 'isStreaming' in message && message.isStreaming;
        const hasFiles = 'attachedFiles' in message && message.attachedFiles && message.attachedFiles.length > 0;

        return (
          <div
            key={message._id}
            className={cn(
              "flex flex-col px-2 sm:px-0 gap-1 sm:max-w-[90%] w-full",
              isCurrentUser && !isAI ? "m-auto" : "",
              isOptimistic ? "opacity-95" : ""
            )}
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
                  Assistant{isStreaming ? " (typing...)" : ""}:
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
              {hasFiles && 'attachedFiles' in message && (
                <div className={cn(
                  "flex flex-col gap-2 max-w-md",
                  isCurrentUser && !isAI ? "items-end" : "items-start"
                )}>
                  {message.attachedFiles?.map((file) => (
                    <FilePreview key={file._id} file={file} className="max-w-full" />
                  ))}
                </div>
              )}

              {/* Message Bubble */}
              {message.content && (
                <div
                  className={cn(
                    "rounded-2xl p-2 break-words max-w-full",
                    isAI
                      ? "bg-transparent text-foreground"
                      : isSystem
                        ? "bg-transparent text-foreground wrap-anywhere border w-full text-sm"
                        : isCurrentUser
                          ? "bg-primary/20 text-primary"
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
                      {/* Show blinking cursor while streaming */}
                      {isStreaming && (
                        <span className="inline-block w-2 h-4 bg-primary/60 animate-pulse ml-1" />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
