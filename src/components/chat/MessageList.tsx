"use client";

import { useUser } from "@clerk/nextjs";
import { Doc } from "../../../convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface MessageListProps {
  messages: Doc<"messages">[];
}

export function MessageList({ messages }: MessageListProps) {
  const { user } = useUser();

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-lg mb-2">No messages yet</p>
          <p className="text-sm">Start the conversation by sending a message below</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((message) => {
        const isCurrentUser = message.userId === user?.id;
        const isAI = message.type === "ai";
        const isSystem = message.type === "system";

        return (
          <div
            key={message._id}
            className={cn(
              "flex gap-3 max-w-[80%]",
              isCurrentUser && !isAI ? "ml-auto flex-row-reverse" : ""
            )}
          >
            {/* Avatar */}
            <Avatar className="h-8 w-8 flex-shrink-0">
              {isAI ? (
                <AvatarFallback className="bg-purple-100 text-purple-600">
                  AI
                </AvatarFallback>
              ) : isSystem ? (
                <AvatarFallback className="bg-gray-100 text-gray-600">
                  SYS
                </AvatarFallback>
              ) : (
                <>
                  <AvatarImage 
                    src={user?.id === message.userId ? user?.imageUrl : undefined} 
                  />
                  <AvatarFallback>
                    {user?.id === message.userId 
                      ? user?.firstName?.charAt(0) || "U"
                      : "U"
                    }
                  </AvatarFallback>
                </>
              )}
            </Avatar>

            {/* Message Content */}
            <div className={cn(
              "flex flex-col",
              isCurrentUser && !isAI ? "items-end" : "items-start"
            )}>
              {/* Message Bubble */}
              <div
                className={cn(
                  "rounded-2xl px-4 py-2 break-words",
                  isAI 
                    ? "bg-purple-50 text-purple-900 border border-purple-200"
                    : isSystem
                    ? "bg-gray-50 text-gray-700 border border-gray-200 text-sm"
                    : isCurrentUser
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                )}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                
                {/* AI Model Badge */}
                {isAI && message.aiModel && (
                  <div className="mt-2 text-xs opacity-70">
                    {message.aiModel}
                  </div>
                )}
              </div>

              {/* Timestamp */}
              <div className={cn(
                "text-xs text-muted-foreground mt-1",
                isCurrentUser && !isAI ? "text-right" : "text-left"
              )}>
                {new Date(message.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
} 