"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { Id } from "../../convex/_generated/dataModel";

interface PendingMessage {
  conversationId: Id<"conversations">;
  content: string;
  model: string;
  fileIds?: Id<"files">[];
}

interface ChatContextValue {
  pendingMessage: PendingMessage | null;
  setPendingMessage: (message: PendingMessage | null) => void;
  consumePendingMessage: () => PendingMessage | null;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [pendingMessage, setPendingMessage] = useState<PendingMessage | null>(null);

  const consumePendingMessage = () => {
    const message = pendingMessage;
    setPendingMessage(null);
    return message;
  };

  return (
    <ChatContext.Provider value={{
      pendingMessage,
      setPendingMessage,
      consumePendingMessage
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChatContext must be used within ChatProvider");
  }
  return context;
}
