"use client";

import { useState } from "react";
import { useAI } from "@/hooks/useAI";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Id } from "../../../convex/_generated/dataModel";

interface StreamingTestProps {
  conversationId: Id<"conversations">;
}

export function StreamingTest({ conversationId }: StreamingTestProps) {
  const [input, setInput] = useState("");
  const [streamingContent, setStreamingContent] = useState("");
  const [isTestStreaming, setIsTestStreaming] = useState(false);
  const { streamToAI } = useAI();

  const handleTestStream = async () => {
    if (!input.trim()) return;
    
    setIsTestStreaming(true);
    setStreamingContent(""); // Clear previous content
    
    console.log("🧪 Starting test stream...");
    
    try {
      await streamToAI(
        conversationId,
        input,
        "meta-llama/llama-3.3-8b-instruct:free", // Fast model for testing
        (chunk: string) => {
          console.log("🧪 Received chunk:", chunk);
          setStreamingContent(prev => {
            const newContent = prev + chunk;
            console.log("🧪 Updated content:", newContent);
            return newContent;
          });
        },
        (fullResponse: string) => {
          console.log("🧪 Streaming complete:", fullResponse);
          setIsTestStreaming(false);
        }
      );
    } catch (error) {
      console.error("🧪 Test streaming error:", error);
      setIsTestStreaming(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-muted/50 space-y-4">
      <h3 className="text-lg font-semibold">🧪 Streaming Test Component</h3>
      
      <div className="space-y-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter test message..."
          disabled={isTestStreaming}
          rows={2}
        />
        
        <Button 
          onClick={handleTestStream} 
          disabled={isTestStreaming || !input.trim()}
          className="w-full"
        >
          {isTestStreaming ? "Streaming..." : "Test Stream"}
        </Button>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium">Streaming Output:</div>
        <div className="p-3 bg-background border rounded min-h-[100px] whitespace-pre-wrap">
          {streamingContent || (isTestStreaming ? "Waiting for chunks..." : "No content yet")}
          {isTestStreaming && (
            <span className="inline-block w-2 h-4 bg-primary/60 animate-pulse ml-1" />
          )}
        </div>
      </div>

      {isTestStreaming && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-current rounded-full animate-bounce delay-100"></div>
            <div className="w-2 h-2 bg-current rounded-full animate-bounce delay-200"></div>
          </div>
          <span>Streaming in progress...</span>
        </div>
      )}
    </div>
  );
} 