"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState, useTransition, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createDemand } from "@/app/actions/demands";
import { toast } from "sonner";
import {
  User,
  Building2,
  FileText,
  Layers,
  AlertCircle,
  FileEdit,
  Upload,
  Link2,
  Plus,
  X,
  Send,
  Loader2,
  Image as ImageIcon,
  Clipboard,
} from "lucide-react";

// Schema de validação client-side (valores em português para o formulário)
// Ajustado para suporte apenas aos departamentos válidos [B2B, B2C, Concierge, etc.]
const DEPARTMENTS = [
  "B2B",
  "Call Center",
  "Balcão (PDV)",
  "Suporte",
  "Concierge",
  "Financeiro",
  "Marketing",
  "Operacional",
  "Outro",
];

// Função para normalizar URLs adicionando https:// se necessário
const normalizeUrl = (url: string): string => {
  if (!url || url.trim() === "") return url;

  const trimmed = url.trim();

  // Se já tem protocolo (http://, https://, ftp://, etc.), retorna como está
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed)) {
    return trimmed;
  }

  // Remove barras iniciais se houver
  const cleaned = trimmed.replace(/^\/+/, "");

  // Se parece ser uma URL válida (contém ponto e caracteres válidos)
  // Padrão: começa com letra/número, pode ter hífens/pontos, tem domínio válido
  if (/^[a-zA-Z0-9][a-zA-Z0-9\-.]*\.[a-zA-Z]{2,}/.test(cleaned)) {
    return `https://${cleaned}`;
  }

  // Se começa com www., adiciona https://
  if (/^www\./i.test(cleaned)) {
    return `https://${cleaned}`;
  }

  // Se não parece ser URL, retorna como está (será validado depois)
  return trimmed;
};

const demandFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  department: z
    .enum([
      "B2B",
      "Call Center",
      "Balcão (PDV)",
      "Suporte",
      "Concierge",
      "Financeiro",
      "Marketing",
      "Operacional",
      "Outro",
    ])
    .optional(),
  demand_type: z.enum(["Bug", "Melhoria", "Ideia", "Ajuste"]),
  system_area: z.string().min(1, "Sistema/área é obrigatório"),
  impact_level: z.enum(["Bloqueante", "Alto", "Médio", "Baixo"]),
  description: z
    .string()
    .min(10, "Descrição deve ter pelo menos 10 caracteres"),
  reference_links: z.array(z.string()).min(0).default([]),
});

type DemandFormValues = z.infer<typeof demandFormSchema> & {
  reference_links: string[];
};

