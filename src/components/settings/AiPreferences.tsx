"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { AI_MODELS } from "@/types/ai";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Code, Eye, Save, Sparkles } from "lucide-react";

// Categorize models by use case
const getModelsByCategory = () => {
  const categories = {
    chat: [] as Array<{ id: string; name: string; provider: string }>,
    vision: [] as Array<{ id: string; name: string; provider: string }>,
    coding: [] as Array<{ id: string; name: string; provider: string }>,
  };

  Object.entries(AI_MODELS).forEach(([modelId, modelData]) => {
    const model = {
      id: modelId,
      name: modelData.name,
      provider: modelData.provider,
    };

    // Categorize based on model name and capabilities
    if (modelData.name.toLowerCase().includes('vision') || 
        modelData.name.toLowerCase().includes('visual') ||
        modelId.includes('vision')) {
      categories.vision.push(model);
    } else if (modelData.name.toLowerCase().includes('code') || 
               modelData.name.toLowerCase().includes('coder') ||
               modelId.includes('coder')) {
      categories.coding.push(model);
    } else {
      categories.chat.push(model);
    }

    // Also add versatile models to vision and coding if they support it
    if (modelId.includes('gpt-4') || modelId.includes('claude-3.5') || modelId.includes('gemini')) {
      if (!categories.vision.some(m => m.id === modelId)) {
        categories.vision.push(model);
      }
      if (!categories.coding.some(m => m.id === modelId)) {
        categories.coding.push(model);
      }
    }
  });

  return categories;
};

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
  React.useEffect(() => {
    if (preferences?.defaultModels) {
      setDefaultModels(preferences.defaultModels);
    }
  }, [preferences]);

  const modelCategories = getModelsByCategory();

  const handleModelChange = (category: 'chat' | 'vision' | 'coding', modelId: string) => {
    setDefaultModels(prev => ({
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

  if (!userId) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Please sign in to configure AI preferences</p>
      </div>
    );
  }

  if (preferences === undefined) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Loading preferences...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6">
        {/* Chat Models */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              Default Chat Model
            </CardTitle>
            <CardDescription>
              Choose your preferred model for general conversations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={defaultModels.chat}
              onValueChange={(value) => handleModelChange('chat', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a chat model" />
              </SelectTrigger>
              <SelectContent>
                {modelCategories.chat.map((model) => (
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
          </CardContent>
        </Card>

        {/* Vision Models */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Default Vision Model
            </CardTitle>
            <CardDescription>
              Choose your preferred model for image analysis and visual tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={defaultModels.vision}
              onValueChange={(value) => handleModelChange('vision', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a vision model" />
              </SelectTrigger>
              <SelectContent>
                {modelCategories.vision.map((model) => (
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
          </CardContent>
        </Card>

        {/* Coding Models */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="w-5 h-5" />
              Default Coding Model
            </CardTitle>
            <CardDescription>
              Choose your preferred model for programming and code assistance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={defaultModels.coding}
              onValueChange={(value) => handleModelChange('coding', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a coding model" />
              </SelectTrigger>
              <SelectContent>
                {modelCategories.coding.map((model) => (
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
          </CardContent>
        </Card>
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
          <p>• <strong>Smart Selection:</strong> These preferences help the app choose the best model for different tasks</p>
          <p>• <strong>Override Anytime:</strong> You can always manually select a different model during conversations</p>
          <p>• <strong>Fallback Logic:</strong> Uses your API key configuration to determine availability</p>
          <p>• <strong>Auto-optimization:</strong> Balances performance, cost, and your preferences</p>
        </CardContent>
      </Card>
    </div>
  );
}