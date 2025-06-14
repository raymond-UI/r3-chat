"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useMutation, useQuery } from "convex/react";
import { Globe, Loader2, Star, Tag, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Skeleton } from "../ui/skeleton";

// Constants for validation
const MAX_TAGS = 5;
const MAX_TAG_LENGTH = 30;

// Types for better type safety
interface ShowcaseData {
  isShownOnProfile: boolean;
  isFeatured: boolean;
  tags: string[];
}

interface ConversationShowcaseDialogProps {
  conversationId: Id<"conversations">;
  isOpen: boolean;
  onClose: () => void;
}

// Utility functions
const sanitizeString = (str: string): string => {
  return str.trim().replace(/[<>]/g, ""); // Basic XSS prevention
};

const validateTag = (tag: string): { isValid: boolean; error?: string } => {
  const sanitized = sanitizeString(tag);

  if (!sanitized) return { isValid: false, error: "Tag cannot be empty" };
  if (sanitized.length > MAX_TAG_LENGTH)
    return {
      isValid: false,
      error: `Tag too long (max ${MAX_TAG_LENGTH} characters)`,
    };
  if (!/^[a-zA-Z0-9\s-_]+$/.test(sanitized))
    return { isValid: false, error: "Tag contains invalid characters" };

  return { isValid: true };
};

