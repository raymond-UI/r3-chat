import { CoreMessage, streamText } from "ai";
import { env } from "@/env";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { getModelInstance, type UserApiKeys, type UserAiPreferences } from "@/lib/providers";
import { getDefaultModel } from "@/lib/defaultModel";

// Initialize Convex client for API route
const convex = new ConvexHttpClient(env.NEXT_PUBLIC_CONVEX_URL);

interface ChatRequest {
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  model?: string;
  fileIds?: Id<"files">[];
  userId?: string; // For fetching user's API keys and preferences
}

export async function POST(req: Request) {
  try {
    const {
      messages,
      model,
      fileIds,
      userId,
    }: ChatRequest = await req.json();

    // Validate required fields
    if (!messages || !Array.isArray(messages)) {
      return new Response("Invalid messages format", { status: 400 });
    }

    // Get user's API keys and preferences if userId is provided
    let userKeys: UserApiKeys | null = null;
    let userPrefs: UserAiPreferences | null = null;

    if (userId) {
      try {
        const [decryptedResult, prefsResult] = await Promise.all([
          convex.action(api.actions.apiKeyManager.getApiKeysDecrypted, { userId }),
          convex.query(api.userApiKeys.getUserAiPreferences, { userId }),
        ]);
        
        // Extract decrypted API keys if we have them
        if (decryptedResult) {
          userKeys = {
            openaiKey: decryptedResult.decryptedKeys.openaiKey,
            anthropicKey: decryptedResult.decryptedKeys.anthropicKey,
            googleKey: decryptedResult.decryptedKeys.googleKey,
            openrouterKey: decryptedResult.decryptedKeys.openrouterKey,
          };
        }
        
        userPrefs = prefsResult;
      } catch (error) {
        console.error("Failed to fetch user configuration:", error);
        // Continue with default configuration
      }
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

    try {
      // Use dynamic default model if none provided
      const selectedModel = model || getDefaultModel(userKeys, userPrefs, "chat");
      
      // Get model instance using provider router
      const modelInstance = await getModelInstance(userKeys, userPrefs, selectedModel);

      // Stream AI response using AI SDK with full conversation history
      const result = await streamText({
        model: modelInstance,
        messages: conversationMessages as CoreMessage[],
      });

      return result.toDataStreamResponse();
    } catch (providerError) {
      console.error("Provider configuration error:", providerError);
      
      // Provide more helpful error messages based on configuration
      if (providerError instanceof Error) {
        if (providerError.message.includes("No direct API key configured")) {
          return new Response(
            JSON.stringify({ 
              error: "API Key Configuration Required",
              details: providerError.message,
              suggestion: "Please configure your API keys in Settings to use this model directly, or switch to a model available with your current configuration."
            }), 
            { 
              status: 422, 
              headers: { 'Content-Type': 'application/json' } 
            }
          );
        }
        
        if (providerError.message.includes("No suitable API key configuration found")) {
          return new Response(
            JSON.stringify({ 
              error: "Configuration Error",
              details: "No API keys available for the requested model",
              suggestion: "Please configure your API keys in Settings or enable fallback to system default."
            }), 
            { 
              status: 422, 
              headers: { 'Content-Type': 'application/json' } 
            }
          );
        }
      }
      
      // For other errors, return generic error
      return new Response(
        JSON.stringify({ 
          error: "Provider Error",
          details: "Failed to configure AI provider",
          suggestion: "Please check your API key configuration in Settings."
        }), 
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
