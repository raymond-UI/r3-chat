"use client";

import { useState } from "react";
import { ChatArea } from "@/components/chat/ChatArea";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { Id } from "../../../../convex/_generated/dataModel";
import { useParams, notFound } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export default function ConversationPage() {
  const params = useParams();
  const conversationId = params.id as string;
  const [aiEnabled, setAiEnabled] = useState(true);
  const conversation = useQuery(api.conversations.get, {
    conversationId: conversationId as Id<"conversations">,
  });
  console.log(conversation);

  // Validate the conversation ID format
  if (!conversationId || typeof conversationId !== "string") {
    notFound();
  }

  return (
    <div className="flex flex-col items-start justify-start w-full h-full">
      <ChatHeader
        conversationId={conversationId as Id<"conversations">}
        title={conversation?.title || "Untitled"}
        aiEnabled={aiEnabled}
        onAiToggle={setAiEnabled}
      />
      <ChatArea
        conversationId={conversationId as Id<"conversations">}
        aiEnabled={aiEnabled}
      />
    </div>
  );
}
