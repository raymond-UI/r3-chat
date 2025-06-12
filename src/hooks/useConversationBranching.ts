import { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function useConversationBranching() {
  const { user } = useUser();
  const router = useRouter();
  const createBranchMutation = useMutation(api.conversations.createConversationBranch);
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);

  const createConversationBranch = useCallback(async (
    parentConversationId: Id<"conversations">,
    branchAtMessageId: Id<"messages">,
    title?: string
  ) => {
    if (!user?.id) throw new Error("User not authenticated");
    
    setIsCreatingBranch(true);
    try {
      const newConversationId = await createBranchMutation({
        parentConversationId,
        branchAtMessageId,
        userId: user.id,
        title,
      });

      toast.success("Conversation branched successfully!");
      
      // Navigate to the new branched conversation
      router.push(`/chat/${newConversationId}`);
      
      return newConversationId;
    } catch (error) {
      console.error("Failed to create conversation branch:", error);
      toast.error("Failed to branch conversation. Please try again.");
      throw error;
    } finally {
      setIsCreatingBranch(false);
    }
  }, [user?.id, createBranchMutation, router]);

  return {
    createConversationBranch,
    isCreatingBranch,
  };
} 