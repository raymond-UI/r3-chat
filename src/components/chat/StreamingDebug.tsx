"use client";

import { useUser } from "@clerk/nextjs";
import { Doc } from "../../../convex/_generated/dataModel";

interface MessageWithFiles extends Doc<"messages"> {
  attachedFiles?: Doc<"files">[];
}

interface StreamingDebugProps {
  messages: MessageWithFiles[];
  activeStreamingContent: Record<string, string>;
}

export function StreamingDebug({ messages, activeStreamingContent }: StreamingDebugProps) {
  const { user } = useUser();

  const streamingMessages = messages.filter(m => m.status === "streaming");
  const hasActiveContent = Object.keys(activeStreamingContent).length > 0;

  return (
    <div className="p-3 bg-muted/30 max-h-[200px] overflow-y-auto border rounded text-xs space-y-2">
      <div className="font-semibold text-blue-600">🔍 Streaming Debug Info</div>
      
      <div className="space-y-1">
        <div><strong>User ID:</strong> {user?.id || 'not logged in'}</div>
        <div><strong>Total Messages:</strong> {messages.length}</div>
        <div><strong>Streaming Messages:</strong> {streamingMessages.length}</div>
        <div><strong>Has Active Content:</strong> {hasActiveContent ? 'Yes' : 'No'}</div>
      </div>

      {streamingMessages.length > 0 && (
        <div className="space-y-1">
          <div className="font-medium">Streaming Messages:</div>
          {streamingMessages.map(msg => (
            <div key={msg._id} className="ml-2 p-1 bg-background rounded text-xs">
              <div><strong>ID:</strong> {msg._id}</div>
              <div><strong>For User:</strong> {msg.streamingForUser}</div>
              <div><strong>Content:</strong> {msg.content?.slice(0, 50)}...</div>
              <div><strong>Is Mine:</strong> {msg.streamingForUser === user?.id ? 'Yes' : 'No'}</div>
            </div>
          ))}
        </div>
      )}

      {hasActiveContent && (
        <div className="space-y-1">
          <div className="font-medium">Active Streaming Content:</div>
          {Object.entries(activeStreamingContent).map(([key, content]) => (
            <div key={key} className="ml-2 p-1 bg-background rounded text-xs">
              <div><strong>Key:</strong> {key}</div>
              <div><strong>Content:</strong> {content.slice(0, 100)}...</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 