"use client";

import { FileText, Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Doc } from "../../../convex/_generated/dataModel";
import { formatFileSize } from "@/hooks/useFiles";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface FilePreviewProps {
  file: Doc<"files">;
  className?: string;
}

export function FilePreview({ file, className }: FilePreviewProps) {

  const handleDownload = () => {
    window.open(file.url, "_blank");
  };

  return (
    <div
      className={cn("border rounded-lg overflow-hidden bg-muted/50", className)}
    >
      {/* File Header */}
      <div className="flex items-center gap-3 p-3 border-b bg-background/50">
        <div className="flex-shrink-0">
          {file.type === "image" ? (
            <div className="relative">
              <Image
                src={`https://eftjl1pi5j.ufs.sh/f/${file._id}`}
                alt={file.name}
                className="h-12 w-12 rounded object-cover"
                loading="lazy"
                width={48}
                height={48}
              />
            </div>
          ) : (
            <FileText className="h-12 w-12 text-red-500" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate">{file.name}</p>
            <Badge variant="secondary" className="text-xs">
              {file.type.toUpperCase()}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {formatFileSize(file.size)} •{" "}
            {new Date(file.uploadedAt).toLocaleDateString()}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {file.type === "image" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(file.url, "_blank")}
              className="h-8 w-8 p-0"
              title="View full size"
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="h-8 w-8 p-0"
            title="Download"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Image Preview */}
      {file.type === "image" && (
        <div className="p-3">
          <Image
            src={`https://eftjl1pi5j.ufs.sh/f/${file._id}`}
            alt={file.name}
            className="w-full max-w-md rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => window.open(file.url, "_blank")}
            loading="lazy"
            width={48}
            height={48}
          />
        </div>
      )}



      {/* Extracted Text for PDFs */}
      {file.type === "pdf" && file.extractedText && (
        <details className="border-t">
          <summary className="p-3 cursor-pointer hover:bg-muted/50 text-sm font-medium">
            Extracted Text
          </summary>
          <div className="px-3 pb-3">
            <div className="p-3 bg-muted/50 rounded-lg max-h-40 overflow-y-auto">
              <p className="text-xs leading-relaxed whitespace-pre-wrap">
                {file.extractedText}
              </p>
            </div>
          </div>
        </details>
      )}
    </div>
  );
}

// Compact version for inline display
export function FilePreviewCompact({ file, className }: FilePreviewProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 p-2 bg-muted/50 rounded-lg border",
        className
      )}
    >
      <div className="flex-shrink-0">
        {file.type === "image" ? (
          <Image
            src={file.url}
            alt={file.name}
            className="h-8 w-8 rounded object-cover"
            loading="lazy"
            width={32}
            height={32}
          />
        ) : (
          <FileText className="h-8 w-8 text-red-500" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{file.name}</p>
        <p className="text-xs text-muted-foreground">
          {formatFileSize(file.size)}
        </p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => window.open(file.url, "_blank")}
        className="h-6 w-6 p-0"
      >
        <Eye className="h-3 w-3" />
      </Button>
    </div>
  );
}
