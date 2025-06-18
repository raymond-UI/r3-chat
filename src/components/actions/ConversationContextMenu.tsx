"use client";

import { Download, Edit3, Pin, Star, Trash2 } from "lucide-react";
import React, { useState } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Id } from "../../../convex/_generated/dataModel";
import { Authenticated } from "convex/react";


export function useContextMenu() {
  const [selectedConversationId, setSelectedConversationId] =
    useState<Id<"conversations"> | null>(null);

  const setConversationId = (conversationId: Id<"conversations">) => {
    setSelectedConversationId(conversationId);
  };

  const clearConversationId = () => {
    setSelectedConversationId(null);
  };

  return {
    selectedConversationId,
    setConversationId,
    clearConversationId,
  };
}

interface ConversationContextMenuProps {
  children: React.ReactNode;
  conversationId: Id<"conversations">;
  conversationTitle: string;
  isPinned: boolean;
  isCollaborative?: boolean;
  isShownOnProfile?: boolean;
  isFeatured?: boolean;
  onPin: () => void;
  onRename: () => void;
  onDelete: () => void;
  onExport: () => void;
  onShowcase: () => void;
  onOpenChange?: (open: boolean) => void;
}

interface ContextMenuItemWithBadgeProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: "default" | "destructive";
  badge?: string;
  disabled?: boolean;
}

function ContextMenuItemWithBadge({
  icon,
  label,
  onClick,
  variant = "default",
  badge,
  disabled = false,
}: ContextMenuItemWithBadgeProps) {
  return (
    <ContextMenuItem
      onClick={onClick}
      disabled={disabled}
      className={`
        flex items-center gap-3 cursor-pointer
        ${variant === "destructive" ? "text-destructive-foreground focus:bg-destructive focus:text-destructive-foreground" : ""}
      `}
    >
      <span className="flex-shrink-0">{icon}</span>
      <span className="flex-1">{label}</span>
      {badge && (
        <span className="text-xs px-1.5 py-0.5 bg-muted rounded text-muted-foreground ml-auto">
          {badge}
        </span>
      )}
    </ContextMenuItem>
  );
}

export function ConversationContextMenu({
  children,
  isPinned,
  isShownOnProfile = false,
  isFeatured = false,
  onPin,
  onRename,
  onDelete,
  onExport,
  onShowcase,
  onOpenChange,
}: ConversationContextMenuProps) {
  return (
    <ContextMenu onOpenChange={onOpenChange}>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-[200px]">

      <Authenticated>
        {/* Pin/Unpin */}
        <ContextMenuItemWithBadge
          icon={<Pin className="h-4 w-4" />}
          label={isPinned ? "Unpin" : "Pin"}
          onClick={onPin}
        />
        </Authenticated>

        {/* Rename */}
        <ContextMenuItemWithBadge
          icon={<Edit3 className="h-4 w-4" />}
          label="Rename"
          onClick={onRename}
        />

        {/* Showcase */}
        <Authenticated>

        <ContextMenuItemWithBadge
          icon={<Star className="h-4 w-4" />}
          label="Showcase"
          onClick={onShowcase}
          badge={
            isShownOnProfile ? (isFeatured ? "Featured" : "Public") : undefined
          }
          />
          </Authenticated>

        <ContextMenuSeparator />

        {/* Export */}
        <ContextMenuItemWithBadge
          icon={<Download className="h-4 w-4" />}
          label="Export"
          onClick={onExport}
          badge="BETA"
        />

        <ContextMenuSeparator />

        {/* Delete */}
        <ContextMenuItemWithBadge
          icon={<Trash2 className="h-4 w-4 text-destructive-foreground" />}
          label="Delete"
          onClick={onDelete}
          variant="destructive"
        />
      </ContextMenuContent>
    </ContextMenu>
  );
}
