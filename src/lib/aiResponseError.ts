interface ErrorResponse {
  error: string;
  details?: string;
  suggestion?: string;
  code?: string;
}

export function createErrorResponse(
  error: string,
  status: number,
  details?: string,
  suggestion?: string,
  code?: string
): Response {
  const errorBody: ErrorResponse = { error };
  if (details) errorBody.details = details;
  if (suggestion) errorBody.suggestion = suggestion;
  if (code) errorBody.code = code;

  return new Response(JSON.stringify(errorBody), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export class ChatApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: string,
    public suggestion?: string,
    public code?: string
  ) {
    super(message);
    this.name = "ChatApiError";
  }

  toResponse(): Response {
    return createErrorResponse(
      this.message,
      this.statusCode,
      this.details,
      this.suggestion,
      this.code
    );
  }
}

export function handleStreamError(streamError: unknown): Response {
  console.error("Failed to stream AI response:", streamError);

  // Try to extract more details from known error shapes
  type ProviderError = {
    response?: {
      status?: number;
      statusText?: string;
      data?: unknown;
    };
    body?: string;
    error?: string;
  };
  const errObj = streamError as ProviderError;
  let providerDetails = undefined;
  if (typeof errObj === 'object' && errObj !== null) {
    // Some providers return error.response or error.body
    if ('response' in errObj && typeof errObj.response === 'object' && errObj.response !== null) {
      const resp = errObj.response;
      if (resp.status || resp.statusText) {
        providerDetails = `Provider response: ${resp.status ?? ''} ${resp.statusText ?? ''}`.trim();
      }
      if (resp.data) {
        providerDetails = (providerDetails ? providerDetails + ' | ' : '') + `Details: ${JSON.stringify(resp.data)}`;
      }
    }
    if ('body' in errObj && typeof errObj.body === 'string') {
      providerDetails = ((providerDetails ? providerDetails + ' | ' : '') + `Body: ${errObj.body}`);
    }
    if ('error' in errObj && typeof errObj.error === 'string') {
      providerDetails = ((providerDetails ? providerDetails + ' | ' : '') + `Error: ${errObj.error}`);
    }
  }

  if (streamError instanceof Error) {
    // Handle rate limiting
    if (
      streamError.message.includes("rate limit") ||
      streamError.message.includes("429")
    ) {
      return createErrorResponse(
        "Rate Limit Exceeded",
        429,
        providerDetails || "Too many requests to the AI service",
        "Please wait a moment before sending another message",
        "RATE_LIMIT"
      );
    }

    // Handle quota/billing issues
    if (
      streamError.message.includes("quota") ||
      streamError.message.includes("billing")
    ) {
      return createErrorResponse(
        "Service Quota Exceeded",
        402,
        providerDetails || "API usage quota has been exceeded",
        "Please check your API key billing status or try again later",
        "QUOTA_EXCEEDED"
      );
    }

    // Handle authentication errors
    if (
      streamError.message.includes("authentication") ||
      streamError.message.includes("401")
    ) {
      return createErrorResponse(
        "Authentication Error",
        401,
        providerDetails || "Invalid or expired API key",
        "Please check your API key configuration in Settings",
        "AUTH_ERROR"
      );
    }

    // Handle content policy violations
    if (
      streamError.message.includes("content policy") ||
      streamError.message.includes("safety")
    ) {
      return createErrorResponse(
        "Content Policy Violation",
        400,
        providerDetails || "The request was rejected due to content policy",
        "Please modify your message to comply with content guidelines",
        "CONTENT_POLICY"
      );
    }
  }

  // Generic streaming error
  return createErrorResponse(
    "Streaming Error",
    500,
    (providerDetails ? providerDetails + ' | ' : '') + (streamError instanceof Error
      ? streamError.message
      : "Failed to stream AI response"),
    "Please try again or contact support if the issue persists",
    "STREAM_ERROR"
  );
}

