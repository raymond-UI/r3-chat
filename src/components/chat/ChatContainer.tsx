"use client";

import { useConversationAccess } from "@/hooks/useConversationAccess";
import { Authenticated } from "convex/react";
import { AlertTriangle, Lock } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import type { Id } from "../../../convex/_generated/dataModel";
import { ChatArea } from "../chat-area/ChatArea";
import { LoadingIndicator } from "../indicators/LoadingIndicator";
import { Card, CardContent } from "../ui/card";
import { ChatHeader } from "./ChatHeader";

interface ChatContainerProps {
  conversationId: Id<"conversations">;
  initialSelectedModel?: string;
} 

export function ChatContainer({ conversationId, initialSelectedModel }: ChatContainerProps) {
  const [aiEnabled, setAiEnabled] = useState(true);
  const searchParams = useSearchParams();
  
  // Check if this is invite access
  const isInviteAccess = searchParams.get("invite") === conversationId;
  
  const { isLoading: accessLoading } = useConversationAccess(conversationId, isInviteAccess);

  const {
    canAccess,
    error: accessError,
    accessReason,
  } = useConversationAccess(conversationId, isInviteAccess);

  return (
    <div className="flex relative flex-col items-start justify-start w-full min-w-0 overflow-hidden h-full">
      <Authenticated>
        <ChatHeader
          conversationId={conversationId}
          aiEnabled={aiEnabled}
          onAiEnabledChange={setAiEnabled}
        />
      </Authenticated>
     
      {accessLoading ? (
        <div className="flex-1 h-full w-full flex items-center opacity-30 px-4 sm:px-8 justify-center">
          <LoadingIndicator />
        </div>
      ) : (
        <>
          {!canAccess ? (
            <AccessDenied
              accessError={accessError}
              accessReason={accessReason}
            />
          ) : (
            <ChatArea conversationId={conversationId} aiEnabled={aiEnabled} initialSelectedModel={initialSelectedModel} />
          )}
        </>
      )}
    </div>
  );
}

function AccessDenied({
  accessError,
  accessReason,
}: {
  accessError: string | null;
  accessReason: string | null;
}) {
  // Handle access denied

  return (
    <Card className="w-full flex items-center justify-center p-8 py-20 border bg-card/50 rounded-t-none">
      <CardContent className="text-center space-y-4 max-w-md m-auto">
        <div className="flex justify-center">
          {accessError?.includes("not found") ? (
            <AlertTriangle className="h-12 w-12 text-yellow-500" />
          ) : (
            <Lock className="h-12 w-12 text-red-500" />
          )}
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-foreground">
            {accessError?.includes("not found")
              ? "Conversation Not Found"
              : "Access Denied"}
          </h2>
          <p className="text-muted-foreground text-lg text-balance my-2">
            {accessError ||
              "You don't have permission to view this conversation."}
          </p>
          {accessReason && (
            <p className="text-lg text-muted-foreground">
              Reason: {accessReason}
            </p>
          )}
        </div>
        <div className="border rounded-md overflow-hidden w-full">
          <p className="text-base text-muted-foreground bg-accent/50 p-2">
            To access this conversation, you need to:
          </p>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="border-t p-2">Be invited as a participant</li>
            <li className="border-t p-2">Use a public share link</li>
            <li className="border-t p-2">Be the conversation creator</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
