"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState, useTransition, useEffect } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  createDemand,
  updateAdminStatus,
  updatePriority,
  assignDemand,
  setDemandDeadline,
} from "@/app/actions/demands";
import { listDepartments } from "@/app/actions/departments";
import { listManagedUsers } from "@/app/actions/users";
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
  Settings,
  ClockCheck,
} from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";

// Função para normalizar URLs
const normalizeUrl = (url: string): string => {
  if (!url || url.trim() === "") return url;

  const trimmed = url.trim();

  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed)) {
    return trimmed;
  }

  const cleaned = trimmed.replace(/^\/+/, "");

  if (/^[a-zA-Z0-9][a-zA-Z0-9\-.]*\.[a-zA-Z]{2,}/.test(cleaned)) {
    return `https://${cleaned}`;
  }

  if (/^www\./i.test(cleaned)) {
    return `https://${cleaned}`;
  }

  return trimmed;
};

// Schema dinâmico baseado nos setores do banco
const createDemandFormSchema = (
  departmentNames: string[],
  destinationNames: string[]
) =>
  z.object({
    name: z.string().min(1, "Nome é obrigatório"),
    department:
      departmentNames.length > 0
        ? z.enum(departmentNames as [string, ...string[]]).optional()
        : z.string().optional(),
    demand_type: z.enum([
      "Bug",
      "Melhoria",
      "Ideia",
      "Ajuste",
      "Outro",
    ] as const),
    system_area: z.string().min(1, "Sistema/área é obrigatório"),
    impact_level: z.enum(["Bloqueante", "Alto", "Médio", "Baixo", "Outro"]),
    description: z
      .string()
      .min(10, "Descrição deve ter pelo menos 10 caracteres"),
    reference_links: z.array(z.string()).min(0).default([]),
    destination_department:
      destinationNames.length > 0
        ? z.enum(destinationNames as [string, ...string[]]).optional()
        : z.string().optional(),
    // Campos adicionais para admin
    assigned_to_user_id: z.string().optional(),
    admin_status: z
      .enum(["Em análise", "Acatada", "Resolvida", "Descartada"])
      .optional(),
    priority: z
      .enum(["Urgente", "Importante", "Necessário", "Interessante"])
      .optional(),
    due_at: z.date().nullable().optional(),
  });

type DemandFormValues = {
  name: string;
  department?: string;
  demand_type: "Bug" | "Melhoria" | "Ideia" | "Ajuste" | "Outro";
  system_area: string;
  impact_level: "Bloqueante" | "Alto" | "Médio" | "Baixo" | "Outro";
  description: string;
  reference_links: string[];
  destination_department?: string;
  assigned_to_user_id?: string;
  admin_status?: "Em análise" | "Acatada" | "Resolvida" | "Descartada";
  priority?: "Urgente" | "Importante" | "Necessário" | "Interessante";
  due_at?: Date | null;
};

interface CreateDemandModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialAdminStatus?: "Em análise" | "Acatada" | "Resolvida" | "Descartada";
  onSuccess?: () => void;
}