export function ConversationShowcaseDialog({
  conversationId,
  isOpen,
  onClose,
}: ConversationShowcaseDialogProps) {
  // State with proper typing
  const [showcaseData, setShowcaseData] = useState<ShowcaseData>({
    isShownOnProfile: false,
    isFeatured: false,
    tags: [],
  });
  const [tagInput, setTagInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tagError, setTagError] = useState<string>("");

  // Memoized queries for better performance
  const conversationQuery = useQuery(api.conversations.get, {
    conversationId,
  });

  const conversation = useMemo(
    () => (conversationQuery?.success ? conversationQuery.conversation : null),
    [conversationQuery]
  );

  const updateShowcase = useMutation(
    api.userProfiles.updateConversationShowcase
  );

  // Memoized derived state
  const isFormDirty = useMemo(() => {
    if (!conversation?.showcase) {
      return (
        showcaseData.isShownOnProfile ||
        showcaseData.isFeatured ||
        showcaseData.tags.length > 0
      );
    }

    const original = conversation.showcase;
    return (
      original.isShownOnProfile !== showcaseData.isShownOnProfile ||
      original.isFeatured !== showcaseData.isFeatured ||
      JSON.stringify(original.tags) !== JSON.stringify(showcaseData.tags)
    );
  }, [conversation?.showcase, showcaseData]);

  const canAddTag = useMemo(() => {
    if (!tagInput.trim()) return false;
    if (showcaseData.tags.length >= MAX_TAGS) return false;

    const sanitized = sanitizeString(tagInput);
    return (
      !showcaseData.tags.includes(sanitized) && validateTag(sanitized).isValid
    );
  }, [tagInput, showcaseData.tags]);

  // Initialize form data when conversation loads
  useEffect(() => {
    if (conversation?.showcase) {
      setShowcaseData({
        isShownOnProfile: conversation.showcase.isShownOnProfile ?? false,
        isFeatured: conversation.showcase.isFeatured ?? false,
        tags: conversation.showcase.tags ?? [],
      });
    }
  }, [conversation?.showcase]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setTagInput("");
      setTagError("");
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Auto-clear isFeatured when isShownOnProfile is false
  useEffect(() => {
    if (!showcaseData.isShownOnProfile && showcaseData.isFeatured) {
      setShowcaseData((prev) => ({ ...prev, isFeatured: false }));
    }
  }, [showcaseData.isShownOnProfile, showcaseData.isFeatured]);

  // Handlers with proper error handling and validation
  const handleUpdateShowcaseData = useCallback(
    (updates: Partial<ShowcaseData>) => {
      setShowcaseData((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  const handleAddTag = useCallback(() => {
    const sanitized = sanitizeString(tagInput);
    const validation = validateTag(sanitized);

    if (!validation.isValid) {
      setTagError(validation.error || "Invalid tag");
      return;
    }

    if (showcaseData.tags.length >= MAX_TAGS) {
      setTagError(`You can only add up to ${MAX_TAGS} tags`);
      return;
    }

    if (showcaseData.tags.includes(sanitized)) {
      setTagError("Tag already exists");
      return;
    }

    handleUpdateShowcaseData({
      tags: [...showcaseData.tags, sanitized],
    });
    setTagInput("");
    setTagError("");
  }, [tagInput, showcaseData.tags, handleUpdateShowcaseData]);

  const handleRemoveTag = useCallback(
    (tagToRemove: string) => {
      handleUpdateShowcaseData({
        tags: showcaseData.tags.filter((tag) => tag !== tagToRemove),
      });
    },
    [showcaseData.tags, handleUpdateShowcaseData]
  );

  const handleTagInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setTagInput(value);

      // Clear error when user starts typing
      if (tagError) {
        setTagError("");
      }
    },
    [tagError]
  );

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (canAddTag) {
          handleAddTag();
        }
      }
    },
    [canAddTag, handleAddTag]
  );

  const handleSave = useCallback(async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      await updateShowcase({
        conversationId,
        showcase: {
          isShownOnProfile: showcaseData.isShownOnProfile,
          isFeatured: showcaseData.isFeatured,
          tags: showcaseData.tags,
        },
      });

      toast.success("Showcase settings updated!");
      onClose();
    } catch (error) {
      console.error("Error updating showcase:", error);
      toast.error("Failed to update showcase settings. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, conversationId, showcaseData, updateShowcase, onClose]);

  const handleRemoveFromProfile = useCallback(async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      await updateShowcase({
        conversationId,
        showcase: {
          isShownOnProfile: false,
          isFeatured: false,
          tags: [],
        },
      });

      toast.success("Conversation removed from profile");
      onClose();
    } catch (error) {
      console.error("Error removing from profile:", error);
      toast.error("Failed to remove from profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, conversationId, updateShowcase, onClose]);



  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Showcase Settings
          </DialogTitle>
        </DialogHeader>
        <DialogDescription className="sr-only">
          Configure how this conversation appears on your public profile
        </DialogDescription>

        {conversation === null ? (
          <div className="flex items-center justify-center py-8">
            <Skeleton className="w-full"/>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-6">
              {/* Conversation Preview */}
              <div className="bg-muted/50 rounded-lg p-4">
                <h3 className="font-medium text-sm mb-1 line-clamp-2">
                  {conversation.title || "Untitled Conversation"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Configure how this conversation appears on your public profile
                </p>
              </div>

              {/* Show on Profile Toggle */}
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <Label
                    htmlFor="show-on-profile"
                    className="flex items-center gap-2"
                  >
                    <Globe className="h-4 w-4" />
                    Show on Public Profile
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Make this conversation visible on your public profile
                  </p>
                </div>
                <Switch
                  id="show-on-profile"
                  checked={showcaseData.isShownOnProfile}
                  onCheckedChange={(checked) =>
                    handleUpdateShowcaseData({ isShownOnProfile: checked })
                  }
                  disabled={isSubmitting}
                />
              </div>

              {/* Featured Toggle - only show if conversation is on profile */}
              {showcaseData.isShownOnProfile && (
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <Label
                      htmlFor="featured"
                      className="flex items-center gap-2"
                    >
                      <Star className="h-4 w-4" />
                      Feature this Conversation
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Highlight this conversation at the top of your profile
                    </p>
                  </div>
                  <Switch
                    id="featured"
                    checked={showcaseData.isFeatured}
                    onCheckedChange={(checked) =>
                      handleUpdateShowcaseData({ isFeatured: checked })
                    }
                    disabled={isSubmitting}
                  />
                </div>
              )}

              {/* Tags - only show if conversation is on profile */}
              {showcaseData.isShownOnProfile && (
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Tags ({showcaseData.tags.length}/{MAX_TAGS})
                  </Label>

                  {/* Tag Input */}
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a tag..."
                        value={tagInput}
                        onChange={handleTagInputChange}
                        onKeyPress={handleKeyPress}
                        className="flex-1"
                        maxLength={MAX_TAG_LENGTH}
                        disabled={
                          isSubmitting || showcaseData.tags.length >= MAX_TAGS
                        }
                      />
                      <Button
                        type="button"
                        onClick={handleAddTag}
                        disabled={!canAddTag || isSubmitting}
                        size="sm"
                      >
                        Add
                      </Button>
                    </div>

                    {tagError && (
                      <p className="text-xs text-destructive">{tagError}</p>
                    )}
                  </div>

                  {/* Current Tags */}
                  {showcaseData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {showcaseData.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          <span className="truncate max-w-[120px]">{tag}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => handleRemoveTag(tag)}
                            disabled={isSubmitting}
                            aria-label={`Remove ${tag} tag`}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    Add tags to help others discover your conversation by topic
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-between pt-4 border-t">
                <div>
                  {conversation.showcase?.isShownOnProfile && (
                    <Button
                      variant="destructive"
                      onClick={handleRemoveFromProfile}
                      disabled={isSubmitting}
                      //   className="text-destructive-foreground hover:text-destructive"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Removing...
                        </>
                      ) : (
                        "Remove from Profile"
                      )}
                    </Button>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={!isFormDirty || isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