export default function DemandForm() {
  const [isPending, startTransition] = useTransition();
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [referenceLinks, setReferenceLinks] = useState<string[]>([""]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<Map<number, string>>(
    new Map()
  );

  // Limpar URLs de preview quando componente desmontar
  useEffect(() => {
    const currentPreviews = previewUrls;
    return () => {
      currentPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Atualizar previews quando arquivos mudarem
  useEffect(() => {
    // Criar novos previews para arquivos novos
    const newPreviews = new Map<number, string>();
    attachmentFiles.forEach((file, index) => {
      // Reutilizar preview existente se disponível, senão criar novo
      const existingUrl = previewUrls.get(index);
      if (existingUrl) {
        newPreviews.set(index, existingUrl);
      } else {
        const url = URL.createObjectURL(file);
        newPreviews.set(index, url);
      }
    });

    // Revogar URLs que não estão mais sendo usadas
    previewUrls.forEach((url, index) => {
      if (!newPreviews.has(index)) {
        URL.revokeObjectURL(url);
      }
    });

    setPreviewUrls(newPreviews);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachmentFiles]);

  const form = useForm<DemandFormValues>({
    resolver: zodResolver(demandFormSchema) as any,
    defaultValues: {
      name: "",
      department: undefined,
      demand_type: "Bug",
      system_area: "",
      impact_level: "Baixo",
      description: "",
      reference_links: [],
    },
  });

  const onSubmit = async (data: DemandFormValues) => {
    startTransition(async () => {
      try {
        // Validar department manualmente
        if (!data.department) {
          form.setError("department", {
            type: "required",
            message: "Setor é obrigatório",
          });
          return;
        }

        // Filtrar links vazios, normalizar URLs e validar
        const validLinks = referenceLinks
          .filter((link) => link.trim() !== "")
          .map((link) => normalizeUrl(link));

        // Criar FormData para enviar ao Server Action
        const formData = new FormData();
        formData.append("name", data.name);
        formData.append("department", data.department);
        formData.append("demand_type", data.demand_type);
        formData.append("system_area", data.system_area);
        formData.append("impact_level", data.impact_level);
        formData.append("description", data.description);

        // Adicionar links de referência normalizados (como JSON array)
        if (validLinks.length > 0) {
          formData.append("reference_links", JSON.stringify(validLinks));
        }

        // Adicionar múltiplos arquivos
        attachmentFiles.forEach((file) => {
          formData.append("attachments", file);
        });

        // Chamar Server Action
        const result = await createDemand(formData);

        if (result.ok) {
          toast.success("Demanda registrada com sucesso!", {
            description: "Sua demanda foi recebida e será analisada em breve.",
          });
          // Reset do formulário
          form.reset();
          setAttachmentFiles([]);
          setReferenceLinks([""]);
          // Reset do input de arquivo
          const fileInput = document.getElementById(
            "attachment"
          ) as HTMLInputElement;
          if (fileInput) {
            fileInput.value = "";
          }
        } else {
          toast.error("Erro ao registrar demanda", {
            description: result.error || "Tente novamente mais tarde.",
          });
        }
      } catch (error) {
        console.error("Submit error:", error);
        toast.error("Erro inesperado", {
          description: "Não foi possível registrar a demanda. Tente novamente.",
        });
      }
    });
  };

  const validateAndAddFiles = (files: File[]) => {
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ];

    const validFiles: File[] = [];
    const errors: string[] = [];

    files.forEach((file) => {
      if (!allowedTypes.includes(file.type)) {
        errors.push(
          `${file.name}: Tipo não permitido. Use apenas imagens (JPG, PNG, GIF, WEBP)`
        );
        return;
      }
      if (file.size > MAX_SIZE) {
        errors.push(`${file.name}: Arquivo muito grande. Tamanho máximo: 5MB`);
        return;
      }
      validFiles.push(file);
    });

    if (errors.length > 0) {
      toast.error("Erro ao adicionar arquivos", {
        description: errors.join(", "),
      });
    }

    if (validFiles.length > 0) {
      setAttachmentFiles((prev) => [...prev, ...validFiles]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      validateAndAddFiles(files);
    }
    // Reset input para permitir selecionar o mesmo arquivo novamente
    e.target.value = "";
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const imageFiles: File[] = [];

    items.forEach((item) => {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          imageFiles.push(file);
        }
      }
    });

    if (imageFiles.length > 0) {
      e.preventDefault();
      validateAndAddFiles(imageFiles);
      toast.success(`${imageFiles.length} imagem(ns) colada(s)`, {
        description: "Imagem adicionada da área de transferência",
      });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files).filter((file) =>
      file.type.startsWith("image/")
    );

    if (files.length > 0) {
      validateAndAddFiles(files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const removeFile = (index: number) => {
    // Revogar URL do preview
    const url = previewUrls.get(index);
    if (url) {
      URL.revokeObjectURL(url);
      setPreviewUrls((prev) => {
        const newMap = new Map(prev);
        newMap.delete(index);
        // Reindexar URLs restantes
        const reindexed = new Map<number, string>();
        let newIndex = 0;
        attachmentFiles.forEach((_, i) => {
          if (i !== index && previewUrls.has(i)) {
            reindexed.set(newIndex, previewUrls.get(i)!);
            newIndex++;
          }
        });
        return reindexed;
      });
    }
    setAttachmentFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleLinkChange = (index: number, value: string) => {
    const newLinks = [...referenceLinks];
    newLinks[index] = value;
    setReferenceLinks(newLinks);
    // Atualizar o form com os links válidos
    const validLinks = newLinks.filter((link) => link.trim() !== "");
    form.setValue("reference_links", validLinks);
  };

  const addLinkField = () => {
    setReferenceLinks([...referenceLinks, ""]);
  };

  const removeLinkField = (index: number) => {
    if (referenceLinks.length > 1) {
      const newLinks = referenceLinks.filter((_, i) => i !== index);
      setReferenceLinks(newLinks);
      const validLinks = newLinks.filter((link) => link.trim() !== "");
      form.setValue("reference_links", validLinks);
    }
  };

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="space-y-4"
      onPaste={handlePaste}
    >
      <div className="space-y-3.5">
        <div className="space-y-2">
          <Label
            htmlFor="name"
            className="text-foreground/90 font-medium flex items-center gap-2"
          >
            <User className="h-4 w-4" />
            Nome do Solicitante *
          </Label>
          <Input
            id="name"
            {...form.register("name")}
            placeholder="Seu nome completo"
            disabled={isPending}
          />
          {form.formState.errors.name && (
            <p className="text-sm text-destructive mt-1 flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" />
              {form.formState.errors.name.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="department"
            className="text-foreground/90 font-medium flex items-center gap-2"
          >
            <Building2 className="h-4 w-4" />
            Setor *
          </Label>
          <Select
            value={form.watch("department") || undefined}
            onValueChange={(value) =>
              form.setValue(
                "department",
                value as DemandFormValues["department"]
              )
            }
            disabled={isPending}
          >
            <SelectTrigger>
              <SelectValue placeholder="Informe seu setor" />
            </SelectTrigger>
            <SelectContent>
              {DEPARTMENTS.map((dep) => (
                <SelectItem key={dep} value={dep}>
                  {dep}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.department && (
            <p className="text-sm text-destructive mt-1 flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" />
              {form.formState.errors.department.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="demand_type"
            className="text-foreground/90 font-medium flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            Tipo da Demanda *
          </Label>
          <Select
            value={form.watch("demand_type")}
            onValueChange={(value) =>
              form.setValue(
                "demand_type",
                value as DemandFormValues["demand_type"]
              )
            }
            disabled={isPending}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Bug">Bug</SelectItem>
              <SelectItem value="Melhoria">Melhoria</SelectItem>
              <SelectItem value="Ideia">Ideia</SelectItem>
              <SelectItem value="Ajuste">Ajuste</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="system_area"
            className="text-foreground/90 font-medium flex items-center gap-2"
          >
            <Layers className="h-4 w-4" />
            Sistema/Área Afetada *
          </Label>
          <Select
            value={form.watch("system_area")}
            onValueChange={(value) =>
              form.setValue(
                "system_area",
                value as DemandFormValues["system_area"]
              )
            }
            disabled={isPending}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o sistema/área" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="erp-sistemao">ERP (Sistemão)</SelectItem>
              <SelectItem value="wts-chat">
                Plataforma de Atendimento (WTS Chat)
              </SelectItem>
            </SelectContent>
          </Select>
          {form.formState.errors.system_area && (
            <p className="text-sm text-destructive mt-1 flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" />
              {form.formState.errors.system_area.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="impact_level"
            className="text-foreground/90 font-medium flex items-center gap-2"
          >
            <AlertCircle className="h-4 w-4" />
            Impacto Percebido *
          </Label>
          <Select
            value={form.watch("impact_level")}
            onValueChange={(value) =>
              form.setValue(
                "impact_level",
                value as DemandFormValues["impact_level"]
              )
            }
            disabled={isPending}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o impacto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Bloqueante">Bloqueante</SelectItem>
              <SelectItem value="Alto">Alto</SelectItem>
              <SelectItem value="Médio">Médio</SelectItem>
              <SelectItem value="Baixo">Baixo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="description"
            className="text-foreground/90 font-medium flex items-center gap-2"
          >
            <FileEdit className="h-4 w-4" />
            Descrição Detalhada *
          </Label>
          <Textarea
            id="description"
            {...form.register("description")}
            placeholder="Descreva detalhadamente a demanda..."
            rows={5}
            disabled={isPending}
          />
          {form.formState.errors.description && (
            <p className="text-sm text-destructive mt-1 flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" />
              {form.formState.errors.description.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="attachment"
            className="text-foreground/90 font-medium flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Upload de Print/Evidência
          </Label>

          {/* Área de drop e paste */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`
              border-2 border-dashed rounded-lg p-6 transition-colors
              ${
                isDragOver
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
              }
              ${isPending ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
            `}
            onClick={() => {
              if (!isPending) {
                document.getElementById("attachment")?.click();
              }
            }}
          >
            <div className="flex flex-col items-center justify-center gap-3 text-center">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Upload className="h-5 w-5" />
                <ImageIcon className="h-5 w-5" />
                <Clipboard className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  Arraste imagens aqui ou clique para selecionar
                </p>
                <p className="text-xs text-muted-foreground">
                  Você também pode colar imagens da área de transferência
                </p>
              </div>
              <Input
                id="attachment"
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileChange}
                disabled={isPending}
              />
            </div>
          </div>

          {/* Lista de arquivos selecionados */}
          {attachmentFiles.length > 0 && (
            <div className="space-y-2 mt-3">
              <p className="text-sm font-medium text-foreground/80">
                {attachmentFiles.length} arquivo(s) selecionado(s):
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {attachmentFiles.map((file, index) => {
                  const previewUrl = previewUrls.get(index);
                  return (
                    <div
                      key={index}
                      className="relative group border rounded-lg p-2 bg-muted/30"
                    >
                      <div className="flex items-start gap-2">
                        <div className="relative flex-shrink-0">
                          {previewUrl ? (
                            <Image
                              src={previewUrl}
                              alt={file.name}
                              width={64}
                              height={64}
                              className="w-16 h-16 object-cover rounded"
                              unoptimized
                            />
                          ) : (
                            <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                              <ImageIcon className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute -top-1 -right-1 h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFile(index);
                            }}
                            disabled={isPending}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(file.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <p className="text-sm text-muted-foreground/70">
            Opcional. Formatos aceitos: JPG, PNG, GIF, WEBP (máx. 5MB por
            arquivo)
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-foreground/90 font-medium flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Links de Referência
          </Label>
          <div className="space-y-2">
            {referenceLinks.map((link, index) => (
              <div key={index} className="flex gap-2">
                <div className="relative flex-1">
                  <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 pointer-events-none" />
                  <Input
                    type="url"
                    placeholder="Ex: https://plataforma.com/sessao/12345"
                    value={link}
                    onChange={(e) => handleLinkChange(index, e.target.value)}
                    disabled={isPending}
                    className="pl-9"
                  />
                </div>
                {referenceLinks.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeLinkField(index)}
                    disabled={isPending}
                    className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addLinkField}
              disabled={isPending}
              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Adicionar Link
            </Button>
          </div>
          {form.formState.errors.reference_links && (
            <p className="text-sm text-destructive mt-1 flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" />
              {form.formState.errors.reference_links.message}
            </p>
          )}
          <p className="text-sm text-muted-foreground/70">
            Opcional. Adicione links relevantes como sessões de atendimento,
            documentação, etc.
          </p>
        </div>
      </div>

      <Button
        type="submit"
        className="w-full mt-6"
        size="lg"
        disabled={isPending}
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Enviando...
          </>
        ) : (
          <>
            <Send className="h-4 w-4 mr-2" />
            Enviar Demanda
          </>
        )}
      </Button>
    </form>
  );
}
