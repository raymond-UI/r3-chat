"use client";

import { ParticipantsList } from "@/components/chat/ParticipantsList";
import { Switch } from "@/components/ui/switch";
import { Id } from "../../../convex/_generated/dataModel";

interface ChatHeaderProps {
  conversationId: Id<"conversations">;
  aiEnabled: boolean;
  onAiEnabledChange: (enabled: boolean) => void;
}

export function ChatHeader({
  conversationId,
  aiEnabled,
  onAiEnabledChange,
}: ChatHeaderProps) {
  return (
    <header className="flex absolute top-0 sm:top-0 right-0 z-50 items-center justify-between bg-secondary/25 backdrop-blur-sm border border-border/50 rounded-md rounded-br-none rounded-tl-none px-2 py-1 shadow-sm">
      <div className="flex flex-1 items-center justify-end gap-2">
        <ParticipantsList conversationId={conversationId} />
        <div className="flex items-center gap-2 rounded-2xl p-1">
          <span className="text-sm text-muted-foreground">AI</span>
          <Switch
            checked={aiEnabled}
            onCheckedChange={onAiEnabledChange}
            className="data-[state=checked]:bg-primary"
          />
        </div>
      </div>
    </header>
  );
}
