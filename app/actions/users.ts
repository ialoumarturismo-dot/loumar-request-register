"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const departmentNameSchema = z.string().min(1, "Departamento inválido").max(100);

// Schema para criar usuário
const createUserSchema = z
  .object({
    email: z.string().email("Email inválido"),
    password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
    displayName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    role: z.enum(["admin", "sector_user"]),
    departments: z.array(departmentNameSchema).default([]),
    whatsappPhone: z.string().optional(),
    whatsappOptIn: z.boolean().default(false),
    notifyDemandCreated: z.boolean().default(true),
    notifyDemandAssigned: z.boolean().default(true),
    notifyManagerComment: z.boolean().default(true),
    notifyDeadlineSoon: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.role === "sector_user" && data.departments.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["departments"],
        message: "Selecione pelo menos um departamento",
      });
    }
  });

// Schema para atualizar usuário
const updateUserSchema = z
  .object({
    userId: z.string().uuid(),
    displayName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").optional(),
    role: z.enum(["admin", "sector_user"]).optional(),
    departments: z.array(departmentNameSchema).optional(),
    whatsappPhone: z.string().optional(),
    whatsappOptIn: z.boolean().optional(),
    notifyDemandCreated: z.boolean().optional(),
    notifyDemandAssigned: z.boolean().optional(),
    notifyManagerComment: z.boolean().optional(),
    notifyDeadlineSoon: z.boolean().optional(),
    password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").optional(),
  })
  .superRefine((data, ctx) => {
    // If explicitly setting role to sector_user, require departments to be provided (and non-empty)
    if (data.role === "sector_user" && (!data.departments || data.departments.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["departments"],
        message: "Selecione pelo menos um departamento",
      });
    }
  });

async function assertDepartmentsExist(
  admin: ReturnType<typeof createAdminClient>,
  names: string[]
) {
  if (names.length === 0) return;

  const { data, error } = await admin.from("departments").select("name").in("name", names);
  if (error) {
    throw new Error(`Erro ao validar setores: ${error.message}`);
  }

  const allowed = new Set((data || []).map((d) => d.name));
  const invalid = names.filter((n) => !allowed.has(n));
  if (invalid.length > 0) {
    throw new Error(`Setor(es) inválido(s): ${invalid.join(", ")}`);
  }
}

/**
 * Server Action: Obter perfil do usuário logado
 */
export async function getMyProfile(): Promise<
  | {
      ok: true;
      data: {
        id: string;
        displayName: string;
        role: "admin" | "sector_user";
        whatsappPhone: string | null;
        whatsappOptIn: boolean;
        departments: string[];
      };
    }
  | { ok: false; error: string }
> {
  try {
    const supabase = await createClient();

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

    // Buscar perfil
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, display_name, role, whatsapp_phone, whatsapp_opt_in")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return {
        ok: false,
        error: "Perfil não encontrado",
      };
    }

    // Buscar departamentos
    const { data: departments, error: deptError } = await supabase
      .from("user_departments")
      .select("department")
      .eq("user_id", user.id);

    if (deptError) {
      return {
        ok: false,
        error: `Erro ao buscar departamentos: ${deptError.message}`,
      };
    }

    return {
      ok: true,
      data: {
        id: profile.id,
        displayName: profile.display_name,
        role: profile.role as "admin" | "sector_user",
        whatsappPhone: profile.whatsapp_phone,
        whatsappOptIn: profile.whatsapp_opt_in,
        departments: departments?.map((d) => d.department) || [],
      },
    };
  } catch (err) {
    console.error("Get profile error:", err);
    return {
      ok: false,
      error: "Erro inesperado ao buscar perfil",
    };
  }
}

/**
 * Server Action: Criar usuário gerenciado (apenas admin)
 */
