import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { api, internal } from "./_generated/api";
import { env } from "@/env";
import { Id } from "./_generated/dataModel";
import { streamText } from "ai";

const http = httpRouter();

// Configure OpenRouter provider
const openRouterProvider = createOpenRouter({
  apiKey: env.OPENROUTER_API_KEY,
});

// Handle preflight OPTIONS requests - Convex recommended approach
http.route({
  path: "/ai/stream",
  method: "OPTIONS",
  handler: httpAction(async (_, request) => {
    // Make sure the necessary headers are present
    // for this to be a valid pre-flight request
    const headers = request.headers;
    if (
      headers.get("Origin") !== null &&
      headers.get("Access-Control-Request-Method") !== null &&
      headers.get("Access-Control-Request-Headers") !== null
    ) {
      return new Response(null, {
        headers: new Headers({
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Max-Age": "86400",
        }),
      });
    } else {
      return new Response();
    }
  }),
});

// 🆕 Real AI SDK streaming with multi-user coordination
http.route({
  path: "/ai/stream",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const { conversationId, userMessage, model, userId } =
        await request.json();

      if (!conversationId || !userMessage || !userId) {
        return new Response("Missing required fields", { 
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Vary": "origin",
          },
        });
      }

      // 🆕 FIRST: Create the AI message in database for multi-user coordination
      const aiMessageId = await ctx.runMutation(api.messages.send, {
        conversationId: conversationId as Id<"conversations">,
        userId: "ai-assistant",
        content: "",
        type: "ai",
        aiModel: model || "meta-llama/llama-3.3-8b-instruct:free",
        status: "streaming",
        streamingForUser: userId, // Track who initiated
      });

      // 🆕 Start background processing for multi-user coordination (using same message)
      ctx.scheduler.runAfter(0, api.ai.streamAgentResponse, {
        messageId: aiMessageId, // Pass the message ID
        conversationId: conversationId as Id<"conversations">,
        userMessage,
        model: model || "meta-llama/llama-3.3-8b-instruct:free",
        userId,
      });

      // 🆕 Real-time AI SDK streaming for the active user
      const result = await streamText({
        model: openRouterProvider(model || "meta-llama/llama-3.3-8b-instruct:free"),
        prompt: userMessage,
        onFinish: async (result) => {
          // Update the database message when streaming completes
          await ctx.runMutation(internal.messages.updateStreaming, {
            messageId: aiMessageId,
            content: result.text,
            status: "complete",
          });
        },
      });

      // Return real AI SDK stream response with correct method name
      return result.toDataStreamResponse({
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Vary": "origin",
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          "X-Message-Id": aiMessageId, // Send message ID to frontend
          "Access-Control-Expose-Headers": "X-Message-Id"
        },
      });
    } catch (error) {
      console.error("HTTP streaming action error:", error);
      return new Response("Internal server error", { 
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Vary": "origin",
        },
      });
    }
  }),
});

// http.route({
//   path: "/api/process-document",
//   method: "POST",
//   handler: httpAction(async (ctx, request) => {
//     const { fileUrl, fileType, fileName } = await request.json();
//   }),
// });

export default http;
