import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  conversations: defineTable({
    title: v.string(),
    participants: v.array(v.string()), // Clerk user IDs
    lastMessage: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    isCollaborative: v.boolean(),
    // threadId field kept as optional for backward compatibility with existing data
    threadId: v.optional(v.string()),
    // 🌳 Conversation branching fields
    parentConversationId: v.optional(v.id("conversations")), // The conversation this was branched from
    branchedAtMessageId: v.optional(v.id("messages")), // The message point where this was branched
    branchedBy: v.optional(v.string()), // User who created the branch
    branchedAt: v.optional(v.number()), // When this branch was created
    // 🔗 Sharing and collaboration fields
    createdBy: v.optional(v.string()), // Clerk user ID of creator
    sharing: v.optional(v.object({
      isPublic: v.boolean(),
      shareId: v.string(),
      requiresPassword: v.boolean(),
      password: v.optional(v.string()),
      allowAnonymous: v.boolean(),
      expiresAt: v.optional(v.number()),
    })),
    // 🎭 Public Profile & Showcase fields
    showcase: v.optional(v.object({
      isShownOnProfile: v.boolean(), // Show on user's public profile
      isFeatured: v.boolean(), // Highlighted conversation
      tags: v.array(v.string()), // Topic tags (e.g., "coding", "creative", "research")
      description: v.optional(v.string()), // Brief description for the conversation
      excerpt: v.optional(v.string()), // Auto-generated or custom excerpt
    })),
  }),
  messages: defineTable({
    conversationId: v.id("conversations"),
    userId: v.string(),
    content: v.string(),
    aiModel: v.optional(v.string()),
    timestamp: v.number(),
    type: v.union(v.literal("user"), v.literal("ai"), v.literal("system")),
    status: v.optional(v.union(v.literal("complete"), v.literal("streaming"), v.literal("error"))),
    streamingForUser: v.optional(v.string()),
    lastUpdated: v.optional(v.number()),
    attachments: v.optional(v.array(v.object({
      file_name: v.string(),
      file_type: v.string(), 
      file_size: v.number(),
      extracted_content: v.optional(v.string()),
      file_url: v.string(),
    }))),
    // 🌿 Branching fields
    parentMessageId: v.optional(v.id("messages")), // The message this branches from
    branchIndex: v.optional(v.number()), // 0 = original, 1+ = alternatives
    isActiveBranch: v.optional(v.boolean()), // Which branch is currently active
    branchCreatedBy: v.optional(v.string()), // Who created this branch
    branchCreatedAt: v.optional(v.number()), // When this branch was created
  }).index("by_conversation", ["conversationId"])
    .index("by_status", ["status"])
    .index("by_parent", ["parentMessageId"])
    .index("by_conversation_branch", ["conversationId", "isActiveBranch"]),
  presence: defineTable({
    userId: v.string(),
    conversationId: v.id("conversations"),
    lastSeen: v.number(),
    isTyping: v.boolean(),
  }),
  files: defineTable({
    key: v.string(),
    name: v.string(),
    type: v.string(), // 'image' | 'pdf' | 'document'
    mimeType: v.string(),
    size: v.number(),
    url: v.string(),
    uploadedBy: v.string(), // Clerk user ID
    conversationId: v.id("conversations"),
    messageId: v.optional(v.id("messages")),
    uploadedAt: v.number(),
    // File analysis results
    extractedText: v.optional(v.string()), // For PDFs and OCR
    analysisResult: v.optional(v.string()), // AI analysis summary
    thumbnailUrl: v.optional(v.string()), // For file previews
  }),
  // User preferences (pinned conversations, etc.)
  userPreferences: defineTable({
    userId: v.string(),
    pinnedConversations: v.array(v.id("conversations")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),
  
  // 👤 User Profiles for public showcase
  userProfiles: defineTable({
    userId: v.string(), // Clerk user ID
    username: v.string(), // Unique username for /u/username URLs
    displayName: v.optional(v.string()), // Display name
    role: v.optional(v.string()), // User role/description
    avatar: v.optional(v.string()), // Avatar URL (from Clerk or custom)
    
    // Public profile settings
    isPublic: v.boolean(), // Whether profile is publicly accessible
    customSlug: v.optional(v.string()), // Custom URL slug (optional)
    
    // Profile customization
    theme: v.optional(v.string()), // Profile theme/style
    socialLinks: v.optional(v.object({
      twitter: v.optional(v.string()),
      github: v.optional(v.string()),
      linkedin: v.optional(v.string()),
      website: v.optional(v.string()),
    })),
    
    // Showcase preferences
    showcaseSettings: v.object({
      showFeaturedFirst: v.boolean(),
      groupByTags: v.boolean(),
      showStats: v.boolean(), // Show view counts, etc.
      allowSearch: v.boolean(), // Allow others to find this profile
    }),
    
    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
    profileViews: v.number(), // Total profile views
  }).index("by_user", ["userId"])
    .index("by_username", ["username"])
    .index("by_slug", ["customSlug"])
    .index("by_public", ["isPublic"]),
    
  // 📊 Profile Analytics
  profileViews: defineTable({
    profileUserId: v.string(), // Profile being viewed
    viewerUserId: v.optional(v.string()), // Who viewed it (null for anonymous)
    ipAddress: v.optional(v.string()), // For anonymous tracking
    userAgent: v.optional(v.string()),
    conversationId: v.optional(v.id("conversations")), // Which conversation was accessed
    createdAt: v.number(),
  }).index("by_profile", ["profileUserId"])
    .index("by_conversation", ["conversationId"])
    .index("by_date", ["createdAt"]),
    
  // 💝 Profile engagement
  conversationLikes: defineTable({
    conversationId: v.id("conversations"),
    userId: v.string(), // Who liked it
    createdAt: v.number(),
  }).index("by_conversation", ["conversationId"])
    .index("by_user", ["userId"])
    .index("by_user_conversation", ["userId", "conversationId"]),
}); 