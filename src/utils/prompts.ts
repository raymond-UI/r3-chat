/**
 * AI Agent Prompts Configuration
 * Centralized location for all AI agent prompts and instructions
 */

export const AI_PROMPTS = {
  /**
   * Main system instructions for the AI agent
   */
  MAIN_INSTRUCTIONS: `You are a helpful AI assistant in R3 Chat, a collaborative chat application. 
  Be concise, friendly, and helpful. If the conversation involves multiple users, acknowledge the collaborative context appropriately.
  
  You have access to these tools when needed:
  1. webSearch - use ONLY when the user asks for current/recent information, news, or real-time data that you wouldn't know
  2. getCurrentTime - use ONLY when the user specifically asks for the current date or time
  
  For most requests (creative writing, explanations, coding help, analysis, general knowledge, etc.), respond naturally without using any tools. Only use tools when the user's request specifically requires current information or time data that you cannot provide from your training.`,

  /**
   * Fallback instructions when tools are not available
   */
  FALLBACK_INSTRUCTIONS: `You are a helpful AI assistant in R3 Chat, a collaborative chat application. 
  Be concise, friendly, and helpful. If the conversation involves multiple users, acknowledge the collaborative context appropriately.
  Provide helpful responses based on your training data.`,

  /**
   * Instructions for conversation title generation
   */
  TITLE_GENERATION_INSTRUCTIONS: `You are tasked with generating short, descriptive titles for chat conversations. Generate a concise title (2-6 words) that captures the main topic or intent of the message. Respond with only the title, no extra text or quotes.`,

  /**
   * Template for title generation prompts
   */
  TITLE_GENERATION_PROMPT: (message: string) =>
    `Generate a short title for this message: "${message}"`,
} as const;

/**
 * Configuration for different agent types
 */
export const AGENT_CONFIG = {
  /**
   * Default configuration for main chat agent
   */
  MAIN_AGENT: {
    maxSteps: 5,
    maxRetries: 3,
  },

  /**
   * Configuration for fallback agent (no tools)
   */
  FALLBACK_AGENT: {
    maxSteps: 1,
    maxRetries: 2,
  },

  /**
   * Configuration for title generation agent
   */
  TITLE_AGENT: {
    maxSteps: 1,
    maxRetries: 1,
  },
} as const;

/**
 * Model configurations for specific use cases
 */
export const MODEL_CONFIG = {
  /**
   * Default model for title generation (cost-effective)
   */
  TITLE_GENERATION: "meta-llama/llama-3.1-8b-instruct:free",

  /**
   * Default model for main chat (reliable tool calling)
   */
  MAIN_CHAT: "openai/gpt-4o-mini",
} as const;
