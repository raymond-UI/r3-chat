import type { Id } from "../../convex/_generated/dataModel";

export type ConversationData = {
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

export type VirtualListItem = 
  | { 
      type: 'group-header'; 
      id: string; 
      label: string; 
      isCollapsible: boolean;
      isOpen: boolean;
    }
  | { 
      type: 'conversation'; 
      id: string; 
      conversation: ConversationData; 
      isPinned: boolean; 
    }
  | { 
      type: 'empty-state'; 
      id: string; 
      message: string; 
      subMessage?: string;
      icon?: React.ComponentType<{ className?: string }>; 
    }
  | {
      type: 'spacing';
      id: string;
      height: number;
    };

export const ITEM_HEIGHTS = {
  groupHeader: 32,
  conversation: 52,
  emptyState: 120,
  spacing: 8,
} as const; 