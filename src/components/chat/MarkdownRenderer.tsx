"use client";

import { memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock, InlineCode } from "./CodeBlock";
import { cn } from "@/lib/utils";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// Memoized component definitions to prevent re-creation on every render
const MarkdownComponents = {
  // Code blocks (```language)
  code: memo(function Code({
    className,
    children,
    ...props
  }: React.ComponentProps<"code">) {
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
  }),

  // Paragraphs
  p: memo(function Paragraph({
    children,
    ...props
  }: React.ComponentProps<"p">) {
    return (
      <p className="mb-3 last:mb-0 leading-6 text-base max-w-full" {...props}>
        {children}
      </p>
    );
  }),

  // Headings
  h1: memo(function H1({ children, ...props }: React.ComponentProps<"h1">) {
    return (
      <h1
        className="text-lg font-semibold mb-3 text-foreground max-w-fit"
        {...props}
      >
        {children}
      </h1>
    );
  }),

  h2: memo(function H2({ children, ...props }: React.ComponentProps<"h2">) {
    return (
      <h2
        className="text-base font-medium mb-2 text-foreground max-w-fit"
        {...props}
      >
        {children}
      </h2>
    );
  }),

  h3: memo(function H3({ children, ...props }: React.ComponentProps<"h3">) {
    return (
      <h3
        className="text-base font-medium mb-2 text-foreground max-w-fit"
        {...props}
      >
        {children}
      </h3>
    );
  }),

  h4: memo(function H4({ children, ...props }: React.ComponentProps<"h4">) {
    return (
      <h4
        className="text-sm font-medium mb-2 text-foreground max-w-fit"
        {...props}
      >
        {children}
      </h4>
    );
  }),

  h5: memo(function H5({ children, ...props }: React.ComponentProps<"h5">) {
    return (
      <h5
        className="text-sm font-medium mb-2 text-foreground max-w-fit"
        {...props}
      >
        {children}
      </h5>
    );
  }),

  h6: memo(function H6({ children, ...props }: React.ComponentProps<"h6">) {
    return (
      <h6
        className="text-xs font-medium mb-2 text-foreground max-w-fit"
        {...props}
      >
        {children}
      </h6>
    );
  }),

  // Lists
  ul: memo(function UnorderedList({
    children,
    ...props
  }: React.ComponentProps<"ul">) {
    return (
      <ul
        className="list-disc mb-3 text-foreground space-y-1 tracking-wide leading-7 text-base max-w-full pl-6"
        {...props}
      >
        {children}
      </ul>
    );
  }),

  ol: memo(function OrderedList({
    children,
    ...props
  }: React.ComponentProps<"ol">) {
    return (
      <ol
        className="list-decimal mb-3 text-foreground space-y-2 tracking-wide leading-7 text-base max-w-full pl-6"
        {...props}
      >
        {children}
      </ol>
    );
  }),

  li: memo(function ListItem({
    children,
    ...props
  }: React.ComponentProps<"li">) {
    return (
      <li
        className="leading-7 tracking-wide text-foreground text-base max-w-full"
        {...props}
      >
        {children}
      </li>
    );
  }),

  // Blockquotes
  blockquote: memo(function Blockquote({
    children,
    ...props
  }: React.ComponentProps<"blockquote">) {
    return (
      <blockquote
        className="border-l-2 border-muted-foreground/30 pl-3 py-1 my-3 italic text-muted-foreground text-sm max-w-full"
        {...props}
      >
        {children}
      </blockquote>
    );
  }),

  // Links
  a: memo(function Link({
    href,
    children,
    ...props
  }: React.ComponentProps<"a">) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:text-primary/80 underline decoration-primary/50 underline-offset-2 transition-colors max-w-fit"
        {...props}
      >
        {children}
      </a>
    );
  }),

  // Tables (Enhanced for GFM support)
  table: memo(function Table({
    children,
    ...props
  }: React.ComponentProps<"table">) {
    return (
      <div className="overflow-x-auto my-6 max-w-full rounded-md border border-border shadow-sm">
        <table
          className="min-w-full divide-y divide-border text-sm border-collapse"
          {...props}
        >
          {children}
        </table>
      </div>
    );
  }),

  thead: memo(function TableHead({
    children,
    ...props
  }: React.ComponentProps<"thead">) {
    return (
      <thead className="bg-muted/80" {...props}>
        {children}
      </thead>
    );
  }),

  tbody: memo(function TableBody({
    children,
    ...props
  }: React.ComponentProps<"tbody">) {
    return <tbody className="divide-y divide-border bg-background" {...props}>{children}</tbody>;
  }),

  tr: memo(function TableRow({
    children,
    ...props
  }: React.ComponentProps<"tr">) {
    return (
      <tr className="border-b border-border hover:bg-muted/20 transition-colors" {...props}>
        {children}
      </tr>
    );
  }),

  th: memo(function TableHeader({
    children,
    ...props
  }: React.ComponentProps<"th">) {
    return (
      <th
        className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider border-r border-border/50 last:border-r-0 bg-muted/30"
        {...props}
      >
        {children}
      </th>
    );
  }),

  td: memo(function TableData({
    children,
    ...props
  }: React.ComponentProps<"td">) {
    return (
      <td
        className="px-4 py-3 text-sm text-foreground/90 border-r border-border/30 last:border-r-0 align-top"
        {...props}
      >
        {children}
      </td>
    );
  }),

  // Horizontal rules
  hr: memo(function HorizontalRule(props: React.ComponentProps<"hr">) {
    return <hr className="my-4 border-border" {...props} />;
  }),

  // Strong/Bold
  strong: memo(function Strong({
    children,
    ...props
  }: React.ComponentProps<"strong">) {
    return (
      <strong className="font-semibold text-foreground" {...props}>
        {children}
      </strong>
    );
  }),

  // Emphasis/Italic
  em: memo(function Emphasis({
    children,
    ...props
  }: React.ComponentProps<"em">) {
    return (
      <em className="italic" {...props}>
        {children}
      </em>
    );
  }),

  // Strikethrough (GFM feature)
  del: memo(function Strikethrough({
    children,
    ...props
  }: React.ComponentProps<"del">) {
    return (
      <del className="line-through opacity-70" {...props}>
        {children}
      </del>
    );
  }),

  // Task list items (GFM feature)
  input: memo(function TaskListCheckbox({
    checked,
    type,
    ...props
  }: React.ComponentProps<"input">) {
    if (type === "checkbox") {
      return (
        <input
          type="checkbox"
          checked={checked}
          disabled
          className="mr-2 accent-primary"
          {...props}
        />
      );
    }
    return <input type={type} {...props} />;
  }),
} as const;

export const MarkdownRenderer = memo(function MarkdownRenderer({
  content,
  className,
}: MarkdownRendererProps) {
  // Memoize the remarkPlugins array to prevent re-creation
  const remarkPlugins = useMemo(() => [remarkGfm], []);

  // Memoize the className computation
  const containerClassName = useMemo(
    () => cn("markdown-content max-w-full", className),
    [className]
  );

  return (
    <div className={containerClassName}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        components={MarkdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});
