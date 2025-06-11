import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all conversations for a user
export const list = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const allConversations = await ctx.db
      .query("conversations")
      .order("desc")
      .collect();
    
    return allConversations.filter(conversation => 
      conversation.participants.includes(userId)
    );
  },
});

// Get a single conversation by ID
export const get = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    return await ctx.db.get(conversationId);
  },
});

// Create a new conversation
export const create = mutation({
  args: {
    title: v.string(),
    participants: v.array(v.string()),
    isCollaborative: v.boolean(),
  },
  handler: async (ctx, { title, participants, isCollaborative }) => {
    const now = Date.now();
    return await ctx.db.insert("conversations", {
      title,
      participants,
      lastMessage: undefined,
      createdAt: now,
      updatedAt: now,
      isCollaborative,
    });
  },
});

// Add a participant to a collaborative conversation
export const addParticipant = mutation({
  args: { 
    conversationId: v.id("conversations"),
    userId: v.string()
  },
  handler: async (ctx, { conversationId, userId }) => {
    const conversation = await ctx.db.get(conversationId);
    if (!conversation) throw new Error("Conversation not found");
    
    if (!conversation.participants.includes(userId)) {
      await ctx.db.patch(conversationId, {
        participants: [...conversation.participants, userId],
        updatedAt: Date.now(),
      });
    }
  },
});

// Update conversation title
export const updateTitle = mutation({
  args: {
    conversationId: v.id("conversations"),
    title: v.string(),
  },
  handler: async (ctx, { conversationId, title }) => {
    await ctx.db.patch(conversationId, {
      title,
      updatedAt: Date.now(),
    });
  },
});

// Update last message
export const updateLastMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    lastMessage: v.string(),
  },
  handler: async (ctx, { conversationId, lastMessage }) => {
    await ctx.db.patch(conversationId, {
      lastMessage,
      updatedAt: Date.now(),
    });
  },
});

// Note: Migration completed - threadId field removed from all conversations
// Agent now handles thread management internally with string identifiers
// No need to store threadId in conversation table 