export function handleModelError(
  modelError: unknown,
  selectedModel: string
): Response {
  console.error("Failed to get model instance:", modelError);

  if (modelError instanceof Error) {
    if (modelError.message.includes("No direct API key configured")) {
      return createErrorResponse(
        "API Key Configuration Required",
        422,
        modelError.message,
        "Please configure your API keys in Settings to use this model directly, or switch to a model available with your current configuration.",
        "API_KEY_REQUIRED"
      );
    }

    if (
      modelError.message.includes("No suitable API key configuration found")
    ) {
      return createErrorResponse(
        "Configuration Error",
        422,
        "No API keys available for the requested model",
        "Please configure your API keys in Settings or enable fallback to system default.",
        "NO_API_KEYS"
      );
    }

    if (
      modelError.message.includes("Model not found") ||
      modelError.message.includes("Invalid model")
    ) {
      return createErrorResponse(
        "Invalid Model",
        400,
        `The requested model '${selectedModel}' is not available`,
        "Please select a valid model from the available options",
        "INVALID_MODEL"
      );
    }
  }

  // Generic model error
  return createErrorResponse(
    "Model Configuration Error",
    500,
    modelError instanceof Error
      ? modelError.message
      : "Failed to configure AI model",
    "Please check your model selection and API key configuration",
    "MODEL_ERROR"
  );
}

export function handleGenericError(error: unknown): Response {
  console.error("Unexpected chat API error:", error);

  // Handle specific error types
  if (error instanceof Error) {
    // Network errors
    if (error.message.includes("fetch") || error.message.includes("network")) {
      return createErrorResponse(
        "Network Error",
        503,
        "Failed to connect to external services",
        "Please check your internet connection and try again",
        "NETWORK_ERROR"
      );
    }

    // Timeout errors
    if (error.message.includes("timeout")) {
      return createErrorResponse(
        "Request Timeout",
        504,
        "The request took too long to process",
        "Please try again with a shorter message or fewer attachments",
        "TIMEOUT_ERROR"
      );
    }
  }

  // Generic fallback error
  return createErrorResponse(
    "Internal Server Error",
    500,
    "An unexpected error occurred while processing your request",
    "Please try again later or contact support if the issue persists",
    "INTERNAL_ERROR"
  );
}

// Validation error helpers
export const ValidationErrors = {
  invalidJson: () =>
    createErrorResponse(
      "Invalid Request Format",
      400,
      "Request body must be valid JSON",
      "Ensure the request contains valid JSON data",
      "INVALID_JSON"
    ),

  invalidMessages: () =>
    createErrorResponse(
      "Invalid Messages Format",
      400,
      "Messages must be an array of message objects",
      "Provide messages as an array with role and content properties",
      "INVALID_MESSAGES"
    ),

  emptyMessages: () =>
    createErrorResponse(
      "Empty Messages Array",
      400,
      "At least one message is required",
      "Include at least one message in the conversation",
      "EMPTY_MESSAGES"
    ),

  invalidMessageStructure: (index: number) =>
    createErrorResponse(
      "Invalid Message Structure",
      400,
      `Message at index ${index} is missing required 'role' or 'content' field`,
      "Each message must have both 'role' and 'content' properties",
      "INVALID_MESSAGE_STRUCTURE"
    ),

  invalidMessageRole: (index: number, role: string) =>
    createErrorResponse(
      "Invalid Message Role",
      400,
      `Message at index ${index} has invalid role: ${role}`,
      "Message role must be 'user', 'assistant', or 'system'",
      "INVALID_MESSAGE_ROLE"
    ),

  invalidFileId: () =>
    createErrorResponse(
      "Invalid File ID",
      400,
      "All file IDs must be non-empty strings",
      "Provide valid file IDs",
      "INVALID_FILE_ID"
    ),

  configFetchError: (error: unknown) =>
    createErrorResponse(
      "Configuration Fetch Error",
      500,
      error instanceof Error ? error.message : "Unknown configuration error",
      "Please check your user settings and try again",
      "CONFIG_FETCH_ERROR"
    ),

  fileProcessingError: (error: unknown) =>
    createErrorResponse(
      "File Processing Error",
      422,
      error instanceof Error ? error.message : "Unknown file processing error",
      "Check that all files are accessible and in supported formats",
      "FILE_PROCESSING_ERROR"
    ),

  fileAttachmentError: (error: unknown) =>
    createErrorResponse(
      "File Attachment Error",
      422,
      error instanceof Error
        ? error.message
        : "Failed to process file attachments",
      "Ensure all files are valid and accessible",
      "FILE_ATTACHMENT_ERROR"
    ),

  messageFormatError: () =>
    createErrorResponse(
      "Message Formatting Error",
      500,
      "Failed to format messages for AI processing",
      "Check message structure and try again",
      "MESSAGE_FORMAT_ERROR"
    ),

  providerError: (error: unknown) =>
    createErrorResponse(
      "Provider Error",
      500,
      error instanceof Error
        ? error.message
        : "Failed to configure AI provider",
      "Please check your API key configuration in Settings and try again",
      "PROVIDER_ERROR"
    ),
};
