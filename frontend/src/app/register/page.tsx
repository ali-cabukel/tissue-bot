"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { AuthForm } from "@/components/auth/auth-form";
import { useAuth } from "@/contexts/auth-context";

export default function RegisterPage() {
  const { user, loading, register } = useAuth();
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
      title="Create an account"
      description="Register to collect repositories and run the resolution agent."
      submitLabel="Create account"
      withConfirm
      action={register}
      footer={
        <>
          Already registered?{" "}
          <Link href="/login" className="text-foreground underline underline-offset-2">
            Log in
          </Link>
        </>
      }
    />
  );
}
