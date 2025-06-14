"use client";

import {
    Archive,
    Copy,
    Download,
    Edit3,
    Pin,
    Star,
    Trash2
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Id } from "../../../convex/_generated/dataModel";

// Hook for managing context menu state
export function useContextMenu() {
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    conversationId: Id<"conversations"> | null;
  }>({
    visible: false,
    x: 0,
    y: 0,
    conversationId: null,
  });

  const showContextMenu = (
    event: React.MouseEvent,
    conversationId: Id<"conversations">
  ) => {
    event.preventDefault();
    event.stopPropagation();

    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      conversationId,
    });
  };

  const hideContextMenu = () => {
    setContextMenu((prev) => ({ ...prev, visible: false }));
  };

  return {
    contextMenu,
    showContextMenu,
    hideContextMenu,
  };
}

interface ContextMenuProps {
  x: number;
  y: number;
  visible: boolean;
  onClose: () => void;
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
  onDuplicate?: () => void;
  onArchive?: () => void;
}

interface ContextMenuItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: "default" | "destructive";
  badge?: string;
  disabled?: boolean;
}

function ContextMenuItem({
  icon,
  label,
  onClick,
  variant = "default",
  badge,
  disabled = false,
}: ContextMenuItemProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors
        hover:bg-accent hover:text-accent-foreground
        disabled:opacity-50 disabled:cursor-not-allowed
        ${
          variant === "destructive"
            ? "text-destructive hover:bg-destructive hover:text-destructive-foreground"
            : "text-foreground"
        }
      `}
    >
      <span className="flex-shrink-0">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {badge && (
        <span className="text-xs px-1.5 py-0.5 bg-muted rounded text-muted-foreground">
          {badge}
        </span>
      )}
    </button>
  );
}

export function ConversationContextMenu({
  x,
  y,
  visible,
  onClose,
//   conversationId,
//   conversationTitle,
  isPinned,
//   isCollaborative = false,
  isShownOnProfile = false,
  isFeatured = false,
  onPin,
  onRename,
  onDelete,
  onExport,
  onShowcase,
  onDuplicate,
  onArchive,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState({ x, y });

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    if (visible) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [visible, onClose]);

  // Adjust position to keep menu in viewport
  useEffect(() => {
    if (visible && menuRef.current) {
      const menuRect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let adjustedX = x;
      let adjustedY = y;

      // Adjust horizontal position
      if (x + menuRect.width > viewportWidth) {
        adjustedX = x - menuRect.width;
      }

      // Adjust vertical position
      if (y + menuRect.height > viewportHeight) {
        adjustedY = y - menuRect.height;
      }

      // Ensure menu doesn't go off-screen
      adjustedX = Math.max(
        8,
        Math.min(adjustedX, viewportWidth - menuRect.width - 8)
      );
      adjustedY = Math.max(
        8,
        Math.min(adjustedY, viewportHeight - menuRect.height - 8)
      );

      setAdjustedPosition({ x: adjustedX, y: adjustedY });
    }
  }, [visible, x, y]);

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  if (!visible) return null;

  const menuContent = (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[200px] bg-popover border border-border rounded-md shadow-lg"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
    >
      <div className="py-1">
        {/* Pin/Unpin */}
        <ContextMenuItem
          icon={<Pin className="h-4 w-4" />}
          label={isPinned ? "Unpin" : "Pin"}
          onClick={() => handleAction(onPin)}
        />

        {/* Rename */}
        <ContextMenuItem
          icon={<Edit3 className="h-4 w-4" />}
          label="Rename"
          onClick={() => handleAction(onRename)}
        />

        {/* Showcase */}
        <ContextMenuItem
          icon={<Star className="h-4 w-4" />}
          label="Showcase"
          onClick={() => handleAction(onShowcase)}
          badge={
            isShownOnProfile ? (isFeatured ? "Featured" : "Public") : undefined
          }
        />

        <div className="border-t border-border my-1" />

        {/* Duplicate */}
        {onDuplicate && (
          <ContextMenuItem
            icon={<Copy className="h-4 w-4" />}
            label="Duplicate"
            onClick={() => handleAction(onDuplicate)}
          />
        )}

        {/* Export */}
        <ContextMenuItem
          icon={<Download className="h-4 w-4" />}
          label="Export"
          onClick={() => handleAction(onExport)}
          badge="BETA"
        />

        {/* Archive */}
        {onArchive && (
          <ContextMenuItem
            icon={<Archive className="h-4 w-4" />}
            label="Archive"
            onClick={() => handleAction(onArchive)}
          />
        )}

        <div className="border-t border-border my-1" />

        {/* Delete */}
        <ContextMenuItem
          icon={<Trash2 className="h-4 w-4" />}
          label="Delete"
          onClick={() => handleAction(onDelete)}
          variant="destructive"
        />
      </div>
    </div>
  );

  return createPortal(menuContent, document.body);
}
