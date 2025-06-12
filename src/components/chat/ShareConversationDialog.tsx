"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useMutation, useQuery } from "convex/react";
import { Clock, Copy, Eye, Globe, Lock, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

interface ShareConversationDialogProps {
  conversationId: Id<"conversations">;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareConversationDialog({ 
  conversationId, 
  isOpen, 
  onClose 
}: ShareConversationDialogProps) {
  const conversation = useQuery(api.conversations.get, { conversationId });
  const updateSharing = useMutation(api.conversations.updateSharing);
  
  const [isPublic, setIsPublic] = useState(conversation?.sharing?.isPublic || false);
  const [requiresPassword, setRequiresPassword] = useState(conversation?.sharing?.requiresPassword || false);
  const [password, setPassword] = useState(conversation?.sharing?.password || "");
  const [allowAnonymous, setAllowAnonymous] = useState(conversation?.sharing?.allowAnonymous || false);
  const [expirationDays, setExpirationDays] = useState<number | "">("");
  
  const [isUpdating, setIsUpdating] = useState(false);

  if (!conversation) {
    return null;
  }

  const shareUrl = conversation?.sharing?.shareId 
    ? `${window.location.origin}/share/${conversation.sharing.shareId}`
    : "";

  const handleSave = async () => {
    setIsUpdating(true);
    try {
      const expiresAt = expirationDays 
        ? Date.now() + (Number(expirationDays) * 24 * 60 * 60 * 1000)
        : undefined;

      await updateSharing({
        conversationId,
        sharing: {
          isPublic,
          requiresPassword,
          password: requiresPassword ? password : undefined,
          allowAnonymous,
          expiresAt,
        },
      });
      
      toast.success("Sharing settings updated successfully");
      onClose();
    } catch (error) {
      toast.error("Failed to update sharing settings");
      console.error("Error updating sharing:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const copyShareLink = async () => {
    if (!shareUrl) return;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Share link copied to clipboard");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const generateNewShareId = async () => {
    try {
      await updateSharing({
        conversationId,
        sharing: {
          isPublic: true,
          requiresPassword,
          password: requiresPassword ? password : undefined,
          allowAnonymous,
          expiresAt: expirationDays 
            ? Date.now() + (Number(expirationDays) * 24 * 60 * 60 * 1000)
            : undefined,
        },
      });
      toast.success("New share link generated");
    } catch {
      toast.error("Failed to generate new link");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Share Conversation
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Public Access Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="public-access" className="flex items-center gap-2">
                {isPublic ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                Public Access
              </Label>
              <p className="text-sm text-muted-foreground">
                Allow anyone with the link to view this conversation
              </p>
            </div>
            <Switch
              id="public-access"
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
          </div>

          {isPublic && (
            <>
              {/* Share Link */}
              <div className="space-y-2">
                <Label>Share Link</Label>
                <div className="flex gap-2">
                  <Input
                    value={shareUrl}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyShareLink}
                    disabled={!shareUrl}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={generateNewShareId}
                  className="text-muted-foreground"
                >
                  Generate new link
                </Button>
              </div>

              {/* Password Protection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password-protection" className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Password Protection
                  </Label>
                  <Switch
                    id="password-protection"
                    checked={requiresPassword}
                    onCheckedChange={setRequiresPassword}
                  />
                </div>
                
                {requiresPassword && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                    />
                  </div>
                )}
              </div>

              {/* Anonymous Access */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="anonymous-access" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Allow Anonymous Viewing
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Allow users to view without signing in
                  </p>
                </div>
                <Switch
                  id="anonymous-access"
                  checked={allowAnonymous}
                  onCheckedChange={setAllowAnonymous}
                />
              </div>

              {/* Expiration */}
              <div className="space-y-2">
                <Label htmlFor="expiration" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Link Expiration (optional)
                </Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="expiration"
                    type="number"
                    min="1"
                    max="365"
                    value={expirationDays}
                    onChange={(e) => setExpirationDays(e.target.value ? Number(e.target.value) : "")}
                    placeholder="Days"
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">days from now</span>
                </div>
              </div>

              {/* Privacy Notice */}
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <div className="flex gap-2">
                  <Eye className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-800 dark:text-amber-200">
                    <p className="font-medium">Privacy Notice</p>
                    <p className="mt-1">
                      Anyone with this link can view the conversation history. 
                      Be careful when sharing sensitive information.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isUpdating || (requiresPassword && !password.trim())}
              className="flex-1"
            >
              {isUpdating ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 