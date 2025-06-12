"use client";

import { useState } from "react";
import { Id } from "../../../convex/_generated/dataModel";
import { ChatArea } from "./ChatArea";
import { ChatHeader } from "./ChatHeader";

interface ChatContainerProps {
  conversationId: Id<"conversations">;
}

export function ChatContainer({ conversationId }: ChatContainerProps) {
  const [aiEnabled, setAiEnabled] = useState(true);

  return (
    <div className="flex relative flex-col items-start justify-start w-full min-w-0 overflow-hidden h-full">
      <ChatHeader 
        conversationId={conversationId} 
        aiEnabled={aiEnabled}
        onAiEnabledChange={setAiEnabled}
      />
      <ChatArea 
        conversationId={conversationId} 
        aiEnabled={aiEnabled}
      />
    </div>
  );
} 