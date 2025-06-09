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
  }),
  messages: defineTable({
    conversationId: v.id("conversations"),
    userId: v.string(),
    content: v.string(),
    aiModel: v.optional(v.string()),
    timestamp: v.number(),
    type: v.union(v.literal("user"), v.literal("ai"), v.literal("system")),
  }).index("by_conversation", ["conversationId"]),
  presence: defineTable({
    userId: v.string(),
    conversationId: v.id("conversations"),
    lastSeen: v.number(),
    isTyping: v.boolean(),
  }),
  files: defineTable({
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
}); 