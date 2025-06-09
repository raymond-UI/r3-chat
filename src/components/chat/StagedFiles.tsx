import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { X, FileText, CheckCircle, AlertCircle, Loader2, ChevronDown, FileImage } from "lucide-react";
import { FileWithPreview, formatFileSize } from "@/hooks/useFiles";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

interface StagedFilesProps {
  files: FileWithPreview[];
  onRemove: (index: number) => void;
  className?: string;
}

interface FileDetailsProps {
  fileId: Id<"files">;
}

function FileDetails({ fileId }: FileDetailsProps) {
  const file = useQuery(api.files.getById, { fileId });
  const [isOpen, setIsOpen] = useState(false);
  
  if (!file) return null;

  const hasExtractedText = Boolean(file.extractedText?.trim());
  
  // Only show if we have extracted text content
  if (!hasExtractedText) return null;
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-auto p-1 text-xs"
        >
          <ChevronDown className={cn(
            "h-3 w-3 transition-transform",
            isOpen && "rotate-180"
          )} />
          View Extracted Text
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="mt-2">
        <div className="text-xs">
          <Badge variant="outline" className="mb-1">
            <FileText className="h-3 w-3 mr-1" />
            Extracted Content
          </Badge>
          <p className="text-muted-foreground bg-muted/50 rounded p-2 max-h-20 overflow-y-auto">
            {file.extractedText!.slice(0, 200)}
            {file.extractedText!.length > 200 && "..."}
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function StagedFiles({ files, onRemove, className }: StagedFilesProps) {
  if (files.length === 0) return null;

  return (
    <div className={cn("border-b bg-muted/30 p-3", className)}>
      <div className="flex flex-wrap gap-2">
        {files.map((fileWithPreview, index) => (
          <div
            key={index}
            className="relative group flex flex-col gap-2 bg-background border rounded-lg p-3 min-w-[200px] max-w-sm"
          >
            <div className="flex items-center gap-2">
              {/* File Preview */}
              <div className="flex-shrink-0">
                {fileWithPreview.preview ? (
                  <div className="relative">
                    <Image
                      src={fileWithPreview.preview}
                      alt={fileWithPreview.file.name}
                      className="h-8 w-8 rounded object-cover"
                      width={32}
                      height={32}
                    />
                    <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 rounded-full">
                      <FileImage className="h-2 w-2" />
                    </Badge>
                  </div>
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
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(fileWithPreview.file.size)}
                </p>
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

            {/* Upload Status */}
            <div className="flex items-center gap-2">
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

            {/* File Details - Only show for uploaded files */}
            {fileWithPreview.uploaded && fileWithPreview.fileId && (
              <FileDetails fileId={fileWithPreview.fileId} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 