export async function createManagedUser(
  formData: FormData
): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
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
        error: "Apenas administradores podem criar usuários",
      };
    }

    // Extrair dados do FormData
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const displayName = formData.get("displayName") as string;
    const role = formData.get("role") as string;
    const departmentsJson = formData.get("departments") as string;
    const whatsappPhone = formData.get("whatsappPhone") as string | null;
    const whatsappOptIn = formData.get("whatsappOptIn") === "true";
    const notifyDemandCreated = formData.get("notifyDemandCreated") === "true";
    const notifyDemandAssigned = formData.get("notifyDemandAssigned") === "true";
    const notifyManagerComment = formData.get("notifyManagerComment") === "true";
    const notifyDeadlineSoon = formData.get("notifyDeadlineSoon") === "true";

    let departments: string[] = [];
    if (departmentsJson) {
      try {
        departments = JSON.parse(departmentsJson);
      } catch (e) {
        return {
          ok: false,
          error: "Departamentos inválidos",
        };
      }
    }

    // Validar
    const validation = createUserSchema.safeParse({
      email,
      password,
      displayName,
      role,
      departments,
      whatsappPhone: whatsappPhone || undefined,
      whatsappOptIn,
      notifyDemandCreated,
      notifyDemandAssigned,
      notifyManagerComment,
      notifyDeadlineSoon,
    });

    if (!validation.success) {
      return {
        ok: false,
        error: validation.error.issues[0]?.message || "Dados inválidos",
      };
    }

    const admin = createAdminClient();
    // Validate departments against current departments table (dynamic list)
    try {
      await assertDepartmentsExist(admin, validation.data.departments);
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Setores inválidos",
      };
    }

    // Criar usuário no auth
    const { data: authData, error: authCreateError } = await admin.auth.admin.createUser({
      email: validation.data.email,
      password: validation.data.password,
      email_confirm: true,
    });

    if (authCreateError || !authData.user) {
      return {
        ok: false,
        error: `Erro ao criar usuário: ${authCreateError?.message || "Erro desconhecido"}`,
      };
    }

    const userId = authData.user.id;

    try {
      // Criar perfil
      const { error: profileError } = await admin.from("profiles").insert({
        id: userId,
        display_name: validation.data.displayName,
        role: validation.data.role,
        whatsapp_phone: validation.data.whatsappPhone || null,
        whatsapp_opt_in: validation.data.whatsappOptIn,
        notify_demand_created: validation.data.notifyDemandCreated,
        notify_demand_assigned: validation.data.notifyDemandAssigned,
        notify_manager_comment: validation.data.notifyManagerComment,
        notify_deadline_soon: validation.data.notifyDeadlineSoon,
      });

      if (profileError) {
        // Rollback: deletar usuário do auth
        await admin.auth.admin.deleteUser(userId);
        return {
          ok: false,
          error: `Erro ao criar perfil: ${profileError.message}`,
        };
      }

      // Criar departamentos
      if (validation.data.departments.length > 0) {
        const deptInserts = validation.data.departments.map((dept) => ({
          user_id: userId,
          department: dept,
        }));

        const { error: deptError } = await admin
          .from("user_departments")
          .insert(deptInserts);

        if (deptError) {
          // Rollback parcial: deletar perfil e usuário
          await admin.from("profiles").delete().eq("id", userId);
          await admin.auth.admin.deleteUser(userId);
          return {
            ok: false,
            error: `Erro ao associar departamentos: ${deptError.message}`,
          };
        }

        // Sincronizar department_responsibles: se departamento não tem responsável default, tornar este usuário o default
        for (const dept of validation.data.departments) {
          // Verificar se já existe responsável default para este departamento
          const { data: existingDefault } = await admin
            .from("department_responsibles")
            .select("id")
            .eq("department", dept)
            .eq("is_default", true)
            .maybeSingle();

          if (!existingDefault) {
            // Não tem responsável default, criar para este usuário
            const { error: respError } = await admin
              .from("department_responsibles")
              .insert({
                department: dept,
                user_id: userId,
                is_default: true,
              });

            if (respError) {
              console.error(`Erro ao criar responsável default para ${dept}:`, respError);
              // Não fazer rollback, apenas logar erro
            }
          }
        }
      }

      revalidatePath("/admin/users");
      return {
        ok: true,
        userId,
      };
    } catch (err) {
      // Rollback em caso de erro
      await admin.auth.admin.deleteUser(userId).catch(() => {});
      throw err;
    }
  } catch (err) {
    console.error("Create user error:", err);
    return {
      ok: false,
      error: "Erro inesperado ao criar usuário",
    };
  }
}

/**
 * Server Action: Atualizar usuário gerenciado (apenas admin)
 */
