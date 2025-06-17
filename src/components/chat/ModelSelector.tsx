"use client";

import React, { useState } from "react";
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
import {
  ChevronDown,
  Eye,
  Zap,
  DollarSign,
  Lock,
  Key,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  getAvailableModelsSimple,
  getUpgradeRequiredModels,
  type SimpleModelAvailability,
} from "@/lib/providers";
import dynamic from "next/dynamic";

const UpgradePromptDialog = dynamic(
  () => import("./UpgradePromptDialog").then((mod) => mod.UpgradePromptDialog),
  { ssr: false }
);

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
  className,
}: ModelSelectorProps) {
  const { user } = useUser();
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [selectedUpgradeModel, setSelectedUpgradeModel] = useState<
    SimpleModelAvailability | undefined
  >();

  // Get user configuration
  const configuration = useQuery(
    api.userApiKeys.getMyConfiguration,
    user ? {} : "skip"
  );

  // Get available models using simplified logic
  const availableModels = getAvailableModelsSimple(
    configuration?.apiKeys || null,
    configuration?.preferences || null
  );

  // Get models that require upgrade
  const upgradeModels = getUpgradeRequiredModels(
    configuration?.apiKeys || null,
    configuration?.preferences || null
  );

  // Filter models if user has images attached
  const filteredAvailableModels = hasImages
    ? availableModels.filter((m) => m.modelData.supportVision)
    : availableModels;

  const filteredUpgradeModels = hasImages
    ? upgradeModels.filter((m) => m.modelData.supportVision)
    : upgradeModels;

  const selectedModelData =
    filteredAvailableModels.find((m) => m.modelId === selectedModel) ||
    filteredAvailableModels[0];

  const handleUpgradeModelClick = (model: SimpleModelAvailability) => {
    setSelectedUpgradeModel(model);
    setUpgradeDialogOpen(true);
  };

  const getSourceIcon = (source: SimpleModelAvailability["source"]) => {
    switch (source) {
      case "provider":
        return <Shield className="h-3 w-3 text-green-600" />;
      // case "openrouter":
      //   return <Key className="h-3 w-3 text-blue-600" />;
      // case "system":
      //   return <Settings className="h-3 w-3 text-gray-600" />;
      default:
        return null;
    }
  };

  const getSourceBadge = (
    source: SimpleModelAvailability["source"],
    isFree: boolean
  ) => {
    if (isFree)
      return (
        <Badge variant={"outline"} className="text-[10px] bg-transparent">
          Free
        </Badge>
      );

    switch (source) {
      case "provider":
        return (
          <Badge variant={"outline"} className="text-[10px] bg-transparent">
            Direct
          </Badge>
        );
      case "openrouter":
        return (
          <Badge variant={"outline"} className="text-[10px] bg-transparent">
            OpenRouter
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "justify-between min-w-[150px] max-w-[200px] text-xs overflow-clip",
              className
            )}
          >
            <div className="flex items-center gap-2">
              <span className="truncate text-xs">
                {selectedModelData?.name}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          className="w-80 max-h-[300px] p-0 overflow-y-auto"
          align="end"
        >
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

          {hasImages && filteredAvailableModels.length === 0 && (
            <div className="p-2 text-sm text-muted-foreground text-center">
              No models support image analysis. Remove images to access more
              models.
            </div>
          )}

          {/* Available Models */}
          {filteredAvailableModels.map((model) => (
            <DropdownMenuItem
              key={model.modelId}
              onClick={() => onModelChange(model.modelId)}
              className={cn(
                "flex items-center justify-between p-3 cursor-pointer border-b rounded-none",
                selectedModel === model.modelId && "bg-accent"
              )}
            >
              <div className="flex flex-col gap-1 w-full">
                <div className="flex items-center gap-2">
                  {getSourceIcon(model.source)}
                  <span className="font-medium">{model.name}</span>
                  {model.modelData.supportVision && (
                    <Eye className="h-3 w-3 text-blue-600" />
                  )}
                </div>
                <div className="flex items-center w-full gap-3 text-xs text-muted-foreground">
                  <span>{model.provider}</span>
                  <div className="flex items-center gap-1">
                    {getCostIcon(model.modelData.cost)}
                    <span>{model.modelData.cost}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {getSpeedIcon(model.modelData.speed)}
                    <span>{model.modelData.speed}</span>
                  </div>
                  <div className="flex justify-end w-full items-center gap-1">
                    {getSourceBadge(model.source, model.isFree)}
                  </div>
                </div>
              </div>
            </DropdownMenuItem>
          ))}

          {/* Upgrade Section */}
          {filteredUpgradeModels.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <div className="p-3 text-center space-y-2">
                <div className="text-sm text-muted-foreground">
                  {filteredUpgradeModels.length} more models available
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setUpgradeDialogOpen(true)}
                  className="w-full"
                >
                  <Key className="h-3 w-3 mr-1" />
                  Add OpenRouter Key
                </Button>
              </div>

              {/* Show locked models */}
              {filteredUpgradeModels.slice(0, 8).map((model) => (
                <DropdownMenuItem
                  key={model.modelId}
                  onClick={() => handleUpgradeModelClick(model)}
                  className="flex items-center justify-between p-3 cursor-pointer border-b rounded-none opacity-60"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Lock className="h-3 w-3 text-amber-600" />
                      <span className="font-medium">{model.name}</span>
                      {model.modelData.supportVision && (
                        <Eye className="h-3 w-3 text-blue-600" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{model.provider}</span>
                      <div className="flex items-center gap-1">
                        {getCostIcon(model.modelData.cost)}
                        <span>{model.modelData.cost}</span>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-xs text-amber-600"
                      >
                        Requires Key
                      </Badge>
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}
            </>
          )}

          {hasImages && (
            <>
              <DropdownMenuSeparator />
              <div className="p-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2 mb-1">
                  <Eye className="h-3 w-3" />
                  <span className="font-medium">Vision Support</span>
                </div>
                <p>
                  Only models with vision support can analyze images. Remove
                  images to access text-only models.
                </p>
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <UpgradePromptDialog
        open={upgradeDialogOpen}
        onOpenChange={setUpgradeDialogOpen}
        selectedModel={selectedUpgradeModel}
        upgradeCount={filteredUpgradeModels.length}
      />
    </>
  );
}