export default function CreateDemandModal({
  open,
  onOpenChange,
  initialAdminStatus = "Em análise",
  onSuccess,
}: CreateDemandModalProps) {
  const [isPending, startTransition] = useTransition();
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [referenceLinks, setReferenceLinks] = useState<string[]>([""]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<Map<number, string>>(
    new Map()
  );
  const [departments, setDepartments] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [users, setUsers] = useState<
    Array<{ id: string; displayName: string; email: string }>
  >([]);

  // Carregar setores e usuários do banco de dados
  useEffect(() => {
    const loadData = async () => {
      try {
        const [deptResult, usersResult] = await Promise.all([
          listDepartments(),
          listManagedUsers(),
        ]);

        if (deptResult.ok) {
          setDepartments(deptResult.data);
        }

        if (usersResult.ok) {
          setUsers(
            usersResult.data.map((u) => ({
              id: u.id,
              displayName: u.displayName,
              email: u.email,
            }))
          );
        }
      } catch (error) {
        console.error("Load data error:", error);
      }
    };
    loadData();
  }, []);

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
    const newPreviews = new Map<number, string>();
    attachmentFiles.forEach((file, index) => {
      const existingUrl = previewUrls.get(index);
      if (existingUrl) {
        newPreviews.set(index, existingUrl);
      } else {
        const url = URL.createObjectURL(file);
        newPreviews.set(index, url);
      }
    });

    previewUrls.forEach((url, index) => {
      if (!newPreviews.has(index)) {
        URL.revokeObjectURL(url);
      }
    });

    setPreviewUrls(newPreviews);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachmentFiles]);

  const departmentNames = departments.map((d) => d.name);
  const demandFormSchema = createDemandFormSchema(
    departmentNames,
    departmentNames
  );

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
      destination_department: undefined,
      assigned_to_user_id: undefined,
      admin_status: initialAdminStatus,
      priority: "Interessante",
      due_at: null,
    },
  });

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      form.reset({
        name: "",
        department: undefined,
        demand_type: "Bug",
        system_area: "",
        impact_level: "Baixo",
        description: "",
        reference_links: [],
        destination_department: undefined,
        assigned_to_user_id: undefined,
        admin_status: initialAdminStatus,
        priority: "Interessante",
        due_at: null,
      });
      setAttachmentFiles([]);
      setReferenceLinks([""]);
      const fileInput = document.getElementById(
        "attachment-modal"
      ) as HTMLInputElement;
      if (fileInput) {
        fileInput.value = "";
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialAdminStatus]);

  const onSubmit = async (data: DemandFormValues) => {
    startTransition(async () => {
      try {
        if (!data.department) {
          form.setError("department", {
            type: "required",
            message: "Setor é obrigatório",
          });
          return;
        }

        const validLinks = referenceLinks
          .filter((link) => link.trim() !== "")
          .map((link) => normalizeUrl(link));

        const formData = new FormData();
        formData.append("name", data.name);
        formData.append("department", data.department);
        formData.append("demand_type", data.demand_type);
        formData.append("system_area", data.system_area);
        formData.append("impact_level", data.impact_level);
        formData.append("description", data.description);
        if (data.destination_department) {
          formData.append(
            "destination_department",
            data.destination_department
          );
        }
        if (validLinks.length > 0) {
          formData.append("reference_links", JSON.stringify(validLinks));
        }

        attachmentFiles.forEach((file) => {
          formData.append("attachments", file);
        });

        const result = await createDemand(formData);

        if (result.ok && result.id) {
          const demandId = result.id;

          // Atualizar campos adicionais se fornecidos
          const updatePromises: Promise<{ ok: boolean; error?: string }>[] = [];

          // Atualizar admin_status se diferente do padrão "Em análise"
          if (data.admin_status && data.admin_status !== "Em análise") {
            updatePromises.push(updateAdminStatus(demandId, data.admin_status));
          }

          // Atualizar priority se definida
          if (data.priority) {
            updatePromises.push(updatePriority(demandId, data.priority));
          }

          // Atualizar assigned_to_user_id se definido
          if (data.assigned_to_user_id) {
            updatePromises.push(
              assignDemand(demandId, data.assigned_to_user_id)
            );
          }

          // Atualizar due_at se definido
          if (data.due_at) {
            updatePromises.push(
              setDemandDeadline(demandId, data.due_at.toISOString())
            );
          }

          // Executar todas as atualizações em paralelo
          if (updatePromises.length > 0) {
            const updateResults = await Promise.all(updatePromises);
            const hasErrors = updateResults.some((r) => !r.ok);

            if (hasErrors) {
              toast.warning(
                "Demanda criada, mas algumas configurações não puderam ser aplicadas",
                {
                  description: "Você pode editar a demanda após a criação.",
                }
              );
            } else {
              toast.success("Demanda criada com sucesso!", {
                description:
                  "A demanda foi registrada e configurada conforme especificado.",
              });
            }
          } else {
            toast.success("Demanda criada com sucesso!", {
              description:
                "A demanda foi registrada e pode ser atribuída a um responsável.",
            });
          }

          onSuccess?.();
          onOpenChange(false);
        } else {
          toast.error("Erro ao criar demanda", {
            description: result.error || "Tente novamente mais tarde.",
          });
        }
      } catch (error) {
        console.error("Submit error:", error);
        toast.error("Erro inesperado", {
          description: "Não foi possível criar a demanda. Tente novamente.",
        });
      }
    });
  };

  const validateAndAddFiles = (files: File[]) => {
    const MAX_SIZE = 5 * 1024 * 1024;
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
    const url = previewUrls.get(index);
    if (url) {
      URL.revokeObjectURL(url);
      setPreviewUrls((prev) => {
        const newMap = new Map(prev);
        newMap.delete(index);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="shrink-0">
          <div className="px-5 py-3 border-b border-border/40">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Criar Nova Demanda
            </DialogTitle>
            <DialogDescription>
              Preencha os dados abaixo para criar uma nova demanda
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
          <form
            id="create-demand-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            onPaste={handlePaste}
          >
            <div className="space-y-3.5">
              <div className="space-y-2">
                <Label
                  htmlFor="name-modal"
                  className="text-foreground/90 font-medium flex items-center gap-2"
                >
                  <User className="h-4 w-4" />
                  Nome do Solicitante *
                </Label>
                <Input
                  id="name-modal"
                  {...form.register("name")}
                  placeholder="Nome completo do solicitante"
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
                  htmlFor="department-modal"
                  className="text-foreground/90 font-medium flex items-center gap-2"
                >
                  <Building2 className="h-4 w-4" />
                  Setor de Origem *
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
                  <SelectTrigger id="department-modal">
                    <SelectValue placeholder="Informe o setor" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dep) => (
                      <SelectItem key={dep.id} value={dep.name}>
                        {dep.name}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="space-y-2">
                  <Label
                    htmlFor="demand_type-modal"
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
                    <SelectTrigger id="demand_type-modal">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bug">Bug</SelectItem>
                      <SelectItem value="Melhoria">Melhoria</SelectItem>
                      <SelectItem value="Ideia">Ideia</SelectItem>
                      <SelectItem value="Ajuste">Ajuste</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="impact_level-modal"
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
                    <SelectTrigger id="impact_level-modal">
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
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="system_area-modal"
                  className="text-foreground/90 font-medium flex items-center gap-2"
                >
                  <Layers className="h-4 w-4" />
                  Área Afetada *
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
                  <SelectTrigger id="system_area-modal">
                    <SelectValue placeholder="Informe a área afetada" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="erp-sistemao">ERP (Sistemão)</SelectItem>
                    <SelectItem value="wts-chat">
                      Plataforma de Atendimento (WTS Chat)
                    </SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
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
                  htmlFor="destination_department-modal"
                  className="text-foreground/90 font-medium flex items-center gap-2"
                >
                  <Building2 className="h-4 w-4" />
                  Setor de Destino *
                </Label>
                <Select
                  value={form.watch("destination_department") || undefined}
                  onValueChange={(value) =>
                    form.setValue(
                      "destination_department",
                      value as DemandFormValues["destination_department"]
                    )
                  }
                  disabled={isPending}
                >
                  <SelectTrigger id="destination_department-modal">
                    <SelectValue placeholder="Informe o setor que receberá esta demanda" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dep) => (
                      <SelectItem key={dep.id} value={dep.name}>
                        {dep.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground/70">
                  Opcional. Se selecionado, a demanda será atribuída
                  automaticamente ao responsável do setor.
                </p>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="description-modal"
                  className="text-foreground/90 font-medium flex items-center gap-2"
                >
                  <FileEdit className="h-4 w-4" />
                  Descrição Detalhada *
                </Label>
                <Textarea
                  id="description-modal"
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
                  htmlFor="attachment-modal"
                  className="text-foreground/90 font-medium flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Upload de Print/Evidência
                </Label>

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
                  ${
                    isPending
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer"
                  }
                `}
                  onClick={() => {
                    if (!isPending) {
                      document.getElementById("attachment-modal")?.click();
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
                      id="attachment-modal"
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleFileChange}
                      disabled={isPending}
                    />
                  </div>
                </div>

                {attachmentFiles.length > 0 && (
                  <div className="space-y-2 mt-3">
                    <p className="text-sm font-medium text-foreground/80">
                      {attachmentFiles.length} arquivo(s) selecionado(s):
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {attachmentFiles.map((file, index) => {
                        const previewUrl = previewUrls.get(index);
                        return (
                          <div
                            key={index}
                            className="relative group border rounded-lg p-3 bg-muted/30"
                          >
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute top-2 right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFile(index);
                              }}
                              disabled={isPending}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                            <div className="flex flex-col items-center justify-center gap-2 pt-1">
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
                              </div>
                              <div className="flex flex-col items-center justify-center w-full min-w-0">
                                <p className="text-xs font-medium truncate w-full text-center">
                                  {file.name}
                                </p>
                                <p className="text-xs text-muted-foreground text-center">
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
                          onChange={(e) =>
                            handleLinkChange(index, e.target.value)
                          }
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
              </div>

              {/* Seção de Configurações Administrativas */}
              <div className="rounded-lg border border-border/40 bg-muted/30 p-3 space-y-3">
                <div className="text-[11px] font-medium text-muted-foreground flex items-center gap-2 tracking-wide">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  Configurações Administrativas
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label
                      htmlFor="admin_status-modal"
                      className="text-[11px] text-muted-foreground"
                    >
                      Status Admin
                    </Label>
                    <Select
                      value={form.watch("admin_status") || initialAdminStatus}
                      onValueChange={(value) =>
                        form.setValue(
                          "admin_status",
                          value as DemandFormValues["admin_status"]
                        )
                      }
                      disabled={isPending}
                    >
                      <SelectTrigger
                        id="admin_status-modal"
                        className="h-9 rounded-md"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Em análise">Em análise</SelectItem>
                        <SelectItem value="Acatada">Acatada</SelectItem>
                        <SelectItem value="Resolvida">Resolvida</SelectItem>
                        <SelectItem value="Descartada">Descartada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="priority-modal"
                      className="text-[11px] text-muted-foreground"
                    >
                      Prioridade
                    </Label>
                    <Select
                      value={form.watch("priority") || "Interessante"}
                      onValueChange={(value) =>
                        form.setValue(
                          "priority",
                          value as DemandFormValues["priority"]
                        )
                      }
                      disabled={isPending}
                    >
                      <SelectTrigger
                        id="priority-modal"
                        className="h-9 rounded-md"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Urgente">Urgente</SelectItem>
                        <SelectItem value="Importante">Importante</SelectItem>
                        <SelectItem value="Necessário">Necessário</SelectItem>
                        <SelectItem value="Interessante">
                          Interessante
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="assigned_to_user_id-modal"
                      className="text-[11px] text-muted-foreground"
                    >
                      Responsável
                    </Label>
                    <Select
                      value={form.watch("assigned_to_user_id") || "none"}
                      onValueChange={(value) =>
                        form.setValue(
                          "assigned_to_user_id",
                          value === "none" ? undefined : value
                        )
                      }
                      disabled={isPending}
                    >
                      <SelectTrigger
                        id="assigned_to_user_id-modal"
                        className="h-9 rounded-md"
                      >
                        <SelectValue placeholder="Selecione um responsável" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.displayName} ({user.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="due_at-modal"
                      className="text-[11px] text-muted-foreground"
                    >
                      Prazo de Conclusão
                    </Label>
                    <DatePicker
                      value={form.watch("due_at") || null}
                      onChange={(date) => form.setValue("due_at", date)}
                      disabled={isPending}
                      placeholder="Selecione uma data"
                    />
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        <DialogFooter className="shrink-0 bg-background border-t border-border/40 mt-auto">
          <div className="w-full flex items-center justify-between gap-2 px-5 py-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button
              type="submit"
              form="create-demand-form"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Criar Demanda
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
