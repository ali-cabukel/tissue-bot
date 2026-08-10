"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, User } from "lucide-react";
import { useState, type ReactNode } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/" },
  { label: "Repositories", href: "/repos" },
  { label: "Resolutions", href: "/resolutions" },
  { label: "Agent chat", href: "/chat" },
];

/** Auth screens render standalone, without the shell chrome. */
const bareRoutes = ["/login", "/register"];

function Wordmark() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <span className="flex size-6 items-center justify-center rounded-md bg-primary text-[11px] font-semibold text-primary-foreground">
        tb
      </span>
      <span className="font-mono text-sm font-medium tracking-tight text-foreground">
        tissue-bot
      </span>
    </Link>
  );
}

function UserMenu({ email, onLogout }: { email: string; onLogout: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-2 px-2 text-muted-foreground hover:text-foreground"
        >
          <span className="flex size-5 items-center justify-center rounded-full border border-border bg-surface">
            <User className="size-3" />
          </span>
          <span className="hidden max-w-[180px] truncate text-xs sm:inline">{email}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">
          {email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="gap-2 text-sm" onClick={onLogout}>
          <LogOut className="size-4 text-muted-foreground" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();

  if (bareRoutes.includes(pathname)) {
    return <>{children}</>;
  }

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-4 px-4 sm:px-6">
          <Wordmark />

          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-[13px] transition-colors",
                  isActive(item.href)
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            {user ? <UserMenu email={user.email} onLogout={logout} /> : null}
            <Button
              variant="ghost"
              size="icon"
              className="size-8 md:hidden"
              aria-label="Toggle navigation"
              onClick={() => setMobileOpen((open) => !open)}
            >
              <Menu className="size-4" />
            </Button>
          </div>
        </div>

        {mobileOpen ? (
          <nav className="border-t border-border bg-background px-4 py-2 md:hidden">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "block rounded-md px-2 py-2 text-sm transition-colors",
                  isActive(item.href)
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        ) : null}
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
