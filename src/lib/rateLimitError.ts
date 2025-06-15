// Rate limit error handling utilities

export interface RateLimitInfo {
  isRateLimited: boolean;
  message: string;
  retryAfter?: number;
  limitType?: "user" | "model" | "anonymous";
}

// Parse rate limit error from Convex mutation
export function parseRateLimitError(error: Error): RateLimitInfo {
  const message = error.message.toLowerCase();
  
  if (message.includes("rate limit exceeded")) {
    // Extract retry time from error message
    const retryMatch = message.match(/try again in (\d+) seconds/);
    const retryAfter = retryMatch ? parseInt(retryMatch[1]) * 1000 : undefined;
    
    let limitType: "user" | "model" | "anonymous" = "user";
    
    if (message.includes("model usage limit")) {
      limitType = "model";
    } else if (message.includes("anonymous")) {
      limitType = "anonymous";
    }
    
    return {
      isRateLimited: true,
      message: error.message,
      retryAfter,
      limitType,
    };
  }
  
  return {
    isRateLimited: false,
    message: error.message,
  };
}

// Generate user-friendly rate limit messages
export function getRateLimitMessage(info: RateLimitInfo): string {
  if (!info.isRateLimited) {
    return info.message;
  }
  
  const retryText = info.retryAfter 
    ? `Please try again in ${Math.ceil(info.retryAfter / 1000)} seconds.`
    : "Please try again later.";
  
  switch (info.limitType) {
    case "anonymous":
      return `You've reached the message limit for anonymous users. ${retryText} Consider signing up for a free account to get more messages.`;
      
    case "model":
      return `You've reached the usage limit for this AI model. ${retryText} Try using a different model or upgrade your plan for higher limits.`;
      
    case "user":
    default:
      return `You've reached your daily message limit. ${retryText} Upgrade your plan for higher limits.`;
  }
}

// Hook to handle rate limit state
export function useRateLimitHandler() {
  const handleRateLimitError = (error: Error) => {
    const rateLimitInfo = parseRateLimitError(error);
    
    if (rateLimitInfo.isRateLimited) {
      const userMessage = getRateLimitMessage(rateLimitInfo);
      
      // You can customize this to use your preferred notification system
      // For now, we'll just return the info for the component to handle
      return {
        isRateLimited: true,
        message: userMessage,
        retryAfter: rateLimitInfo.retryAfter,
        limitType: rateLimitInfo.limitType,
      };
    }
    
    return {
      isRateLimited: false,
      message: error.message,
    };
  };
  
  return { handleRateLimitError };
} 