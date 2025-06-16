"use client";

import { MessageList } from "@/components/chat-area/MessageList";
import { MessageListLoading } from "@/components/chat/ui/MessageListLoading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Clock, Globe, Lock } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useQuery } from "@/cache/useQuery";

interface SharePageClientProps {
  shareId: string;
}

export default function SharePageClient({ shareId }: SharePageClientProps) {
  const [password, setPassword] = useState("");
  const [isPasswordEntered, setIsPasswordEntered] = useState(false);

  const conversation = useQuery(api.conversations.getByShareId, {
    shareId,
    password: isPasswordEntered ? password : undefined,
  });

  const messagesResult = useQuery(
    api.messages.list,
    conversation && typeof conversation === "object" && "title" in conversation
      ? { conversationId: conversation._id }
      : "skip"
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

  useEffect(() => {
    if (conversation === null) {
      toast.error("This conversation is not available or has expired");
    }
  }, [conversation]);

  // Loading state
  if (conversation === undefined || messagesResult === undefined) {
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

  // Password required
  if (conversation && "requiresPassword" in conversation) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Lock className="h-5 w-5" />
              Password Protected
            </CardTitle>
            <p className="text-muted-foreground">
              This conversation requires a password to view
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && password.trim()) {
                    setIsPasswordEntered(true);
                  }
                }}
              />
            </div>
            <Button
              className="w-full"
              onClick={() => setIsPasswordEntered(true)}
              disabled={!password.trim()}
            >
              Access Conversation
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Conversation not found or expired
  if (conversation === null) {
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
              This conversation link is invalid, has expired, or is no longer
              being shared.
            </p>
            <div className="space-y-2 text-muted-foreground">
              <p>Possible reasons</p>
              <ul className=" space-y-1">
                <li className="border rounded-md p-2">The link has expired</li>
                <li className="border rounded-md p-2">
                  The conversation is no longer public
                </li>
                <li className="border rounded-md p-2">
                  The conversation has been deleted
                </li>
                <li className="border rounded-md p-2">Invalid share link</li>
              </ul>
            </div>
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
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-xl font-semibold flex items-center gap-2">
                {conversation.title}
              </h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {new Date(conversation.createdAt).toLocaleDateString()}
                </span>
              </div>
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
            <p>This is a read-only view of a shared conversation.</p>
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
