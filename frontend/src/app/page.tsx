"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/contexts/auth-context";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      router.replace(user ? "/repos" : "/login");
    }
  }, [loading, user, router]);

  return (
    <div className="flex flex-1 items-center justify-center py-24 text-zinc-500">Loading…</div>
  );
}
