"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { getSignedAttachmentUrl } from "@/app/actions/storage";
import { toast } from "sonner";
import {
  AlertTriangle,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ViewAttachmentProps {
  attachmentPaths: string[] | null;
  variant?: "icon" | "grid";
  title?: string;
  className?: string;
  onOpenChange?: (open: boolean) => void;
}

export default function ViewAttachment({
  attachmentPaths,
  variant = "grid",
  title = "Ver anexos",
  className,
  onOpenChange,
}: ViewAttachmentProps) {
  const [open, setOpen] = useState(false);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [loadingPath, setLoadingPath] = useState<string | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const paths = useMemo(() => attachmentPaths ?? [], [attachmentPaths]);
  const errorSubtitle = "O arquivo não foi encontrado ou foi removido.";

  const ensureSignedUrl = async (path: string) => {
    if (signedUrls[path] || loadingPath === path) return;
    setLoadingPath(path);
    try {
      const result = await getSignedAttachmentUrl(path);

      if (result.ok) {
        setSignedUrls((prev) => ({ ...prev, [path]: result.url }));
        setErrors((prev) => {
          const next = { ...prev };
          delete next[path];
          return next;
        });
      } else {
        let errorMessage = "Não foi possível abrir o anexo.";
        if (
          result.error === "Attachment not found" ||
          result.error?.includes("not found")
        ) {
          errorMessage = "Anexo não encontrado. Reenvie o print nesta demanda.";
        } else if (result.error === "Unauthorized") {
          errorMessage = "Sem permissão para acessar este anexo.";
        }
        setErrors((prev) => ({ ...prev, [path]: errorMessage }));
      }
    } catch (err) {
      console.error("View attachment error:", err);
      setErrors((prev) => ({
        ...prev,
        [path]: "Erro inesperado ao carregar. Tente novamente.",
      }));
    } finally {
      setLoadingPath(null);
    }
  };

  const hasAny = paths.length > 0;

  const activeUrl = activePath ? signedUrls[activePath] : undefined;

  const thumbnailItems = useMemo(() => {
    return paths.map((p) => ({
      path: p,
      url: signedUrls[p],
      error: errors[p],
      isLoading: loadingPath === p && !signedUrls[p],
    }));
  }, [errors, loadingPath, paths, signedUrls]);

  // Prefetch somente quando o componente está em modo "grid" (ex.: modal)
  useEffect(() => {
    if (variant !== "grid") return;
    if (!hasAny) return;
    // Buscar URLs de forma incremental sem bloquear render
    paths.forEach((p) => {
      void ensureSignedUrl(p);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant, hasAny, paths.join("|")]);

  // Quando abrir overlay, garantir ao menos o ativo
  useEffect(() => {
    if (!open) return;
    if (!hasAny) return;
    const toActivate = activePath || paths[0];
    setActivePath(toActivate);
    void ensureSignedUrl(toActivate);
    // Em overlay, é útil ter thumbs disponíveis
    paths.forEach((p) => {
      void ensureSignedUrl(p);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!hasAny) {
    return variant === "icon" ? null : (
      <span className="text-muted-foreground text-sm">-</span>
    );
  }

  const openOverlay = (path?: string) => {
    if (path) setActivePath(path);
    setOpen(true);
    onOpenChange?.(true);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  const handleOpenInNewTab = async () => {
    if (!activePath) return;
    if (!signedUrls[activePath]) {
      await ensureSignedUrl(activePath);
    }
    const url = signedUrls[activePath];
    if (!url) {
      toast.error("Não foi possível abrir o anexo.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (variant === "icon") {
    return (
      <>
        <Button
          variant="ghost"
          size="sm"
          className={cn("h-7 w-7 p-0", className)}
          onClick={(e) => {
            e.stopPropagation();
            openOverlay();
          }}
          title={`${title} (${paths.length})`}
          aria-label={`${title} (${paths.length})`}
        >
          <ImageIcon className="h-3.5 w-3.5" />
        </Button>

        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogContent className="max-w-4xl p-0 overflow-hidden">
            <DialogHeader className="px-4 py-3 border-b">
              <DialogTitle className="flex items-center justify-between">
                <span className="text-sm font-semibold">Anexos</span>
              </DialogTitle>
            </DialogHeader>

            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-muted-foreground">
                  {paths.length} {paths.length === 1 ? "arquivo" : "arquivos"}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={handleOpenInNewTab}
                  disabled={
                    !activePath || (activePath ? !!errors[activePath] : false)
                  }
                  title="Abrir em nova aba"
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  Abrir
                </Button>
              </div>

              <div className="rounded-lg border bg-muted/20 overflow-hidden">
                <div className="aspect-[16/9] bg-black/5 flex items-center justify-center">
                  {activePath && errors[activePath] ? (
                    <div className="p-4 text-center max-w-md">
                      <div className="flex items-center justify-center gap-2 text-sm font-medium text-foreground/80">
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                        Anexo indisponível
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {errorSubtitle}
                      </div>
                      <div className="mt-3">
                        <button
                          type="button"
                          className="text-xs text-muted-foreground underline underline-offset-4 cursor-default"
                          aria-disabled="true"
                        >
                          Solicitar reenvio
                        </button>
                      </div>
                    </div>
                  ) : activePath && !activeUrl ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : activeUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={activeUrl}
                      alt="Anexo"
                      className="max-h-[60vh] w-full object-contain bg-background"
                    />
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {thumbnailItems.map((item, idx) => (
                  <button
                    key={`${item.path}-${idx}`}
                    className={cn(
                      "relative rounded-md border border-border/40 overflow-hidden bg-muted/10 hover:bg-muted/20 transition-colors focus:outline-none focus:ring-2 focus:ring-ring/30",
                      activePath === item.path && "ring-2 ring-primary/30"
                    )}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setActivePath(item.path);
                      void ensureSignedUrl(item.path);
                    }}
                    title={item.error ? item.error : "Selecionar"}
                  >
                    <div className="aspect-square flex items-center justify-center">
                      {item.error ? (
                        <div className="flex flex-col items-center justify-center gap-1 px-1">
                          <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">
                            Indisp.
                          </span>
                        </div>
                      ) : item.isLoading ? (
                        <div className="h-full w-full bg-muted/40 animate-pulse" />
                      ) : item.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.url}
                          alt="Thumbnail"
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
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
    <>
      <div
        className={cn(
          "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2",
          className
        )}
      >
        {thumbnailItems.map((item, idx) => (
          <button
            key={`${item.path}-${idx}`}
            className={cn(
              "group relative rounded-lg border border-border/40 overflow-hidden bg-muted/10 hover:bg-muted/20 transition-colors focus:outline-none focus:ring-2 focus:ring-ring/30"
            )}
            onClick={() => openOverlay(item.path)}
            title={item.error ? item.error : "Abrir preview"}
          >
            <div className="aspect-video flex items-center justify-center bg-black/5">
              {item.error ? (
                <div className="flex flex-col items-center justify-center gap-1 px-3 text-center">
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  <div className="text-[11px] font-medium text-foreground/80">
                    Anexo indisponível
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {errorSubtitle}
                  </div>
                  <div className="mt-1">
                    <span className="text-[10px] text-muted-foreground underline underline-offset-4">
                      Solicitar reenvio
                    </span>
                  </div>
                </div>
              ) : item.isLoading ? (
                <div className="h-full w-full bg-muted/40 animate-pulse" />
              ) : item.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.url}
                  alt="Thumbnail"
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <ImageIcon className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="absolute inset-0 ring-0 group-hover:ring-1 group-hover:ring-primary/25 transition" />
          </button>
        ))}
      </div>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-5xl p-0 overflow-hidden">
          <DialogHeader className="px-4 py-3 border-b">
            <DialogTitle className="flex items-center justify-between">
              <span className="text-sm font-semibold">Preview do anexo</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={handleOpenInNewTab}
                  disabled={
                    !activePath || (activePath ? !!errors[activePath] : false)
                  }
                  title="Abrir em nova aba"
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  Abrir
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="p-4">
            <div className="rounded-lg border bg-muted/20 overflow-hidden">
              <div className="min-h-[320px] max-h-[70vh] flex items-center justify-center bg-black/5">
                {activePath && errors[activePath] ? (
                  <div className="p-4 text-center max-w-md">
                    <div className="flex items-center justify-center gap-2 text-sm font-medium text-foreground/80">
                      <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                      Anexo indisponível
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {errorSubtitle}
                    </div>
                    <div className="mt-3">
                      <button
                        type="button"
                        className="text-xs text-muted-foreground underline underline-offset-4 cursor-default"
                        aria-disabled="true"
                      >
                        Solicitar reenvio
                      </button>
                    </div>
                  </div>
                ) : activePath && !activeUrl ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : activeUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={activeUrl}
                    alt="Anexo"
                    className="max-h-[70vh] w-full object-contain bg-background"
                  />
                ) : null}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-6 gap-2">
              {thumbnailItems.map((item, idx) => (
                <button
                  key={`${item.path}-strip-${idx}`}
                  className={cn(
                    "relative rounded-md border border-border/40 overflow-hidden bg-muted/10 hover:bg-muted/20 transition-colors focus:outline-none focus:ring-2 focus:ring-ring/30",
                    activePath === item.path && "ring-2 ring-primary/30"
                  )}
                  onClick={() => {
                    setActivePath(item.path);
                    void ensureSignedUrl(item.path);
                  }}
                  title={item.error ? item.error : "Selecionar"}
                >
                  <div className="aspect-square flex items-center justify-center">
                    {item.error ? (
                      <div className="flex flex-col items-center justify-center gap-1 px-1">
                        <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">
                          Indisp.
                        </span>
                      </div>
                    ) : item.isLoading ? (
                      <div className="h-full w-full bg-muted/40 animate-pulse" />
                    ) : item.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.url}
                        alt="Thumbnail"
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
