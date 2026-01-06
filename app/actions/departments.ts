"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const createDepartmentSchema = z.object({
  name: z.string().min(1, "Nome do setor é obrigatório"),
});

const updateDepartmentSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Nome do setor é obrigatório"),
});

/**
 * Server Action: Listar todos os setores
 * Permite acesso para usuários autenticados (para uso no formulário de demandas)
 */
export async function listDepartments(): Promise<
  | {
      ok: true;
      data: Array<{ id: string; name: string; created_at: string }>;
    }
  | { ok: false; error: string }
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

    const { data: departments, error } = await supabase
      .from("departments")
      .select("id, name, created_at")
      .order("name", { ascending: true });

    if (error) {
      return {
        ok: false,
        error: `Erro ao buscar setores: ${error.message}`,
      };
    }

    return {
      ok: true,
      data: departments || [],
    };
  } catch (err) {
    console.error("List departments error:", err);
    return {
      ok: false,
      error: "Erro inesperado ao listar setores",
    };
  }
}

/**
 * Server Action: Criar setor
 */
export async function createDepartment(
  name: string
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const supabase = await createClient();

    // Verificar se usuário é admin
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return {
        ok: false,
        error: "Apenas administradores podem criar setores",
      };
    }

    // Validar
    const validation = createDepartmentSchema.safeParse({ name });
    if (!validation.success) {
      return {
        ok: false,
        error: validation.error.issues[0]?.message || "Dados inválidos",
      };
    }

    const admin = createAdminClient();

    const { data, error } = await admin
      .from("departments")
      .insert({
        name: validation.data.name,
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        // Unique constraint violation
        return {
          ok: false,
          error: "Já existe um setor com este nome",
        };
      }
      return {
        ok: false,
        error: `Erro ao criar setor: ${error.message}`,
      };
    }

    revalidatePath("/admin/users");
    return {
      ok: true,
      id: data.id,
    };
  } catch (err) {
    console.error("Create department error:", err);
    return {
      ok: false,
      error: "Erro inesperado ao criar setor",
    };
  }
}

/**
 * Server Action: Atualizar setor
 */
export async function updateDepartment(
  id: string,
  name: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createClient();

    // Verificar se usuário é admin
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return {
        ok: false,
        error: "Apenas administradores podem atualizar setores",
      };
    }

    // Validar
    const validation = updateDepartmentSchema.safeParse({ id, name });
    if (!validation.success) {
      return {
        ok: false,
        error: validation.error.issues[0]?.message || "Dados inválidos",
      };
    }

    const admin = createAdminClient();

    const { error } = await admin
      .from("departments")
      .update({
        name: validation.data.name,
        updated_at: new Date().toISOString(),
      })
      .eq("id", validation.data.id);

    if (error) {
      if (error.code === "23505") {
        // Unique constraint violation
        return {
          ok: false,
          error: "Já existe um setor com este nome",
        };
      }
      return {
        ok: false,
        error: `Erro ao atualizar setor: ${error.message}`,
      };
    }

    revalidatePath("/admin/users");
    return {
      ok: true,
    };
  } catch (err) {
    console.error("Update department error:", err);
    return {
      ok: false,
      error: "Erro inesperado ao atualizar setor",
    };
  }
}

/**
 * Server Action: Deletar setor
 */
export async function deleteDepartment(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createClient();

    // Verificar se usuário é admin
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return {
        ok: false,
        error: "Apenas administradores podem deletar setores",
      };
    }

    const admin = createAdminClient();

    // Buscar nome do setor antes de deletar
    const { data: department } = await admin
      .from("departments")
      .select("name")
      .eq("id", id)
      .single();

    if (!department) {
      return {
        ok: false,
        error: "Setor não encontrado",
      };
    }

    // Verificar se há demandas usando este setor (pelo nome)
    const { data: demandsUsingDept } = await admin
      .from("demands")
      .select("id")
      .eq("department", department.name)
      .limit(1);

    if (demandsUsingDept && demandsUsingDept.length > 0) {
      return {
        ok: false,
        error: "Não é possível deletar setor que está sendo usado em demandas",
      };
    }

    const { error } = await admin.from("departments").delete().eq("id", id);

    if (error) {
      return {
        ok: false,
        error: `Erro ao deletar setor: ${error.message}`,
      };
    }

    revalidatePath("/admin/users");
    return {
      ok: true,
    };
  } catch (err) {
    console.error("Delete department error:", err);
    return {
      ok: false,
      error: "Erro inesperado ao deletar setor",
    };
  }
}

