"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { AuthForm } from "@/components/auth/auth-form";
import { useAuth } from "@/contexts/auth-context";

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/");
    }
  }, [loading, user, router]);

  if (loading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <AuthForm
      title="Log in"
      description="Access your collected GitHub repository and issue data."
      submitLabel="Sign in"
      action={login}
      footer={
        <>
          No account?{" "}
          <Link href="/register" className="text-foreground underline underline-offset-2">
            Register
          </Link>
        </>
      }
    />
  );
}
