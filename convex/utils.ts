import { UserIdentity } from "convex/server";

// Extract client IP from request (for anonymous user tracking)
export function getClientIP(headers: Record<string, string>): string {
  // Check common headers for client IP
  const forwarded = headers["x-forwarded-for"];
  const realIP = headers["x-real-ip"];
  const clientIP = headers["x-client-ip"];
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  if (clientIP) {
    return clientIP;
  }
  
  return "unknown";
}

// Determine user type for rate limiting
export function getUserType(identity: UserIdentity | null): "anonymous" | "free" | "paid" {
  if (!identity) {
    // In development, treat anonymous users as free users to avoid strict limits
    return process.env.NODE_ENV === 'development' ? 'free' : 'anonymous';
  }
  
  // Check user metadata for plan type
  const metadata = identity.metadata as Record<string, unknown> | undefined;
  const plan = metadata?.plan as string | undefined;
  
  if (plan === "paid" || plan === "premium") {
    return "paid";
  }
  
  return "free";
}

// Generate a unique key for rate limiting (user ID or IP)
export function getRateLimitKey(identity: UserIdentity | null, headers?: Record<string, string>): string {
  if (identity?.subject) {
    return identity.subject;
  }
  
  // For anonymous users, use IP address
  if (headers) {
    return `ip:${getClientIP(headers)}`;
  }
  
  return "anonymous";
} 