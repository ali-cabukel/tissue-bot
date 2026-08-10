"use client";

import { SendHorizonal } from "lucide-react";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Composer({
  value,
  onChange,
  onSubmit,
  busy,
  disabled,
  placeholder = "Ask the agent about a repository, issue or resolution…",
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  busy: boolean;
  disabled?: boolean;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  /* Grow with content, capped so the transcript keeps most of the height. */
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, 200)}px`;
  }, [value]);

  useEffect(() => {
    if (!busy) ref.current?.focus();
  }, [busy, disabled]);

  const canSend = value.trim().length > 0 && !busy && !disabled;

  return (
    <div className="border-t border-border bg-card px-4 py-3">
      <div
        className={cn(
          "flex items-end gap-2 rounded-md border border-input bg-background px-3 py-2 transition-colors",
          "focus-within:border-ring focus-within:ring-1 focus-within:ring-ring",
        )}
      >
        <textarea
          ref={ref}
          rows={1}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          aria-label="Message the agent"
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (canSend) onSubmit();
            }
          }}
          className="max-h-[200px] flex-1 resize-none bg-transparent text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
        />
        <Button
          size="icon"
          className="size-7 shrink-0"
          disabled={!canSend}
          onClick={onSubmit}
          aria-label="Send message"
        >
          <SendHorizonal className="size-3.5" />
        </Button>
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        Enter to send · Shift + Enter for a new line. The agent reads only collected
        repositories, issues and resolutions.
      </p>
    </div>
  );
}
