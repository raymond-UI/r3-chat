"use client";

import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useState } from "react";

interface MessageLimitIndicatorProps {
  className?: string;
  model?: string;
  onSignUpClick?: () => void;
  showDetails?: boolean;
}

export function MessageLimitIndicator({
  className,
  onSignUpClick,
}: MessageLimitIndicatorProps) {
  const [isVisible, setIsVisible] = useState(true);
  const remainingMessages = useQuery(api.rateLimitChecks.getRemainingMessages);
  const rateLimitStatus = useQuery(api.rateLimitChecks.getRateLimitStatus);

  // Don't show anything while loading
  if (!remainingMessages || !rateLimitStatus || !isVisible) {
    return null;
  }

  const { remaining, isExhausted, userType } = remainingMessages;
  const { isAnonymous } = rateLimitStatus;

  // Don't show for paid users
  if (userType === "paid") {
    return null;
  }

  // Show different messages based on state
  let message = "";
  let showSignInLink = false;

  if (isExhausted) {
    if (isAnonymous) {
      message = "You've reached your message limit.";
      showSignInLink = true;
    } else {
      message = "You've reached your daily message limit.";
    }
  } else if (isAnonymous && remaining <= 10) {
    message = `You only have ${remaining} message${remaining === 1 ? '' : 's'} left.`;
    showSignInLink = true;
  } else if (userType === "free" && remaining <= 20) {
    message = `You have ${remaining} messages left today.`;
  } else {
    // Don't show indicator if plenty of messages remain
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 px-4 py-3 rounded-lg",
        "bg-amber-100 border border-amber-200 text-amber-800",
        "dark:bg-amber-900/20 dark:border-amber-800/30 dark:text-amber-200",
        "shadow-sm",
        className
      )}
    >
      <div className="flex items-center gap-3 flex-1">
        <span className="text-sm font-medium">
          {message}
        </span>
        {showSignInLink && (
          <Button
            variant="link"
            size="sm"
            onClick={onSignUpClick}
            className="text-amber-700 dark:text-amber-300 underline p-0 h-auto font-medium hover:text-amber-900 dark:hover:text-amber-100"
          >
            Sign in to reset your limits
          </Button>
        )}
      </div>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsVisible(false)}
        className="text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200 p-1 h-auto"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
