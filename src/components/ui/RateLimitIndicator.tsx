"use client";

import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Badge } from "./badge";
import { Clock, AlertTriangle, CheckCircle } from "lucide-react";

interface RateLimitIndicatorProps {
  className?: string;
  model?: string;
  showDetails?: boolean;
}

export function RateLimitIndicator({
  className = "",
  model,
  showDetails = false,
}: RateLimitIndicatorProps) {
  const rateLimitStatus = useQuery(api.rateLimitChecks.getRateLimitStatus);
  const messageRateLimit = useQuery(api.rateLimitChecks.checkMessageRateLimit, {
    aiModel: model,
  });

  if (!rateLimitStatus) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="h-4 w-4 animate-pulse bg-gray-300 rounded" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  const { userType, userLimit, isAnonymous } = rateLimitStatus;
  const canSendMessage = messageRateLimit?.canSendMessage ?? true;

  // Calculate status
  const isLimited = !canSendMessage || !userLimit.ok;
  
  // Calculate reset time from retryAfter
  const retryAfter = userLimit.retryAfter;
  const timeUntilReset = retryAfter || 0;
  const hoursUntilReset = Math.floor(timeUntilReset / (1000 * 60 * 60));
  const minutesUntilReset = Math.floor((timeUntilReset % (1000 * 60 * 60)) / (1000 * 60));

  // Status badge
  const statusBadge = isLimited ? (
    <Badge variant="destructive" className="flex items-center gap-1">
      <AlertTriangle className="h-3 w-3" />
      Rate Limited
    </Badge>
  ) : (
    <Badge variant="outline" className="flex items-center gap-1 border-green-200 text-green-600">
      <CheckCircle className="h-3 w-3" />
      Available
    </Badge>
  );

  if (!showDetails) {
    return <div className={className}>{statusBadge}</div>;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {statusBadge}
      
      <div className="text-xs text-muted-foreground space-y-1">
        <p>
          <span className="font-medium">Account:</span>{" "}
          {isAnonymous ? "Anonymous" : userType === "free" ? "Free" : "Premium"}
        </p>
        
        {isLimited && timeUntilReset > 0 && (
          <p className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Resets in {hoursUntilReset}h {minutesUntilReset}m
          </p>
        )}
        
        {isAnonymous && (
          <p className="text-blue-600 text-xs">
            💡 Sign up for a free account to get more messages!
          </p>
        )}
        
        {userType === "free" && isLimited && (
          <p className="text-blue-600 text-xs">
            💡 Upgrade to premium for unlimited messages!
          </p>
        )}
        
        {model && messageRateLimit?.limits.model && (
          <div className="border-t pt-1 mt-1">
            <p className="font-medium">Model Limits ({model}):</p>
            <p>
              Daily: {messageRateLimit.limits.model.daily.ok ? "✅ Available" : "❌ Limited"}
            </p>
            <p>
              Monthly: {messageRateLimit.limits.model.monthly.ok ? "✅ Available" : "❌ Limited"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 