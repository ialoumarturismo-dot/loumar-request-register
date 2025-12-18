"use client";

import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ViewReferenceLinksProps {
  links: string[] | null;
}

export default function ViewReferenceLinks({ links }: ViewReferenceLinksProps) {
  if (!links || links.length === 0) {
    return <span className="text-muted-foreground text-sm">-</span>;
  }

  return (
    <div className="flex flex-col gap-1">
      {links.map((link, index) => (
        <Button
          key={index}
          variant="ghost"
          size="sm"
          onClick={() => window.open(link, "_blank")}
          className="h-7 justify-start text-xs"
        >
          <ExternalLink className="h-3 w-3 mr-1" />
          Link {index + 1}
        </Button>
      ))}
    </div>
  );
}

