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

// HTTP endpoint for streaming AI responses
http.route({
  path: "/ai/stream",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const { conversationId, userMessage, model, userId } = await request.json();
      
      if (!conversationId || !userMessage || !userId) {
        return new Response("Missing required fields", { status: 400 });
      }

      // Create agent with the specified model
      const streamingAgent = new Agent(components.agent, {
        chat: openRouterProvider(model || "meta-llama/llama-3.3-8b-instruct:free"),
        instructions: `You are a helpful AI assistant in R3 Chat, a collaborative chat application. 
Be concise, friendly, and helpful. If the conversation involves multiple users, acknowledge the collaborative context appropriately.
Use the available tools when needed to provide accurate and up-to-date information.`,
        maxSteps: 5,
        maxRetries: 3,
      });

      // Create a readable stream for the response
      const stream = new ReadableStream({
        async start(controller) {
          try {
            // Use conversation ID and user ID as thread identifier for Agent's internal thread management
            const threadId = `conversation_${conversationId}_${userId}`;
            
            // Use streamText for real streaming
            const result = await streamingAgent.streamText(ctx, { userId, threadId }, {
              prompt: userMessage,
            });

            let fullText = "";

            // Stream the response
            if (result.textStream) {
              for await (const chunk of result.textStream) {
                fullText += chunk;
                controller.enqueue(new TextEncoder().encode(chunk));
              }
            } else {
              // Fallback: get the complete text and simulate streaming
              const resultText = await result.text;
              fullText = resultText;
              
              const words = resultText.split(' ');
              for (const word of words) {
                controller.enqueue(new TextEncoder().encode(word + ' '));
                await new Promise(resolve => setTimeout(resolve, 50));
              }
            }

            // Save the complete response to the database
            if (fullText) {
              await ctx.runMutation(api.messages.send, {
                conversationId: conversationId as Id<"conversations">,
                userId: "ai-assistant",
                content: fullText,
                type: "ai",
                aiModel: model || "meta-llama/llama-3.3-8b-instruct:free",
              });
            }

            controller.close();
          } catch (error) {
            console.error("Streaming error:", error);
            controller.error(error);
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    } catch (error) {
      console.error("HTTP action error:", error);
      return new Response("Internal server error", { status: 500 });
    }
  }),
});

export default http; 