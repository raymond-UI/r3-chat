/**
 * Utility functions for generating SEO-friendly slugs
 */

/**
 * Convert a string to a URL-friendly slug
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .substring(0, 50); // Limit length
}

/**
 * Generate a short unique identifier (6 characters)
 */
export function generateShortId(): string {
  return Math.random().toString(36).substring(2, 8);
}

/**
 * Create a full slug from title and conversation ID
 */
export function createConversationSlug(title: string, conversationId: string): string {
  const titleSlug = slugify(title || 'untitled-conversation');
  const shortId = conversationId.substring(0, 6); // Use first 6 chars of conversation ID
  return `${titleSlug}-${shortId}`;
}

/**
 * Parse a conversation slug to extract the conversation ID
 */
export function parseConversationSlug(slug: string): { titleSlug: string; shortId: string } {
  const parts = slug.split('-');
  if (parts.length < 2) {
    throw new Error('Invalid conversation slug format');
  }
  
  const shortId = parts[parts.length - 1]; // Last part is the ID
  const titleSlug = parts.slice(0, -1).join('-'); // Everything except last part
  
  return { titleSlug, shortId };
}

/**
 * Find conversation ID by matching the short ID prefix
 */
export function findConversationIdByShortId(shortId: string, conversationId: string): boolean {
  return conversationId.startsWith(shortId);
} 