"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getSignedAttachmentUrl } from "@/app/actions/storage";
import { toast } from "sonner";
import { ExternalLink, Image as ImageIcon } from "lucide-react";

interface ViewAttachmentProps {
  attachmentPaths: string[] | null;
}

export default function ViewAttachment({
  attachmentPaths,
}: ViewAttachmentProps) {
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);

  if (!attachmentPaths || attachmentPaths.length === 0) {
    return <span className="text-muted-foreground text-sm">-</span>;
  }

  const handleView = async (path: string, index: number) => {
    setLoadingIndex(index);
    try {
      const result = await getSignedAttachmentUrl(path);

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
      setLoadingIndex(null);
    }
  };

  if (attachmentPaths.length === 1) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleView(attachmentPaths[0], 0)}
        disabled={loadingIndex === 0}
        className="h-8"
      >
        <ExternalLink className="h-4 w-4 mr-1" />
        {loadingIndex === 0 ? "Abrindo..." : "Abrir"}
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {attachmentPaths.map((path, index) => (
        <Button
          key={index}
          variant="ghost"
          size="sm"
          onClick={() => handleView(path, index)}
          disabled={loadingIndex === index}
          className="h-7 justify-start text-xs"
        >
          <ImageIcon className="h-3 w-3 mr-1" />
          {loadingIndex === index ? "Abrindo..." : `Imagem ${index + 1}`}
        </Button>
      ))}
    </div>
  );
}
