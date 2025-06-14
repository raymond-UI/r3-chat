import { Doc, Id } from "../../convex/_generated/dataModel";

// User Profile Types
export interface UserProfile extends Doc<"userProfiles"> {
  username: string;
  displayName?: string;
  role?: string;
  avatar?: string;
  profileViews: number;
}

export interface PublicProfile {
  userId: string;
  username: string;
  displayName?: string;
  customSlug?: string;
  role?: string;
  avatar?: string;
  profileViews: number;
  socialLinks?: {
    twitter?: string;
    github?: string;
    linkedin?: string;
    website?: string;
  };
  showcaseSettings: {
    showFeaturedFirst: boolean;
    groupByTags: boolean;
    showStats: boolean;
    allowSearch: boolean;
  };
}

// Conversation Showcase Types
export interface ConversationShowcase {
  isShownOnProfile: boolean;
  isFeatured: boolean;
  tags: string[];
  description?: string;
  excerpt?: string;
}

export interface ConversationWithStats extends Doc<"conversations"> {
  likeCount: number;
  viewCount: number;
  previewMessages: Doc<"messages">[];
  showcase?: ConversationShowcase;
}

// Profile Analytics Types
export interface ProfileView {
  profileUserId: string;
  viewerUserId?: string;
  ipAddress?: string;
  userAgent?: string;
  conversationId?: Id<"conversations">;
  createdAt: number;
}

export interface ConversationLike {
  conversationId: Id<"conversations">;
  userId: string;
  createdAt: number;
}

// Tag Types
export interface PopularTag {
  tag: string;
  count: number;
}

// Profile Creation/Update Types
export interface CreateProfileData {
  username: string;
  displayName?: string;
  role?: string;
  isPublic?: boolean;
  customSlug?: string;
  socialLinks?: {
    twitter?: string;
    github?: string;
    linkedin?: string;
    website?: string;
  };
  showcaseSettings?: {
    showFeaturedFirst: boolean;
    groupByTags: boolean;
    showStats: boolean;
    allowSearch: boolean;
  };
}

export interface UpdateShowcaseData {
  conversationId: Id<"conversations">;
  showcase: ConversationShowcase;
}

// Profile Query Options
export interface ProfileConversationsOptions {
  userId: string;
  limit?: number;
  offset?: number;
  featuredOnly?: boolean;
  tag?: string;
}

export interface ProfileConversationsResult {
  conversations: ConversationWithStats[];
  total: number;
  hasMore: boolean;
}

// Profile Search Types
export interface ProfileSearchResult {
  userId: string;
  username: string;
  displayName?: string;
  role?: string;
  avatar?: string;
  profileViews: number;
}

// Social Platform Types
export type SocialPlatform = "twitter" | "github" | "linkedin" | "website";

// Profile Theme Types (for future use)
export type ProfileTheme = "default" | "minimal" | "dark" | "colorful";

// Profile Status Types
export interface ProfileStatus {
  hasProfile: boolean;
  isPublic: boolean;
  profileUrl: string | null;
  canEdit: boolean;
}

// Engagement Types
export interface ConversationEngagement {
  liked: boolean;
  likeCount: number;
  viewCount: number;
}
