"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";

interface MessageLimitIndicatorProps {
  remainingMessages: number;
  totalLimit: number;
  className?: string;
  onSignUpClick?: () => void;
}

export function MessageLimitIndicator({
  remainingMessages,
  totalLimit,
  className,
  onSignUpClick,
}: MessageLimitIndicatorProps) {
  const usedMessages = totalLimit - remainingMessages;
  const isLowOnMessages = remainingMessages <= 3;
  const isOutOfMessages = remainingMessages === 0;

  if (isOutOfMessages) {
    return (
      <Alert
        className={cn(
          "flex items-center justify-between gap-2 p-2 rounded-lg transition-colors w-full bg-destructive/30 backdrop-blur-sm border border-warning/50",
          className
        )}
      >
        <AlertTitle className="m-0 text-base">Message limit reached</AlertTitle>
        <AlertDescription className="sr-only">
          You&apos;ve reached your message limit.
        </AlertDescription>
        {onSignUpClick && (
          <Button size="sm" onClick={onSignUpClick} className="text-xs">
            Sign in to reset limit
          </Button>
        )}
      </Alert>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 p-2 rounded-lg transition-colors w-full bg-destructive/30 backdrop-blur-sm border border-warning/50 z-20",
        className
      )}
    >
      <div className="flex-1 min-w-0 text-left">
        <p
          className={cn(
            "text-base font-medium text-foreground"
          )}
        >
          You only have {remainingMessages} message
          {remainingMessages !== 1 ? "s" : ""} left
        </p>
      </div>
      <Badge
        variant="default"
        className={cn(
          "text-xs px-1.5 py-0.5",
          isLowOnMessages && "bg-warning/20 text-warning-foreground"
        )}
      >
        {usedMessages}/{totalLimit}
      </Badge>
      {isLowOnMessages && onSignUpClick && (
        <Button
          size="sm"
          onClick={onSignUpClick}
          className="text-xs h-6 px-2"
        >
          Upgrade to Pro
        </Button>
      )}
    </div>
  );
}
