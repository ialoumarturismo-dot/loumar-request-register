"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Edit, Loader2, User, Building2, Phone } from "lucide-react";
import { listManagedUsers } from "@/app/actions/users";
import { getMyProfile } from "@/app/actions/users";
import { useRouter } from "next/navigation";
import UserFormDialog from "@/components/admin/user-form-dialog";

interface UserData {
  id: string;
  email: string;
  displayName: string;
  role: "admin" | "sector_user";
  whatsappPhone: string | null;
  whatsappOptIn: boolean;
  departments: string[];
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [userRole, setUserRole] = useState<"admin" | "sector_user" | null>(
    null
  );

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const result = await getMyProfile();
        if (result.ok) {
          setUserRole(result.data.role);
          if (result.data.role !== "admin") {
            // Redirecionar sector_user para /admin
            router.push("/admin");
            setLoading(false);
            return;
          }
          // Se for admin, carregar usuários
          await loadUsers();
        } else {
          setLoading(false);
          router.push("/login");
        }
      } catch (error) {
        console.error("Check access error:", error);
        setLoading(false);
        router.push("/login");
      }
    };
    checkAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const result = await listManagedUsers();
      if (result.ok) {
        setUsers(result.data as UserData[]);
      } else {
        toast.error("Erro ao carregar usuários", {
          description: result.error,
        });
      }
    } catch (error) {
      console.error("Load users error:", error);
      toast.error("Erro inesperado", {
        description: "Não foi possível carregar os usuários.",
      });
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingUser(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (user: UserData) => {
    setEditingUser(user);
    setIsDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button onClick={openCreateDialog} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Novo Usuário
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {users.map((user) => (
          <Card key={user.id} className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base truncate">{user.displayName}</CardTitle>
                  <CardDescription className="text-xs truncate mt-1">{user.email}</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEditDialog(user)}
                  className="h-8 w-8 shrink-0"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              <div>
                <Badge
                  variant={user.role === "admin" ? "default" : "secondary"}
                  className="text-xs"
                >
                  {user.role === "admin" ? "Administrador" : "Usuário de Setor"}
                </Badge>
              </div>

              {user.departments.length > 0 && (
                <div>
                  <div className="flex flex-wrap gap-1">
                    {user.departments.map((dept) => (
                      <Badge key={dept} variant="outline" className="text-xs">
                        {dept}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {user.whatsappPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground truncate">{user.whatsappPhone}</span>
                  {user.whatsappOptIn && (
                    <Badge variant="outline" className="text-xs shrink-0">
                      Ativo
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {users.length === 0 && (
        <Card className="border-border/50">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Nenhum usuário cadastrado ainda.
            </p>
          </CardContent>
        </Card>
      )}

      <UserFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        editingUser={editingUser}
        onSuccess={loadUsers}
      />
    </div>
  );
}
