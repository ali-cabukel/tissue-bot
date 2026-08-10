import Link from "next/link";
import { Database } from "lucide-react";

import { Button } from "@/components/ui/button";

export function DashboardEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card px-6 py-20 text-center">
      <span className="flex size-10 items-center justify-center rounded-lg border border-border bg-surface text-muted-foreground">
        <Database className="size-4" />
      </span>
      <h2 className="mt-4 text-base font-medium text-foreground">Nothing collected yet</h2>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
        Add a GitHub repository to start collecting issues. Once issues are stored, the
        agent can analyse them and propose resolutions.
      </p>
      <Button asChild size="sm" className="mt-5">
        <Link href="/repos">Collect a repository</Link>
      </Button>
    </div>
  );
}
