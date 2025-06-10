"use client";

import { cn } from "@/lib/utils";
import { useUser } from "@clerk/nextjs";
import { Doc } from "../../../convex/_generated/dataModel";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { FilePreview } from "./FilePreview";

interface MessageWithFiles extends Doc<"messages"> {
  attachedFiles?: Doc<"files">[];
}

interface MessageListProps {
  messages: MessageWithFiles[];
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
        const hasFiles = message.attachedFiles && message.attachedFiles.length > 0;

        return (
          <div
            key={message._id}
            className={cn(
              "flex flex-col gap-1 sm:max-w-[90%] w-full",
              isCurrentUser && !isAI ? "m-auto" : ""
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
                <span className="text-xs text-muted-foreground order-1">Assistant:</span>
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
                "flex flex-col w-full gap-2",
                isCurrentUser && !isAI ? "items-end" : "items-start"
              )}
            >
              {/* Attached Files */}
              {hasFiles && (
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
                    "rounded-2xl px-4 py-2 break-words max-w-full",
                    isAI
                      ? "bg-purple-50 text-foreground"
                      : isSystem
                        ? "bg-gray-50 text-gray-700 border border-gray-200 text-sm"
                        : isCurrentUser
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-foreground"
                  )}
                >
                  {/* Render markdown for AI and user messages, plain text for system */}
                  {isSystem ? (
                    <p className="whitespace-pre-wrap text-base">
                      {message.content}
                    </p>
                  ) : (
                    <MarkdownRenderer content={message.content} />
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
