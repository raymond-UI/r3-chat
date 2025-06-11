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

// Delete a conversation and all its messages
export const remove = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    // Delete all messages in the conversation first
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
      .collect();
    
    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    // Delete all files associated with the conversation
    const files = await ctx.db
      .query("files")
      .filter((q) => q.eq(q.field("conversationId"), conversationId))
      .collect();
    
    for (const file of files) {
      await ctx.db.delete(file._id);
    }

    // Delete presence records for this conversation
    const presenceRecords = await ctx.db
      .query("presence")
      .filter((q) => q.eq(q.field("conversationId"), conversationId))
      .collect();
    
    for (const presence of presenceRecords) {
      await ctx.db.delete(presence._id);
    }

    // Remove from pinned conversations for all users
    const userPrefs = await ctx.db
      .query("userPreferences")
      .collect();
    
    for (const pref of userPrefs) {
      if (pref.pinnedConversations.includes(conversationId)) {
        await ctx.db.patch(pref._id, {
          pinnedConversations: pref.pinnedConversations.filter(id => id !== conversationId),
          updatedAt: Date.now(),
        });
      }
    }

    // Finally, delete the conversation
    await ctx.db.delete(conversationId);
  },
});

// Note: Migration completed - threadId field removed from all conversations
// Agent now handles thread management internally with string identifiers
// No need to store threadId in conversation table 