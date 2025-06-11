import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// 🆕 Clean up stale streaming messages every hour
crons.interval(
  "cleanup-stale-streaming",
  { hours: 1 }, // Run every hour
  internal.messages.cleanupStaleStreaming,
);

export default crons; 