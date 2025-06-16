import { memo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Star } from "lucide-react";
import type { Provider } from "../types/api-keys";
import { Button } from "./ui/button";

interface ProviderCardProps {
  readonly provider: Provider;
  readonly hasKey: boolean;
  readonly isDefault: boolean;
  readonly onClick: () => void;
}

const MAX_VISIBLE_MODELS = 3;

export const ProviderCard = memo<ProviderCardProps>(
  ({ provider, hasKey, isDefault, onClick }) => {
    const { name, description, models, benefits } = provider;
    const visibleModels = models.slice(0, MAX_VISIBLE_MODELS);
    const remainingModelsCount = models.length - MAX_VISIBLE_MODELS;

    return (
      <Card
        className={`cursor-pointer transition-all duration-200 p-0 gap-0 bg-muted`}
        onClick={onClick}
      >
        <CardHeader className="p-3 bg-dot border-b">
          <div className="w-full flex flex-col items-start ">
            <div className="flex items-center justify-between gap-2 w-full">
              <CardTitle className="text-lg">{name}</CardTitle>
              <Button
                variant="outline"
                className="text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onClick();
                }}
              >
                Manage key
              </Button>
            </div>
            <CardDescription className="text-sm">{description}</CardDescription>
            <div className="flex mt-2 items-end gap-1">
              {hasKey && (
                <Badge
                  variant="default"
                  className="text-sm bg-primary/20 text-primary-foreground border-primary"
                >
                  <Check className="w-3 h-3 mr-1" aria-hidden="true" />
                  Connected
                </Badge>
              )}
              {isDefault && (
                <Badge variant="outline" className="text-sm">
                  <Star className="w-3 h-3 mr-1" aria-hidden="true" />
                  Default
                </Badge>
              )}
            </div>
          
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex flex-wrap gap-1 p-3">
            {visibleModels.map((model) => (
              <Badge key={model} variant="outline" className="text-xs">
                {model}
              </Badge>
            ))}
            {remainingModelsCount > 0 && (
              <Badge variant="outline" className="text-xs">
                +{remainingModelsCount} more
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2 border-t p-3">
            {benefits.map((benefit) => (
              <div
                key={benefit}
                className="flex items-start justify-start gap-2 text-xs text-muted-foreground"
              >
                {benefit}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
);

ProviderCard.displayName = "ProviderCard";
