import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { checkConversationAccess } from "./messages";

// 🚀 OPTIMIZED: Get conversations for a user using proper indexing
export const list = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    // Use index to efficiently find conversations where user is creator
    const createdConversations = await ctx.db
      .query("conversations")
      .withIndex("by_creator_updated", (q) => q.eq("createdBy", userId))
      .order("desc")
      .collect();

    // Also get conversations where user is a participant but not creator
    // Note: Convex doesn't support array contains indexes efficiently,
    // so we'll need to use a different approach for collaborative conversations
    const allConversations = await ctx.db
      .query("conversations")
      .order("desc")
      .filter((q) => q.neq(q.field("createdBy"), userId))
      .collect();
    
    const participantConversations = allConversations.filter(conversation => 
      conversation.participants.includes(userId)
    );

    // Combine and sort by updatedAt
    const allUserConversations = [...createdConversations, ...participantConversations];
    return allUserConversations.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

// 🚀 NEW: Optimized minimal conversation list for UI lists
export const listMinimal = query({
  args: { userId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { userId, limit = 50 }) => {
    const createdConversations = await ctx.db
      .query("conversations")
      .withIndex("by_creator_updated", (q) => q.eq("createdBy", userId))
      .order("desc")
      .take(limit);

    // For collaborative conversations, we still need to scan but limit the result
    const allConversations = await ctx.db
      .query("conversations")
      .order("desc")
      .filter((q) => q.neq(q.field("createdBy"), userId))
      .take(limit * 2); // Take more to account for filtering
    
    const participantConversations = allConversations
      .filter(conversation => conversation.participants.includes(userId))
      .slice(0, limit);

    const allUserConversations = [...createdConversations, ...participantConversations];
    const sorted = allUserConversations.sort((a, b) => b.updatedAt - a.updatedAt);

    // Return only essential fields for list view
    return sorted.slice(0, limit).map(conv => ({
      _id: conv._id,
      title: conv.title,
      updatedAt: conv.updatedAt,
      createdAt: conv.createdAt,
      lastMessage: conv.lastMessage,
      isCollaborative: conv.isCollaborative,
      participants: conv.participants,
      createdBy: conv.createdBy,
      // Only include showcase flag, not full object
      isShownOnProfile: conv.showcase?.isShownOnProfile || false,
    }));
  },
});

// Get conversations by their IDs (for anonymous users)
export const getByIds = query({
  args: { conversationIds: v.array(v.string()) },
  handler: async (ctx, { conversationIds }) => {
    const conversations = [];
    
    for (const idStr of conversationIds) {
      try {
        const conversation = await ctx.db.get(idStr as Id<"conversations">);
        if (conversation && conversation._id) {
          conversations.push(conversation);
        }
      } catch {
        // Skip invalid IDs
        console.warn(`Invalid conversation ID: ${idStr}`);
      }
    }
    
    // Sort by updatedAt descending, with fallback to _creationTime
    return conversations.sort((a, b) => {
      const aTime = "updatedAt" in a && a.updatedAt ? a.updatedAt : a._creationTime;
      const bTime = "updatedAt" in b && b.updatedAt ? b.updatedAt : b._creationTime;
      return bTime - aTime;
    });
  },
});

// Get a single conversation by ID with proper access control
export const get = query({
  args: { 
    conversationId: v.id("conversations"),
    isInviteAccess: v.optional(v.boolean())
  },
  handler: async (ctx, { conversationId, isInviteAccess }) => {
    const identity = await ctx.auth.getUserIdentity();
    const conversation = await ctx.db.get(conversationId);
    
    if (!conversation) {
      return {
        success: false,
        error: "Conversation not found",
        conversation: null,
        canAccess: false,
      };
    }

    // Check if user has access to this conversation
    const hasAccess = await checkConversationAccess(ctx, conversation, identity, isInviteAccess);
    
    if (!hasAccess) {
      return {
        success: false,
        error: "Access denied: You don't have permission to view this conversation",
        conversation: null,
        canAccess: false,
      };
    }

    return {
      success: true,
      error: null,
      conversation,
      canAccess: true,
    };
  },
});

