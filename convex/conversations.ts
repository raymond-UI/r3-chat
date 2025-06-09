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

// Get a specific conversation by ID
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
    userId: v.string(),
    isCollaborative: v.optional(v.boolean())
  },
  handler: async (ctx, { title, userId, isCollaborative = false }) => {
    const conversationId = await ctx.db.insert("conversations", {
      title,
      participants: [userId],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isCollaborative,
    });
    
    return conversationId;
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
    title: v.string()
  },
  handler: async (ctx, { conversationId, title }) => {
    await ctx.db.patch(conversationId, {
      title,
      updatedAt: Date.now(),
    });
  },
}); 