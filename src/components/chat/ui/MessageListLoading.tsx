"use client";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface MessageListLoadingProps {
  messageCount?: number;
  className?: string;
}

export function MessageListLoading({
  messageCount = 3,
  className,
}: MessageListLoadingProps) {
  // Generate a mix of user and AI message skeletons
  const generateMessageSkeletons = () => {
    const skeletons = [];

    for (let i = 0; i < messageCount; i++) {
      const isAI = i % 2 === 1; // Alternate between user and AI messages
      const isCurrentUser = !isAI;

      skeletons.push(
        <div
          key={i}
          className={cn(
            "flex flex-col px-2 sm:px-0 gap-1 sm:max-w-[90%] w-full",
            isCurrentUser ? "m-auto" : ""
          )}
        >
          {/* Sender skeleton */}
          <div
            className={cn(
              "flex items-center mt-4 gap-2",
              isCurrentUser ? "ml-auto" : ""
            )}
          >
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-12" />
          </div>

          {/* Message content skeleton */}
          <div
            className={cn(
              "flex flex-col w-full gap-2",
              isCurrentUser ? "items-end" : "items-start"
            )}
          >
            {/* Message bubble skeleton */}
            <div
              className={cn(
                "rounded-2xl p-2 w-full max-w-full",
                isAI
                  ? "bg-transparent"
                  : isCurrentUser
                    ? "bg-primary/5"
                    : "bg-muted/50"
              )}
            >
              {/* Content lines - vary the number for realism */}
              <div className="space-y-2">
                <Skeleton
                  className={cn(
                    "h-4",
                    isAI ? "w-3/4" : isCurrentUser ? "w-2/3" : "w-4/5"
                  )}
                />
                {(i + 1) % 3 !== 0 && (
                  <Skeleton
                    className={cn(
                      "h-4",
                      isAI ? "w-1/2" : isCurrentUser ? "w-1/3" : "w-2/3"
                    )}
                  />
                )}
                {i % 2 === 0 && (
                  <Skeleton
                    className={cn(
                      "h-4",
                      isAI ? "w-2/3" : isCurrentUser ? "w-1/2" : "w-3/5"
                    )}
                  />
                )}
              </div>
            </div>

            {/* Action buttons skeleton */}
            <div
              className={cn(
                "flex h-9 w-full gap-1",
                isCurrentUser ? "justify-end" : "justify-start"
              )}
            >
              <Skeleton className="h-8 w-8 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-md" />
              {isAI && <Skeleton className="h-8 w-8 rounded-md" />}
            </div>
          </div>
        </div>
      );
    }

    return skeletons;
  };

  return (
    <div className={cn("space-y-6 animate-pulse w-full", className)}>
      {generateMessageSkeletons()}
    </div>
  );
}

// Alternative compact loading version
export function MessageListLoadingCompact({
  messageCount = 2,
  className,
}: MessageListLoadingProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: messageCount }).map((_, i) => {
        const isAI = i % 2 === 1;

        return (
          <div
            key={i}
            className={cn(
              "flex flex-col gap-2",
              !isAI ? "items-end" : "items-start"
            )}
          >
            {/* Sender and timestamp */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-3 w-10" />
            </div>

            {/* Message bubble */}
            <div
              className={cn(
                "rounded-2xl p-3 max-w-[80%]",
                isAI ? "bg-muted/30" : "bg-primary/5"
              )}
            >
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Typing indicator for real-time streaming
export function TypingIndicator({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col px-2 sm:px-0 gap-1", className)}>
      {/* Sender */}
      <div className="flex items-center mt-4">
        <span className="text-xs text-muted-foreground">Assistant:</span>
        <div className="text-xs text-muted-foreground pl-1">
          {new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>

      {/* Typing animation */}
      <div className="flex flex-col items-start">
        <div className="rounded-2xl p-4 bg-transparent">
          <div className="flex items-center space-x-1">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce"></div>
            </div>
            <span className="text-xs text-muted-foreground ml-2">
              Thinking...
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
