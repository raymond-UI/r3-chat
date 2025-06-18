import { Users } from "lucide-react";
// import { useUser } from "@clerk/nextjs";
import { Id } from "../../../convex/_generated/dataModel";
import { ConversationBranchIndicator } from "./ConversationBranchIndicator";
import { ConversationListAction } from "../actions/ConversationListAction";
import { ConversationContextMenu } from "../actions/ConversationContextMenu";

// type ClerkUser = ReturnType<typeof useUser>["user"];

interface ConversationItemProps {
  conversation: {
    _id: Id<"conversations">;
    title: string;
    lastMessage?: string;
    updatedAt: number;
    isCollaborative?: boolean;
    showcase?: {
      isShownOnProfile: boolean;
      isFeatured: boolean;
      tags: string[];
      description?: string;
      excerpt?: string;
    };
  };
  isPinned?: boolean;
  activeConversationId?: Id<"conversations">;
  hoveredId: Id<"conversations"> | null;
  pinnedConversations: Id<"conversations">[];
  // user: ClerkUser;
  onSelectConversation: (id: Id<"conversations">) => void;
  onSetHoveredId: (id: Id<"conversations"> | null) => void;
  onContextMenuPin: (conversationId: Id<"conversations">) => void;
  onContextMenuRename: (conversationId: Id<"conversations">) => void;
  onContextMenuDelete: (conversationId: Id<"conversations">) => void;
  onContextMenuExport: (conversationId: Id<"conversations">) => void;
  onContextMenuShowcase: (conversationId: Id<"conversations">) => void;
  onPin: (id: Id<"conversations">, event?: React.MouseEvent) => void;
  onDelete: (id: Id<"conversations">, event?: React.MouseEvent) => void;
}

export function ConversationItem({
  conversation,
  isPinned = false,
  activeConversationId,
  hoveredId,
  pinnedConversations,
  // user,
  onSelectConversation,
  onSetHoveredId,
  onContextMenuPin,
  onContextMenuRename,
  onContextMenuDelete,
  onContextMenuExport,
  onContextMenuShowcase,
  onPin,
  onDelete,
}: ConversationItemProps) {
  return (
    <ConversationContextMenu
      conversationId={conversation._id}
      conversationTitle={conversation.title}
      isPinned={pinnedConversations.includes(conversation._id)}
      isCollaborative={conversation.isCollaborative}
      isShownOnProfile={conversation.showcase?.isShownOnProfile}
      isFeatured={conversation.showcase?.isFeatured}
      onPin={() => onContextMenuPin(conversation._id)}
      onRename={() => onContextMenuRename(conversation._id)}
      onDelete={() => onContextMenuDelete(conversation._id)}
      onExport={() => onContextMenuExport(conversation._id)}
      onShowcase={() => onContextMenuShowcase(conversation._id)}
    >
      <div
        onClick={(e) => {
          // Only trigger selection on left click, not right click
          if (e.button === 0) {
            onSelectConversation(conversation._id);
          }
        }}
        onMouseEnter={() => onSetHoveredId(conversation._id)}
        onMouseLeave={() => onSetHoveredId(null)}
        className={`relative p-2 ${isPinned ? "px-4" : ""} rounded${isPinned ? "" : "-sm"} cursor-pointer transition-colors hover:bg-muted text-foreground ${
          activeConversationId === conversation._id
            ? "bg-background border border-border"
            : ""
        }`}
      >
        <div className="flex items-center gap-2">
          {!isPinned && (
            <ConversationBranchIndicator
              conversationId={conversation._id}
              onNavigateToParent={(parentId) => {
                onSelectConversation(parentId);
              }}
            />
          )}
          <h3 className="text-sm truncate text-ellipsis">
            {conversation.title}
          </h3>
          {conversation.isCollaborative && (
            <Users className="h-3 w-3 text-muted-foreground" />
          )}
          {isPinned && (
            <ConversationBranchIndicator
              conversationId={conversation._id}
              onNavigateToParent={(parentId) => {
                onSelectConversation(parentId);
              }}
            />
          )}
        </div>
        {/* Only show actions for authenticated users */}
        {/* {user && ( */}
          <ConversationListAction
            visible={hoveredId === conversation._id}
            isPinned={pinnedConversations.includes(conversation._id)}
            onPin={(event) => onPin(conversation._id, event)}
            onDelete={(event) => onDelete(conversation._id, event)}
          />
        {/* )} */}
      </div>
    </ConversationContextMenu>
  );
}
