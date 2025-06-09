"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Eye, Zap, DollarSign } from "lucide-react";
import { getAIModelsArray } from "@/types/ai";
import { cn } from "@/lib/utils";

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  hasImages?: boolean;
  className?: string;
}

const getCostIcon = (cost: string) => {
  switch (cost) {
    case "Free":
      return <span className="text-green-600">○</span>;
    case "Low":
      return <span className="text-yellow-600">●</span>;
    case "Medium":
      return <span className="text-orange-600">●●</span>;
    case "High":
      return <span className="text-red-600">●●●</span>;
    default:
      return <DollarSign className="h-3 w-3" />;
  }
};

const getSpeedIcon = (speed: string) => {
  switch (speed) {
    case "Fast":
      return <Zap className="h-3 w-3 text-green-600" />;
    case "Medium":
      return <Zap className="h-3 w-3 text-yellow-600" />;
    case "Slow":
      return <Zap className="h-3 w-3 text-red-600" />;
    default:
      return <Zap className="h-3 w-3" />;
  }
};

export function ModelSelector({ 
  selectedModel, 
  onModelChange, 
  hasImages = false,
  className 
}: ModelSelectorProps) {
  const models = getAIModelsArray();
  // const currentModel = models.find(m => m.key === selectedModel || m.id === selectedModel);
  
  // Filter models if user has images attached
  const availableModels = hasImages 
    ? models.filter(m => m.supportVision)
    : models;

  const selectedModelData = availableModels.find(m => 
    m.key === selectedModel || m.id === selectedModel
  ) || availableModels[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={cn("justify-between min-w-[200px]", className)}
        >
          <div className="flex items-center gap-2">
            <span className="font-medium">{selectedModelData?.name}</span>
            {selectedModelData?.supportVision && (
              <Eye className="h-3 w-3 text-blue-600" />
            )}
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-80" align="end">
        <DropdownMenuLabel>
          <div className="flex items-center justify-between">
            <span>AI Models</span>
            {hasImages && (
              <Badge variant="secondary" className="text-xs">
                <Eye className="h-3 w-3 mr-1" />
                Vision Required
              </Badge>
            )}
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        {hasImages && availableModels.length === 0 && (
          <div className="p-2 text-sm text-muted-foreground text-center">
            No models support image analysis.
            Remove images to access more models.
          </div>
        )}
        
        {availableModels.map((model) => (
          <DropdownMenuItem
            key={model.key}
            onClick={() => onModelChange(model.key)}
            className={cn(
              "flex items-center justify-between p-3 cursor-pointer",
              (selectedModel === model.key || selectedModel === model.id) && 
              "bg-accent"
            )}
          >
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{model.name}</span>
                {model.supportVision && (
                  <Eye className="h-3 w-3 text-blue-600" />
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{model.provider}</span>
                <div className="flex items-center gap-1">
                  {getCostIcon(model.cost)}
                  <span>{model.cost}</span>
                </div>
                <div className="flex items-center gap-1">
                  {getSpeedIcon(model.speed)}
                  <span>{model.speed}</span>
                </div>
              </div>
            </div>
          </DropdownMenuItem>
        ))}
        
        {hasImages && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2 mb-1">
                <Eye className="h-3 w-3" />
                <span className="font-medium">Vision Support</span>
              </div>
              <p>Only models with vision support can analyze images. Remove images to access text-only models.</p>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
