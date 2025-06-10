"use client";

import { ParticipantsList } from "@/components/chat/ParticipantsList";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";
import { Id } from "../../../convex/_generated/dataModel";
import { MessagesSquare } from "lucide-react";

interface ChatHeaderProps {
  conversationId: Id<"conversations">;
  title?: string;
  aiEnabled: boolean;
  onAiToggle: (enabled: boolean) => void;
}

export function ChatHeader({
  conversationId,
  title,
  aiEnabled,
  onAiToggle,
}: ChatHeaderProps) {
  return (
    <header className="flex h-12 max-w-4xl mx-auto items-center gap-4 border border-border/50 px-3 mt-1 sticky top-0 bg-background/50 backdrop-blur-sm w-full rounded-lg">
      {/* Left side: Sidebar trigger and title */}
      <SidebarTrigger className="sm:hidden" />
      <div className="flex items-center gap-2">
        <MessagesSquare className="h-4 w-4 text-muted-foreground/70" />
        <span className="text-sm font-medium text-muted-foreground truncate line-clamp-1">
          {title && title !== "" ? (
            title
          ) : (
            <div className="w-20 sm:w-40 h-4 bg-secondary/30 rounded-full animate-pulse" />
          )}
        </span>
      </div>

      {/* Right side: Participants and AI controls */}
      <div className="flex flex-1 items-center justify-end gap-2">
        <ParticipantsList conversationId={conversationId} />

        <div className="flex items-center gap-2 border rounded-2xl p-1">
          <span className="text-sm text-muted-foreground">AI</span>
          <Switch
            checked={aiEnabled}
            onCheckedChange={onAiToggle}
            className="data-[state=checked]:bg-primary"
          />
        </div>
      </div>
    </header>
  );
}
