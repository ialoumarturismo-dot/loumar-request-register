"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import type { Database } from "@/types/database";

type Demand = Database["public"]["Tables"]["demands"]["Row"];

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
    const attachment = formData.get("attachment") as File | null;

    // Validar campos obrigatórios
    const validation = createDemandSchema.safeParse({
      name,
      department,
      demand_type,
      system_area,
      impact_level,
      description,
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

    let attachmentUrl: string | null = null;

    // Processar upload se houver arquivo
    if (attachment && attachment.size > 0) {
      try {
        // Validar tamanho (máx 5MB)
        const MAX_SIZE = 5 * 1024 * 1024; // 5MB
        if (attachment.size > MAX_SIZE) {
          return {
            ok: false,
            error: "Arquivo muito grande. Tamanho máximo: 5MB",
          };
        }

        // Validar tipo de arquivo (apenas imagens)
        const allowedTypes = [
          "image/jpeg",
          "image/jpg",
          "image/png",
          "image/gif",
          "image/webp",
        ];
        if (!allowedTypes.includes(attachment.type)) {
          return {
            ok: false,
            error:
              "Tipo de arquivo não permitido. Use apenas imagens (JPG, PNG, GIF, WEBP)",
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

        // Criar cliente admin e fazer upload
        const supabase = createAdminClient();
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
            error: `Erro ao fazer upload do arquivo: ${uploadError.message}`,
          };
        }

        // Salvar apenas o path, não a URL completa
        attachmentUrl = storagePath;
      } catch (uploadErr) {
        console.error("Upload exception:", uploadErr);
        return {
          ok: false,
          error: "Erro ao processar arquivo. Tente novamente.",
        };
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
          attachment_url: attachmentUrl,
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
