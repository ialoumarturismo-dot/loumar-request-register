"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getSignedAttachmentUrl } from "@/app/actions/storage";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";

interface ViewAttachmentProps {
  attachmentPath: string | null;
}

export default function ViewAttachment({ attachmentPath }: ViewAttachmentProps) {
  const [isLoading, setIsLoading] = useState(false);

  if (!attachmentPath) {
    return <span className="text-muted-foreground text-sm">-</span>;
  }

  const handleView = async () => {
    setIsLoading(true);
    try {
      const result = await getSignedAttachmentUrl(attachmentPath);

      if (result.ok) {
        // Abrir em nova aba
        window.open(result.url, "_blank");
      } else {
        toast.error("Erro ao abrir anexo", {
          description: result.error || "Tente novamente.",
        });
      }
    } catch (err) {
      console.error("View attachment error:", err);
      toast.error("Erro inesperado", {
        description: "Não foi possível abrir o anexo.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleView}
      disabled={isLoading}
      className="h-8"
    >
      <ExternalLink className="h-4 w-4 mr-1" />
      {isLoading ? "Abrindo..." : "Abrir"}
    </Button>
  );
}

