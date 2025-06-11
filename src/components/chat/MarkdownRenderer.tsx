"use client";

import ReactMarkdown from "react-markdown";
import { CodeBlock, InlineCode } from "./CodeBlock";
import { cn } from "@/lib/utils";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={cn("markdown-content max-w-full", className)}>
      <ReactMarkdown
        components={{
          // Code blocks (```language)
          code({ className, children, ...props }: React.ComponentProps<"code">) {
            const match = /language-(\w+)/.exec(className || "");
            const code = String(children).replace(/\n$/, "");
            const isInline = !className?.startsWith("language-");
            
            return !isInline ? (
              <CodeBlock
                code={code}
                language={match?.[1] || "plaintext"}
                className=""
              />
            ) : (
              <InlineCode className={className} {...props}>
                {children}
              </InlineCode>
            );
          },
          
          // Paragraphs
          p({ children }) {
            return <p className="mb-3 last:mb-0 leading-6 text-base max-w-fit">{children}</p>;
          },
          
          // Headings
          h1({ children }) {
            return <h1 className="text-lg font-semibold mb-3 text-foreground max-w-fit">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-base font-medium mb-2 text-foreground max-w-fit">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-base font-medium mb-2 text-foreground max-w-fit">{children}</h3>;
          },
          
          // Lists
          ul({ children }) {
            return <ul className="list-disc pl-4 mb-3 space-y-1 tracking-wide leading-7 text-base max-w-full">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal pl-4 mb-3 space-y-2 tracking-wide leading-7 text-base max-w-full">{children}</ol>;
          },
          li({ children }) {
            return <li className="leading-7 tracking-wide text-base max-w-full">{children}</li>;
          },
          
          // Blockquotes
          blockquote({ children }) {
            return (
              <blockquote className="border-l-2 border-muted-foreground/30 pl-3 py-1 my-3 italic text-muted-foreground text-sm max-w-full">
                {children}
              </blockquote>
            );
          },
          
          // Links
          a({ href, children }) {
            return (
              <a 
                href={href} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80 underline decoration-primary/50 underline-offset-2 transition-colors max-w-fit"
              >
                {children}
              </a>
            );
          },
          
          // Tables
          table({ children }) {
            return (
              <div className="overflow-x-auto my-3 max-w-fit">
                <table className="min-w-full border border-border rounded-md text-sm max-w-fit">
                  {children}
                </table>
              </div>
            );
          },
          thead({ children }) {
            return <thead className="bg-muted/50">{children}</thead>;
          },
          th({ children }) {
            return (
              <th className="px-3 py-2 text-left font-medium border-b border-border text-xs">
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td className="px-3 py-2 border-b border-border last:border-b-0 text-xs">
                {children}
              </td>
            );
          },
          
          // Horizontal rules
          hr() {
            return <hr className="my-4 border-border" />;
          },
          
          // Strong/Bold
          strong({ children }) {
            return <strong className="font-semibold text-foreground">{children}</strong>;
          },
          
          // Emphasis/Italic
          em({ children }) {
            return <em className="italic">{children}</em>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
} 