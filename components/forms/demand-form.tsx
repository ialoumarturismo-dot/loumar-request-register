"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState, useTransition } from "react";
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

// Schema de validação client-side (valores em português para o formulário)
const demandFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  department: z.string().min(1, "Setor é obrigatório"),
  demand_type: z.enum(["Bug", "Melhoria", "Ideia", "Ajuste"]),
  system_area: z.string().min(1, "Sistema/área é obrigatório"),
  impact_level: z.enum(["Bloqueante", "Alto", "Médio", "Baixo"]),
  description: z
    .string()
    .min(10, "Descrição deve ter pelo menos 10 caracteres"),
});

type DemandFormValues = z.infer<typeof demandFormSchema>;

export default function DemandForm() {
  const [isPending, startTransition] = useTransition();
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  const form = useForm<DemandFormValues>({
    resolver: zodResolver(demandFormSchema),
    defaultValues: {
      name: "",
      department: "",
      demand_type: "Bug",
      system_area: "",
      impact_level: "Baixo",
      description: "",
    },
  });

  const onSubmit = async (data: DemandFormValues) => {
    startTransition(async () => {
      try {
        // Criar FormData para enviar ao Server Action
        const formData = new FormData();
        formData.append("name", data.name);
        formData.append("department", data.department);
        formData.append("demand_type", data.demand_type);
        formData.append("system_area", data.system_area);
        formData.append("impact_level", data.impact_level);
        formData.append("description", data.description);

        // Adicionar arquivo se houver
        if (attachmentFile) {
          formData.append("attachment", attachmentFile);
        }

        // Chamar Server Action
        const result = await createDemand(formData);

        if (result.ok) {
          toast.success("Demanda registrada com sucesso!", {
            description: "Sua demanda foi recebida e será analisada em breve.",
          });
          // Reset do formulário
          form.reset();
          setAttachmentFile(null);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setAttachmentFile(file);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome do Solicitante *</Label>
          <Input
            id="name"
            {...form.register("name")}
            placeholder="Seu nome completo"
            disabled={isPending}
          />
          {form.formState.errors.name && (
            <p className="text-sm text-destructive">
              {form.formState.errors.name.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="department">Setor *</Label>
          <Input
            id="department"
            {...form.register("department")}
            placeholder="Ex: Financeiro, RH, Vendas..."
            disabled={isPending}
          />
          {form.formState.errors.department && (
            <p className="text-sm text-destructive">
              {form.formState.errors.department.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="demand_type">Tipo da Demanda *</Label>
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
          <Label htmlFor="system_area">Sistema/Área Afetada *</Label>
          <Input
            id="system_area"
            {...form.register("system_area")}
            placeholder="Ex: ERP, Portal do Cliente, Automação..."
            disabled={isPending}
          />
          {form.formState.errors.system_area && (
            <p className="text-sm text-destructive">
              {form.formState.errors.system_area.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="impact_level">Impacto Percebido *</Label>
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
          <Label htmlFor="description">Descrição Detalhada *</Label>
          <Textarea
            id="description"
            {...form.register("description")}
            placeholder="Descreva detalhadamente a demanda..."
            rows={6}
            disabled={isPending}
          />
          {form.formState.errors.description && (
            <p className="text-sm text-destructive">
              {form.formState.errors.description.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="attachment">Upload de Print/Evidência</Label>
          <Input
            id="attachment"
            type="file"
            accept="image/*"
            className="cursor-pointer"
            onChange={handleFileChange}
            disabled={isPending}
          />
          {attachmentFile && (
            <p className="text-sm text-muted-foreground">
              Arquivo selecionado: {attachmentFile.name} (
              {(attachmentFile.size / 1024).toFixed(2)} KB)
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            Opcional. Formatos aceitos: JPG, PNG, GIF, WEBP (máx. 5MB)
          </p>
        </div>
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={isPending}>
        {isPending ? "Enviando..." : "Enviar Demanda"}
      </Button>
    </form>
  );
}
