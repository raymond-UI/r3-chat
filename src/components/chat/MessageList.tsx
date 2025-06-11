"use client";

import { cn } from "@/lib/utils";
import { useUser } from "@clerk/nextjs";
import { Doc } from "../../../convex/_generated/dataModel";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { FilePreview } from "./FilePreview";

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
        // 🆕 Enhanced streaming status detection
        const isStreaming = message.status === "streaming";
        // const isMyStream = message.streamingForUser === user?.id;
        const isRealTimeStreaming = message.isRealTimeStreaming || false;
        const hasFiles =
          "attachedFiles" in message &&
          message.attachedFiles &&
          message.attachedFiles.length > 0;

        return (
          <div
            key={message._id}
            className={cn(
              "flex flex-col px-2 sm:px-0 gap-1 sm:max-w-[90%] h-full w-full",
              isCurrentUser && !isAI ? "m-auto" : "",
              // 🆕 Visual indication for streaming messages
              isStreaming ? "opacity-95" : ""
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
                      {/* 🆕 Enhanced streaming cursor - only show for real-time streaming */}
                      {isRealTimeStreaming && (
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
