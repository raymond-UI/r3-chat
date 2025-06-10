"use client";

import { ParticipantsList } from "@/components/chat/ParticipantsList";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";
import { Id } from "../../../convex/_generated/dataModel";

interface ChatHeaderProps {
  conversationId: Id<"conversations">;
  title: string;
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
    <header className="flex h-12 items-center gap-4 border-b border-border/50 px-4 lg:px-6 sticky top-0 bg-background/50 backdrop-blur-sm w-full">
      {/* Left side: Sidebar trigger and title */}
      <SidebarTrigger className="lg:hidden" />
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground truncate line-clamp-1">{title}</span>
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
