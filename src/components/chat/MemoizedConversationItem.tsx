import { memo } from "react";
import { ConversationItem } from "./ConversationItem";
import type { Id } from "../../../convex/_generated/dataModel";
import type { ConversationData } from "@/types/virtualList";
import type { UserResource } from "@clerk/types";

interface MemoizedConversationItemProps {
  conversation: ConversationData;
  isPinned: boolean;
  activeConversationId?: Id<"conversations">;
  hoveredId: Id<"conversations"> | null;
  pinnedConversations: Id<"conversations">[];
  user: UserResource | null | undefined;
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

export const MemoizedConversationItem = memo<MemoizedConversationItemProps>(
  (props) => {
    return <ConversationItem {...props} />;
  },
  (prevProps, nextProps) => {
    // Custom comparison for optimal re-rendering
    return (
      prevProps.conversation._id === nextProps.conversation._id &&
      prevProps.conversation.title === nextProps.conversation.title &&
      prevProps.conversation.lastMessage === nextProps.conversation.lastMessage &&
      prevProps.conversation.updatedAt === nextProps.conversation.updatedAt &&
      prevProps.conversation.isCollaborative === nextProps.conversation.isCollaborative &&
      prevProps.activeConversationId === nextProps.activeConversationId &&
      prevProps.hoveredId === nextProps.hoveredId &&
      prevProps.isPinned === nextProps.isPinned &&
      prevProps.user?.id === nextProps.user?.id &&
      JSON.stringify(prevProps.pinnedConversations) === JSON.stringify(nextProps.pinnedConversations)
    );
  }
);

MemoizedConversationItem.displayName = "MemoizedConversationItem"; 