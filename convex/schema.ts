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
}); 