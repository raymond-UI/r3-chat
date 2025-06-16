import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create or update a user profile
export const createOrUpdateProfile = mutation({
  args: {
    username: v.string(),
    displayName: v.optional(v.string()),
    role: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
    customSlug: v.optional(v.string()),
    socialLinks: v.optional(v.object({
      twitter: v.optional(v.string()),
      github: v.optional(v.string()),
      linkedin: v.optional(v.string()),
      website: v.optional(v.string()),
    })),
    showcaseSettings: v.optional(v.object({
      showFeaturedFirst: v.boolean(),
      groupByTags: v.boolean(),
      showStats: v.boolean(),
      allowSearch: v.boolean(),
    })),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const userId = identity.subject;
    const now = Date.now();

    // Check if username is already taken by another user
    if (args.username) {
      const existingProfile = await ctx.db
        .query("userProfiles")
        .withIndex("by_username", (q) => q.eq("username", args.username))
        .first();
      
      if (existingProfile && existingProfile.userId !== userId) {
        throw new Error("Username is already taken");
      }
    }

    // Check if custom slug is already taken
    if (args.customSlug) {
      const existingSlug = await ctx.db
        .query("userProfiles")
        .withIndex("by_slug", (q) => q.eq("customSlug", args.customSlug))
        .first();
      
      if (existingSlug && existingSlug.userId !== userId) {
        throw new Error("Custom slug is already taken");
      }
    }

    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const profileData = {
      userId,
      username: args.username,
      displayName: args.displayName,
      role: args.role,
      isPublic: args.isPublic ?? false,
      customSlug: args.customSlug,
      socialLinks: args.socialLinks,
      showcaseSettings: args.showcaseSettings ?? {
        showFeaturedFirst: true,
        groupByTags: false,
        showStats: true,
        allowSearch: true,
      },
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, profileData);
      return existing._id;
    } else {
      return await ctx.db.insert("userProfiles", {
        ...profileData,
        createdAt: now,
        profileViews: 0,
      });
    }
  },
});

// Get current user's profile
export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();
  },
});

// Get profile by username or custom slug
export const getProfileBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    // Try custom slug first, then username
    let profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_slug", (q) => q.eq("customSlug", slug))
      .first();

    if (!profile) {
      profile = await ctx.db
        .query("userProfiles")
        .withIndex("by_username", (q) => q.eq("username", slug))
        .first();
    }

    // Only return public profiles
    if (!profile || !profile.isPublic) {
      return null;
    }

    return profile;
  },
});

// 🚀 OPTIMIZED: Get profile conversations with proper indexing and pre-computed stats
export const getProfileConversations = query({
  args: { 
    userId: v.string(),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    featuredOnly: v.optional(v.boolean()),
    tag: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 12;
    const offset = args.offset ?? 0;

    // Use optimized index to get conversations by creator
    const allConversations = await ctx.db
      .query("conversations")
      .withIndex("by_creator_updated", (q) => q.eq("createdBy", args.userId))
      .order("desc")
      .collect();

    // Filter conversations that are set to show on profile
    let conversations = allConversations.filter(conv => 
      conv.showcase?.isShownOnProfile === true
    );

    // Filter by featured if requested
    if (args.featuredOnly) {
      conversations = conversations.filter(conv => 
        conv.showcase?.isFeatured === true
      );
    }

    // Filter by tag if specified
    if (args.tag) {
      conversations = conversations.filter(conv =>
        conv.showcase?.tags?.includes(args.tag!) || false
      );
    }

    // Apply pagination
    const paginatedConversations = conversations.slice(offset, offset + limit);

    // 🚀 OPTIMIZED: Batch fetch stats and preview data
    const conversationIds = paginatedConversations.map(c => c._id);
    
    // Get pre-computed stats if they exist
    const stats = await ctx.db
      .query("conversationStats")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversationIds[0]))
      .collect();
    
    const statsByConversation = new Map();
    stats.forEach(stat => {
      statsByConversation.set(stat.conversationId, stat);
    });

    // Get likes and views in batch for conversations without pre-computed stats
    const conversationsNeedingStats = conversations.filter(c => 
      !statsByConversation.has(c._id)
    );

    const [allLikes, allViews] = await Promise.all([
      conversationsNeedingStats.length > 0 ? 
        ctx.db.query("conversationLikes").collect() : Promise.resolve([]),
      conversationsNeedingStats.length > 0 ? 
        ctx.db.query("profileViews").collect() : Promise.resolve([])
    ]);

    // Group likes and views by conversation
    const likesByConversation = new Map();
    const viewsByConversation = new Map();
    
    allLikes.forEach(like => {
      const count = likesByConversation.get(like.conversationId) || 0;
      likesByConversation.set(like.conversationId, count + 1);
    });
    
    allViews.forEach(view => {
      if (view.conversationId) {
        const count = viewsByConversation.get(view.conversationId) || 0;
        viewsByConversation.set(view.conversationId, count + 1);
      }
    });

    // Get first few messages for preview (batch query)
    const allMessages = conversationIds.length > 0 ? await ctx.db
      .query("messages")
      .filter((q) => q.or(...conversationIds.map(id => q.eq(q.field("conversationId"), id))))
      .order("asc")
      .collect() : [];

    const messagesByConversation = new Map();
    allMessages.forEach(message => {
      if (!messagesByConversation.has(message.conversationId)) {
        messagesByConversation.set(message.conversationId, []);
      }
      messagesByConversation.get(message.conversationId).push(message);
    });

    // Combine all data efficiently
    const conversationsWithData = conversations.map((conv) => {
      const stats = statsByConversation.get(conv._id);
      const likeCount = stats?.likeCount ?? likesByConversation.get(conv._id) ?? 0;
      const viewCount = stats?.viewCount ?? viewsByConversation.get(conv._id) ?? 0;
      const messages = (messagesByConversation.get(conv._id) || []).slice(0, 3);

      return {
        ...conv,
        likeCount,
        viewCount,
        previewMessages: messages,
      };
    });

    return {
      conversations: conversationsWithData,
      total: conversations.length,
      hasMore: offset + limit < conversations.length,
    };
  },
});

