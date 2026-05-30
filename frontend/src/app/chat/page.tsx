"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { ChatPage } from "@/components/chat-page";

function ChatRouteContent() {
  const searchParams = useSearchParams();
  const owner = searchParams.get("owner") ?? undefined;
  const repo = searchParams.get("repo") ?? undefined;
  const numberParam = searchParams.get("number");
  const threadId = searchParams.get("thread") ?? undefined;
  const number = numberParam ? Number(numberParam) : undefined;

  return (
    <ChatPage
      initialOwner={owner}
      initialRepo={repo}
      initialNumber={Number.isInteger(number) ? number : undefined}
      initialThreadId={threadId}
    />
  );
}

export default function ChatRoutePage() {
  return (
    <Suspense fallback={<div className="flex flex-1 items-center justify-center py-24">Loading…</div>}>
      <ChatRouteContent />
    </Suspense>
  );
}
