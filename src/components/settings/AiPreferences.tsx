"use client";

import { useQuery } from "@/cache/useQuery";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AI_MODELS } from "@/types/ai";
import { useAuth } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { Brain, Code, Eye, Save, Sparkles } from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";

// Categorize models by use case
const getModelsByCategory = () => {
  const categories = {
    chat: [] as Array<{ id: string; name: string; provider: string }>,
    vision: [] as Array<{ id: string; name: string; provider: string }>,
    coding: [] as Array<{ id: string; name: string; provider: string }>,
  };

  const modelEntries = Object.entries(AI_MODELS);

  const categorizeModel = (
    modelId: string,
    modelData: { name: string; provider: string }
  ) => {
    const model = {
      id: modelId,
      name: modelData.name,
      provider: modelData.provider,
    };

    const modelNameLower = modelData.name.toLowerCase();

    if (
      modelNameLower.includes("vision") ||
      modelNameLower.includes("visual") ||
      modelId.includes("vision")
    ) {
      categories.vision.push(model);
    }
    if (
      modelNameLower.includes("code") ||
      modelNameLower.includes("coder") ||
      modelId.includes("coder")
    ) {
      categories.coding.push(model);
    }
    if (
      !modelNameLower.includes("vision") &&
      !modelNameLower.includes("visual") &&
      !modelId.includes("vision") &&
      !modelNameLower.includes("code") &&
      !modelNameLower.includes("coder") &&
      !modelId.includes("coder")
    ) {
      categories.chat.push(model);
    }

    return model;
  };

  const addVersatileModel = (model: {
    id: string;
    name: string;
    provider: string;
  }) => {
    if (!categories.vision.some((m) => m.id === model.id)) {
      categories.vision.push(model);
    }
    if (!categories.coding.some((m) => m.id === model.id)) {
      categories.coding.push(model);
    }
  };

  modelEntries.forEach(([modelId, modelData]) => {
    const model = categorizeModel(modelId, modelData);

    if (
      modelId.includes("gpt-4") ||
      modelId.includes("claude-3.5") ||
      modelId.includes("gemini")
    ) {
      addVersatileModel(model);
    }
  });

  return categories;
};

interface ModelCategory {
  category: "chat" | "vision" | "coding";
  title: string;
  description: string;
  icon: React.ReactNode;
}

const modelCategoriesData: ModelCategory[] = [
  {
    category: "chat",
    title: "Default Chat Model",
    description: "Choose your preferred model for general conversations",
    icon: <Brain className="w-5 h-5" />,
  },
  {
    category: "vision",
    title: "Default Vision Model",
    description:
      "Choose your preferred model for image analysis and visual tasks",
    icon: <Eye className="w-5 h-5" />,
  },
  {
    category: "coding",
    title: "Default Coding Model",
    description:
      "Choose your preferred model for programming and code assistance",
    icon: <Code className="w-5 h-5" />,
  },
];

export function AiPreferences() {
  const { userId } = useAuth();
  const preferences = useQuery(
    api.userApiKeys.getUserAiPreferences,
    userId ? { userId } : "skip"
  );

  const updatePreferences = useMutation(api.userApiKeys.updateAiPreferences);

  const [defaultModels, setDefaultModels] = useState({
    chat: "",
    vision: "",
    coding: "",
  });

  const [hasChanges, setHasChanges] = useState(false);

  // Update local state when preferences load
  useEffect(() => {
    if (preferences?.defaultModels) {
      setDefaultModels(preferences.defaultModels);
    }
  }, [preferences]);

  const modelCategories = getModelsByCategory();

  const handleModelChange = (
    category: "chat" | "vision" | "coding",
    modelId: string
  ) => {
    setDefaultModels((prev) => ({
      ...prev,
      [category]: modelId,
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!userId) return;

    try {
      await updatePreferences({
        userId,
        defaultModels,
      });
      setHasChanges(false);
      toast.success("AI preferences updated successfully");
    } catch (error) {
      console.error("Failed to update preferences:", error);
      toast.error("Failed to update preferences");
    }
  };

  const renderLoadingState = (message: string) => (
    <div className="text-center py-8">
      <p className="text-muted-foreground">{message}</p>
    </div>
  );

  if (!userId) {
    return renderLoadingState("Please sign in to configure AI preferences");
  }

  if (preferences === undefined) {
    return renderLoadingState("Loading preferences...");
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {modelCategoriesData.map((categoryData) => (
          <div
            key={categoryData.category}
            className="bg-card text-card-foreground flex items-center gap-6 rounded-xl border p-4 shadow-sm"
          >
            <div className="flex flex-col w-full gap-2">
              <div className="flex items-center gap-2">
                {categoryData.icon}
                <h2 className="text-sm font-semibold">{categoryData.title}</h2>
              </div>
              <span className="text-sm text-muted-foreground">
                {categoryData.description}
              </span>
            </div>
            <div>
              <Select
                value={defaultModels[categoryData.category]}
                onValueChange={(value) =>
                  handleModelChange(categoryData.category, value)
                }
              >
                <SelectTrigger className="w-full ">
                  <SelectValue
                    placeholder={`Select a ${categoryData.category} model`}
                  />
                </SelectTrigger>
                <SelectContent>
                  {modelCategories[categoryData.category].map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      <div className="flex items-center gap-2">
                        <span>{model.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {model.provider}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
      </div>

      {hasChanges && (
        <div className="flex justify-end">
          <Button onClick={handleSave} className="flex items-center gap-2">
            <Save className="w-4 h-4" />
            Save Preferences
          </Button>
        </div>
      )}

      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            How Default Models Work
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            • <strong>Smart Selection:</strong> These preferences help the app
            choose the best model for different tasks
          </p>
          <p>
            • <strong>Override Anytime:</strong> You can always manually select
            a different model during conversations
          </p>
          <p>
            • <strong>Fallback Logic:</strong> Uses your API key configuration
            to determine availability
          </p>
          <p>
            • <strong>Auto-optimization:</strong> Balances performance, cost,
            and your preferences
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