export async function updateManagedUser(
  formData: FormData
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
        error: "Apenas administradores podem editar usuários",
      };
    }

    const userId = formData.get("userId") as string;
    const displayName = formData.get("displayName") as string | null;
    const role = formData.get("role") as string | null;
    const departmentsJson = formData.get("departments") as string | null;
    const whatsappPhone = formData.get("whatsappPhone") as string | null;
    const whatsappOptIn = formData.get("whatsappOptIn") === "true";
    const notifyDemandCreated = formData.get("notifyDemandCreated") === "true";
    const notifyDemandAssigned = formData.get("notifyDemandAssigned") === "true";
    const notifyManagerComment = formData.get("notifyManagerComment") === "true";
    const notifyDeadlineSoon = formData.get("notifyDeadlineSoon") === "true";
    const password = formData.get("password") as string | null;

    let departments: string[] | undefined;
    if (departmentsJson) {
      try {
        departments = JSON.parse(departmentsJson);
      } catch (e) {
        return {
          ok: false,
          error: "Departamentos inválidos",
        };
      }
    }

    // Validar
    const validation = updateUserSchema.safeParse({
      userId,
      displayName: displayName || undefined,
      role: role || undefined,
      departments,
      whatsappPhone: whatsappPhone || undefined,
      whatsappOptIn,
      notifyDemandCreated,
      notifyDemandAssigned,
      notifyManagerComment,
      notifyDeadlineSoon,
      password: password || undefined,
    });

    if (!validation.success) {
      return {
        ok: false,
        error: validation.error.issues[0]?.message || "Dados inválidos",
      };
    }

    const admin = createAdminClient();

    // If role is explicitly set to admin, clear existing departments/responsibles
    if (validation.data.role === "admin") {
      await admin.from("user_departments").delete().eq("user_id", userId);
      await admin.from("department_responsibles").delete().eq("user_id", userId);
    }

    // Atualizar senha se fornecida
    if (validation.data.password) {
      const { error: passwordError } = await admin.auth.admin.updateUserById(userId, {
        password: validation.data.password,
      });

      if (passwordError) {
        return {
          ok: false,
          error: `Erro ao atualizar senha: ${passwordError.message}`,
        };
      }
    }

    // Atualizar perfil
    const profileUpdate: {
      display_name?: string;
      role?: string;
      whatsapp_phone?: string | null;
      whatsapp_opt_in?: boolean;
      notify_demand_created?: boolean;
      notify_demand_assigned?: boolean;
      notify_manager_comment?: boolean;
      notify_deadline_soon?: boolean;
      updated_at?: string;
    } = {
      updated_at: new Date().toISOString(),
    };

    if (validation.data.displayName) {
      profileUpdate.display_name = validation.data.displayName;
    }
    if (validation.data.role) {
      profileUpdate.role = validation.data.role;
    }
    if (validation.data.whatsappPhone !== undefined) {
      profileUpdate.whatsapp_phone = validation.data.whatsappPhone || null;
    }
    if (validation.data.whatsappOptIn !== undefined) {
      profileUpdate.whatsapp_opt_in = validation.data.whatsappOptIn;
    }
    if (validation.data.notifyDemandCreated !== undefined) {
      profileUpdate.notify_demand_created = validation.data.notifyDemandCreated;
    }
    if (validation.data.notifyDemandAssigned !== undefined) {
      profileUpdate.notify_demand_assigned = validation.data.notifyDemandAssigned;
    }
    if (validation.data.notifyManagerComment !== undefined) {
      profileUpdate.notify_manager_comment = validation.data.notifyManagerComment;
    }
    if (validation.data.notifyDeadlineSoon !== undefined) {
      profileUpdate.notify_deadline_soon = validation.data.notifyDeadlineSoon;
    }

    if (Object.keys(profileUpdate).length > 1) {
      // Mais que apenas updated_at
      const { error: profileError } = await admin
        .from("profiles")
        .update(profileUpdate)
        .eq("id", userId);

      if (profileError) {
        return {
          ok: false,
          error: `Erro ao atualizar perfil: ${profileError.message}`,
        };
      }
    }

    // Atualizar departamentos se fornecidos
    if (validation.data.departments) {
      // Validate departments against current departments table (dynamic list)
      try {
        await assertDepartmentsExist(admin, validation.data.departments);
      } catch (e) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : "Setores inválidos",
        };
      }

      // Buscar departamentos atuais antes de deletar
      const { data: currentDepts } = await admin
        .from("user_departments")
        .select("department")
        .eq("user_id", userId);

      const currentDeptNames = currentDepts?.map((d) => d.department) || [];
      const newDeptNames = validation.data.departments;
      const removedDepts = currentDeptNames.filter((d) => !newDeptNames.includes(d));

      // Deletar departamentos existentes
      await admin.from("user_departments").delete().eq("user_id", userId);

      // Remover registros de department_responsibles para departamentos removidos
      if (removedDepts.length > 0) {
        await admin
          .from("department_responsibles")
          .delete()
          .eq("user_id", userId)
          .in("department", removedDepts);
      }

      // Inserir novos
      if (validation.data.departments.length > 0) {
        const deptInserts = validation.data.departments.map((dept) => ({
          user_id: userId,
          department: dept,
        }));

        const { error: deptError } = await admin
          .from("user_departments")
          .insert(deptInserts);

        if (deptError) {
          return {
            ok: false,
            error: `Erro ao atualizar departamentos: ${deptError.message}`,
          };
        }

        // Sincronizar department_responsibles: criar registros para novos departamentos se necessário
        for (const dept of validation.data.departments) {
          // Verificar se já existe registro para este usuário neste departamento
          const { data: existing } = await admin
            .from("department_responsibles")
            .select("id")
            .eq("department", dept)
            .eq("user_id", userId)
            .maybeSingle();

          if (!existing) {
            // Verificar se já existe responsável default para este departamento
            const { data: existingDefault } = await admin
              .from("department_responsibles")
              .select("id")
              .eq("department", dept)
              .eq("is_default", true)
              .maybeSingle();

            // Criar registro (default apenas se não houver outro responsável default)
            const { error: respError } = await admin
              .from("department_responsibles")
              .insert({
                department: dept,
                user_id: userId,
                is_default: !existingDefault,
              });

            if (respError) {
              console.error(`Erro ao sincronizar responsável para ${dept}:`, respError);
              // Não fazer rollback, apenas logar erro
            }
          }
        }
      }
    }

    revalidatePath("/admin/users");
    return {
      ok: true,
    };
  } catch (err) {
    console.error("Update user error:", err);
    return {
      ok: false,
      error: "Erro inesperado ao atualizar usuário",
    };
  }
}