// Create a new conversation
export const create = mutation({
  args: {
    title: v.optional(v.string()),
    isCollaborative: v.optional(v.boolean()),
    participants: v.optional(v.array(v.string())),
    isAnonymous: v.optional(v.boolean()),
    anonymousId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    
    // Support anonymous users
    let createdBy: string;
    let participants: string[];
    
    if (!identity && args.isAnonymous) {
      // Use provided anonymousId if present, else fallback to old behavior
      createdBy = args.anonymousId || `anonymous_${crypto.randomUUID()}`;
      participants = [createdBy, ...(args.participants || [])];
    } else if (identity) {
      // Authenticated user
      createdBy = identity.subject;
      participants = [identity.subject, ...(args.participants || [])];
    } else {
      throw new Error("Not authenticated");
    }

    const conversationId = await ctx.db.insert("conversations", {
      title: args.title || "New Chat",
      participants,
      isCollaborative: args.isCollaborative || false,
      createdBy,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      // Add sharing configuration
      sharing: {
        isPublic: false,
        shareId: crypto.randomUUID(),
        requiresPassword: false,
        allowAnonymous: false,
        expiresAt: undefined,
      }
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
    const identity = await ctx.auth.getUserIdentity();
    const conversation = await ctx.db.get(conversationId);
    
    if (!conversation) {
      throw new Error("Conversation not found");
    }
    
    // Only allow existing participants or creator to add new participants
    if (!identity) {
      throw new Error("Authentication required");
    }
    
    if (!conversation.participants.includes(identity.subject) && 
        conversation.createdBy !== identity.subject) {
      throw new Error("Access denied: You don't have permission to add participants to this conversation");
    }
    
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
    const identity = await ctx.auth.getUserIdentity();
    const conversation = await ctx.db.get(conversationId);
    
    if (!conversation) {
      throw new Error("Conversation not found");
    }
    
    // Only allow participants or creator to update title
    if (!identity) {
      throw new Error("Authentication required");
    }
    
    if (!conversation.participants.includes(identity.subject) && 
        conversation.createdBy !== identity.subject) {
      throw new Error("Access denied: You don't have permission to modify this conversation");
    }
    
    await ctx.db.patch(conversationId, {
      title,
      updatedAt: Date.now(),
    });

    // 🚀 OPTIMIZATION: Trigger stats update
    await ctx.scheduler.runAfter(0, internal.analytics.updateConversationStats, { conversationId });
  },
});

// Update conversation title for system/AI operations (works for anonymous conversations)
export const updateTitleSystem = mutation({
  args: {
    conversationId: v.id("conversations"),
    title: v.string(),
  },
  handler: async (ctx, { conversationId, title }) => {
    const conversation = await ctx.db.get(conversationId);
    
    if (!conversation) {
      throw new Error("Conversation not found");
    }
    
    // System operation - no authentication required
    // This is used by AI title generation and other internal operations
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

// 🌳 Create a new conversation branch from a specific message point
export const createConversationBranch = mutation({
  args: {
    parentConversationId: v.id("conversations"),
    branchAtMessageId: v.id("messages"),
    userId: v.string(),
    title: v.optional(v.string()),
  },
  handler: async (ctx, { parentConversationId, branchAtMessageId, userId, title }) => {
    const parentConversation = await ctx.db.get(parentConversationId);
    if (!parentConversation) throw new Error("Parent conversation not found");

    const branchMessage = await ctx.db.get(branchAtMessageId);
    if (!branchMessage) throw new Error("Branch message not found");

    // Get all messages up to and including the branch point
    const allMessages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", parentConversationId))
      .order("asc")
      .collect();

    // Filter messages up to the branch point (inclusive)
    const messagesToCopy = allMessages.filter(msg => msg.timestamp <= branchMessage.timestamp);

    const now = Date.now();
    
    // Generate a better title with versioning
    let branchedTitle: string;
    if (title) {
      branchedTitle = title;
    } else {
      // Check how many branches exist from this parent
      const existingBranches = await ctx.db
        .query("conversations")
        .filter((q) => q.eq(q.field("parentConversationId"), parentConversationId))
        .collect();
      
      const versionNumber = existingBranches.length + 2; // +2 because original is v1, first branch is v2
      branchedTitle = `${parentConversation.title} v${versionNumber}`;
    }

    // Create the new branched conversation
    const newConversationId = await ctx.db.insert("conversations", {
      title: branchedTitle,
      participants: parentConversation.participants,
      lastMessage: branchMessage.content,
      createdAt: now,
      updatedAt: now,
      isCollaborative: parentConversation.isCollaborative,
      createdBy: userId,
      // 🌳 Branching metadata
      parentConversationId,
      branchedAtMessageId: branchAtMessageId,
      branchedBy: userId,
      branchedAt: now,
      // 🔗 Sharing - inherit from parent but make it private by default
      sharing: {
        isPublic: false,
        shareId: crypto.randomUUID(),
        requiresPassword: false,
        allowAnonymous: false,
        expiresAt: undefined,
      }
    });

    // Copy all messages up to the branch point
    for (const message of messagesToCopy) {
      await ctx.db.insert("messages", {
        conversationId: newConversationId,
        userId: message.userId,
        content: message.content,
        type: message.type,
        aiModel: message.aiModel,
        timestamp: message.timestamp,
        status: message.status || "complete",
        lastUpdated: message.lastUpdated || message.timestamp,
        attachments: message.attachments,
        // Reset branching fields for the new conversation
        parentMessageId: undefined,
        branchIndex: undefined,
        isActiveBranch: undefined,
        branchCreatedBy: undefined,
        branchCreatedAt: undefined,
      });
    }

    return newConversationId;
  },
});

// Get conversation branch info
export const getConversationBranchInfo = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    const conversation = await ctx.db.get(conversationId);
    if (!conversation) return null;

    if (!conversation.parentConversationId) {
      return { isBranched: false };
    }

    const parentConversation = await ctx.db.get(conversation.parentConversationId);
    const branchMessage = conversation.branchedAtMessageId 
      ? await ctx.db.get(conversation.branchedAtMessageId)
      : null;

    return {
      isBranched: true,
      parentConversation,
      branchedAtMessage: branchMessage,
      branchedBy: conversation.branchedBy,
      branchedAt: conversation.branchedAt,
    };
  },
});

// Get all child branches of a conversation
export const getConversationBranches = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    return await ctx.db
      .query("conversations")
      .filter((q) => q.eq(q.field("parentConversationId"), conversationId))
      .order("desc")
      .collect();
  },
});

