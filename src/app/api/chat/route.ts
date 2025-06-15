import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { CoreMessage, streamText } from "ai";
import { env } from "@/env";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

// Configure OpenRouter provider
const openRouterProvider = createOpenRouter({
  apiKey: env.OPENROUTER_API_KEY,
});

// Initialize Convex client for API route
const convex = new ConvexHttpClient(env.NEXT_PUBLIC_CONVEX_URL);

interface ChatRequest {
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  model?: string;
  fileIds?: Id<"files">[];
}

export async function POST(req: Request) {
  try {
    const {
      messages,
      model = "google/gemini-2.0-flash-exp:free",
      fileIds,
    }: ChatRequest = await req.json();

    // Validate required fields
    if (!messages || !Array.isArray(messages)) {
      return new Response("Invalid messages format", { status: 400 });
    }

    // Process file attachments if provided (only for the latest message)
    let attachedFiles: Array<{
      type: "file";
      data: Buffer;
      mimeType: string;
      filename?: string;
    }> = [];

    if (fileIds && Array.isArray(fileIds) && fileIds.length > 0) {
      try {
        // Fetch file data from Convex
        const files = await Promise.all(
          fileIds.map(async (fileId: Id<"files">) => {
            try {
              const file = await convex.query(api.files.getById, { fileId });
              if (!file) return null;

              // For PDF files, fetch the content from the URL and pass as Buffer
              if (file.type === "pdf" || file.mimeType === "application/pdf") {
                const response = await fetch(file.url);
                const arrayBuffer = await response.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);

                return {
                  type: "file" as const,
                  data: buffer,
                  mimeType: file.mimeType,
                  filename: file.name,
                };
              }

              // For image files, also fetch and pass as Buffer
              if (
                file.type === "image" ||
                file.mimeType?.startsWith("image/")
              ) {
                const response = await fetch(file.url);
                const arrayBuffer = await response.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);

                return {
                  type: "file" as const,
                  data: buffer,
                  mimeType: file.mimeType,
                  filename: file.name,
                };
              }

              return null;
            } catch (error) {
              console.error(`Failed to fetch file ${fileId}:`, error);
              return null;
            }
          })
        );

        // Filter out null values
        attachedFiles = files.filter(
          (file): file is NonNullable<typeof file> => file !== null
        );
      } catch (error) {
        console.error("Failed to process file attachments:", error);
        return new Response(
          JSON.stringify({ error: "Failed to process file attachments" }), 
          { status: 422, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Build proper conversation history for AI
    const conversationMessages = messages.map((message, index) => {
      // For the latest user message, include files if any
      if (
        index === messages.length - 1 &&
        message.role === "user" &&
        attachedFiles.length > 0
      ) {
        return {
          role: message.role,
          content: [{ type: "text", text: message.content }, ...attachedFiles],
        };
      }

      // For all other messages, just use text content
      return {
        role: message.role,
        content: message.content,
      };
    });

    // Stream AI response using AI SDK with full conversation history
    const result = await streamText({
      model: openRouterProvider(model),
      messages: conversationMessages as CoreMessage[],
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