/**
 * Server Action: Listar usuários gerenciados (apenas admin)
 */
export async function listManagedUsers(): Promise<
  | {
      ok: true;
      data: Array<{
        id: string;
        email: string;
        displayName: string;
        role: string;
        whatsappPhone: string | null;
        whatsappOptIn: boolean;
        departments: string[];
      }>;
    }
  | { ok: false; error: string }
> {
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
        error: "Apenas administradores podem listar usuários",
      };
    }

    // Buscar todos os perfis
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, display_name, role, whatsapp_phone, whatsapp_opt_in, notify_demand_created, notify_demand_assigned, notify_manager_comment, notify_deadline_soon")
      .order("created_at", { ascending: false });

    if (profilesError) {
      return {
        ok: false,
        error: `Erro ao buscar perfis: ${profilesError.message}`,
      };
    }

    // Buscar emails e departamentos
    const admin = createAdminClient();
    const usersWithDetails = await Promise.all(
      (profiles || []).map(async (profile) => {
        // Buscar email do auth
        const { data: authUser } = await admin.auth.admin.getUserById(profile.id);
        const email = authUser?.user?.email || "";

        // Buscar departamentos
        const { data: departments } = await supabase
          .from("user_departments")
          .select("department")
          .eq("user_id", profile.id);

        return {
          id: profile.id,
          email,
          displayName: profile.display_name,
          role: profile.role,
          whatsappPhone: profile.whatsapp_phone,
          whatsappOptIn: profile.whatsapp_opt_in,
          departments: departments?.map((d) => d.department) || [],
          notifyDemandCreated: profile.notify_demand_created ?? true,
          notifyDemandAssigned: profile.notify_demand_assigned ?? true,
          notifyManagerComment: profile.notify_manager_comment ?? true,
          notifyDeadlineSoon: profile.notify_deadline_soon ?? true,
        };
      })
    );

    return {
      ok: true,
      data: usersWithDetails,
    };
  } catch (err) {
    console.error("List users error:", err);
    return {
      ok: false,
      error: "Erro inesperado ao listar usuários",
    };
  }
}