// Update sharing settings
export const updateSharing = mutation({
  args: {
    conversationId: v.id("conversations"),
    sharing: v.object({
      isPublic: v.boolean(),
      requiresPassword: v.boolean(),
      password: v.optional(v.string()),
      allowAnonymous: v.boolean(),
      expiresAt: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    // Check if user is participant or creator
    if (!conversation.participants.includes(identity.subject) && 
        conversation.createdBy !== identity.subject) {
      throw new Error("Not authorized");
    }

    const currentSharing = conversation.sharing || {
      isPublic: false,
      shareId: crypto.randomUUID(),
      requiresPassword: false,
      allowAnonymous: false,
      expiresAt: undefined,
    };

    const updatedSharing = {
      ...currentSharing,
      ...args.sharing,
      // Generate new shareId if making public for first time
      shareId: currentSharing.shareId || crypto.randomUUID(),
    };

    await ctx.db.patch(args.conversationId, {
      sharing: updatedSharing,
      updatedAt: Date.now(),
    });

    return updatedSharing;
  },
});

// Get conversation by share ID (public access)
export const getByShareId = query({
  args: { shareId: v.string(), password: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const conversation = await ctx.db
      .query("conversations")
      .filter(q => q.eq(q.field("sharing.shareId"), args.shareId))
      .first();

    if (!conversation || !conversation.sharing) return null;

    // Check if sharing is enabled
    if (!conversation.sharing.isPublic) return null;

    // Check expiration
    if (conversation.sharing.expiresAt && Date.now() > conversation.sharing.expiresAt) {
      return null;
    }

    // Check password if required
    if (conversation.sharing.requiresPassword) {
      if (!args.password || args.password !== conversation.sharing.password) {
        return { requiresPassword: true };
      }
    }

    return {
      ...conversation,
      // Don't expose sensitive sharing details in public view
      sharing: {
        isPublic: true,
        allowAnonymous: conversation.sharing.allowAnonymous,
      }
    };
  },
});

// Create an invite code for a conversation
export const createInvite = mutation({
  args: {
    conversationId: v.id("conversations"),
    expiresIn: v.optional(v.number()), // Hours until expiration
    maxUses: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    // Check if user can create invites (participant or creator)
    if (!conversation.participants.includes(identity.subject) && 
        conversation.createdBy !== identity.subject) {
      throw new Error("Access denied: You don't have permission to create invites for this conversation");
    }

    // Generate unique invite code
    const inviteCode = crypto.randomUUID().replace(/-/g, '').substring(0, 12);
    
    const expiresAt = args.expiresIn 
      ? Date.now() + (args.expiresIn * 60 * 60 * 1000) // Convert hours to ms
      : undefined;

    const inviteId = await ctx.db.insert("invites", {
      conversationId: args.conversationId,
      inviteCode,
      createdBy: identity.subject,
      createdAt: Date.now(),
      expiresAt,
      maxUses: args.maxUses,
      usedCount: 0,
      isActive: true,
    });

    return { inviteCode, inviteId };
  },
});

// Join a conversation using an invite code
export const joinViaInvite = mutation({
  args: {
    inviteCode: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Find the invite
    const invite = await ctx.db
      .query("invites")
      .withIndex("by_code", (q) => q.eq("inviteCode", args.inviteCode))
      .first();

    if (!invite) {
      throw new Error("Invalid invite code");
    }

    // Check if invite is still valid
    if (!invite.isActive) {
      throw new Error("This invite has been deactivated");
    }

    if (invite.expiresAt && Date.now() > invite.expiresAt) {
      throw new Error("This invite has expired");
    }

    if (invite.maxUses && invite.usedCount >= invite.maxUses) {
      throw new Error("This invite has reached its usage limit");
    }

    // Get the conversation
    const conversation = await ctx.db.get(invite.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    // Check if user is already a participant
    if (conversation.participants.includes(identity.subject)) {
      return { 
        conversationId: invite.conversationId,
        message: "You are already a participant in this conversation"
      };
    }

    // Add user to conversation
    await ctx.db.patch(invite.conversationId, {
      participants: [...conversation.participants, identity.subject],
      updatedAt: Date.now(),
    });

    // Update invite usage count
    await ctx.db.patch(invite._id, {
      usedCount: invite.usedCount + 1,
    });

    return { 
      conversationId: invite.conversationId,
      message: "Successfully joined the conversation"
    };
  },
});

// Get invite details (for displaying in join dialog)
export const getInviteDetails = query({
  args: { inviteCode: v.string() },
  handler: async (ctx, args) => {
    const invite = await ctx.db
      .query("invites")
      .withIndex("by_code", (q) => q.eq("inviteCode", args.inviteCode))
      .first();

    if (!invite) {
      return {
        success: false,
        error: "Invalid invite code",
        invite: null,
        conversation: null,
      };
    }

    // Check if invite is still valid
    if (!invite.isActive) {
      return {
        success: false,
        error: "This invite has been deactivated",
        invite: null,
        conversation: null,
      };
    }

    if (invite.expiresAt && Date.now() > invite.expiresAt) {
      return {
        success: false,
        error: "This invite has expired",
        invite: null,
        conversation: null,
      };
    }

    if (invite.maxUses && invite.usedCount >= invite.maxUses) {
      return {
        success: false,
        error: "This invite has reached its usage limit",
        invite: null,
        conversation: null,
      };
    }

    // Get conversation details
    const conversation = await ctx.db.get(invite.conversationId);
    if (!conversation) {
      return {
        success: false,
        error: "Conversation not found",
        invite: null,
        conversation: null,
      };
    }

    return {
      success: true,
      error: null,
      invite: {
        inviteCode: invite.inviteCode,
        createdAt: invite.createdAt,
        expiresAt: invite.expiresAt,
        maxUses: invite.maxUses,
        usedCount: invite.usedCount,
      },
      conversation: {
        _id: conversation._id,
        title: conversation.title,
        isCollaborative: conversation.isCollaborative,
        participants: conversation.participants,
        createdBy: conversation.createdBy,
      },
    };
  },
});

// List invites for a conversation (for management)
export const listInvites = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    // Check if user can view invites (participant or creator)
    if (!conversation.participants.includes(identity.subject) && 
        conversation.createdBy !== identity.subject) {
      throw new Error("Access denied");
    }

    const invites = await ctx.db
      .query("invites")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return invites.map((invite) => ({
      _id: invite._id,
      inviteCode: invite.inviteCode,
      createdBy: invite.createdBy,
      createdAt: invite.createdAt,
      expiresAt: invite.expiresAt,
      maxUses: invite.maxUses,
      usedCount: invite.usedCount,
    }));
  },
});

// Deactivate an invite
export const deactivateInvite = mutation({
  args: { inviteId: v.id("invites") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const invite = await ctx.db.get(args.inviteId);
    if (!invite) throw new Error("Invite not found");

    const conversation = await ctx.db.get(invite.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    // Check if user can deactivate invites (creator or invite creator)
    if (conversation.createdBy !== identity.subject && invite.createdBy !== identity.subject) {
      throw new Error("Access denied");
    }

    await ctx.db.patch(args.inviteId, {
      isActive: false,
    });
  },
}); 