import type { Doc } from "../../convex/_generated/dataModel";

// Base message with files and metadata
export interface MessageWithFiles extends Doc<"messages"> {
  attachedFiles?: Doc<"files">[];
  senderName?: string;
}

// Enhanced message type with streaming status for real-time UI
export interface StreamingMessage extends MessageWithFiles {
  isRealTimeStreaming?: boolean;
  senderName?: string;
}

// Union type for all possible message states
export type ChatMessage = StreamingMessage;

// Message action handlers with proper typing
export interface MessageActionHandlers {
  onCopy: (content: string) => void;
  onEdit: (messageId: string) => void;
  onRetry: (messageId: string) => Promise<void>;
  onRetryAlternative: (messageId: string) => Promise<void>;
  onBranchConversation: (messageId: string) => Promise<void>;
  onBranchChange: (messageId: string, branchIndex: number) => Promise<void>;
}

// Message component props with strict typing
export interface MessageItemProps {
  message: ChatMessage;
  currentUserId?: string;
  hoveredMessageId: string | null;
  openDropdownMessageId: string | null;
  isMobile: boolean;
  readOnly: boolean;
  handlers: MessageActionHandlers;
  onMouseEnter: (messageId: string) => void;
  onMouseLeave: () => void;
  onDropdownChange: (messageId: string | null) => void;
}

// Streaming status enum for better type safety
export enum StreamingStatus {
  IDLE = "idle",
  STREAMING = "streaming",
  COMPLETED = "completed",
  ERROR = "error"
}

// Message display configuration
export interface MessageDisplayConfig {
  showTimestamp: boolean;
  showSenderName: boolean;
  maxWidth: string;
  enableActions: boolean;
} 