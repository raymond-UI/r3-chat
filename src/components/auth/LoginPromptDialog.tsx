"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { MessageSquare, Sparkles, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { ConfirmationModal } from "../actions/ConfirmationModal";

interface LoginPromptDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const BENEFITS = [
  {
    icon: MessageSquare,
    title: "Unlimited Messages",
    description: "Send as many messages as you want",
  },
  {
    icon: Sparkles,
    title: "Save Conversations", 
    description: "Your chats will be preserved and synced across devices",
  },
  {
    icon: Users,
    title: "Share & Collaborate",
    description: "Invite others to join your conversations",
  },
] as const;

export function LoginPromptDialog({
  isOpen,
  onClose,
}: LoginPromptDialogProps) {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  
  // Get remaining messages data from Convex
  const remainingMessages = useQuery(api.rateLimitChecks.getRemainingMessages);
  const rateLimitStatus = useQuery(api.rateLimitChecks.getRateLimitStatus);

  const handleSignIn = useCallback(async () => {
    if (isNavigating) return;
    
    setIsNavigating(true);
    try {
      const redirectUrl = encodeURIComponent(window.location.pathname);
      router.push(`/auth?redirect_url=${redirectUrl}`);
    } catch (error) {
      console.error("Navigation failed:", error);
      setIsNavigating(false);
    }
  }, [router, isNavigating]);

  const handleClose = useCallback(() => {
    if (!isNavigating) {
      onClose();
    }
  }, [onClose, isNavigating]);

  const { title, description } = useMemo(() => {
    if (!remainingMessages || !rateLimitStatus) {
      return {
        title: "Sign up to continue",
        description: "Sign up to unlock unlimited messages and more features!"
      };
    }

    const { remaining, total, isExhausted } = remainingMessages;
    const { isAnonymous } = rateLimitStatus;
    
    if (isExhausted) {
      return {
        title: "You've reached your message limit",
        description: isAnonymous 
          ? "You've used all 5 free messages. Sign up to continue chatting and unlock unlimited messages!"
          : "You've reached your daily limit. Sign up for a premium account to get unlimited messages!"
      };
    }
    
    const used = total - remaining;
    return {
      title: "You're running low on messages",
      description: `You've used ${used} of ${total} free messages. Sign up to continue chatting and unlock more features!`
    };
  }, [remainingMessages, rateLimitStatus]);

  const benefitsList = useMemo(
    () => BENEFITS.map((benefit, index) => {
      const Icon = benefit.icon;
      return (
        <div key={index} className="flex items-start gap-3">
          <div className="rounded-full bg-primary/10 p-2 mt-0.5 flex-shrink-0">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{benefit.title}</p>
            <p className="text-sm text-muted-foreground">
              {benefit.description}
            </p>
          </div>
        </div>
      );
    }),
    []
  );

  const footer = useMemo(
    () => (
      <div className="w-full p-4 border-t space-y-3">
        <div className="flex flex-col gap-3">
          <Button 
            onClick={handleSignIn} 
            className="w-full"
            disabled={isNavigating}
          >
            {isNavigating ? "Redirecting..." : "Sign Up Free"}
          </Button>
          <Button 
            variant="outline" 
            onClick={handleClose}
            className="w-full"
            disabled={isNavigating}
          >
            Not now
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Your current conversations will be saved to your account
        </p>
      </div>
    ),
    [handleSignIn, handleClose, isNavigating]
  );

  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      description={description}
      hideCloseButton={false}
      contentClassName="w-full px-4"
      footer={footer}
    >
      <div className="space-y-3 mb-6">
        {benefitsList}
      </div>
    </ConfirmationModal>
  );
} 