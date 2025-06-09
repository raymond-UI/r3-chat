import { useAction } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { AIModel } from "@/types/ai";

export function useAI() {
  const [selectedModel, setSelectedModel] = useState("gpt-3.5-turbo");
  const [isGenerating, setIsGenerating] = useState(false);
  
  const generateResponse = useAction(api.ai.generateResponse);
  const getModels = useAction(api.ai.getModels);

  const sendToAI = async (
    conversationId: Id<"conversations">,
    userMessage: string,
    model?: string
  ) => {
    setIsGenerating(true);
    
    try {
      const result = await generateResponse({
        conversationId,
        userMessage,
        model: model || selectedModel,
      });
      
      return result;
    } catch (error) {
      console.error("AI generation failed:", error);
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  const fetchModels = async (): Promise<AIModel[]> => {
    try {
      return await getModels();
    } catch (error) {
      console.error("Failed to fetch models:", error);
      return [];
    }
  };

  return {
    selectedModel,
    setSelectedModel,
    isGenerating,
    sendToAI,
    fetchModels,
  };
} 