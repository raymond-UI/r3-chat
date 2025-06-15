"use client";

import { MessageList } from "@/components/chat/MessageList";
import { MessageListLoading } from "@/components/chat/ui/MessageListLoading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  findConversationIdByShortId,
  parseConversationSlug,
} from "@/lib/slugs";
import { useQuery } from "convex/react";
import { AlertTriangle, ArrowLeft, Clock, Globe, User } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { Skeleton } from "@/components/ui/skeleton";

interface PublicConversationClientProps {
  username: string;
  slug: string;
}

export default function PublicConversationClient({
  username,
  slug,
}: PublicConversationClientProps) {
  // Parse the slug to extract the short ID
  const { shortId } = useMemo(() => {
    try {
      return parseConversationSlug(slug);
    } catch {
      return { titleSlug: "", shortId: "" };
    }
  }, [slug]);

  // Get the profile first to get userId
  const profile = useQuery(
    api.userProfiles.getProfileBySlug,
    username ? { slug: username } : "skip"
  );

  // Get all conversations for this profile to find the matching one
  const profileConversations = useQuery(
    api.userProfiles.getProfileConversations,
    profile?.userId
      ? {
          userId: profile.userId,
          limit: 1000, // Get all to search through
          offset: 0,
          featuredOnly: false,
        }
      : "skip"
  );

  // Find the conversation that matches our short ID
  const conversation = useMemo(() => {
    if (!profileConversations?.conversations || !shortId) return null;

    return (
      profileConversations.conversations.find((conv) =>
        findConversationIdByShortId(shortId, conv._id)
      ) || null
    );
  }, [profileConversations?.conversations, shortId]);

  // Get messages
  const messagesResult = useQuery(
    api.messages.list,
    conversation ? { conversationId: conversation._id } : "skip"
  );

  const messages = messagesResult?.success ? messagesResult.messages : null;

  // Transform messages to match the expected format for MessageList
  const displayMessages = useMemo(() => {
    if (!messages) return [];

    return messages.map((msg) => ({
      ...msg,
      _id: msg._id as Id<"messages">,
      attachedFiles: [],
      isRealTimeStreaming: false,
    }));
  }, [messages]);

  // Check if this conversation is publicly accessible
  const isPubliclyAccessible = useMemo(() => {
    if (!conversation || !profile) return false;

    // Must be owned by the profile user and showcased on their profile
    // If it's showcased on their profile, it should be publicly accessible
    return (
      conversation.createdBy === profile.userId &&
      conversation.showcase?.isShownOnProfile
    );
  }, [conversation, profile]);

  // Loading state
  if (
    profile === undefined ||
    profileConversations === undefined ||
    messagesResult === undefined
  ) {
    return (
      <div className="flex flex-col justify-start min-h-screen">
        <div className="border-b bg-dot backdrop-blur-sm sticky top-0 z-10 w-full">
          <div className="max-w-4xl mx-auto px-4 py-4 gap-2 flex flex-col items-start">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-10" />
          </div>
        </div>
        <div className="max-w-4xl w-full mx-auto px-4 py-6">
          <MessageListLoading />
        </div>
      </div>
    );
  }

  // Profile not found
  if (profile === null) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-card-foreground">
              <AlertTriangle className="h-5 w-5" />
              Profile Not Found
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              The profile &quot;{username}&quot; does not exist.
            </p>
            <Button variant="outline" asChild>
              <Link href="/">Go Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Conversation not found or not public
  if (!conversation || !isPubliclyAccessible) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-card-foreground">
              <AlertTriangle className="h-5 w-5" />
              Conversation Not Available
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground text-balance">
              This conversation is not publicly available or doesn&apos;t exist.
            </p>
            <div className="space-y-2 text-muted-foreground">
              <p>Possible reasons:</p>
              <ul className="space-y-1">
                <li className="border rounded-md p-2">
                  The conversation is private
                </li>
                <li className="border rounded-md p-2">
                  The conversation is not showcased on the profile
                </li>
                <li className="border rounded-md p-2">
                  The conversation has been deleted
                </li>
                <li className="border rounded-md p-2">
                  Invalid conversation ID
                </li>
              </ul>
            </div>
            <Button variant="outline" asChild>
              <Link href={`/u/${username}`}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Profile
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-dot backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between ">
            <div className="space-y-1">
              <h1 className="text-xl font-semibold flex items-center gap-2">
                {conversation.title}
              </h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <Link
                  href={`/u/${username}`}
                  className="flex items-center gap-1 hover:underline"
                >
                  <User className="h-4 w-4" />
                  by {profile.displayName || username}
                </Link>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {new Date(conversation.createdAt).toLocaleDateString()}
                </span>
              </div>

              {/* Tags */}
              {conversation.showcase?.tags &&
                conversation.showcase.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {conversation.showcase.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {messages && messages.length > 0 ? (
          <MessageList
            messages={displayMessages}
            conversationId={conversation._id}
            readOnly={true}
          />
        ) : (
          <div className="text-center py-12">
            <div className="text-muted-foreground text-balance">
              <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>This conversation doesn&apos;t have any messages yet.</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t bg-card/50 mt-12">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="text-center text-sm text-muted-foreground">
            <p>This is a read-only view of a public conversation.</p>
            <p className="mt-1">
              Powered by R3 Chat - Create your own conversations at{" "}
              <Link href="/" className="text-primary hover:underline">
                {typeof window !== "undefined"
                  ? window.location.host
                  : "r3chat.com"}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
