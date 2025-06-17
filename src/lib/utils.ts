import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { Id, TableNames } from "../../convex/_generated/dataModel";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Utility function to check if a string is a valid Convex ID
export function isValidConvexId<T extends TableNames>(
  id: string
): id is Id<T> {
  // Convex IDs follow a specific format pattern
  // They typically don't start with prefixes like "msg-" and don't contain hyphens
  // They are also longer than typical UUID prefixes
  return !id.startsWith("msg-") && !id.includes("-") && id.length > 10;
}

// Utility to get or create a persistent anonymous user ID in localStorage
export function getOrCreateAnonymousId(): string {
  if (typeof window === "undefined") {
    // Not in browser, return empty string (should not be used server-side)
    return "";
  }
  const key = "anonymous_user_id";
  let anonId = localStorage.getItem(key);
  if (!anonId) {
    anonId = `anonymous_${crypto.randomUUID()}`;
    localStorage.setItem(key, anonId);
    console.log("Generated new anonymous ID:", anonId);
  } else {
    console.log("Using existing anonymous ID:", anonId);
  }
  return anonId;
}
