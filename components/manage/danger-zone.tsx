"use client";

import { clearDataAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";

export function ClearDataButton() {
  return (
    <form
      action={clearDataAction}
      onSubmit={(e) => {
        if (!confirm("Delete ALL report data? Settings and credentials are kept. This cannot be undone.")) {
          e.preventDefault();
        }
      }}
    >
      <Button type="submit" variant="danger" size="sm">
        Delete all report data
      </Button>
    </form>
  );
}
