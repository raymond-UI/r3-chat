"use client";

import React, {
  useRef,
  useCallback,
  useState,
  useImperativeHandle,
  forwardRef,
} from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StagedFiles } from "./StagedFiles";
import { Send, Paperclip, Settings2, Loader2 } from "lucide-react";
import { FileWithPreview } from "@/hooks/useFiles";
import { ModelSelector } from "./ModelSelector";
import { useConversations } from "@/hooks/useConversations";
import { useSendMessage } from "@/hooks/useMessages";
import { useAI } from "@/hooks/useAI";
import { useAnonymousMessaging } from "@/hooks/useAnonymousMessaging";
import { Id } from "../../../convex/_generated/dataModel";
import { MessageLimitIndicator } from "../indicators/MessageLimitIndicator";
import { ModelLimitManager } from "@/utils/MessageLimitManager";
import { ModelKey } from "@/types/ai";

interface MessageInputProps {
  // For existing chat mode
  value?: string;
  onChange?: (value: string) => void;
  onSend?: () => void;
  disabled?: boolean;
  placeholder?: string;
  selectedModel?: string;
  onModelChange?: (model: string) => void;

  // For new chat mode
  isNewChat?: boolean;
  clearUploadedFiles?: () => void;

  // Common props
  uploadingFiles: FileWithPreview[];
  onUploadFiles: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  isUploading?: boolean;
  hasFilesToSend?: boolean;
  showSignUpPrompt?: () => void;
  uploadStagedFiles?: (
    conversationId: Id<"conversations">
  ) => Promise<Id<"files">[]>;
}

export const MessageInput = forwardRef<
  { fillInput: (text: string) => void },
  MessageInputProps
