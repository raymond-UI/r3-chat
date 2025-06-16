"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Trash2,
  ExternalLink,
  AlertCircle
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Provider } from "@/types/providers";

interface ProviderInfo {
  name: string;
  description: string;
  websiteUrl: string;
  docsUrl: string;
  keyFormat: string;
  estimatedSavings?: string;
}

const PROVIDER_INFO: Record<Provider, ProviderInfo> = {
  openai: {
    name: "OpenAI",
    description: "GPT-4, GPT-4o, and other OpenAI models",
    websiteUrl: "https://platform.openai.com/api-keys",
    docsUrl: "https://platform.openai.com/docs/quickstart",
    keyFormat: "sk-...",
    estimatedSavings: "~20%"
  },
  anthropic: {
    name: "Anthropic",
    description: "Claude 3.5 Sonnet, Claude 3 Haiku, and other Claude models",
    websiteUrl: "https://console.anthropic.com/settings/keys",
    docsUrl: "https://docs.anthropic.com/en/api/getting-started",
    keyFormat: "sk-ant-...",
    estimatedSavings: "~15%"
  },
  google: {
    name: "Google AI",
    description: "Gemini Pro, Gemini Flash, and other Google models",
    websiteUrl: "https://aistudio.google.com/app/apikey",
    docsUrl: "https://ai.google.dev/gemini-api/docs/quickstart",
    keyFormat: "AI...",
    estimatedSavings: "~10%"
  },
  openrouter: {
    name: "OpenRouter",
    description: "Access to 200+ models from multiple providers",
    websiteUrl: "https://openrouter.ai/keys",
    docsUrl: "https://openrouter.ai/docs/quick-start",
    keyFormat: "sk-or-v1-...",
    estimatedSavings: "Cost control"
  }
};

interface KeyValidationResult {
  isValid: boolean;
  error?: string;
  testing?: boolean;
}

interface ApiKeyInputProps {
  provider: Provider;
  value: string;
  onValueChange: (value: string) => void;
  onValidationChange?: (result: KeyValidationResult) => void;
  validationResult?: KeyValidationResult;
  className?: string;
}

export function ApiKeyInput({ 
  provider, 
  value, 
  onValueChange, 
  onValidationChange,
  validationResult,
  className 
}: ApiKeyInputProps) {
  const [showKey, setShowKey] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);
  
  const providerInfo = PROVIDER_INFO[provider];
  const hasKey = value.length > 0;
  
  const handleTestKey = async () => {
    if (!value || !onValidationChange) return;
    
    setIsTestingKey(true);
    onValidationChange({ isValid: false, testing: true });
    
    try {
      // TODO: Implement actual API key validation
      // For now, simulate validation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simple format validation for demo
      const isFormatValid = value.startsWith(providerInfo.keyFormat.split('...')[0]);
      
      if (isFormatValid) {
        onValidationChange({ isValid: true });
      } else {
        onValidationChange({ 
          isValid: false, 
          error: `Invalid key format. Expected format: ${providerInfo.keyFormat}` 
        });
      }
    } catch (error) {
      onValidationChange({ 
        isValid: false, 
        error: error instanceof Error ? error.message : 'Failed to validate key' 
      });
    } finally {
      setIsTestingKey(false);
    }
  };

  const handleClearKey = () => {
    onValueChange("");
    if (onValidationChange) {
      onValidationChange({ isValid: false });
    }
  };

  const getStatusIcon = () => {
    if (isTestingKey || validationResult?.testing) {
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    }
    if (validationResult?.isValid) {
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    }
    if (validationResult?.error) {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
    return null;
  };

  const getStatusBadge = () => {
    if (isTestingKey || validationResult?.testing) {
      return <Badge variant="secondary">Testing...</Badge>;
    }
    if (validationResult?.isValid) {
      return <Badge variant="default" className="bg-green-500">Valid</Badge>;
    }
    if (validationResult?.error) {
      return <Badge variant="destructive">Invalid</Badge>;
    }
    if (hasKey) {
      return <Badge variant="outline">Not tested</Badge>;
    }
    return <Badge variant="secondary">Not configured</Badge>;
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {providerInfo.name}
              {getStatusIcon()}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {providerInfo.description}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {providerInfo.estimatedSavings && (
              <Badge variant="outline" className="text-green-600">
                {providerInfo.estimatedSavings} savings
              </Badge>
            )}
            {getStatusBadge()}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`${provider}-key`}>API Key</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                id={`${provider}-key`}
                type={showKey ? "text" : "password"}
                placeholder={`Enter your ${providerInfo.name} API key (${providerInfo.keyFormat})`}
                value={value}
                onChange={(e) => onValueChange(e.target.value)}
                className={`pr-10 ${
                  validationResult?.isValid ? 'border-green-500' : 
                  validationResult?.error ? 'border-red-500' : ''
                }`}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            
            {hasKey && (
              <>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleTestKey}
                  disabled={isTestingKey || validationResult?.testing}
                >
                  {isTestingKey || validationResult?.testing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Test"
                  )}
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleClearKey}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {validationResult?.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {validationResult.error}
            </AlertDescription>
          </Alert>
        )}

        {validationResult?.isValid && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              API key is valid and ready to use!
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <a 
            href={providerInfo.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-primary transition-colors"
          >
            Get API Key <ExternalLink className="h-3 w-3" />
          </a>
          <a 
            href={providerInfo.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-primary transition-colors"
          >
            Documentation <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
} 