// Record a profile view
export const recordProfileView = mutation({
  args: {
    profileUserId: v.string(),
    conversationId: v.optional(v.id("conversations")),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    
    // Don't record views from the profile owner themselves
    if (identity?.subject === args.profileUserId) {
      return;
    }

    await ctx.db.insert("profileViews", {
      profileUserId: args.profileUserId,
      viewerUserId: identity?.subject,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
      conversationId: args.conversationId,
      createdAt: Date.now(),
    });

    // Update total profile views counter
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.profileUserId))
      .first();

    if (profile) {
      await ctx.db.patch(profile._id, {
        profileViews: profile.profileViews + 1,
      });
    }
  },
});

// Update conversation showcase settings
export const updateConversationShowcase = mutation({
  args: {
    conversationId: v.id("conversations"),
    showcase: v.object({
      isShownOnProfile: v.boolean(),
      isFeatured: v.boolean(),
      tags: v.array(v.string()),
      description: v.optional(v.string()),
      excerpt: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    // Only allow the creator to update showcase settings
    if (conversation.createdBy !== identity.subject) {
      throw new Error("Not authorized to update this conversation");
    }

    await ctx.db.patch(args.conversationId, {
      showcase: args.showcase,
      updatedAt: Date.now(),
    });
  },
});

// Like/unlike a conversation
export const toggleConversationLike = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const userId = identity.subject;
    
    const existing = await ctx.db
      .query("conversationLikes")
      .withIndex("by_user_conversation", (q) => 
        q.eq("userId", userId).eq("conversationId", args.conversationId)
      )
      .first();

    if (existing) {
      // Unlike
      await ctx.db.delete(existing._id);
      return { liked: false };
    } else {
      // Like
      await ctx.db.insert("conversationLikes", {
        conversationId: args.conversationId,
        userId,
        createdAt: Date.now(),
      });
      return { liked: true };
    }
  },
});

// Check if user liked a conversation
export const getConversationLike = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { liked: false, likeCount: 0 };

    const userId = identity.subject;
    
    const userLike = await ctx.db
      .query("conversationLikes")
      .withIndex("by_user_conversation", (q) => 
        q.eq("userId", userId).eq("conversationId", args.conversationId)
      )
      .first();

    const totalLikes = await ctx.db
      .query("conversationLikes")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    return {
      liked: !!userLike,
      likeCount: totalLikes.length,
    };
  },
});

// Get popular profiles
export const getPopularProfiles = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;

    return await ctx.db
      .query("userProfiles")
      .withIndex("by_public", (q) => q.eq("isPublic", true))
      .order("desc") // This will order by creation time, we could add a popularity score later
      .take(limit);
  },
});

// Search public profiles
export const searchProfiles = query({
  args: { 
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    const searchTerm = args.query.toLowerCase();

    const profiles = await ctx.db
      .query("userProfiles")
      .withIndex("by_public", (q) => q.eq("isPublic", true))
      .collect();

    // Simple text search on username, displayName, and bio
    const filtered = profiles.filter(profile => 
      profile.showcaseSettings?.allowSearch !== false && (
        profile.username.toLowerCase().includes(searchTerm) ||
        profile.displayName?.toLowerCase().includes(searchTerm) ||
        profile.role?.toLowerCase().includes(searchTerm)
      )
    );

    return filtered.slice(0, limit);
  },
});

// Get all available tags from public conversations
export const getPopularTags = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    const conversations = await ctx.db
      .query("conversations")
      .filter((q) => q.eq(q.field("showcase.isShownOnProfile"), true))
      .collect();

    // Count tag frequency
    const tagCounts: Record<string, number> = {};
    
    conversations.forEach(conv => {
      conv.showcase?.tags?.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    // Sort by frequency and return top tags
    const sortedTags = Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([tag, count]) => ({ tag, count }));

    return sortedTags;
  },
}); 