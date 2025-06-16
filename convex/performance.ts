import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// 📊 Performance monitoring for bandwidth optimizations
export const trackQueryPerformance = mutation({
  args: {
    queryName: v.string(),
    executionTime: v.number(),
    dataSize: v.number(), // Estimated data size in bytes
    recordCount: v.number(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("queryPerformance", {
      queryName: args.queryName,
      executionTime: args.executionTime,
      dataSize: args.dataSize,
      recordCount: args.recordCount,
      userId: args.userId,
      timestamp: Date.now(),
    });
  },
});

// Get performance metrics for analysis
export const getPerformanceMetrics = query({
  args: {
    timeRange: v.optional(v.union(v.literal("1h"), v.literal("24h"), v.literal("7d"))),
    queryName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const timeRangeMs = {
      "1h": 60 * 60 * 1000,
      "24h": 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
    };
    
    const cutoffTime = Date.now() - timeRangeMs[args.timeRange || "24h"];
    
    let query = ctx.db
      .query("queryPerformance")
      .filter((q) => q.gt(q.field("timestamp"), cutoffTime));
    
    if (args.queryName) {
      query = query.filter((q) => q.eq(q.field("queryName"), args.queryName));
    }
    
    const metrics = await query.collect();
    
    // Calculate aggregates
    const totalQueries = metrics.length;
    const avgExecutionTime = metrics.reduce((sum, m) => sum + m.executionTime, 0) / totalQueries;
    const avgDataSize = metrics.reduce((sum, m) => sum + m.dataSize, 0) / totalQueries;
    const totalDataTransferred = metrics.reduce((sum, m) => sum + m.dataSize, 0);
    
    // Group by query name for breakdown
    const byQueryName = metrics.reduce((acc, metric) => {
      if (!acc[metric.queryName]) {
        acc[metric.queryName] = {
          count: 0,
          totalTime: 0,
          totalData: 0,
          avgTime: 0,
          avgData: 0,
        };
      }
      const group = acc[metric.queryName];
      group.count++;
      group.totalTime += metric.executionTime;
      group.totalData += metric.dataSize;
      group.avgTime = group.totalTime / group.count;
      group.avgData = group.totalData / group.count;
      return acc;
    }, {} as Record<string, {
      count: number;
      totalTime: number;
      totalData: number;
      avgTime: number;
      avgData: number;
    }>);

    return {
      summary: {
        totalQueries,
        avgExecutionTime,
        avgDataSize,
        totalDataTransferred,
        period: args.timeRange || "24h",
      },
      byQueryName,
    };
  },
});

// 🚀 OPTIMIZATION: Benchmark query to compare old vs new implementations
export const benchmarkQuery = query({
  args: {
    queryType: v.union(
      v.literal("conversations_list"),
      v.literal("messages_list"),
      v.literal("profile_conversations")
    ),
    userId: v.string(),
    useOptimized: v.boolean(),
  },
  handler: async (ctx, args) => {
    const startTime = Date.now();
    let result;
    let dataSize = 0;

    try {
      switch (args.queryType) {
        case "conversations_list":
          if (args.useOptimized) {
            // Use optimized listMinimal
            const convos = await ctx.db
              .query("conversations")
              .withIndex("by_creator_updated", (q) => q.eq("createdBy", args.userId))
              .order("desc")
              .take(50);
            result = convos.map(c => ({
              _id: c._id,
              title: c.title,
              updatedAt: c.updatedAt,
            }));
            dataSize = JSON.stringify(result).length;
          } else {
            // Use old method (fetch all, filter in memory)
            const allConvos = await ctx.db
              .query("conversations")
              .order("desc")
              .collect();
            result = allConvos
              .filter(c => c.participants.includes(args.userId))
              .slice(0, 50);
            dataSize = JSON.stringify(result).length;
          }
          break;

        case "messages_list":
          // Benchmark would go here
          result = { message: "Not implemented" };
          break;

        case "profile_conversations":
          // Benchmark would go here  
          result = { message: "Not implemented" };
          break;
      }

      const executionTime = Date.now() - startTime;

      // Note: Performance tracking would need to be done via a separate mutation

      return {
        executionTime,
        dataSize,
        recordCount: Array.isArray(result) ? result.length : 1,
        result: args.useOptimized ? result : undefined, // Don't return large legacy results
      };

    } catch (error) {
      console.error("Benchmark error:", error);
      return {
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime,
      };
    }
  },
}); 