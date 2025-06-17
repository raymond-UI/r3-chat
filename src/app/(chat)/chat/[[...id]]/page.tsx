import { NewChatScreen } from "@/components/chat/NewChatScreen";
import { notFound } from "next/navigation";
import React from "react";
import type { Id } from "../../../../../convex/_generated/dataModel";

interface ChatPageProps {
  params: Promise<{ id?: string[] }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ChatPage({
  params: paramsPromise,
  searchParams: searchParamsPromise,
}: ChatPageProps): Promise<React.ReactNode> {
  const { id } = await paramsPromise;
  const conversationId = id?.[0] as Id<"conversations"> | undefined;

  // Handle invite redirects - check searchParams if needed
  const params = await searchParamsPromise;
  const inviteId = params?.invite;

  // If there's an invite parameter, show new chat screen to handle it
  if (inviteId) {
    return <NewChatScreen />;
  }

  // If no ID provided, show new chat screen
  if (!conversationId) {
    return <NewChatScreen />;
  }

  // Validate the conversation ID format
  if (typeof conversationId !== "string") {
    notFound();
  }

  // Show new chat screen with conversation ID - it will handle the transition
  return <NewChatScreen conversationId={conversationId} />;
} 