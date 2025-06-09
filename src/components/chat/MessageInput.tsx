"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import { useEffect, useRef } from "react";

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function MessageInput({
  value,
  onChange,
  onSend,
  disabled = false,
  placeholder = "Type a message..."
}: MessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && value.trim()) {
        onSend();
      }
    }
  };

  const handleSend = () => {
    if (!disabled && value.trim()) {
      onSend();
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2 items-end w-full">
      <div className="flex-1 w-full relative">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="min-h-[80px] w-full max-h-[120px] resize-none sm:pr-12  rounded-t-lg border-none focus-visible:ring-0 focus-visible:ring-offset-0"
          rows={1}
        />
      </div>
      
      <Button
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        size="icon"
        className="h-10 w-10 flex-shrink-0"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
} 