>(
  (
    {
      value,
      onChange,
      onSend,
      disabled = false,
      placeholder = "Type a message...",
      selectedModel,
      onModelChange,
      isNewChat = false,
      clearUploadedFiles,
      uploadingFiles,
      onUploadFiles,
      onRemoveFile,
      isUploading = false,
      hasFilesToSend = false,
      uploadStagedFiles,
      showSignUpPrompt,
    },
    ref
  ) => {
    // Local state for new chat mode
    const [localInputValue, setLocalInputValue] = useState("");
    const [localSelectedModel, setLocalSelectedModel] = useState(
      "google/gemini-2.0-flash-exp:free"
    );
    const [isSending, setIsSending] = useState(false);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    const { create } = useConversations();
    const { send } = useSendMessage();
    const { generateTitle, isStreaming } = useAI(); // Use streaming for better UX
    const {
      trackMessageSent,
      isSignedIn,
      isInitialized,
      remainingMessages,
      messageLimit,
    } = useAnonymousMessaging();

    // Use local or prop values based on mode
    const currentValue = isNewChat ? localInputValue : value || "";
    const currentSelectedModel = isNewChat
      ? localSelectedModel
      : selectedModel || "";
    const currentPlaceholder = isNewChat
      ? "Start a new conversation..."
      : placeholder;
    const isDisabled = isNewChat ? isSending || isStreaming : disabled; // Also disable during AI streaming

    // Expose fill input function for new chat mode
    useImperativeHandle(
      ref,
      () => ({
        fillInput: (text: string) => {
          if (isNewChat) {
            setLocalInputValue(text);
          } else if (onChange) {
            onChange(text);
          }
          // Auto-resize textarea after setting value
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.style.height = "auto";
              textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
              textareaRef.current.focus();
            }
          }, 0);
        },
      }),
      [isNewChat, onChange]
    );

    const handleValueChange = (newValue: string) => {
      if (isNewChat) {
        setLocalInputValue(newValue);
      } else if (onChange) {
        onChange(newValue);
      }
    };

    const handleModelChange = (model: string) => {
      if (isNewChat) {
        setLocalSelectedModel(model);
      } else if (onModelChange) {
        onModelChange(model);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (canSend) {
          handleSendMessage();
        }
      }
    };

    const handleTextareaChange = (
      e: React.ChangeEvent<HTMLTextAreaElement>
    ) => {
      handleValueChange(e.target.value);

      // Auto-resize textarea
      const textarea = e.target;
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    };

    const handleFileSelect = useCallback(() => {
      fileInputRef.current?.click();
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        onUploadFiles(files);
      }
      // Reset input so same file can be selected again
      e.target.value = "";
    };

    // Check if we have any image files attached
    const hasImages = uploadingFiles.some(
      (fileWithPreview) =>
        fileWithPreview.file.type.startsWith("image/") &&
        (fileWithPreview.uploaded || fileWithPreview.uploading)
    );

    // Can send if:
    // - Has text content OR has uploaded files ready to send
    // - Not disabled
    // - Not currently uploading files
    const canSend =
      (currentValue.trim() || hasFilesToSend) && !isDisabled && !isUploading;

    const handleSendMessage = async () => {
      // Check model-specific limits first
      const userType = isSignedIn ? 'free' : 'anonymous';
      const modelKey = currentSelectedModel as ModelKey;
      const modelLimitCheck = ModelLimitManager.canUseModel(modelKey, userType);
      
      if (!modelLimitCheck.canUse) {
        showSignUpPrompt?.();
        return;
      }

      // Check general message limits for anonymous users
      if (!isSignedIn && (remainingMessages === null || remainingMessages <= 0)) {
        showSignUpPrompt?.();
        return;
      }

      if (isNewChat) {
        // New chat creation logic - now supports anonymous users
        if (!currentValue.trim() && !hasFilesToSend) return;

        const messageContent = currentValue.trim();
        setLocalInputValue("");
        setIsSending(true);

        try {
          // Create new conversation (works for both anonymous and authenticated users)
          const conversationId = await create("New Chat");

          // Save any uploaded files to database
          let uploadedFileIds: Id<"files">[] = [];
          if (uploadStagedFiles && hasFilesToSend) {
            uploadedFileIds = await uploadStagedFiles(conversationId);
          }

          // Send user message with uploaded file IDs
          await send(
            conversationId,
            messageContent,
            "user",
            undefined,
            uploadedFileIds.length > 0 ? uploadedFileIds : undefined
          );

          // Track model usage
          ModelLimitManager.incrementModelUsage(modelKey);

          // Track message for anonymous users
          trackMessageSent(conversationId);

          // Clear staged files
          if (clearUploadedFiles) {
            clearUploadedFiles();
          }

          // ✅ NEW: Trigger AI response for the first message
          if (messageContent) {
            try {
              // Generate title in parallel
              await generateTitle(conversationId, messageContent);
              
              // ✅ Trigger AI response using existing AI hook
              await generateTitle(conversationId, messageContent);
            } catch (aiError) {
              console.error("Failed to trigger AI response:", aiError);
              // Don't block navigation if AI fails
            }
          }

          // Navigate to the conversation page
          router.push(`/chat/${conversationId}`);

        } catch (error) {
          console.error(
            "Failed to create conversation and send message:",
            error
          );
          // Re-add message to input on error
          setLocalInputValue(messageContent);
        } finally {
          setIsSending(false);
        }
      } else {
        // Existing chat logic - also track model usage
        if (onSend) {
          const modelKey = currentSelectedModel as ModelKey;
          ModelLimitManager.incrementModelUsage(modelKey);
          onSend();
        }
      }
    };

    const handleSettings = () => {
      console.log("Settings");
    };

    return (
      <div className="relative bg-muted/50 backdrop-blur shadow-2xl p-2 pb-0 w-full rounded-t-lg max-w-2xl mx-auto mt-0">
        {!isSignedIn && isInitialized && remainingMessages !== null && (
          <div className="absolute z-10 -top-12 left-0 w-full px-2 flex justify-center">
            <MessageLimitIndicator
              remainingMessages={remainingMessages}
              totalLimit={messageLimit}
              className="max-w-sm"
              onSignUpClick={showSignUpPrompt}
            />
          </div>
        )}
        <div className="w-full bg-background rounded-md overflow-clip relative z-0">
          {/* Uploading/Staged Files Preview */}
          <StagedFiles files={uploadingFiles} onRemove={onRemoveFile} />

          {/* Message Input Area */}
          <div className="flex flex-col items-end">
            {/* Text Input */}
            <div className=" w-full relative">
              <Textarea
                ref={textareaRef}
                value={currentValue}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder={
                  isUploading ? "Files uploading..." : currentPlaceholder
                }
                disabled={isDisabled}
                className="min-h-[80px] w-full max-h-[120px] resize-none rounded-none rounded-t-mhd border-none focus-visible:ring-0 focus-visible:ring-offset-0"
                rows={1}
              />
            </div>

            <div className="flex items-center justify-end w-full border border-border/50 bg-secondary/5 flex-row gap-1 p-2">
              <div className="flex items-center gap-2 w-full justify-start">
                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />

                <ModelSelector
                  selectedModel={currentSelectedModel}
                  onModelChange={handleModelChange}
                  hasImages={hasImages}
                />

                {/* File Upload Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleFileSelect}
                  disabled={isDisabled}
                  className="flex-shrink-0"
                  title="Upload files"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSettings}
                  disabled={isDisabled}
                  className="flex-shrink-0"
                  title="Settings"
                >
                  <Settings2 className="h-4 w-4" />
                </Button>
              </div>
              {/* Send Button */}
              <Button
                onClick={handleSendMessage}
                disabled={!canSend}
                className="flex-shrink-0"
                title={
                  isUploading
                    ? "Wait for files to finish uploading"
                    : !canSend
                      ? "Type a message or upload files"
                      : "Send message"
                }
              >
                {isSending || isStreaming || isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

MessageInput.displayName = "MessageInput";
