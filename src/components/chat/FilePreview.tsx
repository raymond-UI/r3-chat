"use client";

import { Badge } from "@/components/ui/badge";
import { formatFileSize } from "@/hooks/useFiles";
import { cn } from "@/lib/utils";
import { FileText } from "lucide-react";
import Image from "next/image";
import { Doc } from "../../../convex/_generated/dataModel";

interface FilePreviewProps {
  file: Doc<"files">;
  className?: string;
}

export function FilePreview({ file, className }: FilePreviewProps) {
  // Add safety checks
  if (!file) {
    console.warn("FilePreview: file prop is null or undefined");
    return null;
  }

  if (!file.key || !file.name) {
    console.warn("FilePreview: file missing required properties", file);
    return null;
  }

  try {
    return (
      <div
        className={cn(
          "w-full max-w-2xs border rounded-lg overflow-hidden bg-muted/50",
          className
        )}
      >
        {/* File Header */}
        <a
          href={`https://eftjl1pi5j.ufs.sh/f/${file.key}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {/* Image Preview */}
          {file.type === "image" && (
            <div className="p-1">
              <Image
                src={`https://eftjl1pi5j.ufs.sh/f/${file.key}`}
                alt={file.name}
                className=" w-full max-w-md cursor-pointer hover:opacity-90 transition-opacity object-cover rounded-md"
                onClick={() => window.open(file.url, "_blank")}
                loading="lazy"
                width={200}
                height={200}
              />
            </div>
          )}
          <div
            className={`  flex items-center gap-3 p-1 bg-background/50 ${
              file.type === "image" ? "border-t" : ""
            }`}
          >
            <div className="flex-shrink-0">
              {file.type === "pdf" && (
                <FileText className="h-12 w-12 text-primary" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <Badge variant="secondary" className="text-xs">
                  {file.type?.toUpperCase() || "FILE"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground/70">
                {file.size ? formatFileSize(file.size) : "Unknown size"}
              </p>
            </div>
          </div>
        </a>

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
  } catch (error) {
    console.error("FilePreview render error:", error, file);
    return (
      <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-sm">
        Error displaying file: {file.name || "Unknown file"}
      </div>
    );
  }
}

// Compact version for inline display
export function FilePreviewCompact({ file, className }: FilePreviewProps) {
  return (
    <div
      className={cn(
        "inline-flex max-w-xs items-center gap-2 p-2 bg-muted/50 rounded-lg border",
        className
      )}
    >
      <a
        href={`https://eftjl1pi5j.ufs.sh/f/${file.key}`}
        target="_blank"
        className="flex items-center gap-2"
      >
        <div className="flex-shrink-0">
          {file.type === "image" ? (
            <Image
              src={`https://eftjl1pi5j.ufs.sh/f/${file.key}`}
              alt={file.name}
              className="h-8 w-8 rounded object-cover"
              loading="lazy"
              width={32}
              height={32}
            />
          ) : (
            <FileText className="h-8 w-8 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{file.name}</p>
          <p className="text-xs text-muted-foreground/70">
            {formatFileSize(file.size)}
          </p>
        </div>
      </a>
    </div>
  );
}
