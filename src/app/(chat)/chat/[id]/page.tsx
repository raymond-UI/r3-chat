// app/(chat)/chat/[id]/page.tsx
import { ChatContainer } from "@/components/chat/ChatContainer";
import { PageParams } from "@/types/params";
import { notFound } from "next/navigation";
import React from "react";
import type { Id } from "../../../../../convex/_generated/dataModel";

export default async function ConversationPage(
  context: PageParams
): Promise<React.ReactNode> {
  const { id } = await context.params;
  const conversationId = id as Id<"conversations">;

  // Validate the conversation ID format
  if (!conversationId || typeof conversationId !== "string") {
    notFound();
  }

  return (
    <ChatContainer conversationId={conversationId as Id<"conversations">} />
  );
}
