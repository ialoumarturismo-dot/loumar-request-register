"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import type { Database } from "@/types/database";

type Demand = Database["public"]["Tables"]["demands"]["Row"];

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

// Schema de validação para criação de demanda
const createDemandSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  department: z.string().min(2, "Setor deve ter pelo menos 2 caracteres"),
  demand_type: z.enum(["Bug", "Melhoria", "Ideia", "Ajuste"]),
  system_area: z
    .string()
    .min(2, "Sistema/área deve ter pelo menos 2 caracteres"),
  impact_level: z.enum(["Bloqueante", "Alto", "Médio", "Baixo"]),
  description: z
    .string()
    .min(10, "Descrição deve ter pelo menos 10 caracteres"),
  reference_links: z
    .array(
      z
        .string()
        .transform((val) => normalizeUrl(val))
        .pipe(z.string().url())
    )
    .optional()
    .default([]),
});

type CreateDemandInput = z.infer<typeof createDemandSchema>;

export async function createDemand(formData: FormData) {
  try {
    // Extrair campos do FormData
    const name = formData.get("name") as string;
    const department = formData.get("department") as string;
    const demand_type = formData.get("demand_type") as string;
    const system_area = formData.get("system_area") as string;
    const impact_level = formData.get("impact_level") as string;
    const description = formData.get("description") as string;
    const referenceLinksJson = formData.get("reference_links") as string | null;

    // Extrair múltiplos arquivos
    const attachments: File[] = [];
    const attachmentsData = formData.getAll("attachments");
    attachmentsData.forEach((item) => {
      if (item instanceof File && item.size > 0) {
        attachments.push(item);
      }
    });

    // Processar links de referência
    let referenceLinks: string[] = [];
    if (referenceLinksJson) {
      try {
        referenceLinks = JSON.parse(referenceLinksJson);
      } catch (e) {
        console.error("Error parsing reference_links:", e);
        // Continuar com array vazio se houver erro
      }
    }

    // Validar campos obrigatórios
    const validation = createDemandSchema.safeParse({
      name,
      department,
      demand_type,
      system_area,
      impact_level,
      description,
      reference_links: referenceLinks,
    });

    if (!validation.success) {
      return {
        ok: false,
        error: validation.error.issues[0]?.message || "Dados inválidos",
      };
    }

    const validatedData = validation.data;

    // Gerar ID da demanda antes do upload (para organizar arquivos)
    const demandId = randomUUID();

    const attachmentUrls: string[] = [];

    // Processar upload de múltiplos arquivos
    if (attachments.length > 0) {
      const MAX_SIZE = 5 * 1024 * 1024; // 5MB
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
      ];

      const supabase = createAdminClient();

      for (const attachment of attachments) {
        try {
          // Validar tamanho
          if (attachment.size > MAX_SIZE) {
            return {
              ok: false,
              error: `${attachment.name}: Arquivo muito grande. Tamanho máximo: 5MB`,
            };
          }

          // Validar tipo de arquivo
          if (!allowedTypes.includes(attachment.type)) {
            return {
              ok: false,
              error: `${attachment.name}: Tipo não permitido. Use apenas imagens (JPG, PNG, GIF, WEBP)`,
            };
          }

          // Sanitizar nome do arquivo
          const sanitizedFilename = attachment.name
            .replace(/[^a-zA-Z0-9.-]/g, "_")
            .toLowerCase();

          // Definir path no storage: demand-uploads/{demandId}/{filename}
          const storagePath = `${demandId}/${sanitizedFilename}`;

          // Converter File para ArrayBuffer
          const arrayBuffer = await attachment.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          // Fazer upload
          const { error: uploadError } = await supabase.storage
            .from("demand-uploads")
            .upload(storagePath, buffer, {
              contentType: attachment.type,
              upsert: false,
            });

          if (uploadError) {
            console.error("Upload error:", uploadError);
            return {
              ok: false,
              error: `Erro ao fazer upload de ${attachment.name}: ${uploadError.message}`,
            };
          }

          // Adicionar path ao array
          attachmentUrls.push(storagePath);
        } catch (uploadErr) {
          console.error("Upload exception:", uploadErr);
          return {
            ok: false,
            error: `Erro ao processar ${attachment.name}. Tente novamente.`,
          };
        }
      }
    }

    // Inserir demanda no banco
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("demands")
        .insert({
          id: demandId,
          name: validatedData.name,
          department: validatedData.department,
          demand_type: validatedData.demand_type,
          system_area: validatedData.system_area,
          impact_level: validatedData.impact_level,
          description: validatedData.description,
          attachment_urls: attachmentUrls.length > 0 ? attachmentUrls : [],
          reference_links: validatedData.reference_links || [],
          status: "Recebido",
        })
        .select()
        .single();

      if (error) {
        console.error("Insert error:", error);
        return {
          ok: false,
          error: `Erro ao criar demanda: ${error.message}`,
        };
      }

      return {
        ok: true,
        id: data.id,
      };
    } catch (insertErr) {
      console.error("Insert exception:", insertErr);
      return {
        ok: false,
        error: "Erro ao salvar demanda. Tente novamente.",
      };
    }
  } catch (err) {
    console.error("Unexpected error:", err);
    return {
      ok: false,
      error: "Erro inesperado. Tente novamente mais tarde.",
    };
  }
}

/**
 * Server Action: Listar todas as demandas (apenas para usuários autenticados)
 */
export async function getDemands(): Promise<
  { ok: true; data: Demand[] } | { ok: false; error: string }
> {
  try {
    const supabase = await createClient();

    // Verificar se usuário está autenticado
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        ok: false,
        error: "Não autenticado",
      };
    }

    // Buscar demandas ordenadas por data (mais recente primeiro)
    const { data, error } = await supabase
      .from("demands")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Get demands error:", error);
      return {
        ok: false,
        error: `Erro ao buscar demandas: ${error.message}`,
      };
    }

    return {
      ok: true,
      data: data || [],
    };
  } catch (err) {
    console.error("Unexpected error:", err);
    return {
      ok: false,
      error: "Erro inesperado ao buscar demandas.",
    };
  }
}

/**
 * Server Action: Atualizar status de uma demanda
 */
const updateStatusSchema = z.object({
  status: z.enum(["Recebido", "Em análise", "Em execução", "Concluído"]),
});

export async function updateDemandStatus(
  demandId: string,
  status: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createClient();

    // Verificar se usuário está autenticado
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        ok: false,
        error: "Não autenticado",
      };
    }

    // Validar status
    const validation = updateStatusSchema.safeParse({ status });
    if (!validation.success) {
      return {
        ok: false,
        error: validation.error.issues[0]?.message || "Status inválido",
      };
    }

    // Atualizar apenas o campo status
    const { error: updateError } = await supabase
      .from("demands")
      .update({ status: validation.data.status })
      .eq("id", demandId);

    if (updateError) {
      console.error("Update status error:", updateError);
      return {
        ok: false,
        error: `Erro ao atualizar status: ${updateError.message}`,
      };
    }

    // Revalidar página do admin para refletir mudanças
    revalidatePath("/admin");

    return {
      ok: true,
    };
  } catch (err) {
    console.error("Unexpected error:", err);
    return {
      ok: false,
      error: "Erro inesperado ao atualizar status.",
    };
  }
}
