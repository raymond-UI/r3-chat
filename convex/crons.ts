import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// 🆕 Clean up stale streaming messages every hour
crons.interval(
  "cleanup-stale-streaming",
  { hours: 1 }, // Run every hour
  internal.messages.cleanupStaleStreaming,
);

// 🚀 BANDWIDTH OPTIMIZATION: Update conversation statistics regularly
crons.interval(
  "update conversation stats",
  { minutes: 30 }, // Every 30 minutes
  internal.analytics.updateStaleConversationStats,
);

export default crons; 