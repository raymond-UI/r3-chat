"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useConversations } from "@/hooks/useConversations";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, MessageSquare, AlertCircle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface JoinConversationDialogProps {
  conversationId: Id<"conversations"> | null;
  isOpen: boolean;
  onClose: () => void;
  onJoin: (conversationId: Id<"conversations">) => void;
}

export function JoinConversationDialog({
  conversationId,
  isOpen,
  onClose,
  onJoin
}: JoinConversationDialogProps) {
  const { user } = useUser();
  const { addUser } = useConversations();
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Get conversation details
  const conversationResult = useQuery(
    api.conversations.get,
    conversationId ? { conversationId } : "skip"
  );
  
  const conversation = conversationResult?.success ? conversationResult.conversation : null;

  // Get presence info for participants
  const presence = useQuery(
    api.presence.list,
    conversationId ? { conversationId } : "skip"
  );

  const isAlreadyParticipant = conversation?.participants.includes(user?.id || "");
  const activeUsers = presence?.filter(p => 
    Date.now() - p.lastSeen < 30000 // Active within last 30 seconds
  ).map(p => p.userId) || [];

  const handleJoin = async () => {
    if (!conversationId || !user?.id) return;

    setIsJoining(true);
    setJoinError(null);

    try {
      // Add user to conversation
      await addUser(conversationId, user.id);
      
      // Join the conversation
      onJoin(conversationId);
      onClose();
    } catch (error) {
      console.error("Failed to join conversation:", error);
      setJoinError("Failed to join conversation. Please try again.");
    } finally {
      setIsJoining(false);
    }
  };

  const handleViewOnly = () => {
    if (conversationId) {
      onJoin(conversationId);
      onClose();
    }
  };

  // Show loading state while conversation is being fetched
  if (conversationId && conversationResult === undefined) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
              Loading Conversation
            </DialogTitle>
            <DialogDescription>
              Please wait while we load the conversation details...
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
          </div>
          
          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Show error state when conversation is null (not found)
  if (conversationId && conversationResult && !conversationResult.success) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Conversation Not Found
            </DialogTitle>
            <DialogDescription>
              {conversationResult?.error || "This conversation doesn't exist or you don't have permission to view it."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {conversation?.isCollaborative ? (
              <Users className="h-5 w-5 text-blue-600" />
            ) : (
              <MessageSquare className="h-5 w-5 text-green-600" />
            )}
            Join Conversation
          </DialogTitle>
          <DialogDescription>
            You&apos;ve been invited to join this conversation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Conversation Details */}
          <div className="p-4 rounded-lg bg-muted/50 space-y-3">
            <div>
              <h3 className="font-medium text-lg">{conversation?.title}</h3>
              <div className="flex items-center gap-2 mt-1">
                {conversation?.isCollaborative ? (
                  <Badge variant="secondary" className="text-xs">
                    <Users className="h-3 w-3 mr-1" />
                    Collaborative
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">
                    <MessageSquare className="h-3 w-3 mr-1" />
                    Standard Chat
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {conversation?.participants.length} participant{conversation?.participants.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Participants Preview */}
            <div>
              <p className="text-sm font-medium mb-2">Participants:</p>
              <div className="flex -space-x-2">
                {conversation?.participants.slice(0, 5).map((participantId) => (
                  <Avatar key={participantId} className="h-8 w-8 border-2 border-background">
                    <AvatarImage src={user?.id === participantId ? user?.imageUrl : undefined} />
                    <AvatarFallback className="text-xs">
                      {participantId === user?.id 
                        ? user?.firstName?.charAt(0) || "U"
                        : participantId.charAt(0).toUpperCase()
                      }
                    </AvatarFallback>
                  </Avatar>
                ))}
                {(conversation?.participants.length || 0) > 5 && (
                  <div className="h-8 w-8 rounded-full border-2 border-background bg-muted flex items-center justify-center">
                    <span className="text-xs">+{(conversation?.participants.length || 0) - 5}</span>
                  </div>
                )}
              </div>
              {activeUsers.length > 0 && (
                <p className="text-xs text-green-600 mt-1">
                  {activeUsers.length} user{activeUsers.length !== 1 ? 's' : ''} currently active
                </p>
              )}
            </div>
          </div>

          {/* Status Messages */}
          {isAlreadyParticipant && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                You&apos;re already a participant in this conversation.
              </AlertDescription>
            </Alert>
          )}

          {joinError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{joinError}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            
            {isAlreadyParticipant ? (
              <Button onClick={handleViewOnly} className="flex-1">
                <MessageSquare className="h-4 w-4 mr-2" />
                Open Chat
              </Button>
            ) : (
              <Button 
                onClick={handleJoin} 
                disabled={isJoining}
                className="flex-1"
              >
                {isJoining ? (
                  <>
                    <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Joining...
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4 mr-2" />
                    Join Conversation
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}