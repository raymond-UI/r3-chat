"use client";

import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CodeBlockProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
  className?: string;
}

export function CodeBlock({ 
  code, 
  language = "plaintext", 
  showLineNumbers = true,
  className 
}: CodeBlockProps) {
  const { resolvedTheme } = useTheme();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  };

  return (
    <div className={cn("relative group rounded-lg overflow-hidden w-full border border-border my-4", className)}>
      {/* Header with language and copy button */}
      <div className="flex items-center justify-between bg-muted/50 px-4 py-2 text-sm">
        <span className="text-muted-foreground font-mono">
          {language !== "plaintext" ? language : "code"}
        </span>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleCopy}
          aria-label="Copy code"
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Code content */}
      <SyntaxHighlighter
        language={language}
        style={resolvedTheme === "dark" ? oneDark : oneLight}
        showLineNumbers={showLineNumbers}
        wrapLongLines
        customStyle={{
          margin: 0,
          fontSize: "0.875rem",
          padding: "1rem",
          background: "transparent",
        }}
        lineNumberStyle={{
          minWidth: "3em",
          paddingRight: "1em",
          color: "var(--muted-foreground)",
          userSelect: "none",
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

// Inline code component for smaller code snippets
interface InlineCodeProps {
  children: React.ReactNode;
  className?: string;
}

export function InlineCode({ children, className }: InlineCodeProps) {
  return (
    <code 
      className={cn(
        "relative rounded bg-muted px-1.5 py-0.5 font-mono text-sm font-medium",
        className
      )}
    >
      {children}
    </code>
  );
} 