import { memo } from "react";
import { AlertCircle, Settings } from "lucide-react";

interface LoadingStateProps {
  readonly isAuthenticated: boolean;
}

export const LoadingState = memo<LoadingStateProps>(({ isAuthenticated }) => {
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">
            Please sign in to manage API keys
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center">
        <Settings className="w-8 h-8 mx-auto mb-2 text-muted-foreground animate-spin" />
        <p className="text-muted-foreground">Loading API key settings...</p>

      </div>
      
    </div>
  );
});

LoadingState.displayName = "LoadingState";
