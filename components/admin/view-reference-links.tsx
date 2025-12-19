"use client";

import { ExternalLink, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface ViewReferenceLinksProps {
  links: string[] | null;
  variant?: "icon" | "list";
  title?: string;
  className?: string;
}

export default function ViewReferenceLinks({
  links,
  variant = "list",
  title = "Ver links",
  className,
}: ViewReferenceLinksProps) {
  const [open, setOpen] = useState(false);
  const items = links || [];

  if (items.length === 0) {
    return variant === "icon" ? null : (
      <span className="text-muted-foreground text-sm">-</span>
    );
  }

  if (variant === "icon") {
    return (
      <>
        <Button
          variant="ghost"
          size="sm"
          className={cn("h-7 w-7 p-0", className)}
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
          title={`${title} (${items.length})`}
          aria-label={`${title} (${items.length})`}
        >
          <Link2 className="h-3.5 w-3.5" />
        </Button>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-lg p-0 overflow-hidden">
            <DialogHeader className="px-4 py-3 border-b">
              <DialogTitle className="flex items-center justify-between">
                <span className="text-sm font-semibold">
                  Links de referência
                </span>
              </DialogTitle>
            </DialogHeader>

            <div className="p-2">
              <div className="flex flex-col">
                {items.map((link, index) => (
                  <button
                    key={index}
                    className="flex items-center justify-between gap-3 px-3 py-2 rounded-md hover:bg-muted/60 transition-colors text-left"
                    onClick={() =>
                      window.open(link, "_blank", "noopener,noreferrer")
                    }
                    title={link}
                  >
                    <span className="text-sm truncate">{link}</span>
                    <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {items.map((link, index) => (
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
