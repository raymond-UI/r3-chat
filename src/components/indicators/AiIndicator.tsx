
interface AiIndicatorProps {
  message?: string;
}

export function AiIndicator({ message = "Assistant is typing..." }: AiIndicatorProps) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
      <div className="flex items-center space-x-1">
        <div className="size-3 bg-current rounded-full animate-bounce"></div>
        <div className="size-4 bg-current rounded-full animate-bounce delay-100"></div>
        <div className="size-3 bg-current rounded-full animate-bounce delay-200"></div>
      </div>
      <span>{message}</span>
    </div>
  );
}
