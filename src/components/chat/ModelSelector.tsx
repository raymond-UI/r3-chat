"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Brain, Zap, DollarSign } from "lucide-react";
import { useAI } from "@/hooks/useAI";
import { AIModel } from "@/types/ai";

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
}

export function ModelSelector({
  selectedModel,
  onModelChange,
}: ModelSelectorProps) {
  const { fetchModels } = useAI();
  const [models, setModels] = useState<AIModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadModels = async () => {
      try {
        const modelList = await fetchModels();
        setModels(modelList);
      } catch (error) {
        console.error("Failed to load models:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadModels();
  }, [fetchModels]);

  const getCostColor = (cost: string) => {
    switch (cost.toLowerCase()) {
      case "low":
        return "bg-green-100 text-green-700";
      case "medium":
        return "bg-yellow-100 text-yellow-700";
      case "high":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getSpeedColor = (speed: string) => {
    switch (speed.toLowerCase()) {
      case "fast":
        return "bg-green-100 text-green-700";
      case "medium":
        return "bg-yellow-100 text-yellow-700";
      case "slow":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Brain className="h-4 w-4 animate-pulse" />
        <span>Loading models...</span>
      </div>
    );
  }

  const currentModel = models.find((m) => m.key === selectedModel);

  return (
    <div className="flex items-center gap-3">
      <Select value={selectedModel} onValueChange={onModelChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue>
            <div className="flex items-center gap-2">
              <span>{currentModel?.name || selectedModel}</span>
              {currentModel && (
                <div className="flex gap-1">
                  <Badge
                    variant="outline"
                    className={`text-xs ${getCostColor(currentModel.cost)}`}
                  >
                    <DollarSign className="h-3 w-3 mr-1" />
                    {currentModel.cost}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`text-xs ${getSpeedColor(currentModel.speed)}`}
                  >
                    <Zap className="h-3 w-3 mr-1" />
                    {currentModel.speed}
                  </Badge>
                </div>
              )}
            </div>
          </SelectValue>
        </SelectTrigger>

        <SelectContent className="max-h-[300px] overflow-y-auto">
          {models.map((model) => (
            <SelectItem key={model.key} value={model.key} className="border-b last:border-b-0 rounded-none">
              <div className="flex flex-col gap-1 ">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{model.name}</span>
                  <span className="text-xs text-muted-foreground">
                    by {model.provider}
                  </span>
                </div>
                <div className="flex gap-1">
                  <Badge
                    variant="outline"
                    className={`text-xs ${getCostColor(model.cost)}`}
                  >
                    <DollarSign className="h-3 w-3 mr-1" />
                    {model.cost}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`text-xs ${getSpeedColor(model.speed)}`}
                  >
                    <Zap className="h-3 w-3 mr-1" />
                    {model.speed}
                  </Badge>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
