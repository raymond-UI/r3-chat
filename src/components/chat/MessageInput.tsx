"use client";

import React, { useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StagedFiles } from "./StagedFiles";
import { Send, Paperclip } from "lucide-react";
import { FileWithPreview } from "@/hooks/useFiles";
import { ModelSelector } from "./ModelSelector";

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
  uploadingFiles: FileWithPreview[];
  onUploadFiles: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  isUploading?: boolean;
  hasFilesToSend?: boolean;
  selectedModel: string;
  onModelChange: (model: string) => void;
}

export function MessageInput({
  value,
  onChange,
  onSend,
  disabled = false,
  placeholder = "Type a message...",
  uploadingFiles,
  onUploadFiles,
  onRemoveFile,
  isUploading = false,
  hasFilesToSend = false,
  selectedModel,
  onModelChange,
}: MessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSend) {
        onSend();
      }
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);

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

  // Can send if:
  // - Has text content OR has uploaded files ready to send
  // - Not disabled
  // - Not currently uploading files
  const canSend = (value.trim() || hasFilesToSend) && !disabled && !isUploading;

  return (
    <div className="bg-background rounded-t-md overflow-clip">
      {/* Uploading/Staged Files Preview */}
      <StagedFiles files={uploadingFiles} onRemove={onRemoveFile} />

      {/* Message Input Area */}
      <div className="flex flex-col items-end">
        {/* Text Input */}
        <div className="flex-1 w-full relative">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder={isUploading ? "Files uploading..." : placeholder}
            disabled={disabled}
            className="min-h-[80px] w-full max-h-[120px] resize-none rounded-none rounded-t-md border-none focus-visible:ring-0 focus-visible:ring-offset-0"
            rows={1}
          />
        </div>

        <div className="flex items-center justify-end w-full border-t border-border/50 bg-secondary/5 flex-row gap-2 p-2">
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
              selectedModel={selectedModel}
              onModelChange={onModelChange}
            />

            {/* File Upload Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFileSelect}
              disabled={disabled}
              className="flex-shrink-0"
              title="Upload files"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
          </div>
          {/* Send Button */}
          <Button
            onClick={onSend}
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
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
