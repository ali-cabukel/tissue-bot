"use client";

import { Check, Copy } from "lucide-react";
import { useCallback, useState, type ComponentPropsWithoutRef, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { highlight, normaliseLanguage, tokenClass } from "@/lib/highlight";
import { cn } from "@/lib/utils";

function childrenToText(children: ReactNode): string {
  if (children === null || children === undefined || children === false) return "";
  if (typeof children === "string" || typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(childrenToText).join("");
  if (typeof children === "object" && "props" in (children as never)) {
    return childrenToText((children as { props: { children?: ReactNode } }).props.children);
  }
  return "";
}

function CodeBlock({ code, language }: { code: string; language?: string | null }) {
  const [copied, setCopied] = useState(false);
  const lines = highlight(code, language);
  const label = normaliseLanguage(language);

  const copy = useCallback(() => {
    void navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  }, [code]);

  return (
    <div className="group relative my-3 overflow-hidden rounded-md border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          {label === "plain" ? "code" : label}
        </span>
        <button
          type="button"
          onClick={copy}
          aria-label="Copy code"
          className="inline-flex items-center gap-1.5 rounded-sm px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto px-3 py-2.5 text-[12.5px] leading-relaxed">
        <code className="font-mono">
          {lines.map((tokens, lineIndex) => (
            <span key={lineIndex} className="block whitespace-pre">
              {tokens.length === 0 ? " " : null}
              {tokens.map((token, tokenIndex) => (
                <span key={tokenIndex} className={tokenClass[token.type]}>
                  {token.text}
                </span>
              ))}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}

/** Shared markdown renderer: tokenised typography + highlighted fenced code. */
export function Markdown({ content, className }: { content: string; className?: string }) {
  return (
    <div className={cn("text-sm leading-relaxed text-foreground/90", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (props) => (
            <h3 className="mt-4 mb-2 text-sm font-semibold text-foreground" {...props} />
          ),
          h2: (props) => (
            <h4 className="mt-4 mb-2 text-sm font-semibold text-foreground" {...props} />
          ),
          h3: (props) => (
            <h5 className="mt-3 mb-1.5 text-[13px] font-semibold text-foreground" {...props} />
          ),
          h4: (props) => (
            <h6 className="mt-3 mb-1.5 text-[13px] font-medium text-foreground" {...props} />
          ),
          p: (props) => <p className="my-2.5" {...props} />,
          a: (props) => (
            <a
              className="text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
              target="_blank"
              rel="noreferrer"
              {...props}
            />
          ),
          ul: (props) => <ul className="my-2.5 ml-4 list-disc space-y-1" {...props} />,
          ol: (props) => <ol className="my-2.5 ml-4 list-decimal space-y-1" {...props} />,
          li: (props) => <li className="pl-0.5" {...props} />,
          strong: (props) => <strong className="font-semibold text-foreground" {...props} />,
          blockquote: (props) => (
            <blockquote
              className="my-3 border-l-2 border-border-strong pl-3 text-muted-foreground"
              {...props}
            />
          ),
          hr: () => <hr className="my-4 border-border" />,
          table: (props) => (
            <div className="my-3 overflow-x-auto rounded-md border border-border">
              <table className="w-full text-[13px]" {...props} />
            </div>
          ),
          thead: (props) => <thead className="bg-surface" {...props} />,
          th: (props) => (
            <th
              className="border-b border-border px-3 py-1.5 text-left font-medium text-foreground"
              {...props}
            />
          ),
          td: (props) => <td className="border-b border-border px-3 py-1.5 align-top" {...props} />,
          pre: ({ children }) => <>{children}</>,
          code: ({ className: codeClassName, children, ...rest }: ComponentPropsWithoutRef<"code">) => {
            const text = childrenToText(children);
            const match = /language-([\w+-]+)/.exec(codeClassName ?? "");
            const isBlock = match !== null || text.includes("\n");
            if (isBlock) return <CodeBlock code={text} language={match?.[1] ?? null} />;
            return (
              <code
                className="rounded-sm border border-border bg-surface px-1 py-0.5 font-mono text-[12px] text-foreground"
                {...rest}
              >
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
