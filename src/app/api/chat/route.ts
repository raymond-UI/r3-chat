import { CoreMessage, streamText } from "ai";
import { env } from "@/env";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import {
  getModelInstance,
  type UserApiKeys,
  type UserAiPreferences,
} from "@/lib/providers";
import { getDefaultModel } from "@/lib/defaultModel";
import {
  ValidationErrors,
  handleStreamError,
  handleModelError,
  handleGenericError,
} from "@/lib/aiResponseError";

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
    // Parse and validate request body
    let requestBody: ChatRequest;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return ValidationErrors.invalidJson();
    }

    const { messages, model, fileIds, userId } = requestBody;

    // Validate required fields
    if (!messages || !Array.isArray(messages)) {
      return ValidationErrors.invalidMessages();
    }

    if (messages.length === 0) {
      return ValidationErrors.emptyMessages();
    }

    // Validate message structure
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      if (!message.role || !message.content) {
        return ValidationErrors.invalidMessageStructure(i);
      }

      if (!["user", "assistant", "system"].includes(message.role)) {
        return ValidationErrors.invalidMessageRole(i, message.role);
      }
    }

    // Get user's API keys and preferences if userId is provided
    let userKeys: UserApiKeys | null = null;
    let userPrefs: UserAiPreferences | null = null;

    if (userId) {
      try {
        const [decryptedResult, prefsResult] = await Promise.all([
          convex.action(api.actions.apiKeyManager.getApiKeysDecrypted, {
            userId,
          }),
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

        // Debug logging - log available keys and preferences (without exposing actual key values)
        console.log("🔍 [SERVER] User configuration debug:", {
          userId,
          hasUserKeys: !!userKeys,
          availableKeyTypes: userKeys
            ? Object.entries(userKeys)
                .filter(([, value]) => !!value)
                .map(([key]) => key)
            : [],
          userPreferences: userPrefs,
          requestedModel: model,
        });
      } catch (configError) {
        console.error("Failed to fetch user configuration:", configError);
        return ValidationErrors.configFetchError(configError);
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
        // Validate file IDs format
        for (const fileId of fileIds) {
          if (typeof fileId !== "string" || !fileId.trim()) {
            return ValidationErrors.invalidFileId();
          }
        }

        // Fetch file data from Convex
        const filePromises = fileIds.map(async (fileId: Id<"files">) => {
          try {
            const file = await convex.query(api.files.getById, { fileId });
            if (!file) {
              console.warn(`File not found: ${fileId}`);
              return null;
            }

            // Validate file accessibility
            if (!file.url) {
              console.error(`File ${fileId} has no accessible URL`);
              return null;
            }

            // For PDF files, fetch the content from the URL and pass as Buffer
            if (file.type === "pdf" || file.mimeType === "application/pdf") {
              try {
                const response = await fetch(file.url);
                if (!response.ok) {
                  throw new Error(
                    `Failed to fetch PDF: ${response.status} ${response.statusText}`
                  );
                }
                const arrayBuffer = await response.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);

                return {
                  type: "file" as const,
                  data: buffer,
                  mimeType: file.mimeType,
                  filename: file.name,
                };
              } catch (fetchError) {
                console.error(
                  `Failed to fetch PDF file ${fileId}:`,
                  fetchError
                );
                throw new Error(`PDF file ${file.name} could not be accessed`);
              }
            }

            // For image files, also fetch and pass as Buffer
            if (file.type === "image" || file.mimeType?.startsWith("image/")) {
              try {
                const response = await fetch(file.url);
                if (!response.ok) {
                  throw new Error(
                    `Failed to fetch image: ${response.status} ${response.statusText}`
                  );
                }
                const arrayBuffer = await response.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);

                return {
                  type: "file" as const,
                  data: buffer,
                  mimeType: file.mimeType,
                  filename: file.name,
                };
              } catch (fetchError) {
                console.error(
                  `Failed to fetch image file ${fileId}:`,
                  fetchError
                );
                throw new Error(
                  `Image file ${file.name} could not be accessed`
                );
              }
            }

            // Unsupported file type
            console.warn(
              `Unsupported file type for ${fileId}: ${file.type}/${file.mimeType}`
            );
            return null;
          } catch (error) {
            console.error(`Failed to process file ${fileId}:`, error);
            throw error;
          }
        });

        try {
          const files = await Promise.all(filePromises);
          // Filter out null values
          attachedFiles = files.filter(
            (file): file is NonNullable<typeof file> => file !== null
          );
        } catch (fileProcessError) {
          console.error(
            "Failed to process file attachments:",
            fileProcessError
          );
          return ValidationErrors.fileProcessingError(fileProcessError);
        }
      } catch (fileError) {
        console.error("File attachment processing failed:", fileError);
        return ValidationErrors.fileAttachmentError(fileError);
      }
    }

    // Build proper conversation history for AI
    let conversationMessages: CoreMessage[];
    try {
      conversationMessages = messages.map((message, index) => {
        // For the latest user message, include files if any
        if (
          index === messages.length - 1 &&
          message.role === "user" &&
          attachedFiles.length > 0
        ) {
          return {
            role: message.role,
            content: [
              { type: "text", text: message.content },
              ...attachedFiles,
            ],
          };
        }

        // For all other messages, just use text content
        return {
          role: message.role,
          content: message.content,
        };
      }) as CoreMessage[];
    } catch (messageFormatError) {
      console.error(
        "Failed to format conversation messages:",
        messageFormatError
      );
      return ValidationErrors.messageFormatError();
    }

    // Model selection and AI streaming with enhanced error handling
    try {
      // Use dynamic default model if none provided
      const selectedModel =
        model || getDefaultModel(userKeys, userPrefs, "chat");

      // Debug log: Show model selection decision
      console.log("🔍 [SERVER] Model selection debug:", {
        requestedModel: model,
        selectedModel,
        modelSource: model ? "requested" : "default",
      });

      // Get model instance using provider router
      let modelInstance;
      try {
        modelInstance = await getModelInstance(
          userKeys,
          userPrefs,
          selectedModel
        );
      } catch (modelError) {
        console.error("Model instance creation failed:", modelError);
        return handleModelError(modelError, selectedModel);
      }

      // Debug log: Show which provider is being used
      const providerInfo = {
        modelId: selectedModel,
        modelProvider:
          selectedModel.split("/")[0] || selectedModel.split(":")[0],
        hasUserKeys: !!userKeys,
        usingUserKey: userKeys && Object.values(userKeys).some((key) => !!key),
      };
      console.log("🔍 [SERVER] Provider selection debug:", providerInfo);

      try {
        const result = streamText({
          model: modelInstance,
          messages: conversationMessages,
          onError: ({ error }) => {
            console.error("🚨 [STREAM ERROR] AI streaming error occurred:", {
              error: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined,
              modelId: selectedModel,
              userId,
              timestamp: new Date().toISOString(),
            });

            // Log additional context for debugging
            if (error instanceof Error && error.cause) {
              console.error("🚨 [STREAM ERROR] Error cause:", error.cause);
            }

            // The onError callback prevents server crashes by suppressing errors
          },
          abortSignal: req.signal, // Respect request cancellation
        });

        // Return the streaming response with proper error handling
        return result.toDataStreamResponse();
      } catch (streamError) {
        // This catch handles errors that occur before streaming starts
        console.error("🚨 [PRE-STREAM ERROR] Error before streaming:", {
          error:
            streamError instanceof Error
              ? streamError.message
              : String(streamError),
          stack: streamError instanceof Error ? streamError.stack : undefined,
          modelId: selectedModel,
          userId,
          timestamp: new Date().toISOString(),
        });

        return handleStreamError(streamError);
      }
    } catch (providerError) {
      console.error("🚨 [PROVIDER ERROR] Provider configuration error:", {
        error:
          providerError instanceof Error
            ? providerError.message
            : String(providerError),
        stack: providerError instanceof Error ? providerError.stack : undefined,
        userId,
        timestamp: new Date().toISOString(),
      });

      return ValidationErrors.providerError(providerError);
    }
  } catch (error) {
    // Top-level error handler with enhanced logging
    console.error("🚨 [FATAL ERROR] Unhandled error in chat API:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    return handleGenericError(error);
  }
}
