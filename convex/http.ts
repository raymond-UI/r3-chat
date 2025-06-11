import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { Agent } from "@convex-dev/agent";
import { components } from "./_generated/api";
import { api } from "./_generated/api";
import { env } from "@/env";
import { Id } from "./_generated/dataModel";

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

// HTTP endpoint for streaming AI responses using Convex Agent best practices
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

      // Create agent with proper streaming configuration
      const streamingAgent = new Agent(components.agent, {
        chat: openRouterProvider(
          model || "meta-llama/llama-3.3-8b-instruct:free"
        ),
        instructions: `You are a helpful AI assistant in R3 Chat, a collaborative chat application. 
Be concise, friendly, and helpful. If the conversation involves multiple users, acknowledge the collaborative context appropriately.
Use the available tools when needed to provide accurate and up-to-date information.`,
        maxSteps: 5,
        maxRetries: 3,
      });

      // Let Agent create and manage threads automatically
      // Pass only userId, Agent will handle thread creation/management internally
      const result = await streamingAgent.generateText(
        ctx,
        { userId },
        {
          prompt: userMessage,
        }
      );

      // Create a readable stream for real-time response
      const stream = new ReadableStream({
        async start(controller) {
          try {
            // Get the complete text from Agent (Agent handles internal streaming)
            const fullText = result.text;

            // Simulate streaming for UX by breaking text into chunks
            const words = fullText.split(" ");

            for (const word of words) {
              controller.enqueue(new TextEncoder().encode(word + " "));
              // Small delay for streaming effect
              await new Promise((resolve) => setTimeout(resolve, 50));
            }

            // Save the complete response to database
            await ctx.runMutation(api.messages.send, {
              conversationId: conversationId as Id<"conversations">,
              userId: "ai-assistant",
              content: fullText,
              type: "ai",
              aiModel: model || "meta-llama/llama-3.3-8b-instruct:free",
            });

            controller.close();
          } catch (error) {
            console.error("Agent streaming error:", error);
            controller.error(error);
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Vary": "origin",
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
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

export default http;
