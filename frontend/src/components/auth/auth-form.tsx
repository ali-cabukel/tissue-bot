"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/types";

function Wordmark() {
  return (
    <Link href="/" className="flex items-center justify-center gap-2">
      <span className="flex size-6 items-center justify-center rounded-md bg-primary text-[11px] font-semibold text-primary-foreground">
        tb
      </span>
      <span className="font-mono text-sm font-medium tracking-tight text-foreground">
        tissue-bot
      </span>
    </Link>
  );
}

type Errors = { email?: string; password?: string; confirm?: string };

export function AuthForm({
  title,
  description,
  submitLabel,
  withConfirm,
  footer,
  action,
}: {
  title: string;
  description: string;
  submitLabel: string;
  withConfirm?: boolean;
  footer: ReactNode;
  /** Resolves on success and navigates; rejects with ApiError on failure. */
  action: (email: string, password: string) => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const validate = (): Errors => {
    const next: Errors = {};
    if (!email.trim()) next.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()))
      next.email = "Enter a valid email address.";
    if (!password) next.password = "Password is required.";
    else if (password.length < 8) next.password = "Use at least 8 characters.";
    if (withConfirm && confirm !== password) next.confirm = "Passwords do not match.";
    return next;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      await action(email.trim(), password);
    } catch (error) {
      setFormError(
        error instanceof ApiError ? error.message : "Something went wrong. Try again.",
      );
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <Wordmark />

        <div className="mt-6 rounded-lg border border-border bg-card p-6 shadow-subtle">
          <h1 className="text-base font-medium text-foreground">{title}</h1>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>

          <form className="mt-5 space-y-4" onSubmit={submit} noValidate>
            <Field id="email" label="Email" error={errors.email}>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={Boolean(errors.email)}
                className="h-9 text-sm"
              />
            </Field>

            <Field id="password" label="Password" error={errors.password}>
              <Input
                id="password"
                type="password"
                autoComplete={withConfirm ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={Boolean(errors.password)}
                className="h-9 text-sm"
              />
            </Field>

            {withConfirm ? (
              <Field id="confirm" label="Confirm password" error={errors.confirm}>
                <Input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  aria-invalid={Boolean(errors.confirm)}
                  className="h-9 text-sm"
                />
              </Field>
            ) : null}

            <div aria-live="polite">
              {formError ? (
                <p className="rounded-md border border-status-failed/30 bg-status-failed-soft px-3 py-2 text-xs text-status-failed">
                  {formError}
                </p>
              ) : null}
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {submitting ? "Working…" : submitLabel}
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">{footer}</p>
      </div>
    </main>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string | undefined;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium text-foreground">
        {label}
      </Label>
      {children}
      {error ? <p className="text-[11px] text-status-failed">{error}</p> : null}
    </div>
  );
}
