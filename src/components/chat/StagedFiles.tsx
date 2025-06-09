import React from "react";
import { Button } from "@/components/ui/button";
import { X, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { FileWithPreview, formatFileSize } from "@/hooks/useFiles";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface StagedFilesProps {
  files: FileWithPreview[];
  onRemove: (index: number) => void;
  className?: string;
}

export function StagedFiles({ files, onRemove, className }: StagedFilesProps) {
  if (files.length === 0) return null;

  return (
    <div className={cn("border-b bg-muted/30 p-3", className)}>
      <div className="flex flex-wrap gap-2">
        {files.map((fileWithPreview, index) => (
          <div
            key={index}
            className="relative group flex items-center gap-2 bg-background border rounded-lg p-2 max-w-xs"
          >
            {/* File Preview */}
            <div className="flex-shrink-0">
              {fileWithPreview.preview ? (
                <Image
                  src={fileWithPreview.preview}
                  alt={fileWithPreview.file.name}
                  className="h-8 w-8 rounded object-cover"
                  width={32}
                  height={32}
                />
              ) : (
                <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* File Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {fileWithPreview.file.name}
              </p>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(fileWithPreview.file.size)}
                </p>
                
                {/* Upload Status */}
                {fileWithPreview.uploading && (
                  <div className="flex items-center gap-1 text-xs text-blue-600">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Uploading...</span>
                  </div>
                )}
                
                {fileWithPreview.uploaded && (
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <CheckCircle className="h-3 w-3" />
                    <span>Ready</span>
                  </div>
                )}
                
                {fileWithPreview.error && (
                  <div className="flex items-center gap-1 text-xs text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    <span>Failed</span>
                  </div>
                )}
              </div>
            </div>

            {/* Remove Button - Only show if not uploading */}
            {!fileWithPreview.uploading && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(index)}
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 