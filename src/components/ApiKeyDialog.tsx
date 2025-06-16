import { useState, useCallback, memo, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Key, X, ExternalLink, Eye, EyeOff, Edit2 } from "lucide-react";
import type { ApiKeyDialogProps } from "../types/api-keys";

export const ApiKeyDialog = memo<
  ApiKeyDialogProps & {
    readonly open: boolean;
    readonly onOpenChange: (open: boolean) => void;
  }
>(({ provider, hasKey, isDefault, maskedKey, onSave, onDelete, open, onOpenChange }) => {
  const [apiKey, setApiKey] = useState("");
  const [isDefaultProvider, setIsDefaultProvider] = useState(isDefault);
  const [showKey, setShowKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(!hasKey); // Auto-edit mode if no key exists

  const handleSave = useCallback(async () => {
    if (!apiKey.trim() && !hasKey) {
      toast.error("Please enter an API key");
      return;
    }

    setIsLoading(true);
    try {
      if (apiKey.trim()) {
        await onSave(apiKey.trim(), isDefaultProvider);
      } else if (hasKey && isDefaultProvider !== isDefault) {
        // Just updating default status
        await onSave("", isDefaultProvider);
      }

      setApiKey("");
      setIsEditing(false); // Exit edit mode after successful save
      onOpenChange(false);
    } catch {
      // Error handling is done in the hook
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, hasKey, isDefaultProvider, isDefault, onSave, onOpenChange]);

  const handleDelete = useCallback(async () => {
    setIsLoading(true);
    try {
      await onDelete();
      onOpenChange(false);
    } catch {
      // Error handling is done in the hook
    } finally {
      setIsLoading(false);
    }
  }, [onDelete, onOpenChange]);

  const toggleKeyVisibility = useCallback(() => {
    setShowKey((prev) => !prev);
  }, []);

  const handleKeyChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setApiKey(e.target.value);
    },
    []
  );

  const handleDefaultChange = useCallback((checked: boolean) => {
    setIsDefaultProvider(checked);
  }, []);

  const handleEditClick = useCallback(() => {
    setIsEditing(true);
    setApiKey(""); // Clear input when starting to edit
  }, []);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setApiKey("");
  }, []);

  // Reset edit state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setIsEditing(!hasKey); // Auto-edit mode if no key exists
      setIsDefaultProvider(isDefault);
      setApiKey("");
    }
  }, [open, hasKey, isDefault]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0">
        <DialogHeader className="p-3 border-b">
          <DialogTitle className="flex items-center gap-2">
            Configure {provider.name}
          </DialogTitle>
          <DialogDescription>
            {hasKey
              ? "Update your API key and settings"
              : "Add your API key to enable direct access"}
          </DialogDescription>
        </DialogHeader>
        <div className="">
          <div className="space-y-2 p-3">
            <Label htmlFor="api-key">API Key</Label>
            
            {hasKey && !isEditing ? (
              // Show masked key as read-only value
              <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                <div className="font-mono font-bold text-sm">
                  {maskedKey || "••••••••••••••••"}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleEditClick}
                  disabled={isLoading}
                >
                  <Edit2 className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              </div>
            ) : (
              // Show input field for editing
              <div className="relative">
                <Input
                  id="api-key"
                  type={showKey ? "text" : "password"}
                  placeholder="Enter your API key"
                  value={apiKey}
                  onChange={handleKeyChange}
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-7 w-7"
                  onClick={toggleKeyVisibility}
                  disabled={isLoading}
                  aria-label={showKey ? "Hide API key" : "Show API key"}
                >
                  {showKey ? <EyeOff /> : <Eye />}
                </Button>
              </div>
            )}
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ExternalLink className="w-3 h-3" aria-hidden="true" />
              <a
                href={provider.website}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline focus:underline"
              >
                Get your API key from {provider.name}
              </a>
            </div>
          </div>

          <div className="flex items-center space-x-2 p-3">
            <Checkbox
              id="default-provider"
              checked={isDefaultProvider}
              onCheckedChange={handleDefaultChange}
              disabled={isLoading}
            />
            <Label htmlFor="default-provider" className="text-sm">
              Use as default for {provider.name} models
            </Label>
          </div>

          <div className="bg-muted text-sm border-y p-3">
            <div className="font-medium mb-1">How it works:</div>
            <div className="text-muted-foreground space-y-1">
              <div>
                • If enabled as default: Use your {provider.name} key for{" "}
                {provider.name} models
              </div>
              <div>• Otherwise: Use your OpenRouter key → System key</div>
              <div>• Direct keys often have better pricing and rate limits</div>
            </div>
          </div>

          <div className="flex gap-2 p-3">
            {isEditing ? (
              <>
                <Button
                  onClick={handleSave}
                  className="flex-1"
                  disabled={isLoading}
                >
                  <Key className="w-4 h-4 mr-2" aria-hidden="true" />
                  {hasKey ? "Update" : "Save"} Key
                </Button>
                
                {hasKey && (
                  <Button
                    variant="outline"
                    onClick={handleCancelEdit}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                )}
              </>
            ) : (
              <Button
                variant="outline"
                onClick={handleDelete}
                disabled={isLoading}
                className="flex-1"
              >
                <X className="w-4 h-4 mr-2" />
                Remove Key
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});

ApiKeyDialog.displayName = "ApiKeyDialog";
